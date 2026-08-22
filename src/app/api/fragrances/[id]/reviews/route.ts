import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createVerifiedFragranceReview,
  getFragranceReviewSummary,
  listFragranceReviews,
} from "@/lib/fragrance-reviews";

type RouteContext = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteContext) {
  const fragranceId = String(params.id || "").trim();
  if (!fragranceId) {
    return NextResponse.json({ error: "Missing fragrance id" }, { status: 400 });
  }

  const [reviews, summary] = await Promise.all([
    listFragranceReviews(fragranceId),
    getFragranceReviewSummary(fragranceId),
  ]);

  return NextResponse.json({ reviews, summary });
}

export async function POST(req: Request, { params }: RouteContext) {
  const fragranceId = String(params.id || "").trim();
  if (!fragranceId) {
    return NextResponse.json({ error: "Missing fragrance id" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Sign in to leave a verified review." },
      { status: 401 }
    );
  }

  const email = session.user.email.trim().toLowerCase();
  const userId = session.user.id || null;
  const authorName = session.user.name;

  try {
    const body = await req.json();
    const review = await createVerifiedFragranceReview({
      fragranceId,
      orderId: String(body.orderId || "").trim(),
      userId,
      email,
      authorName,
      rating: Number(body.rating),
      title: body.title,
      body: String(body.body || ""),
    });

    const summary = await getFragranceReviewSummary(fragranceId);
    return NextResponse.json({ review, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save review";
    const status = /sign in|verified|belong|order/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
