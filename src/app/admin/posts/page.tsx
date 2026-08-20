import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { getAllBlogPostsAdmin, formatBlogDate } from "@/lib/blog";
import { DeletePostButton } from "@/components/admin/DeletePostButton";

export default async function AdminPostsPage() {
  await requireAdminPage();
  const posts = await getAllBlogPostsAdmin();

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4">
        <h1 className="font-playfair text-3xl">Journal</h1>
        <Link href="/admin/posts/new" className="btn-gold">
          New post
        </Link>
      </div>

      <div className="border border-wf-border rounded-lg overflow-hidden bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-wf-light">
            <tr>
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Published</th>
              <th className="text-left p-3 font-medium">Updated</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-wf-gray">
                  No posts yet. Create your first journal story.
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr key={post.id} className="border-t border-wf-border">
                <td className="p-3">
                  <div className="font-medium">{post.title}</div>
                  <div className="text-wf-gray text-xs mt-0.5">/{post.slug}</div>
                </td>
                <td className="p-3">
                  {post.published ? (
                    <span className="text-green-700">Published</span>
                  ) : (
                    <span className="text-wf-gray">Draft</span>
                  )}
                </td>
                <td className="p-3 text-wf-gray">
                  {formatBlogDate(post.publishedAt) || "-"}
                </td>
                <td className="p-3 text-wf-gray">
                  {formatBlogDate(post.updatedAt) || "-"}
                </td>
                <td className="p-3 space-x-3">
                  {post.published && (
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-wf-gray hover:underline"
                      target="_blank"
                    >
                      View
                    </Link>
                  )}
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="text-gold hover:underline"
                  >
                    Edit
                  </Link>
                  <DeletePostButton id={post.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
