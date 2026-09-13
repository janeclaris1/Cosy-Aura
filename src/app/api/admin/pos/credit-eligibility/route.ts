import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { findCustomerForCredit, isCreditSaleCountry } from "@/lib/credit-eligibility";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("pos.read", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") || "";
  const email = url.searchParams.get("email") || "";
  const phone = url.searchParams.get("phone") || "";

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required" }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { country: true },
  });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  if (!isCreditSaleCountry(branch.country)) {
    return NextResponse.json({
      eligible: false,
      ghanaOnly: true,
      message: "In-store credit is only available at Ghana branches",
    });
  }

  const customer = await findCustomerForCredit({ email, phone });

  if (!customer) {
    return NextResponse.json({
      eligible: false,
      ghanaOnly: false,
      message:
        "No matching account. Customer must register and be approved for credit in Admin → Customers.",
    });
  }

  if (!customer.creditApproved) {
    return NextResponse.json({
      eligible: false,
      ghanaOnly: false,
      customerFound: true,
      customerName: customer.name,
      message: "Customer found but not approved for credit. Enable it in Admin → Customers.",
    });
  }

  return NextResponse.json({
    eligible: true,
    customerName: customer.name,
    message: "Approved for credit",
  });
}
