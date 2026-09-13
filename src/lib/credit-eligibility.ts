import { prisma } from "@/lib/prisma";

/** In-store credit is offered only at Ghana branches. */
export const CREDIT_SALE_COUNTRY = "GH";

export function isCreditSaleCountry(country: string | null | undefined): boolean {
  return String(country || "").trim().toUpperCase() === CREDIT_SALE_COUNTRY;
}

export async function findCustomerForCredit(input: {
  email?: string | null;
  phone?: string | null;
}) {
  const email = input.email?.trim().toLowerCase();
  if (email && !email.endsWith("@cosyaura.local")) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        creditApproved: true,
      },
    });
    if (byEmail) return byEmail;
  }

  const phone = input.phone?.trim();
  if (phone) {
    const byPhone = await prisma.user.findFirst({
      where: { phone },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        creditApproved: true,
      },
    });
    if (byPhone) return byPhone;
  }

  return null;
}

export async function assertCreditSaleAllowed(input: {
  branchCountry: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
}): Promise<
  | { ok: true; userId: string; customerName: string | null }
  | { ok: false; reason: string }
> {
  if (!isCreditSaleCountry(input.branchCountry)) {
    return {
      ok: false,
      reason: "In-store credit is only available at Ghana branches",
    };
  }

  const customer = await findCustomerForCredit({
    email: input.customerEmail,
    phone: input.customerPhone,
  });

  if (!customer) {
    return {
      ok: false,
      reason:
        "No matching customer account. The customer must register, then be approved for credit in Admin → Customers.",
    };
  }

  if (!customer.creditApproved) {
    return {
      ok: false,
      reason:
        "This customer is not approved for credit. An admin must enable credit in Admin → Customers.",
    };
  }

  return { ok: true, userId: customer.id, customerName: customer.name };
}
