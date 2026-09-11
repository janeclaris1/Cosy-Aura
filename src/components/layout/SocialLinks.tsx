"use client";

import type { ComponentType } from "react";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { SOCIAL_PROFILES } from "@/lib/social-links";
import { cn } from "@/lib/utils";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.593 1.356.465 3.087-.309 4.747-.516 1.058-1.228 1.931-2.047 2.658.605.224 1.171.484 1.664.777 1.097.724 1.756 1.578 2.013 2.491.398 1.461-.079 2.686-1.322 3.419-2.003 1.181-5.191 1.842-8.047 1.842-2.856 0-6.044-.661-8.047-1.842-1.243-.733-1.72-1.958-1.322-3.419.257-.913.916-1.767 2.013-2.491.493-.293 1.059-.553 1.664-.777-.819-.727-1.531-1.6-2.047-2.658-.774-1.66-.902-3.391-.309-4.747 1.583-3.545 4.94-3.821 5.93-3.821z" />
    </svg>
  );
}

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  snapchat: SnapchatIcon,
  tiktok: TikTokIcon,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
};

export function SocialLinks({
  className,
  iconClassName = "w-5 h-5",
  variant = "footer",
}: {
  className?: string;
  iconClassName?: string;
  variant?: "footer" | "light";
}) {
  // Footer is navy — use signal yellow (#FFD200), not text-gold (also navy in theme).
  const linkClass =
    variant === "footer"
      ? "text-[#FFD200] hover:text-white transition-colors"
      : "text-[#03045e] hover:text-[#FFD200] transition-colors";

  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {SOCIAL_PROFILES.map((profile) => {
        const Icon = ICONS[profile.id];
        if (!Icon) return null;
        return (
          <a
            key={profile.id}
            href={profile.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${profile.label} (${profile.handle})`}
            title={profile.label}
            className={linkClass}
          >
            <Icon className={cn(iconClassName, "shrink-0 block")} />
          </a>
        );
      })}
    </div>
  );
}

export function SocialLinksList({
  className,
}: {
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {SOCIAL_PROFILES.map((profile) => (
        <li key={profile.id}>
          <a
            href={profile.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-wf-black hover:text-gold transition-colors inline-flex items-center gap-2"
          >
            <span className="font-medium">{profile.label}</span>
            <span className="text-wf-gray">{profile.handle}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
