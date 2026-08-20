"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { formatPrice, inspiredByBrandLine } from "@/lib/utils";
import { useCartDisplayPricing } from "@/lib/use-cart-display-pricing";
import Image from "next/image";

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const t = useT();
  const { member, subtotal, bundleActive, bundlePercent, priceFor } =
    useCartDisplayPricing(items);

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="font-playfair text-3xl mb-4">{t("cart.pageTitle")}</h1>
        <p className="text-wf-gray mb-8">{t("cart.emptyPage")}</p>
        <Link href="/fragrances" className="btn-gold">
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl mb-8">{t("cart.pageTitle")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          {member.active || bundleActive ? (
            <p className="text-sm text-gold bg-gold/5 border border-gold/20 px-4 py-3">
              {[
                member.active ? `Member ${member.percent}% discount applied` : null,
                bundleActive
                  ? `Sample bundle ${bundlePercent}% off (4+ samples)`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              .
            </p>
          ) : (
            <p className="text-sm text-wf-gray bg-wf-light border border-wf-border px-4 py-3">
              <Link href="/account/register" className="text-gold hover:underline">
                Create an account
              </Link>{" "}
              for a permanent {member.percent}% member discount on every order.
            </p>
          )}
          {items.map((item) => (
            <div
              key={`${item.fragranceId}-${item.bottleSize ?? "std"}`}
              className="flex gap-6 p-4 border border-wf-border rounded-lg"
            >
              <div className="relative w-24 h-24 rounded overflow-hidden shrink-0 bg-accent">
                <Image src={item.image || "/images/placeholders/fragrance.svg"} alt={item.model} fill className="object-contain" sizes="96px" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider font-semibold">{item.brand}</p>
                <Link href={`/fragrances/${item.slug}`} className="text-sm hover:text-gold">
                  {item.model}
                </Link>
                <p className="text-xs text-wf-black mt-0.5">{inspiredByBrandLine(item.brand, item.model)}</p>
                {item.bottleSize ? (
                  <p className="text-xs text-wf-gray mt-0.5">{item.bottleSize} ml</p>
                ) : null}
                <p className="font-playfair text-gold mt-1">
                  {formatPrice(priceFor(item), currency)}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() =>
                      updateQuantity(item.fragranceId, item.quantity - 1, item.bottleSize)
                    }
                    className="w-8 h-8 border border-wf-border rounded flex items-center justify-center hover:border-gold"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.fragranceId, item.quantity + 1, item.bottleSize)
                    }
                    className="w-8 h-8 border border-wf-border rounded flex items-center justify-center hover:border-gold"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => removeItem(item.fragranceId, item.bottleSize)}
                className="text-wf-gray hover:text-red-500 self-start"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="border border-wf-border rounded-lg p-6 h-fit">
          <h2 className="font-playfair text-xl mb-6">{t("cart.summary")}</h2>
          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-wf-gray">{t("cart.subtotal")}</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-wf-gray">{t("cart.shipping")}</span>
              <span className="text-wf-gray">{t("cart.shippingCalc")}</span>
            </div>
          </div>
          <div className="flex justify-between font-playfair text-xl text-gold border-t border-wf-border pt-4 mb-6">
            <span>{t("cart.total")}</span>
            <span>{formatPrice(subtotal, currency)}</span>
          </div>
          <Link href="/checkout" className="btn-gold w-full text-center block">
            {t("cart.proceed")}
          </Link>
        </div>
      </div>
    </div>
  );
}
