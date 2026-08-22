import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getReviewEligibility } from "@/lib/fragrance-reviews";

type RouteContext = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteContext) {
  const fragranceId = String(params.id || "").trim();
  if (!fragranceId) {
    return NextResponse.json({ error: "Missing fragrance id" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({
      signedIn: false,
      canReview: false,
      orders: [],
    });
  }

  const email = session.user.email.trim().toLowerCase();
  const eligibility = await getReviewEligibility({
    fragranceId,
    userId: session.user.id || null,
    email,
  });

  return NextResponse.json({
    signedIn: true,
    ...eligibility,
  });
}
