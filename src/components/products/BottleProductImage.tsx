import Image from "next/image";
import { bottleLabelName, variationBottleSrc } from "@/lib/bottle-image";
import { cn } from "@/lib/utils";

export function BottleProductImage({
  brand,
  model,
  size = 50,
  alt,
  className,
  imgClassName,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority = false,
  fillParent = false,
}: {
  brand: string;
  model: string;
  size?: number;
  alt?: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  fillParent?: boolean;
}) {
  const ml = size === 30 || size === 100 ? size : 50;
  const name = bottleLabelName(brand, model);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-ivory",
        fillParent ? "h-full w-full" : "aspect-square",
        className
      )}
    >
      <Image
        src={variationBottleSrc(ml)}
        alt={alt || `${name} perfume oil ${ml}ml`}
        fill
        priority={priority}
        sizes={sizes}
        className={cn("object-contain object-center", imgClassName)}
      />
    </div>
  );
}

export function cartModelName(model: string): string {
  return String(model || "").replace(/\s*·\s*\d+\s*ml$/i, "").trim();
}
