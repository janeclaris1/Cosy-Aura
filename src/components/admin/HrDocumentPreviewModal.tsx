"use client";

import { X } from "lucide-react";
import { HrDocumentSheet } from "@/components/admin/HrDocumentSheet";
import type { HrDocumentSheetProps } from "@/lib/hr-document";

export function HrDocumentPreviewModal({
  sheet,
  sample,
  onClose,
}: {
  sheet: HrDocumentSheetProps;
  sample?: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hr-doc-preview-title"
    >
      <div className="hr-doc-no-print flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-wf-border bg-stone-50 shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-wf-border bg-white px-4 py-3">
          <div>
            <p id="hr-doc-preview-title" className="font-playfair text-[#03045e]">
              {sheet.title}
            </p>
            {sample ? (
              <p className="text-xs text-mocha">Sample preview — placeholders shown</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-mocha hover:bg-stone-100"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <HrDocumentSheet doc={sheet} />
        </div>
      </div>
    </div>
  );
}
