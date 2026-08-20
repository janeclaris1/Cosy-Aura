import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await req.json();
  const enquiry = await prisma.contactEnquiry.update({
    where: { id: params.id },
    data: { read: Boolean(body.read ?? true) },
  });

  return NextResponse.json(enquiry);
}
