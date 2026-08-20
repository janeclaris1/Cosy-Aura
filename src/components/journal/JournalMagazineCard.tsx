import Image from "next/image";
import Link from "next/link";

export function JournalMagazineCard({
  href,
  onClick,
  image,
  title,
  cta,
  sizes = "(max-width: 768px) 100vw, 33vw",
  ariaLabel,
}: {
  href?: string;
  onClick?: () => void;
  image: string | null;
  title: string;
  cta: string;
  sizes?: string;
  ariaLabel?: string;
}) {
  const body = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden bg-[#f3f3f3]">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes={sizes}
          />
        ) : (
          <div className="absolute inset-0 bg-[#f3f3f3]" />
        )}
      </div>
      <h2 className="mt-4 text-[14px] md:text-[15px] font-bold uppercase tracking-[0.04em] leading-snug text-black line-clamp-4 text-left">
        {title}
      </h2>
      <span className="mt-4 inline-block text-[13px] md:text-sm text-black underline underline-offset-[5px] decoration-black/80 group-hover:decoration-black">
        {cta}
      </span>
    </>
  );

  const shell =
    "group flex flex-col w-full text-left appearance-none bg-transparent";

  if (href) {
    return (
      <article>
        <Link href={href} className={shell} aria-label={ariaLabel || title}>
          {body}
        </Link>
      </article>
    );
  }

  return (
    <article>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel || title}
        className={shell}
      >
        {body}
      </button>
    </article>
  );
}
