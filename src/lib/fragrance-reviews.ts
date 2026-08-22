import type { OrderStatus } from "@prisma/client";
import { prisma } from "./prisma";

export const VERIFIED_BUYER_ORDER_STATUSES: OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export type FragranceReviewPublic = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  verified: boolean;
  createdAt: string;
};

export type ReviewEligibilityOrder = {
  orderId: string;
  orderRef: string;
  purchasedAt: string;
  alreadyReviewed: boolean;
};

function displayAuthorName(name: string | null | undefined, email: string): string {
  const trimmed = String(name || "").trim();
  if (trimmed) return trimmed.split(/\s+/).slice(0, 2).join(" ");
  const local = email.split("@")[0] || "Customer";
  return local.replace(/[._-]+/g, " ").trim() || "Customer";
}

export async function getFragranceReviewSummary(fragranceId: string) {
  const agg = await prisma.fragranceReview.aggregate({
    where: { fragranceId },
    _avg: { rating: true },
    _count: { id: true },
  });

  return {
    averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    reviewCount: agg._count.id,
  };
}

export async function listFragranceReviews(
  fragranceId: string,
  limit = 20
): Promise<FragranceReviewPublic[]> {
  const rows = await prisma.fragranceReview.findMany({
    where: { fragranceId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      authorName: true,
      verified: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

function orderBelongsToCustomer(
  order: { userId: string | null; email: string },
  userId: string | null,
  email: string
): boolean {
  if (userId && order.userId === userId) return true;
  return order.email.trim().toLowerCase() === email.trim().toLowerCase();
}

export async function getReviewEligibility(input: {
  fragranceId: string;
  userId: string | null;
  email: string;
}): Promise<{ canReview: boolean; orders: ReviewEligibilityOrder[] }> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { canReview: false, orders: [] };

  const orders = await prisma.order.findMany({
    where: {
      status: { in: VERIFIED_BUYER_ORDER_STATUSES },
      items: { some: { fragranceId: input.fragranceId } },
      OR: [
        ...(input.userId ? [{ userId: input.userId }] : []),
        { email: { equals: email, mode: "insensitive" as const } },
      ],
    },
    select: {
      id: true,
      createdAt: true,
      userId: true,
      email: true,
      items: {
        where: { fragranceId: input.fragranceId },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const existing = await prisma.fragranceReview.findMany({
    where: {
      fragranceId: input.fragranceId,
      orderId: { in: orders.map((o) => o.id) },
    },
    select: { orderId: true },
  });
  const reviewed = new Set(existing.map((r) => r.orderId));

  const eligible = orders.filter(
    (order) =>
      order.items.length > 0 &&
      orderBelongsToCustomer(order, input.userId, email)
  );

  const mapped = eligible.map((order) => ({
    orderId: order.id,
    orderRef: order.id.slice(-8).toUpperCase(),
    purchasedAt: order.createdAt.toISOString(),
    alreadyReviewed: reviewed.has(order.id),
  }));

  return {
    canReview: mapped.some((o) => !o.alreadyReviewed),
    orders: mapped,
  };
}

export async function createVerifiedFragranceReview(input: {
  fragranceId: string;
  orderId: string;
  userId: string | null;
  email: string;
  authorName?: string | null;
  rating: number;
  title?: string | null;
  body: string;
}) {
  const email = input.email.trim().toLowerCase();
  const rating = Math.round(input.rating);
  const body = input.body.trim();
  const title = input.title?.trim() || null;

  if (!email) throw new Error("Sign in to leave a review.");
  if (rating < 1 || rating > 5) throw new Error("Choose a rating from 1 to 5 stars.");
  if (body.length < 10) throw new Error("Please write at least 10 characters.");
  if (body.length > 2000) throw new Error("Review is too long (max 2000 characters).");
  if (title && title.length > 120) throw new Error("Title is too long (max 120 characters).");

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      items: { where: { fragranceId: input.fragranceId }, select: { id: true } },
    },
  });

  if (
    !order ||
    !VERIFIED_BUYER_ORDER_STATUSES.includes(order.status) ||
    order.items.length === 0
  ) {
    throw new Error("Only verified buyers can review this product.");
  }

  if (!(orderBelongsToCustomer(order, input.userId, email))) {
    throw new Error("This order does not belong to your account.");
  }

  const authorName = displayAuthorName(input.authorName, email);

  const review = await prisma.fragranceReview.create({
    data: {
      fragranceId: input.fragranceId,
      orderId: input.orderId,
      userId: input.userId,
      email,
      authorName,
      rating,
      title,
      body,
      verified: true,
    },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      authorName: true,
      verified: true,
      createdAt: true,
    },
  });

  await syncFragranceRating(input.fragranceId);

  return {
    ...review,
    createdAt: review.createdAt.toISOString(),
  } satisfies FragranceReviewPublic;
}

export async function syncFragranceRating(fragranceId: string) {
  const agg = await prisma.fragranceReview.aggregate({
    where: { fragranceId },
    _avg: { rating: true },
    _count: { id: true },
  });

  const average =
    agg._count.id > 0 && agg._avg.rating != null
      ? Math.round(agg._avg.rating * 10) / 10
      : null;

  await prisma.fragrance.update({
    where: { id: fragranceId },
    data: { rating: average },
  });

  return { average, count: agg._count.id };
}
