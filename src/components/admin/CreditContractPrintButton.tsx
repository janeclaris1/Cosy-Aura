"use client";

export function CreditContractPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-sm bg-[#03045e] text-white px-4 py-2 rounded-xl hover:bg-[#02033f]"
    >
      Print contract
    </button>
  );
}
