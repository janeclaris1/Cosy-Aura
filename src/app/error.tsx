"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <h1 className="font-playfair text-4xl mb-4">Something went wrong</h1>
      <p className="text-wf-gray mb-8">
        We could not load this page. Please try again.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button onClick={reset} className="btn-gold">
          Try Again
        </button>
        <Link href="/" className="btn-outline">
          Back Home
        </Link>
      </div>
    </div>
  );
}
