import { getGoogleReviews } from "@/lib/google-reviews";
import { GoogleReviewsSlider } from "@/components/home/GoogleReviewsSlider";

export async function GoogleReviews() {
  const data = await getGoogleReviews();
  const reviews = data.reviews.slice(0, 10);
  if (!reviews.length) return null;
  return (
    <GoogleReviewsSlider
      reviews={reviews}
      mapsUrl={data.mapsUrl}
      rating={data.rating}
      total={data.total}
    />
  );
}
