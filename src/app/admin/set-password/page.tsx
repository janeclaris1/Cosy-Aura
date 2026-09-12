import Link from "next/link";

export default function AdminSetPasswordPage() {
  return (
    <div className="admin-app min-h-screen bg-[#f7f6f3] flex items-center justify-center px-4">
      <div className="bg-white shadow-sm ring-1 ring-black/[0.04] rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="font-playfair text-2xl text-[#03045e] mb-2">Password setup</h1>
        <p className="text-sm text-mocha leading-relaxed mb-6">
          Admin passwords are set by a Super Admin. If you need access, ask your
          administrator to create or reset your login credentials.
        </p>
        <Link
          href="/admin/login"
          className="inline-flex items-center justify-center rounded-2xl bg-[#03045e] px-5 py-2.5 text-sm font-medium text-white"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
