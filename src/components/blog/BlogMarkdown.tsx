import Markdown from "markdown-to-jsx";
import type { ReactNode } from "react";
import { slugify } from "@/lib/utils";

function Heading({
  level,
  children,
  className,
}: {
  level: 1 | 2 | 3;
  children?: ReactNode;
  className: string;
}) {
  const text = flattenText(children);
  const id = slugify(text);
  const Tag = (`h${level}` as "h1" | "h2" | "h3");
  return (
    <Tag id={id} className={className}>
      {children}
    </Tag>
  );
}

function flattenText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (typeof node === "object" && "props" in node) {
    return flattenText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

export function BlogMarkdown({ content }: { content: string }) {
  return (
    <Markdown
      options={{
        forceBlock: true,
        overrides: {
          h1: {
            component: Heading,
            props: {
              level: 1,
              className: "font-playfair text-3xl md:text-4xl text-wf-black mt-12 mb-4 scroll-mt-24",
            },
          },
          h2: {
            component: Heading,
            props: {
              level: 2,
              className: "font-playfair text-2xl md:text-3xl text-wf-black mt-12 mb-4 scroll-mt-24",
            },
          },
          h3: {
            component: Heading,
            props: {
              level: 3,
              className: "font-playfair text-xl text-wf-black mt-8 mb-3 scroll-mt-24",
            },
          },
          p: {
            props: {
              className: "text-wf-gray leading-relaxed text-[16px] md:text-[17px] mb-5",
            },
          },
          ul: {
            props: {
              className: "list-disc pl-5 space-y-2 text-wf-gray mb-5 text-[16px]",
            },
          },
          ol: {
            props: {
              className:
                "list-decimal pl-5 space-y-2 text-wf-gray mb-5 text-[16px]",
            },
          },
          li: { props: { className: "leading-relaxed" } },
          a: {
            props: {
              className: "text-gold hover:text-gold-light underline-offset-2",
            },
          },
          strong: { props: { className: "text-wf-black font-semibold" } },
          blockquote: {
            props: {
              className:
                "border-l-2 border-gold bg-[#faf8f4] pl-4 pr-4 py-3 italic text-wf-gray my-8 text-[15px] md:text-base",
            },
          },
          img: {
            props: {
              className:
                "rounded-sm my-10 w-full object-contain max-h-[480px] bg-[#f7f7f7] border border-black/10 p-6 md:p-10",
            },
          },
          table: {
            props: {
              className:
                "w-full text-sm md:text-[15px] border-collapse my-8 overflow-hidden",
            },
          },
          thead: {
            props: { className: "bg-wf-light text-wf-black" },
          },
          th: {
            props: {
              className:
                "text-left font-medium border border-wf-border px-3 py-2.5",
            },
          },
          td: {
            props: {
              className: "border border-wf-border px-3 py-2.5 text-wf-gray align-top",
            },
          },
          tr: { props: { className: "even:bg-[#fafafa]" } },
          hr: { props: { className: "border-wf-border my-10" } },
        },
      }}
    >
      {content}
    </Markdown>
  );
}
