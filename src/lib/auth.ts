import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { writeAuditLog } from "./audit";

const oauthProviders: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauthProviders.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  oauthProviders.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/account/login",
    error: "/account/login",
  },
  providers: [
    ...oauthProviders,
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.trim().toLowerCase() || "";
        const portal = credentials?.portal || "store";
        const headers =
          req && typeof req === "object" && "headers" in req
            ? (req as { headers?: Headers | Record<string, string> }).headers
            : undefined;
        const getHeader = (name: string): string | null => {
          if (!headers) return null;
          if (typeof (headers as Headers).get === "function") {
            return (headers as Headers).get(name);
          }
          const h = headers as Record<string, string>;
          return h[name] || h[name.toLowerCase()] || null;
        };
        const ip =
          getHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
          getHeader("x-real-ip") ||
          null;
        const ua = getHeader("user-agent");

        if (!email || !credentials?.password) {
          if (portal === "admin") {
            await writeAuditLog({
              action: "auth.login_failed",
              entityType: "User",
              summary: "Admin login failed (missing credentials)",
              ipAddress: ip,
              userAgent: ua,
              metadata: { portal },
            });
          }
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        const fail = async (reason: string) => {
          if (portal === "admin") {
            await writeAuditLog({
              actorId: user?.id || null,
              action: "auth.login_failed",
              entityType: "User",
              entityId: user?.id || null,
              summary: `Admin login failed for ${email}: ${reason}`,
              ipAddress: ip,
              userAgent: ua,
              metadata: { portal, email, reason },
            });
          }
          return null;
        };

        if (!user || !user.password) return fail("unknown user");

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) return fail("bad password");

        if (portal === "admin" && user.role !== "ADMIN") {
          return fail("not admin");
        }

        if (portal === "admin" && user.activeStaff === false) {
          return fail("inactive");
        }

        if (portal === "admin") {
          await writeAuditLog({
            actorId: user.id,
            action: "auth.login",
            entityType: "User",
            entityId: user.id,
            summary: `Admin signed in (${email})`,
            ipAddress: ip,
            userAgent: ua,
            metadata: { portal },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          memberDiscount: user.memberDiscount,
        };
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { memberDiscount: true },
        });
        if (user.email) {
          await prisma.newsletterSubscriber.upsert({
            where: { email: user.email.toLowerCase() },
            update: {},
            create: { email: user.email.toLowerCase() },
          });
        }
      } catch (error) {
        console.error("[auth] createUser follow-up failed", error);
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      const userId = user?.id || token.sub;
      if (userId && (user || token.memberDiscount === undefined || !token.role)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { memberDiscount: true, role: true },
        });
        if (dbUser) {
          token.memberDiscount = Boolean(dbUser.memberDiscount);
          token.role = dbUser.role;
        } else if (user) {
          token.role = (user as { role?: string }).role || "USER";
          token.memberDiscount = Boolean(
            (user as { memberDiscount?: boolean }).memberDiscount
          );
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        session.user.id = token.sub!;
        session.user.memberDiscount = Boolean(token.memberDiscount);
      }
      return session;
    },
  },
};
