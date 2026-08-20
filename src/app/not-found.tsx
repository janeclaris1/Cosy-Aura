import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <h1 className="font-playfair text-5xl mb-4">404</h1>
      <p className="text-wf-gray mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="btn-gold">Back to Home</Link>
    </div>
  );
}
