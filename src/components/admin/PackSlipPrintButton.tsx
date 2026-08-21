"use client";

export function PackSlipPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-gold text-sm"
    >
      Print pack slip
    </button>
  );
}
