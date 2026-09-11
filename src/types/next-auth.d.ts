import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: string;
      memberDiscount?: boolean;
    };
  }

  interface User {
    role?: string;
    memberDiscount?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    memberDiscount?: boolean;
  }
}
