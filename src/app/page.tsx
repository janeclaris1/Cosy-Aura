import { unstable_noStore as noStore } from "next/cache";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { BrandStrip } from "@/components/home/BrandStrip";
import { GoogleReviews } from "@/components/home/GoogleReviews";
import { FeatureCtaPanels } from "@/components/home/FeatureCtaPanels";
import { VideoReviews } from "@/components/home/VideoReviews";
import { RequestFragranceBanner } from "@/components/home/RequestFragranceBanner";
import { WhyBuyFromUs } from "@/components/home/WhyBuyFromUs";
import { NewsletterSignup } from "@/components/home/NewsletterSignup";
import { PerfumeOfTheMonth } from "@/components/home/PerfumeOfTheMonth";
import { PremiumFeaturesStrip } from "@/components/home/PremiumFeaturesStrip";
import { ProductCard } from "@/components/products/ProductCard";
import { ScentTalkStrip } from "@/components/home/ScentTalkStrip";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getRandomFragrances, getBestSellingFragrances } from "@/lib/fragrances";
import { getGentsScentsVideoReviews } from "@/lib/gents-scents";

export default async function HomePage() {
  noStore();

  const [latest, bestSellers, videoReviews] = await Promise.all([
    getRandomFragrances(12),
    getBestSellingFragrances(12),
    getGentsScentsVideoReviews(6),
  ]);
  const latestFirstRow = latest.slice(0, 6);
  const latestSecondRow = latest.slice(6, 12);
  const bestSellersFirstRow = bestSellers.slice(0, 6);
  const bestSellersSecondRow = bestSellers.slice(6, 12);

  return (
    <>
      <HeroCarousel />
      <PremiumFeaturesStrip />
      <BrandStrip />
      <GoogleReviews />

      <section className="py-16 px-4">
        <div className="max-w-[1500px] mx-auto">
          <HomeSectionHeader titleKey="home.latest" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-10">
            {latestFirstRow.map((fragrance) => (
              <ProductCard key={fragrance.id} fragrance={fragrance} />
            ))}
          </div>

          <ScentTalkStrip />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-10">
            {latestSecondRow.map((fragrance) => (
              <ProductCard key={fragrance.id} fragrance={fragrance} />
            ))}
          </div>
        </div>
      </section>

      <PerfumeOfTheMonth />

      <section className="py-16 px-4">
        <div className="max-w-[1500px] mx-auto">
          <HomeSectionHeader titleKey="home.bestSellers" />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-10">
            {bestSellersFirstRow.map((fragrance) => (
              <ProductCard key={fragrance.id} fragrance={fragrance} />
            ))}
          </div>

          <div className="my-10 md:my-12">
            <FeatureCtaPanels />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-10">
            {bestSellersSecondRow.map((fragrance) => (
              <ProductCard key={fragrance.id} fragrance={fragrance} />
            ))}
          </div>
        </div>
      </section>

      <VideoReviews reviews={videoReviews} />
      <RequestFragranceBanner />
      <WhyBuyFromUs />
      <NewsletterSignup />
    </>
  );
}
