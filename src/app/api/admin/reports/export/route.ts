import { NextResponse } from "next/server";
import { requireAdminApi, orderBranchWhere, scopedBranchIds } from "@/lib/admin";
import { fetchMonthlyAbsenceReport } from "@/lib/attendance-absence-report";
import { fetchAttendanceReport } from "@/lib/attendance-report";
import { aggregateBranchReportRows } from "@/lib/branch-reports";
import { prisma } from "@/lib/prisma";

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

  // Default: branch roll-up (same logic as reports API)
  const scope = scopedBranchIds(ctx);
  const branchWhere =
    scope === "all"
      ? ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry
        ? { country: ctx.staffCountry }
        : {}
      : { id: { in: scope } };

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
