"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/admin-ui";

interface PostFormProps {
  post?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    coverImage: string | null;
    authorName: string;
    published: boolean;
    publishedAt: Date | string | null;
  };
}

export function PostForm({ post }: PostFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: post?.title || "",
    slug: post?.slug || "",
    excerpt: post?.excerpt || "",
    content: post?.content || "",
    coverImage: post?.coverImage || "",
    authorName: post?.authorName || "COSY AURA",
    published: post?.published ?? false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = post ? `/api/admin/posts/${post.id}` : "/api/admin/posts";
    const method = post ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Save failed");
      setLoading(false);
      return;
    }

    router.push("/admin/posts");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
          {error}
        </p>
      )}

      <div>
        <label className={adminLabelClass}>Title</label>
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={adminInputClass}
        />
      </div>

      <div>
        <label className={adminLabelClass}>
          Slug{" "}
          <span className="normal-case tracking-normal text-mocha font-normal">
            (optional, auto from title)
          </span>
        </label>
        <input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          className={adminInputClass}
          placeholder="how-to-choose-a-first-luxury-fragrance"
        />
      </div>

      <div>
        <label className={adminLabelClass}>Excerpt</label>
        <textarea
          required
          rows={3}
          value={form.excerpt}
          onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          className={adminInputClass}
          placeholder="Short summary shown on the journal index and SEO description."
        />
      </div>

      <div>
        <label className={adminLabelClass}>
          Content{" "}
          <span className="normal-case tracking-normal text-mocha font-normal">
            (Markdown supported)
          </span>
        </label>
        <textarea
          required
          rows={18}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className={`${adminInputClass} font-mono text-[13px] leading-relaxed`}
          placeholder={"## Heading\n\nWrite your story here..."}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Cover image URL</label>
          <input
            value={form.coverImage}
            onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
            className={adminInputClass}
            placeholder="/images/fragrances/..."
          />
        </div>
        <div>
          <label className={adminLabelClass}>Author</label>
          <input
            value={form.authorName}
            onChange={(e) => setForm({ ...form, authorName: e.target.value })}
            className={adminInputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => setForm({ ...form, published: e.target.checked })}
        />
        Published
      </label>

      <div className="flex gap-3 pt-2">
        <AdminButton type="submit" disabled={loading}>
          {loading ? "Saving..." : post ? "Update post" : "Create post"}
        </AdminButton>
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => router.push("/admin/posts")}
        >
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}
