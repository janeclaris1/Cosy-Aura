import { cn } from "@/lib/utils";

const PRODUCT_PROMISES = ["Undiluted", "Online Store", "Next day delivery"] as const;

export function ProductPromises({
  className,
  badgeClassName = "w-3.5 h-3.5 text-black shrink-0",
}: {
  className?: string;
  badgeClassName?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {PRODUCT_PROMISES.map((label) => (
        <span key={label} className="inline-flex items-center gap-1.5 font-medium">
          {label}
          <VerifiedBadge className={badgeClassName} />
        </span>
      ))}
    </div>
  );
}

export function VerifiedBadge({
  className = "w-3.5 h-3.5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 1.1l1.92 1.92 2.68-.48.78 2.61 2.61.78-.48 2.68L21.9 12l-1.92 1.92.48 2.68-2.61.78-.78 2.61-2.68-.48L12 22.9l-1.92-1.92-2.68.48-.78-2.61-2.61-.78.48-2.68L2.1 12l1.92-1.92-.48-2.68 2.61-.78.78-2.61 2.68.48L12 1.1z"
      />
      <path
        fill="#fff"
        d="M10.05 15.65L6.8 12.4l1.15-1.15 2.1 2.1 5.05-5.05 1.15 1.15-6.2 6.2z"
      />
    </svg>
  );
}
