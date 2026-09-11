import { requireAdminPage } from "@/lib/admin";
import { PostForm } from "@/components/admin/PostForm";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function NewPostPage() {
  await requireAdminPage();

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Content"
        title="New post"
        description="Write a journal story for the blog."
      />
      <PostForm />
    </div>
  );
}
