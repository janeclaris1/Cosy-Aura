"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { formatPrice, cn, inspiredByBrandLine } from "@/lib/utils";
import { useCartDisplayPricing } from "@/lib/use-cart-display-pricing";
import { useIsClientMounted } from "@/lib/use-is-client-mounted";
import Image from "next/image";

export function CartDrawer() {
  const mounted = useIsClientMounted();
  const { items: storedItems, isOpen, closeCart, removeItem, updateQuantity } =
    useCartStore();
  // Avoid hydration mismatch: persist may rehydrate before React hydrates.
  const items = mounted ? storedItems : [];
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const t = useT();
  const { member, subtotal, bundleActive, bundlePercent, priceFor } =
    useCartDisplayPricing(items);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeCart}
      />

      <div
        ref={drawerRef}
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-wf-border">
          <h2 className="font-playfair text-xl">{t("cart.title")}</h2>
          <button onClick={closeCart} className="p-1 hover:text-gold transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <ShoppingCart className="w-12 h-12 text-secondary mb-4" />
            <p className="text-wf-gray mb-4">{t("cart.empty")}</p>
            <button onClick={closeCart} className="btn-gold">
              {t("cart.continue")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {member.active ? (
                <p className="text-xs text-gold bg-gold/5 border border-gold/20 px-3 py-2">
                  Member {member.percent}% discount applied
                  {bundleActive
                    ? ` · Sample bundle ${bundlePercent}% off`
                    : ""}
                </p>
              ) : bundleActive ? (
                <p className="text-xs text-gold bg-gold/5 border border-gold/20 px-3 py-2">
                  Sample bundle {bundlePercent}% off (4+ samples)
                </p>
              ) : (
                <p className="text-xs text-wf-gray bg-wf-light border border-wf-border px-3 py-2">
                  <Link
                    href="/account/register"
                    className="text-gold hover:underline"
                    onClick={closeCart}
                  >
                    Create an account
                  </Link>{" "}
                  for a permanent {member.percent}% member discount.
                </p>
              )}
              {items.map((item) => (
                <div
                  key={`${item.fragranceId}-${item.bottleSize ?? "std"}`}
                  className="flex gap-4"
                >
                  <div className="relative w-20 h-20 rounded overflow-hidden shrink-0 bg-accent">
                    <Image
                      src={item.image || "/images/placeholders/fragrance.svg"}
                      alt={item.model}
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wider font-semibold">
                      {item.brand}
                    </p>
                    <p className="text-sm text-wf-gray truncate">{item.model}</p>
                    <p className="text-[11px] text-wf-black truncate">
                      {inspiredByBrandLine(item.brand, item.model)}
                    </p>
                    {item.bottleSize ? (
                      <p className="text-xs text-wf-gray">{item.bottleSize} ml</p>
                    ) : null}
                    <p className="font-playfair text-gold mt-1">
                      {formatPrice(priceFor(item), currency)}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.fragranceId,
                            item.quantity - 1,
                            item.bottleSize
                          )
                        }
                        className="w-7 h-7 border border-wf-border rounded flex items-center justify-center hover:border-gold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.fragranceId,
                            item.quantity + 1,
                            item.bottleSize
                          )
                        }
                        className="w-7 h-7 border border-wf-border rounded flex items-center justify-center hover:border-gold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() =>
                          removeItem(item.fragranceId, item.bottleSize)
                        }
                        className="text-xs text-wf-gray hover:text-red-500 ml-auto"
                      >
                        {t("cart.remove")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-wf-border p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-wf-gray">{t("cart.subtotal")}</span>
                <span className="font-playfair text-xl text-gold">
                  {formatPrice(subtotal, currency)}
                </span>
              </div>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="btn-gold w-full text-center block"
              >
                {t("cart.checkout")}
              </Link>
              <Link
                href="/cart"
                onClick={closeCart}
                className="btn-outline w-full text-center block text-sm"
              >
                {t("cart.view")}
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
