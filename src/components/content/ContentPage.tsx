import Link from "next/link";

/** Shared layout for trust/legal pages (Privacy, Terms, Shipping, Returns, FAQ, Track). */
export function ContentPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white">
      <section className="border-b border-[#e8e8e8]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          <h1 className="font-inter text-3xl sm:text-4xl font-bold text-black tracking-tight mb-4">
            {title}
          </h1>
          {subtitle && (
            <p className="font-inter text-base sm:text-lg leading-relaxed text-black/80 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        {children}
      </section>
    </div>
  );
}

export function ContentSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10 last:mb-0">
      {title && (
        <h2 className="font-inter text-xl sm:text-2xl font-bold text-black mb-4">
          {title}
        </h2>
      )}
      <div className="space-y-4 font-inter text-[15px] sm:text-base leading-relaxed text-black/85 [&_a]:text-[#03045e] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#0077b6] [&_strong]:text-black [&_strong]:font-semibold">
        {children}
      </div>
    </div>
  );
}

export function ContentCta({
  href = "/fragrances",
  label = "Browse Fragrances",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <div className="mt-12 pt-10 border-t border-[#e8e8e8]">
      <Link href={href} className="btn-gold inline-block">
        {label}
      </Link>
    </div>
  );
}
