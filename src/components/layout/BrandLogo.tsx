import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: { height: 28, text: "text-[26px]" },
  md: { height: 34, text: "text-[32px]" },
  lg: { height: 44, text: "text-[42px]" },
};

/** Unified logo: COSY AURA */
export function BrandLogo({
  variant = "light",
  size = "md",
  className,
}: BrandLogoProps) {
  const s = SIZES[size];
  const letter = variant === "dark" ? "text-white" : "text-primary";

  return (
    <span
      className={cn(
        "inline-flex items-center select-none font-cormorant font-semibold uppercase leading-none tracking-[0.08em]",
        letter,
        s.text,
        className
      )}
      style={{ height: s.height }}
    >
      COSY AURA
    </span>
  );
}
