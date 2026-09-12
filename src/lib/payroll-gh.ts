/**
 * Ghana payroll tax calculations (Act 1111 resident bands, 2024+).
 * SSNIT Tier 1 rates per current GRA/SSNIT guidance.
 */

export type PayeBand = { width: number; rate: number };

/** Monthly progressive PAYE bands — each rate applies only to its slice. */
export const GHANA_PAYE_BANDS_MONTHLY: PayeBand[] = [
  { width: 490, rate: 0 },
  { width: 110, rate: 0.05 },
  { width: 130, rate: 0.1 },
  { width: 3166.67, rate: 0.175 },
  { width: 16000, rate: 0.25 },
  { width: 30520, rate: 0.3 },
];

export const GHANA_PAYE_TOP_RATE = 0.35;

export const SSNIT_EMPLOYEE_RATE = 0.055;
export const SSNIT_EMPLOYER_RATE = 0.13;
export const SSNIT_MAX_INSURABLE_MONTHLY = 69_000;
export const SSNIT_MIN_INSURABLE_MONTHLY = 587.79;

export const DEFAULT_ANNUAL_LEAVE_DAYS = 15;

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeProgressiveTax(
  chargeableIncome: number,
  bands: PayeBand[],
  topRate: number
): number {
  if (chargeableIncome <= 0) return 0;
  let remaining = chargeableIncome;
  let tax = 0;
  for (const band of bands) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, band.width);
    tax += slice * band.rate;
    remaining -= slice;
  }
  if (remaining > 0) tax += remaining * topRate;
  return roundMoney(tax);
}

export function computePaye(chargeableIncome: number): number {
  return computeProgressiveTax(
    chargeableIncome,
    GHANA_PAYE_BANDS_MONTHLY,
    GHANA_PAYE_TOP_RATE
  );
}

export type SsnitBreakdown = {
  insurableBase: number;
  employee: number;
  employer: number;
};

export function computeSsnit(basicSalary: number): SsnitBreakdown {
  const insurableBase = roundMoney(
    Math.min(
      Math.max(basicSalary, SSNIT_MIN_INSURABLE_MONTHLY),
      SSNIT_MAX_INSURABLE_MONTHLY
    )
  );
  return {
    insurableBase,
    employee: roundMoney(insurableBase * SSNIT_EMPLOYEE_RATE),
    employer: roundMoney(insurableBase * SSNIT_EMPLOYER_RATE),
  };
}

export type PayslipInput = {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  overtime?: number;
  bonus?: number;
  otherDeductions?: number;
  proRateFactor?: number;
};

export type PayslipBreakdown = {
  basicSalary: number;
  allowances: number;
  overtime: number;
  bonus: number;
  grossPay: number;
  ssnitEmployee: number;
  ssnitEmployer: number;
  insurableBase: number;
  chargeableIncome: number;
  paye: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  proRateFactor: number;
};

export function computePayslip(input: PayslipInput): PayslipBreakdown {
  const factor = input.proRateFactor ?? 1;
  const basicSalary = roundMoney(input.basicSalary * factor);
  const allowances = roundMoney(
    (input.housingAllowance + input.transportAllowance + input.otherAllowances) *
      factor
  );
  const overtime = roundMoney(input.overtime ?? 0);
  const bonus = roundMoney(input.bonus ?? 0);
  const otherDeductions = roundMoney(input.otherDeductions ?? 0);

  const grossPay = roundMoney(basicSalary + allowances + overtime + bonus);
  const ssnit = computeSsnit(basicSalary);
  const chargeableIncome = roundMoney(Math.max(0, grossPay - ssnit.employee));
  const paye = computePaye(chargeableIncome);
  const totalDeductions = roundMoney(paye + ssnit.employee + otherDeductions);
  const netPay = roundMoney(grossPay - totalDeductions);

  return {
    basicSalary,
    allowances,
    overtime,
    bonus,
    grossPay,
    ssnitEmployee: ssnit.employee,
    ssnitEmployer: ssnit.employer,
    insurableBase: ssnit.insurableBase,
    chargeableIncome,
    paye,
    otherDeductions,
    totalDeductions,
    netPay,
    proRateFactor: factor,
  };
}

export function leaveTypeLabel(type: string): string {
  switch (type) {
    case "ANNUAL":
      return "Annual";
    case "SICK":
      return "Sick";
    case "MATERNITY":
      return "Maternity";
    case "PATERNITY":
      return "Paternity";
    case "UNPAID":
      return "Unpaid";
    case "COMPASSIONATE":
      return "Compassionate";
    default:
      return type;
  }
}

export function employmentTypeLabel(type: string): string {
  switch (type) {
    case "FULL_TIME":
      return "Full time";
    case "PART_TIME":
      return "Part time";
    case "CONTRACT":
      return "Contract";
    case "INTERN":
      return "Intern";
    default:
      return type;
  }
}

export function payRunStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "REVIEW":
      return "In review";
    case "APPROVED":
      return "Approved";
    case "PAID":
      return "Paid";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}
