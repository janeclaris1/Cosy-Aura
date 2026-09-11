import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { getAllBlogPostsAdmin, formatBlogDate } from "@/lib/blog";
import { DeletePostButton } from "@/components/admin/DeletePostButton";
import {
  AdminButton,
  AdminEmptyState,
  AdminLink,
  AdminPageHeader,
  AdminTableWrap,
  adminPageWrap,
  adminTdClass,
  adminThClass,
  adminTheadClass,
  adminTrClass,
  adminTableClass,
} from "@/components/admin/admin-ui";

export default async function AdminPostsPage() {
  await requireAdminPage();
  const posts = await getAllBlogPostsAdmin();

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Content"
        title="Journal"
        description="Blog posts and stories published on the storefront."
        actions={<AdminButton href="/admin/posts/new">New post</AdminButton>}
      />

      <AdminTableWrap>
        <table className={`${adminTableClass} min-w-[720px]`}>
          <thead className={adminTheadClass}>
            <tr>
              <th className={adminThClass}>Title</th>
              <th className={adminThClass}>Status</th>
              <th className={adminThClass}>Published</th>
              <th className={adminThClass}>Updated</th>
              <th className={adminThClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <AdminEmptyState message="No posts yet. Create your first journal story." />
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr key={post.id} className={adminTrClass}>
                <td className={adminTdClass}>
                  <div className="font-medium text-espresso">{post.title}</div>
                  <div className="text-mocha text-xs mt-0.5">/{post.slug}</div>
                </td>
                <td className={adminTdClass}>
                  {post.published ? (
                    <span className="text-emerald-700 text-xs font-medium">Published</span>
                  ) : (
                    <span className="text-mocha text-xs">Draft</span>
                  )}
                </td>
                <td className={`${adminTdClass} text-mocha`}>
                  {formatBlogDate(post.publishedAt) || "—"}
                </td>
                <td className={`${adminTdClass} text-mocha`}>
                  {formatBlogDate(post.updatedAt) || "—"}
                </td>
                <td className={`${adminTdClass} space-x-3`}>
                  {post.published && (
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-mocha hover:underline text-sm"
                      target="_blank"
                    >
                      View
                    </Link>
                  )}
                  <AdminLink href={`/admin/posts/${post.id}/edit`}>Edit</AdminLink>
                  <DeletePostButton id={post.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableWrap>
    </div>
  );
}
