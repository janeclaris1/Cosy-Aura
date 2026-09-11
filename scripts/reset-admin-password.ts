/**
 * Reset an admin user's password (local/dev recovery).
 *
 * Usage:
 *   npx tsx scripts/reset-admin-password.ts you@example.com NewPassword123
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/reset-admin-password.ts <email> <new-password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, activeStaff: true },
    });

    if (!user) {
      console.error(`No user found for ${email}.`);
      console.error("Create one first, or run: npm run db:seed (default admin@cosyaura.com)");
      process.exit(1);
    }
    if (user.role !== "ADMIN") {
      console.error(`User ${email} exists but role is ${user.role}, not ADMIN.`);
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: { password: hash, activeStaff: true, role: "ADMIN" },
    });

    console.log(`Password updated for ${email}.`);
    console.log("Sign in at /admin/login with the new password.");
    console.log(
      "For Super Admin branch/staff access, add this email to SUPER_ADMIN_EMAILS in .env and restart the server."
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
