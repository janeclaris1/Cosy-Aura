import { requireAdminPage } from "@/lib/admin";
import { PostForm } from "@/components/admin/PostForm";

export default async function NewPostPage() {
  await requireAdminPage();

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-8">New post</h1>
      <PostForm />
    </div>
  );
}
