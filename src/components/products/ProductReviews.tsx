"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/locale-store";
import { cn } from "@/lib/utils";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  verified: boolean;
  createdAt: string;
};

type EligibilityOrder = {
  orderId: string;
  orderRef: string;
  purchasedAt: string;
  alreadyReviewed: boolean;
};

function Stars({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: "sm" | "md";
}) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn(
            onChange ? "hover:scale-110 transition-transform" : "cursor-default"
          )}
          aria-label={`${n} stars`}
        >
          <Star
            className={cn(
              iconClass,
              n <= value ? "fill-gold text-gold" : "text-wf-border"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function formatReviewDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function ProductReviews({ fragranceId }: { fragranceId: string }) {
  const t = useT();
  const { status } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<{ averageRating: number | null; reviewCount: number }>({
    averageRating: null,
    reviewCount: 0,
  });
  const [orders, setOrders] = useState<EligibilityOrder[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [orderId, setOrderId] = useState("");

  async function loadReviews() {
    const res = await fetch(`/api/fragrances/${encodeURIComponent(fragranceId)}/reviews`);
    if (!res.ok) return;
    const data = await res.json();
    setReviews(data.reviews || []);
    setSummary(data.summary || { averageRating: null, reviewCount: 0 });
  }

  async function loadEligibility() {
    const res = await fetch(
      `/api/fragrances/${encodeURIComponent(fragranceId)}/reviews/eligibility`
    );
    if (!res.ok) return;
    const data = await res.json();
    setSignedIn(Boolean(data.signedIn));
    setCanReview(Boolean(data.canReview));
    const list = (data.orders || []) as EligibilityOrder[];
    setOrders(list);
    const firstOpen = list.find((o) => !o.alreadyReviewed);
    if (firstOpen) setOrderId(firstOpen.orderId);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await Promise.all([loadReviews(), loadEligibility()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fragranceId, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/fragrances/${encodeURIComponent(fragranceId)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating, title, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save review");

      setSuccess(t("reviews.submitted"));
      setTitle("");
      setBody("");
      setRating(5);
      if (data.review) {
        setReviews((prev) => [data.review, ...prev]);
      } else {
        await loadReviews();
      }
      if (data.summary) setSummary(data.summary);
      await loadEligibility();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setSubmitting(false);
    }
  }

  const openOrders = orders.filter((o) => !o.alreadyReviewed);

  return (
    <section className="mt-12 border-t border-wf-border pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-playfair text-2xl text-espresso">{t("reviews.title")}</h2>
          {summary.reviewCount > 0 ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-mocha">
              <Stars value={Math.round(summary.averageRating || 0)} size="sm" />
              <span>
                {summary.averageRating?.toFixed(1)} · {summary.reviewCount}{" "}
                {summary.reviewCount === 1 ? t("reviews.reviewSingular") : t("reviews.reviewPlural")}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-mocha">{t("reviews.empty")}</p>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-mocha">{t("reviews.loading")}</p>
      ) : (
        <>
          {!signedIn ? (
            <p className="text-sm text-mocha mb-8">
              {t("reviews.signInPrompt")}{" "}
              <Link href="/account/login" className="text-espresso underline underline-offset-2">
                {t("reviews.signInLink")}
              </Link>
            </p>
          ) : canReview && openOrders.length > 0 ? (
            <form
              onSubmit={handleSubmit}
              className="mb-10 border border-wf-border bg-white p-5 space-y-4"
            >
              <p className="text-sm font-medium text-espresso">{t("reviews.write")}</p>
              <p className="text-xs text-mocha">{t("reviews.verifiedHint")}</p>

              {openOrders.length > 1 ? (
                <label className="block text-sm">
                  {t("reviews.orderLabel")}
                  <select
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-wf-border text-sm bg-white"
                    required
                  >
                    {openOrders.map((order) => (
                      <option key={order.orderId} value={order.orderId}>
                        #{order.orderRef} · {formatReviewDate(order.purchasedAt)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div>
                <p className="text-sm mb-1">{t("reviews.ratingLabel")}</p>
                <Stars value={rating} onChange={setRating} />
              </div>

              <label className="block text-sm">
                {t("reviews.titleLabel")}
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder={t("reviews.titlePlaceholder")}
                  className="mt-1 w-full px-3 py-2 border border-wf-border text-sm bg-white"
                />
              </label>

              <label className="block text-sm">
                {t("reviews.bodyLabel")}
                <textarea
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder={t("reviews.bodyPlaceholder")}
                  className="mt-1 w-full px-3 py-2 border border-wf-border text-sm bg-white resize-y min-h-[100px]"
                />
              </label>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm text-green-700">{success}</p> : null}

              <button
                type="submit"
                disabled={submitting || !orderId}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? t("reviews.submitting") : t("reviews.submit")}
              </button>
            </form>
          ) : signedIn ? (
            <p className="text-sm text-mocha mb-8">{t("reviews.notEligible")}</p>
          ) : null}

          {reviews.length > 0 ? (
            <ul className="space-y-6">
              {reviews.map((review) => (
                <li key={review.id} className="border-b border-wf-border pb-6 last:border-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                    <Stars value={review.rating} size="sm" />
                    {review.verified ? (
                      <span className="text-[10px] uppercase tracking-[0.14em] text-gold">
                        {t("reviews.verifiedBuyer")}
                      </span>
                    ) : null}
                    <span className="text-xs text-mocha ml-auto">
                      {formatReviewDate(review.createdAt)}
                    </span>
                  </div>
                  <p className="font-medium text-espresso">{review.authorName}</p>
                  {review.title ? (
                    <p className="font-playfair text-lg text-espresso mt-1">{review.title}</p>
                  ) : null}
                  <p className="text-sm text-mocha mt-2 leading-relaxed whitespace-pre-wrap">
                    {review.body}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}
