import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { ensureUniqueBlogSlug } from "@/lib/blog";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

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

  return NextResponse.json(post);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  await prisma.blogPost.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
