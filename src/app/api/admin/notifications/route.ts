import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const [unread, notifications] = await Promise.all([
    prisma.adminNotification.count({ where: { read: false } }),
    prisma.adminNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({ unread, notifications });
}

export async function PATCH(req: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await req.json();

  if (body.markAllRead) {
    await prisma.adminNotification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    await prisma.adminNotification.update({
      where: { id: body.id },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
