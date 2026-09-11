"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function BarcodeSvg({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        displayValue: true,
        fontSize: 12,
        height: 44,
        margin: 6,
        width: 1.4,
      });
    } catch {
      /* invalid barcode value */
    }
  }, [value]);

  if (!value) return null;
  return <svg ref={ref} className={className} role="img" aria-label={`Barcode ${value}`} />;
}
