export type VideoReviewPerfume = { name: string; href: string };

export type GentsScentsVideoReview = {
  id: string;
  username: string;
  timeAgo: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channelUrl: string;
  perfumes: VideoReviewPerfume[];
};

export const GENTS_SCENTS_CHANNEL = {
  name: "Gents Scents",
  handle: "@GentsScents",
  url: "https://www.youtube.com/@GentsScents",
};
