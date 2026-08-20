import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { ensureUniqueBlogSlug } from "@/lib/blog";

export async function POST(req: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

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
    String(body.slug || "").trim() || title
  );
  const published = Boolean(body.published);

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      coverImage: body.coverImage?.trim() || null,
      authorName: String(body.authorName || "COSY AURA").trim() || "COSY AURA",
      published,
      publishedAt: published ? new Date() : null,
    },
  });

  return NextResponse.json(post);
}
