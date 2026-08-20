import { BrandLogo } from "@/components/layout/BrandLogo";

export const metadata = {
  title: "Under Maintenance",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-wf-black text-white flex items-center justify-center px-6 font-cantora">
      <div className="max-w-lg w-full text-center">
        <div className="flex justify-center mb-8">
          <BrandLogo variant="dark" size="lg" />
        </div>
        <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
          Temporarily unavailable
        </p>
        <h1 className="text-4xl md:text-5xl mb-4">
          We&apos;ll be right back
        </h1>
        <p className="text-white/70 leading-relaxed mb-8 text-lg">
          Cosy Aura is undergoing scheduled maintenance. Please check back
          shortly.
        </p>
        <p className="text-sm text-white/50">
          Need help?{" "}
          <a
            href="mailto:support@cosyaura.com"
            className="text-gold hover:text-gold-light underline underline-offset-2"
          >
            support@cosyaura.com
          </a>
        </p>
      </div>
    </main>
  );
}
