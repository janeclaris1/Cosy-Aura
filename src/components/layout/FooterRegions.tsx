import Link from "next/link";
import { FOOTER_REGIONS } from "@/lib/footer-regions";

export function FooterRegions() {
  return (
    <div className="border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-6 text-white">
          We deliver worldwide
        </h3>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-3">
          {FOOTER_REGIONS.map((region) => (
            <li key={region.code}>
              <Link
                href="/shipping"
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <img
                  src={`https://flagcdn.com/w40/${region.code.toLowerCase()}.png`}
                  srcSet={`https://flagcdn.com/w80/${region.code.toLowerCase()}.png 2x`}
                  width={20}
                  height={15}
                  alt=""
                  className="rounded-[2px] shrink-0 object-cover w-5 h-[15px]"
                  loading="lazy"
                />
                <span className="truncate">{region.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
