import { prisma } from "@/lib/prisma";
import type { FaqGalleryImage } from "@/components/faq/FaqTopicCards";

const FALLBACK_IMAGES: FaqGalleryImage[] = [
  {
    url: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=800&fit=crop",
    alt: "Chanel fragrance",
  },
  {
    url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&h=800&fit=crop",
    alt: "Luxury perfume bottle",
  },
  {
    url: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=800&h=800&fit=crop",
    alt: "Designer fragrance",
  },
  {
    url: "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=800&h=800&fit=crop",
    alt: "Premium perfume collection",
  },
];

export async function getFaqGalleryImages(): Promise<FaqGalleryImage[]> {
  try {
    const rows = await prisma.fragranceImage.findMany({
      where: { isPrimary: true },
      select: {
        url: true,
        alt: true,
        fragrance: {
          select: {
            model: true,
            brand: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    });

    const pool = rows
      .filter((row) => row.url)
      .map((row) => ({
        url: row.url,
        alt:
          row.alt ||
          `${row.fragrance.brand.name} ${row.fragrance.model}`.trim() ||
          `${row.fragrance.brand.name} fragrance`,
      }));

    if (pool.length >= 3) return pool;
    return FALLBACK_IMAGES;
  } catch {
    return FALLBACK_IMAGES;
  }
}
