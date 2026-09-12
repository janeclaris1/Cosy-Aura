import { NextResponse } from "next/server";
import {
  countryScopedBranchWhere,
  requireAdminApi,
  orderBranchWhere,
  scopedBranchIds,
} from "@/lib/admin";
import { fetchMonthlyAbsenceReport } from "@/lib/attendance-absence-report";
import { fetchAttendanceReport } from "@/lib/attendance-report";
import { aggregateBranchReportRows } from "@/lib/branch-reports";
import { prisma } from "@/lib/prisma";
import {
  aggregateTaxReport,
  monthRangeForFilter,
} from "@/lib/tax-reports";

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("reports.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kind = String(searchParams.get("kind") || "branches").toLowerCase();

  if (kind === "orders") {
    const { ctx: orderCtx, error: orderErr } = await requireAdminApi("orders.read");
    if (orderErr) return orderErr;
    if (!orderCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const scope = orderBranchWhere(orderCtx);
    const channelParam = searchParams.get("channel")?.toUpperCase();
    const channelFilter =
      channelParam === "WEB" || channelParam === "POS"
        ? { channel: channelParam as "WEB" | "POS" }
        : {};

    const orders = await prisma.order.findMany({
      where: {
        ...(scope || {}),
        status: { not: "CANCELLED" },
        ...channelFilter,
      },
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: {
        fulfillmentBranch: { select: { name: true, country: true } },
        items: { select: { quantity: true } },
        posUser: { select: { email: true, name: true } },
      },
    });

    const header = [
      "order_id",
      "short_id",
      "receipt_number",
      "channel",
      "created_at",
      "status",
      "email",
      "total_ghs",
      "items",
      "country",
      "branch",
      "payment_provider",
      "pos_payment_method",
      "pos_payment_reference",
      "cashier",
      "delivery_provider",
    ];
    const lines = [header.join(",")];
    for (const o of orders) {
      lines.push(
        [
          csvEscape(o.id),
          csvEscape(o.id.slice(0, 8).toUpperCase()),
          csvEscape(o.receiptNumber || ""),
          csvEscape(o.channel),
          csvEscape(o.createdAt.toISOString()),
          csvEscape(o.status),
          csvEscape(o.email),
          csvEscape(o.total.toFixed(2)),
          csvEscape(o.items.reduce((n, i) => n + i.quantity, 0)),
          csvEscape(o.shippingCountry || ""),
          csvEscape(
            o.fulfillmentBranch
              ? `${o.fulfillmentBranch.name} (${o.fulfillmentBranch.country})`
              : ""
          ),
          csvEscape(o.paymentProvider || ""),
          csvEscape(o.posPaymentMethod || ""),
          csvEscape(o.posPaymentReference || ""),
          csvEscape(o.posUser?.name || o.posUser?.email || ""),
          csvEscape(o.deliveryProvider || ""),
        ].join(",")
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (kind === "attendance") {
    const { ctx: attendanceCtx, error: attendanceErr } =
      await requireAdminApi("attendance.read");
    if (attendanceErr) return attendanceErr;
    if (!attendanceCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const branchId = searchParams.get("branchId") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const result = await fetchAttendanceReport(attendanceCtx, {
      branchId,
      from,
      to,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const header = [
      "date",
      "time_utc",
      "staff_name",
      "staff_email",
      "branch",
      "country",
      "punch_type",
      "source",
      "device",
      "note",
      "recorded_by",
      "punch_id",
    ];
    const lines = [header.join(",")];
    for (const row of result.rows) {
      lines.push(
        [
          csvEscape(row.dayKey),
          csvEscape(row.punchedAt),
          csvEscape(row.staffName),
          csvEscape(row.staffEmail),
          csvEscape(row.branchName),
          csvEscape(row.branchCountry),
          csvEscape(row.punchType),
          csvEscape(row.source),
          csvEscape(row.deviceName || ""),
          csvEscape(row.note || ""),
          csvEscape(row.recordedBy || ""),
          csvEscape(row.id),
        ].join(",")
      );
    }

    const filename = `staff-attendance-${result.fromDay}_to_${result.toDay}.csv`;
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (kind === "attendance-absences") {
    const { ctx: attendanceCtx, error: attendanceErr } =
      await requireAdminApi("attendance.read");
    if (attendanceErr) return attendanceErr;
    if (!attendanceCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await fetchMonthlyAbsenceReport(attendanceCtx, {
      branchId: searchParams.get("branchId") || undefined,
      month: searchParams.get("month") || undefined,
      fromMonth: searchParams.get("fromMonth") || undefined,
      toMonth: searchParams.get("toMonth") || undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const header = [
      "month",
      "staff_name",
      "staff_email",
      "branches",
      "working_days",
      "present_days",
      "absent_days",
    ];
    const lines = [header.join(",")];
    for (const row of result.rows) {
      lines.push(
        [
          csvEscape(row.month),
          csvEscape(row.staffName),
          csvEscape(row.staffEmail),
          csvEscape(row.branches),
          csvEscape(row.workingDays),
          csvEscape(row.presentDays),
          csvEscape(row.absentDays),
        ].join(",")
      );
    }

    const filename = `staff-absences-${result.fromMonth}_to_${result.toMonth}.csv`;
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (kind === "taxes") {
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const range = monthRangeForFilter(month);
    if (!range) {
      return NextResponse.json({ error: "Invalid month (use YYYY-MM)" }, { status: 400 });
    }

    const scope = scopedBranchIds(ctx);
    const branchWhere =
      scope === "all" ? countryScopedBranchWhere(ctx) : { id: { in: scope } };

    const branches = await prisma.branch.findMany({
      where: { ...branchWhere, active: true },
      orderBy: [{ country: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        country: true,
        city: true,
        isDefault: true,
        createdAt: true,
      },
    });

    const orderScope = orderBranchWhere(ctx);
    const orders = await prisma.order.findMany({
      where: {
        ...(orderScope || {}),
        createdAt: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        channel: true,
        total: true,
        shippingCost: true,
        posDiscountAmount: true,
        fulfillmentBranchId: true,
        shippingCountry: true,
        items: { select: { price: true, quantity: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const { totals, byBranch, byDay } = aggregateTaxReport(orders, branches);

    const lines = [
      [
        "section",
        "date",
        "branch",
        "country",
        "orders",
        "gross_sales_ghs",
        "taxable_ghs",
        "nhil_ghs",
        "getfund_ghs",
        "vat_ghs",
        "total_tax_ghs",
      ].join(","),
      [
        csvEscape("summary"),
        csvEscape(month),
        csvEscape(""),
        csvEscape(""),
        csvEscape(totals.orders),
        csvEscape(totals.grossSales.toFixed(2)),
        csvEscape(totals.taxable.toFixed(2)),
        csvEscape(totals.nhil.toFixed(2)),
        csvEscape(totals.getfund.toFixed(2)),
        csvEscape(totals.vat.toFixed(2)),
        csvEscape(totals.total.toFixed(2)),
      ].join(","),
    ];

    for (const row of byDay) {
      lines.push(
        [
          csvEscape("daily"),
          csvEscape(row.date),
          csvEscape(""),
          csvEscape(""),
          csvEscape(row.orders),
          csvEscape(row.grossSales.toFixed(2)),
          csvEscape(row.taxable.toFixed(2)),
          csvEscape(row.nhil.toFixed(2)),
          csvEscape(row.getfund.toFixed(2)),
          csvEscape(row.vat.toFixed(2)),
          csvEscape(row.total.toFixed(2)),
        ].join(",")
      );
    }

    for (const row of byBranch) {
      lines.push(
        [
          csvEscape("branch"),
          csvEscape(""),
          csvEscape(row.name),
          csvEscape(row.country),
          csvEscape(row.orders),
          csvEscape(row.grossSales.toFixed(2)),
          csvEscape(row.taxable.toFixed(2)),
          csvEscape(row.nhil.toFixed(2)),
          csvEscape(row.getfund.toFixed(2)),
          csvEscape(row.vat.toFixed(2)),
          csvEscape(row.total.toFixed(2)),
        ].join(",")
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tax-report-${month}.csv"`,
      },
    });
  }

  if (kind === "payroll") {
    const { ctx: payrollCtx, error: payrollErr } = await requireAdminApi("payroll.read");
    if (payrollErr) return payrollErr;
    if (!payrollCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payRunId = String(searchParams.get("payRunId") || "").trim();
    if (!payRunId) {
      return NextResponse.json({ error: "payRunId required" }, { status: 400 });
    }

    const payRun = await prisma.payRun.findUnique({
      where: { id: payRunId },
      include: {
        branch: { select: { name: true } },
        lines: { orderBy: { grossPay: "desc" } },
      },
    });
    if (!payRun) {
      return NextResponse.json({ error: "Pay run not found" }, { status: 404 });
    }

    const userIds = [...new Set(payRun.lines.map((l) => l.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        employeeProfile: {
          select: {
            employeeNumber: true,
            bankName: true,
            bankAccountNo: true,
            momoProvider: true,
            momoNumber: true,
            paymentMethod: true,
          },
        },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const header = [
      "period",
      "country",
      "branch",
      "employee_name",
      "employee_email",
      "employee_number",
      "basic_ghs",
      "allowances_ghs",
      "gross_ghs",
      "paye_ghs",
      "ssnit_employee_ghs",
      "ssnit_employer_ghs",
      "other_deductions_ghs",
      "total_deductions_ghs",
      "net_pay_ghs",
      "working_days",
      "present_days",
      "leave_days",
      "pro_rate_pct",
      "payment_method",
      "bank_or_momo",
    ];
    const csvLines = [header.join(",")];
    for (const line of payRun.lines) {
      const user = userMap.get(line.userId);
      const profile = user?.employeeProfile;
      const payout =
        profile?.paymentMethod === "MOMO"
          ? `${profile.momoProvider || ""} ${profile.momoNumber || ""}`.trim()
          : profile?.paymentMethod === "BANK"
            ? `${profile.bankName || ""} ${profile.bankAccountNo || ""}`.trim()
            : "cash";
      csvLines.push(
        [
          csvEscape(payRun.periodLabel),
          csvEscape(payRun.country),
          csvEscape(payRun.branch?.name || "All"),
          csvEscape(user?.name || ""),
          csvEscape(user?.email || ""),
          csvEscape(profile?.employeeNumber || ""),
          csvEscape(line.basicSalary.toFixed(2)),
          csvEscape(line.allowances.toFixed(2)),
          csvEscape(line.grossPay.toFixed(2)),
          csvEscape(line.paye.toFixed(2)),
          csvEscape(line.ssnitEmployee.toFixed(2)),
          csvEscape(line.ssnitEmployer.toFixed(2)),
          csvEscape(line.otherDeductions.toFixed(2)),
          csvEscape(line.totalDeductions.toFixed(2)),
          csvEscape(line.netPay.toFixed(2)),
          csvEscape(line.workingDays),
          csvEscape(line.presentDays),
          csvEscape(line.leaveDays),
          csvEscape(Math.round(line.proRateFactor * 100)),
          csvEscape(profile?.paymentMethod || ""),
          csvEscape(payout),
        ].join(",")
      );
    }

    return new NextResponse(csvLines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payroll-${payRun.periodLabel}.csv"`,
      },
    });
  }

  // Default: branch roll-up (same logic as reports API)
  const scope = scopedBranchIds(ctx);
  const branchWhere =
    scope === "all" ? countryScopedBranchWhere(ctx) : { id: { in: scope } };

  const branches = await prisma.branch.findMany({
    where: { ...branchWhere, active: true },
    orderBy: [{ country: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      country: true,
      city: true,
      isDefault: true,
      createdAt: true,
    },
  });
  const branchIds = branches.map((b) => b.id);

  const [orders, stockAggs] = await Promise.all([
    branchIds.length
      ? prisma.order.findMany({
          where: {
            OR: [
              { fulfillmentBranchId: { in: branchIds } },
              { fulfillmentBranchId: null, shippingCountry: { not: null } },
            ],
          },
          select: {
            fulfillmentBranchId: true,
            shippingCountry: true,
            status: true,
            total: true,
            channel: true,
          },
        })
      : Promise.resolve([]),
    branchIds.length
      ? prisma.branchStock.groupBy({
          by: ["branchId"],
          where: { branchId: { in: branchIds } },
          _sum: { quantity: true },
        })
      : Promise.resolve([]),
  ]);

  const stockByBranch = new Map(
    stockAggs.map((r) => [r.branchId, Number(r._sum.quantity || 0)])
  );

  const { rows } = aggregateBranchReportRows(
    branches,
    orders,
    stockByBranch,
    new Map(),
    new Map()
  );

  const header = [
    "branch",
    "country",
    "city",
    "transactions",
    "revenue_ghs",
    "pos_transactions",
    "pos_revenue_ghs",
    "web_transactions",
    "web_revenue_ghs",
    "to_fulfil",
    "delivered",
    "stock_units",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.name),
        csvEscape(row.country),
        csvEscape(row.city || ""),
        csvEscape(row.transactions),
        csvEscape(row.revenue.toFixed(2)),
        csvEscape(row.posTransactions),
        csvEscape(row.posRevenue.toFixed(2)),
        csvEscape(row.webTransactions),
        csvEscape(row.webRevenue.toFixed(2)),
        csvEscape(row.toFulfil),
        csvEscape(row.delivered),
        csvEscape(row.stockUnits),
      ].join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="branch-reports-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
