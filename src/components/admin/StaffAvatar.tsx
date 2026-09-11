"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-xl",
} as const;

function initialsFrom(name: string | null | undefined, email: string | null | undefined) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function StaffAvatar({
  name,
  email,
  image,
  size = "md",
  className,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const label = name || email || "Staff";
  const initials = initialsFrom(name, email);
  const sizeClass = SIZES[size];

  if (image) {
    const isRemote = image.startsWith("http");
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-full bg-[#03045e]/5 ring-1 ring-[#03045e]/10",
          sizeClass,
          className
        )}
      >
        {isRemote ? (
          <Image
            src={image}
            alt={label}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={label} className="h-full w-full object-cover" />
        )}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[#03045e]/10 font-semibold text-[#03045e] ring-1 ring-[#03045e]/10",
        sizeClass,
        className
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
