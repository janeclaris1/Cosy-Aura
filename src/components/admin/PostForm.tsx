"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  const inputClass =
    "w-full px-3 py-2 border border-wf-border rounded text-sm focus:outline-none focus:border-gold bg-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
          {error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">Title</label>
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Slug{" "}
          <span className="text-wf-gray font-normal">(optional, auto from title)</span>
        </label>
        <input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          className={inputClass}
          placeholder="how-to-choose-a-first-luxury-fragrance"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Excerpt</label>
        <textarea
          required
          rows={3}
          value={form.excerpt}
          onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          className={inputClass}
          placeholder="Short summary shown on the journal index and SEO description."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Content{" "}
          <span className="text-wf-gray font-normal">(Markdown supported)</span>
        </label>
        <textarea
          required
          rows={18}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className={`${inputClass} font-mono text-[13px] leading-relaxed`}
          placeholder={"## Heading\n\nWrite your story here..."}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Cover image URL</label>
          <input
            value={form.coverImage}
            onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
            className={inputClass}
            placeholder="/images/fragrances/..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Author</label>
          <input
            value={form.authorName}
            onChange={(e) => setForm({ ...form, authorName: e.target.value })}
            className={inputClass}
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
        <button type="submit" disabled={loading} className="btn-gold disabled:opacity-50">
          {loading ? "Saving..." : post ? "Update post" : "Create post"}
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={() => router.push("/admin/posts")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
