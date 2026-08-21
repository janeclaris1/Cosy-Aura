import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { ensureUniqueBlogSlug } from "@/lib/blog";

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("content.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  await writeAuditLog({
    actorId: ctx.userId,
    action: "content.post.create",
    entityType: "BlogPost",
    entityId: post.id,
    summary: `Created post “${post.title}”`,
    req,
  });

  return NextResponse.json(post);
}
