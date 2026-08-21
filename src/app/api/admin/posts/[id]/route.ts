import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { ensureUniqueBlogSlug } from "@/lib/blog";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("content.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const body = await req.json();
  const title = String(body.title || "").trim();
  const excerpt = String(body.excerpt || "").trim();
  const content = String(body.content || "").trim();

  if (!title || !excerpt || !content) {
    return NextResponse.json(
      { error: "Title, excerpt, and content are required" },
      { status: 400 }
    );
  }

  const slug = await ensureUniqueBlogSlug(
    String(body.slug || "").trim() || title,
    params.id
  );
  const published = Boolean(body.published);
  const publishedAt =
    published && !existing.publishedAt
      ? new Date()
      : published
        ? existing.publishedAt
        : null;

  const post = await prisma.blogPost.update({
    where: { id: params.id },
    data: {
      title,
      slug,
      excerpt,
      content,
      coverImage: body.coverImage?.trim() || null,
      authorName: String(body.authorName || "COSY AURA").trim() || "COSY AURA",
      published,
      publishedAt,
    },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "content.post.update",
    entityType: "BlogPost",
    entityId: post.id,
    summary: `Updated post “${post.title}”`,
    req,
  });

  return NextResponse.json(post);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("content.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.blogPost.findUnique({
    where: { id: params.id },
    select: { title: true },
  });
  await prisma.blogPost.delete({ where: { id: params.id } });
  await writeAuditLog({
    actorId: ctx.userId,
    action: "content.post.delete",
    entityType: "BlogPost",
    entityId: params.id,
    summary: `Deleted post “${existing?.title || params.id}”`,
    req,
  });
  return NextResponse.json({ ok: true });
}
