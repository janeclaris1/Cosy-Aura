import type { HrDocumentSheetProps } from "@/lib/hr-document";
import { hrDocumentCategoryLabel, hrDocumentDateLabel } from "@/lib/hr-document";
import { cn } from "@/lib/utils";

export function HrDocumentSheet({
  doc,
  className,
}: {
  doc: HrDocumentSheetProps;
  className?: string;
}) {
  const dateLabel = hrDocumentDateLabel(doc.generatedAt);

  return (
    <article
      className={cn(
        "hr-doc-sheet mx-auto max-w-[680px] border border-stone-300 bg-white p-8 sm:p-10 shadow-sm print:shadow-none",
        className
      )}
    >
      <header className="hr-doc-letterhead mb-6 text-center">
        <h1 className="font-playfair text-2xl font-bold uppercase text-[#03045e]">
          {doc.letterhead.name}
        </h1>
        <p className="mt-1 text-sm text-stone-600">{doc.letterhead.addressLine}</p>
        {doc.letterhead.phone ? (
          <p className="mt-1 text-sm text-stone-600">Tel: {doc.letterhead.phone}</p>
        ) : null}
        {doc.letterhead.email ? (
          <p className="mt-1 text-sm text-stone-600">{doc.letterhead.email}</p>
        ) : null}
        {doc.registrationLines.map((line) => (
          <p key={line} className="mt-1 text-sm text-stone-600">
            {line}
          </p>
        ))}
        <h2 className="mt-5 text-lg font-bold tracking-wide">
          {hrDocumentCategoryLabel(doc.category)}
        </h2>
        <p className="mt-1 text-sm text-stone-500">{doc.title}</p>
      </header>

      <section className="mb-5 text-sm">
        <p>
          <span className="font-semibold">Employee:</span> {doc.employeeName}
        </p>
        <p>
          <span className="font-semibold">Date:</span> {dateLabel}
        </p>
      </section>

      {doc.kind === "CHECKLIST" && doc.checklistItems?.length ? (
        <section className="mb-6">
          <div
            className="hr-doc-body mb-4"
            dangerouslySetInnerHTML={{ __html: doc.bodyHtml }}
          />
          <ul className="hr-doc-checklist">
            {doc.checklistItems.map((item) => {
              const done = doc.checklistProgress?.[item.id];
              return (
                <li key={item.id}>
                  <span aria-hidden>{done ? "☑" : "☐"}</span>
                  <span>
                    {item.label}
                    {item.required ? " *" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section
          className="hr-doc-body mb-6"
          dangerouslySetInnerHTML={{ __html: doc.bodyHtml }}
        />
      )}

      <footer className="hr-doc-footer">{doc.footerWording}</footer>
    </article>
  );
}
