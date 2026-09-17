import { cn } from "@/lib/utils";

/** Shared checkout form tokens (Paystack, Flutterwave, Aramex, WhatsApp). */
export const checkoutFormClass = "space-y-4";

export const checkoutLabelClass = "block text-sm font-medium text-espresso";

export const checkoutInputClass =
  "mt-1.5 w-full rounded-lg border border-[#c4c8d4] bg-white px-3.5 py-2.5 text-sm leading-normal text-espresso placeholder:text-wf-gray/70 transition-[border-color,box-shadow] focus:border-espresso focus:outline-none focus:ring-2 focus:ring-espresso/10";

export const checkoutSelectClass = cn(
  checkoutInputClass,
  "appearance-none pr-10 bg-no-repeat bg-[length:1rem_1rem] bg-[position:right_0.875rem_center]",
  "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2303045e%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]"
);

/** Radio / selectable delivery & payment rows */
export const checkoutOptionClass =
  "flex items-center gap-3 rounded-lg border border-[#c4c8d4] bg-white px-3.5 py-3 text-sm cursor-pointer transition-[border-color,box-shadow] hover:border-espresso/35 has-[:checked]:border-espresso has-[:checked]:ring-2 has-[:checked]:ring-espresso/10";

/** Pre-selected summary row (e.g. pay-in-full when no choice) */
export const checkoutSelectedSummaryClass =
  "flex items-center gap-3 rounded-lg border border-espresso bg-white px-3.5 py-3 text-sm ring-2 ring-espresso/10";

export const checkoutFieldsetClass = "space-y-2";

export const checkoutLegendClass = "text-sm font-medium text-espresso mb-2";

export const checkoutIconButtonClass =
  "shrink-0 rounded-lg border border-[#c4c8d4] p-2 text-espresso transition-[border-color,box-shadow] hover:border-espresso/35 focus:border-espresso focus:outline-none focus:ring-2 focus:ring-espresso/10";

export const checkoutPopoverClass =
  "absolute right-0 z-20 mt-2 w-[280px] rounded-lg border border-[#c4c8d4] bg-white p-3 shadow-lg";

export function checkoutDayButtonClass({
  selected,
  enabled,
}: {
  selected: boolean;
  enabled: boolean;
}) {
  return cn(
    "h-8 rounded-md text-sm transition-colors",
    selected
      ? "bg-espresso text-white"
      : enabled
        ? "text-espresso hover:bg-wf-light"
        : "cursor-not-allowed text-wf-gray/40"
  );
}
