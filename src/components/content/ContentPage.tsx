import Link from "next/link";

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
    <div>
      <section className="bg-wf-light border-b border-wf-border">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20">
          <p className="text-xs uppercase tracking-[0.2em] text-gold mb-3">
            COSY AURA
          </p>
          <h1 className="font-playfair text-4xl md:text-5xl text-wf-black mb-4">
            {title}
          </h1>
          {subtitle && (
            <p className="text-wf-gray text-base md:text-lg leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
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
        <h2 className="font-playfair text-2xl text-wf-black mb-4">{title}</h2>
      )}
      <div className="space-y-4 text-wf-gray leading-relaxed text-[15px]">
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
    <div className="mt-12 pt-10 border-t border-wf-border">
      <Link href={href} className="btn-gold inline-block">
        {label}
      </Link>
    </div>
  );
}
