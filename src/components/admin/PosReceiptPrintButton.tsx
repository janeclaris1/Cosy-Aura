"use client";

export function PosReceiptPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-sm bg-[#03045e] text-white px-4 py-2 hover:bg-[#02033f]"
    >
      Print receipt
    </button>
  );
}
