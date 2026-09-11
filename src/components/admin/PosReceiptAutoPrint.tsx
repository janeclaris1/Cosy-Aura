"use client";

import { useEffect } from "react";

/** Opens the browser print dialog once when a POS receipt loads. */
export function PosReceiptAutoPrint() {
  useEffect(() => {
    const id = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
