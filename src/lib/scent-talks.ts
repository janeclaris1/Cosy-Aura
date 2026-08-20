export type ScentTalkKind = "video" | "podcast";

export type ScentTalk = {
  id: string;
  guest: string;
  youtubeId: string;
  poster: string;
  duration: string;
  title: string;
  kind: ScentTalkKind;
  publishedAt: string;
};

export const SCENT_TALKS: ScentTalk[] = [
  {
    id: "ama-mensah-sauvage",
    guest: "Ama Mensah",
    youtubeId: "CIvFjk8XmvY",
    poster: "/images/hero/legacy.jpg",
    duration: "12:40",
    title: "First impressions: Sauvage oil vs the spray you already know",
    kind: "video",
    publishedAt: "2026-08-05",
  },
  {
    id: "kofi-boateng-wardrobe",
    guest: "Kofi Boateng",
    youtubeId: "Mz_j_H8oZ4A",
    poster: "/images/lifestyle/request-a-fragrance.png",
    duration: "15:10",
    title: "A scent wardrobe as a personal journal",
    kind: "podcast",
    publishedAt: "2026-08-01",
  },
  {
    id: "nana-adjei-collector",
    guest: "Nana Adjei",
    youtubeId: "YI-4Hc97ItE",
    poster:
      "https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1200&h=675&q=80",
    duration: "20:33",
    title: "From first bottle to collector: building an oil-based rotation",
    kind: "video",
    publishedAt: "2026-07-24",
  },
  {
    id: "efua-darko-rose",
    guest: "Efua Darko",
    youtubeId: "fFJGjaOa2fk",
    poster: "/images/hero/rose.jpg",
    duration: "11:05",
    title: "Skin-close florals: why rose oils bloom differently after dark",
    kind: "video",
    publishedAt: "2026-07-16",
  },
  {
    id: "yaw-mensah-oud",
    guest: "Yaw Mensah",
    youtubeId: "t0i7iRNdBhk",
    poster: "/images/hero/black-orchid.jpg",
    duration: "18:22",
    title: "Oud, tobacco, night - dressing an oriental trail for Accra evenings",
    kind: "podcast",
    publishedAt: "2026-07-09",
  },
  {
    id: "akua-serwaa-samples",
    guest: "Akua Serwaa",
    youtubeId: "uuI6-NNfLX8",
    poster: "/images/hero/zino.jpg",
    duration: "09:48",
    title: "How to test a 2ml sample before you commit to 50ml",
    kind: "video",
    publishedAt: "2026-07-02",
  },
  {
    id: "kwame-asante-layering",
    guest: "Kwame Asante",
    youtubeId: "CIvFjk8XmvY",
    poster: "/images/lifestyle/buy-with-confidence.png",
    duration: "14:16",
    title: "Layering oils without muddying the trail",
    kind: "podcast",
    publishedAt: "2026-06-22",
  },
  {
    id: "afia-boateng-coco",
    guest: "Afia Boateng",
    youtubeId: "Mz_j_H8oZ4A",
    poster:
      "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=1200&h=675&q=80",
    duration: "16:04",
    title: "Coco DNA, oil format - elegant, romantic, everyday?",
    kind: "video",
    publishedAt: "2026-06-12",
  },
  {
    id: "kojo-nkrumah-santal",
    guest: "Kojo Nkrumah",
    youtubeId: "YI-4Hc97ItE",
    poster:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&h=675&q=80",
    duration: "13:51",
    title: "Santal, woods, and the quiet confidence of a daily oil",
    kind: "podcast",
    publishedAt: "2026-06-04",
  },
];

export const FEATURED_SCENT_TALKS = SCENT_TALKS.slice(0, 3);
