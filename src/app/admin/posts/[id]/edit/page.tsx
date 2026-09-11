import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { getBlogPostById } from "@/lib/blog";
import { PostForm } from "@/components/admin/PostForm";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

interface PageProps {
  params: { id: string };
}

export default async function EditPostPage({ params }: PageProps) {
  await requireAdminPage();
  const post = await getBlogPostById(params.id);
  if (!post) notFound();

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Content"
        title="Edit post"
        description={post.title}
      />
      <PostForm post={post} />
    </div>
  );
}
