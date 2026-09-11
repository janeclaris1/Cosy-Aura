import type { GhanaPosTaxBreakdown } from "@/lib/pos-taxes";
import { cn } from "@/lib/utils";

type Props = {
  taxes: GhanaPosTaxBreakdown;
  formatAmount: (amount: number) => string;
  className?: string;
  /** Show ex-tax value of supply before levy lines. */
  showTaxable?: boolean;
  showTotal?: boolean;
  totalClassName?: string;
};

export function PosTaxSummary({
  taxes,
  formatAmount,
  className,
  showTaxable = false,
  showTotal = true,
  totalClassName,
}: Props) {
  if (taxes.total <= 0) return null;

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-[10px] uppercase tracking-[0.12em] text-mocha/80 pb-0.5">
        Taxes included in price
      </p>
      {showTaxable && (
        <div className="flex justify-between text-mocha">
          <span>Taxable value (excl.)</span>
          <span className="tabular-nums">{formatAmount(taxes.taxable)}</span>
        </div>
      )}
      <div className="flex justify-between text-mocha">
        <span>NHIL Levy (2.5%)</span>
        <span className="tabular-nums">{formatAmount(taxes.nhil)}</span>
      </div>
      <div className="flex justify-between text-mocha">
        <span>GETFund Levy (2.5%)</span>
        <span className="tabular-nums">{formatAmount(taxes.getfund)}</span>
      </div>
      <div className="flex justify-between text-mocha">
        <span>VAT (15%)</span>
        <span className="tabular-nums">{formatAmount(taxes.vat)}</span>
      </div>
      {showTotal && (
        <div
          className={cn(
            "flex justify-between font-semibold pt-1",
            totalClassName ?? "text-base"
          )}
        >
          <span>Total</span>
          <span className="tabular-nums">{formatAmount(taxes.total)}</span>
        </div>
      )}
    </div>
  );
}
