/** Public social profiles — override URLs in .env (see .env.example). */

function envUrl(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value || fallback;
}

export type SocialProfile = {
  id: string;
  label: string;
  handle: string;
  href: string;
};

const HANDLE = "cosyaura";

export const SOCIAL_PROFILES: SocialProfile[] = [
  {
    id: "instagram",
    label: "Instagram",
    handle: `@${HANDLE}`,
    href: envUrl(
      "NEXT_PUBLIC_INSTAGRAM_URL",
      `https://www.instagram.com/${HANDLE}`
    ),
  },
  {
    id: "snapchat",
    label: "Snapchat",
    handle: `@${HANDLE}`,
    href: envUrl(
      "NEXT_PUBLIC_SNAPCHAT_URL",
      `https://www.snapchat.com/add/${HANDLE}`
    ),
  },
  {
    id: "tiktok",
    label: "TikTok",
    handle: `@${HANDLE}`,
    href: envUrl(
      "NEXT_PUBLIC_TIKTOK_URL",
      `https://www.tiktok.com/@${HANDLE}`
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    handle: `@${HANDLE}`,
    href: envUrl(
      "NEXT_PUBLIC_FACEBOOK_URL",
      `https://www.facebook.com/${HANDLE}`
    ),
  },
  {
    id: "youtube",
    label: "YouTube",
    handle: `@${HANDLE}`,
    href: envUrl(
      "NEXT_PUBLIC_YOUTUBE_URL",
      `https://www.youtube.com/@${HANDLE}`
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    handle: "Cosy Aura",
    href: envUrl(
      "NEXT_PUBLIC_LINKEDIN_URL",
      `https://www.linkedin.com/company/${HANDLE}`
    ),
  },
];
