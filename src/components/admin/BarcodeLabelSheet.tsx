"use client";

import { useCallback, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Barcode,
  LayoutGrid,
  Printer,
  ScanLine,
  Tag,
} from "lucide-react";
import { BarcodeSvg } from "@/components/admin/BarcodeSvg";
import { BarcodeLabelsToolbar } from "@/components/admin/BarcodeLabelsToolbar";
import {
  AdminButton,
  AdminCard,
  adminInputClass,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";
import "./barcode-label-print.css";

export type LabelRow = {
  fragranceId: string;
  brand: string;
  model: string;
  reference: string;
  bottleSize: number;
  barcode: string;
  priceGhs: number;
};

function formatLabelPrice(amount: number): string {
  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return `GH₵${amount.toFixed(2)}`;
  }
}

type SearchConfig = {
  action: string;
  defaultValue?: string;
  clearHref?: string;
};

export function BarcodeLabelSheet({
  title,
  subtitle,
  labels,
  backHref,
  backLabel = "Fragrances",
  showGenerate,
  search,
}: {
  title: string;
  subtitle?: string;
  labels: LabelRow[];
  backHref: string;
  backLabel?: string;
  showGenerate?: boolean;
  search?: SearchConfig;
}) {
  const [barcodeOnly, setBarcodeOnly] = useState(false);

  const print = useCallback((onlyBarcode: boolean) => {
    setBarcodeOnly(onlyBarcode);
    document.body.classList.toggle("print-barcode-only", onlyBarcode);
    const cleanup = () => {
      document.body.classList.remove("print-barcode-only");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    // Allow React to re-render the grid before opening the print dialog.
    window.setTimeout(() => window.print(), 100);
  }, []);

  const sizeCounts = labels.reduce(
    (acc, l) => {
      acc[l.bottleSize] = (acc[l.bottleSize] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  return (
    <div className="print:p-0">
      <div className="print:hidden max-w-6xl mx-auto space-y-5 px-4 sm:px-0 pb-8 max-lg:pt-2">
        {/* Header */}
        <header>
          <div className="mb-6">
            <AdminButton href={backHref} variant="secondary" className="!px-4 !py-2">
              <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              {backLabel}
            </AdminButton>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-mocha mb-2">
                Catalogue
              </p>
              <h1 className="font-playfair text-3xl text-[#03045e]">{title}</h1>
              {subtitle ? (
                <p className="text-sm text-mocha mt-2 max-w-2xl">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-stretch gap-2.5 shrink-0">
              <AdminButton
                type="button"
                variant="secondary"
                onClick={() => print(false)}
              >
                <Printer className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                Full labels
              </AdminButton>
              <AdminButton type="button" onClick={() => print(true)}>
                <Barcode className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                Barcodes only
              </AdminButton>
            </div>
          </div>
        </header>

        {/* Search */}
        {search ? (
          <AdminCard className="!p-3">
            <form action={search.action} method="get" className="flex flex-wrap gap-2">
              <input
                name="q"
                defaultValue={search.defaultValue || ""}
                placeholder="Filter by brand, model, or reference…"
                className={cn(adminInputClass, "flex-1 min-w-[14rem]")}
              />
              <AdminButton type="submit" variant="secondary">
                Filter
              </AdminButton>
              {search.clearHref && search.defaultValue ? (
                <AdminButton href={search.clearHref} variant="ghost">
                  Clear
                </AdminButton>
              ) : null}
            </form>
          </AdminCard>
        ) : null}

        {/* Control panel */}
        <AdminCard className="!p-4 sm:!p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="grid sm:grid-cols-3 gap-3">
              <StatTile
                icon={Tag}
                label="Labels"
                value={String(labels.length)}
                hint="In this view"
              />
              <StatTile
                icon={ScanLine}
                label="Prefix codes"
                value="3 · 5 · 1"
                hint="30 ml · 50 ml · 100 ml"
              />
              <StatTile
                icon={LayoutGrid}
                label="Sizes"
                value={
                  Object.keys(sizeCounts).length
                    ? Object.entries(sizeCounts)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([size, n]) => `${size}ml ×${n}`)
                        .join(" · ")
                    : "—"
                }
                hint="Breakdown"
                compact
              />
            </div>

            <div className="space-y-4 lg:min-w-[240px]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-mocha mb-2">
                  Preview mode
                </p>
                <div className="inline-flex p-1 bg-[#fafafa] ring-1 ring-stone-200/80">
                  <PreviewToggle
                    active={!barcodeOnly}
                    onClick={() => setBarcodeOnly(false)}
                    label="Full label"
                  />
                  <PreviewToggle
                    active={barcodeOnly}
                    onClick={() => setBarcodeOnly(true)}
                    label="Barcode only"
                  />
                </div>
              </div>
              {(showGenerate || labels.length === 0) && (
                <BarcodeLabelsToolbar
                  labelCount={labels.length}
                  showGenerate={showGenerate}
                />
              )}
            </div>
          </div>

          {barcodeOnly ? (
            <p className="text-xs text-mocha mt-4 pt-4 border-t border-stone-100 leading-relaxed max-w-3xl">
              Barcode strips for bottle stickers — cut each row and apply to the matching size.
              Codes start with <strong className="text-[#03045e]">3</strong> (30 ml),{" "}
              <strong className="text-[#03045e]">5</strong> (50 ml), or{" "}
              <strong className="text-[#03045e]">1</strong> (100 ml).
            </p>
          ) : (
            <p className="text-xs text-mocha mt-4 pt-4 border-t border-stone-100">
              Full labels include brand, model, size, website price, and scannable barcode. Works
              with Avery 5160 or 50×25 mm thermal sheets.
            </p>
          )}
        </AdminCard>

        {labels.length === 0 ? (
          <AdminCard className="text-center py-16">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#03045e]/5 flex items-center justify-center mb-4">
              <Barcode className="w-6 h-6 text-[#03045e]" strokeWidth={1.5} />
            </div>
            <p className="font-medium text-espresso">No barcodes to print</p>
            <p className="text-sm text-mocha mt-2 max-w-md mx-auto">
              Barcodes are created when you save a fragrance. Use Generate missing to backfill all
              products at once.
            </p>
          </AdminCard>
        ) : null}
      </div>

      {labels.length > 0 ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-0 pb-8 print:p-0 print:max-w-none print:mx-0">
          <LabelGrid labels={labels} barcodeOnly={barcodeOnly} />
        </div>
      ) : null}
    </div>
  );
}

function LabelGrid({
  labels,
  barcodeOnly,
}: {
  labels: LabelRow[];
  barcodeOnly: boolean;
}) {
  return (
    <div
      className={cn(
        "label-sheet-grid grid gap-3 print:gap-2",
        barcodeOnly
          ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 print:grid-cols-6"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4"
      )}
    >
      {labels.map((label) => (
        <article
          key={`${label.fragranceId}-${label.bottleSize}`}
          className={cn(
            "label-sheet-cell bg-white shadow-sm ring-1 ring-black/[0.04] print:ring-0 print:shadow-none print:break-inside-avoid flex flex-col items-center text-center transition-shadow hover:ring-[#03045e]/15",
            barcodeOnly
              ? "p-3 min-h-0 print:p-2"
              : "p-4 min-h-[148px] print:min-h-[120px] print:p-2"
          )}
        >
          <div className={cn("label-sheet-meta w-full", barcodeOnly && "hidden")}>
            <p className="text-[9px] uppercase tracking-[0.18em] text-mocha/80">Cosy Aura</p>
            <p className="text-xs font-semibold text-espresso leading-snug mt-1.5 line-clamp-2">
              {label.brand}
            </p>
            <p className="text-[11px] text-mocha leading-tight mt-0.5 line-clamp-1">
              {label.model}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="text-[10px] font-medium bg-[#fafafa] ring-1 ring-stone-200/80 px-1.5 py-0.5 text-[#03045e]">
                {label.bottleSize} ml
              </span>
              <span className="text-[10px] text-mocha truncate max-w-[5rem]">
                {label.reference}
              </span>
            </div>
            <p className="text-sm font-semibold text-[#03045e] mt-2 tabular-nums">
              {formatLabelPrice(label.priceGhs)}
            </p>
          </div>
          <div
            className={cn(
              "label-sheet-barcode w-full flex flex-col items-center",
              barcodeOnly ? "mt-0" : "mt-3 pt-3 border-t border-stone-100 w-full"
            )}
          >
            {barcodeOnly ? (
              <p className="label-sheet-size text-sm font-bold text-[#03045e] leading-none mb-1.5 tabular-nums">
                {label.bottleSize} ml
              </p>
            ) : null}
            <div className="w-full flex justify-center overflow-hidden">
              <BarcodeSvg value={label.barcode} className="max-w-full h-auto" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  compact?: boolean;
}) {
  return (
    <div className="bg-[#fafafa] ring-1 ring-stone-200/60 px-3.5 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-[#03045e]" strokeWidth={1.75} />
        <span className="text-[10px] uppercase tracking-[0.14em] text-mocha">{label}</span>
      </div>
      <p
        className={cn(
          "font-medium text-[#03045e] tabular-nums",
          compact ? "text-xs leading-snug" : "font-playfair text-xl"
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-mocha mt-0.5">{hint}</p>
    </div>
  );
}

function PreviewToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-white text-[#03045e] shadow-sm ring-1 ring-stone-200/80"
          : "text-mocha hover:text-[#03045e]"
      )}
    >
      {label}
    </button>
  );
}
