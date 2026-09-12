import { NextResponse } from "next/server";

/** Staff passwords are set by Super Admin only — self-service links are disabled. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Passwords are set by your administrator. Contact a Super Admin if you need access.",
    },
    { status: 403 }
  );
}
