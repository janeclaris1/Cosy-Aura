/** Ghana POS tax rates (GRA standard VAT invoice). */

export const GHANA_NHIL_RATE = 0.025;
export const GHANA_GETFUND_RATE = 0.025;
export const GHANA_VAT_RATE = 0.15;

/** Multiplier when NHIL + GETFund apply to base and VAT applies to base + levies. */
export const GHANA_INCLUSIVE_TAX_MULTIPLIER =
  1 +
  GHANA_NHIL_RATE +
  GHANA_GETFUND_RATE +
  GHANA_VAT_RATE * (1 + GHANA_NHIL_RATE + GHANA_GETFUND_RATE);

export type GhanaPosTaxBreakdown = {
  /** Value of supply excluding levies and VAT. */
  taxable: number;
  nhil: number;
  getfund: number;
  vat: number;
  /** Tax-inclusive amount (same as input when extracting). */
  total: number;
};

export type ReceiptTaxPresentation = {
  /** When false, receipt omits NHIL / GETFund / VAT lines (non-Ghana customers). */
  showGhanaLevies: boolean;
  breakdown: GhanaPosTaxBreakdown;
};

function roundGhs(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Ghana-only: NHIL, GETFund and VAT apply to customers in Ghana. */
export function isGhanaTaxCustomer(country: string | null | undefined): boolean {
  return country?.trim().toUpperCase() === "GH";
}

/**
 * Extract NHIL, GETFund and VAT from a tax-inclusive POS total.
 * Prices are VAT-inclusive — customer pays `inclusiveTotal` with no tax added on top.
 */
export function extractGhanaPosTaxBreakdown(
  inclusiveTotal: number
): GhanaPosTaxBreakdown {
  if (!Number.isFinite(inclusiveTotal) || inclusiveTotal <= 0) {
    return { taxable: 0, nhil: 0, getfund: 0, vat: 0, total: 0 };
  }

  const total = roundGhs(inclusiveTotal);
  const taxable = roundGhs(total / GHANA_INCLUSIVE_TAX_MULTIPLIER);
  const nhil = roundGhs(taxable * GHANA_NHIL_RATE);
  const getfund = roundGhs(taxable * GHANA_GETFUND_RATE);
  let vat = roundGhs((taxable + nhil + getfund) * GHANA_VAT_RATE);

  const roundingDiff = roundGhs(total - (taxable + nhil + getfund + vat));
  if (roundingDiff !== 0) {
    vat = roundGhs(vat + roundingDiff);
  }

  return { taxable, nhil, getfund, vat, total };
}

/**
 * Receipt / POS display: show GRA levy breakdown only for Ghana customers.
 * Non-Ghana customers still pay the listed total; levies are not itemised.
 */
export function buildReceiptTaxBreakdown(
  inclusiveTotal: number,
  customerCountry: string | null | undefined
): ReceiptTaxPresentation {
  const total = roundGhs(Math.max(0, inclusiveTotal));
  if (!isGhanaTaxCustomer(customerCountry)) {
    return {
      showGhanaLevies: false,
      breakdown: { taxable: total, nhil: 0, getfund: 0, vat: 0, total },
    };
  }
  return {
    showGhanaLevies: true,
    breakdown: extractGhanaPosTaxBreakdown(inclusiveTotal),
  };
}

/** @deprecated Use extractGhanaPosTaxBreakdown — prices are tax-inclusive. */
export function computeGhanaPosTaxes(inclusiveTotal: number): GhanaPosTaxBreakdown {
  return extractGhanaPosTaxBreakdown(inclusiveTotal);
}
