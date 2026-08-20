import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { getBlogPostById } from "@/lib/blog";
import { PostForm } from "@/components/admin/PostForm";

interface PageProps {
  params: { id: string };
}

export default async function EditPostPage({ params }: PageProps) {
  await requireAdminPage();
  const post = await getBlogPostById(params.id);
  if (!post) notFound();

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-8">Edit post</h1>
      <PostForm post={post} />
    </div>
  );
}
