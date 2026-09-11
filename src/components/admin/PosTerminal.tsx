"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Store,
  Trash2,
} from "lucide-react";
import { AdminBranchSelect } from "@/components/admin/AdminBranchSelect";
import { adminInputClass, adminLabelClass } from "@/components/admin/admin-ui";
import { PosTaxSummary } from "@/components/admin/PosTaxSummary";
import { computePosDiscountAmount } from "@/lib/pos-discount";
import { extractGhanaPosTaxBreakdown } from "@/lib/pos-taxes";
import { cn, formatPrice } from "@/lib/utils";
import { readAdminBranchCookie, writeAdminBranchCookie } from "@/lib/admin-context";
import type { PosDiscountType } from "@prisma/client";

type Branch = { id: string; name: string; country: string; isDefault?: boolean };

type PosProduct = {
  fragranceId: string;
  slug: string;
  brand: string;
  model: string;
  reference: string;
  bottleSize: number;
  barcode: string | null;
  unitPriceGhs: number;
  branchQty: number;
  imageUrl: string | null;
};

type CartLine = PosProduct & {
  quantity: number;
  lineKey: string;
};

const PAYMENTS = [
  { id: "CASH", label: "Cash" },
  { id: "MOMO", label: "Mobile money" },
  { id: "CARD", label: "Card" },
  { id: "OTHER", label: "Other" },
] as const;

const DISCOUNT_TYPES = [
  { id: "PERCENT" as const, label: "%" },
  { id: "FIXED" as const, label: "GHS" },
] as const;

const QUICK_DISCOUNTS = [5, 10, 15] as const;

function lineKey(p: Pick<PosProduct, "fragranceId" | "bottleSize">) {
  return `${p.fragranceId}:${p.bottleSize}`;
}

/** POS always prices in GHS — avoid storefront locale / FX conversion. */
function formatPosGhs(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      currencyDisplay: "narrowSymbol",
    }).format(value);
  } catch {
    return `GH₵${value.toFixed(2)}`;
  }
}

function parseGhsInput(raw: string): number {
  const cleaned = raw.trim().replace(/,/g, "");
  if (!cleaned) return 0;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function roundGhs(amount: number): number {
  return Math.round(amount * 100) / 100;
}

async function readJsonResponse<T extends Record<string, unknown>>(
  res: Response
): Promise<{ data: T | null; error: string | null }> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {
      data: null,
      error: res.ok
        ? "Unexpected server response"
        : `Sale failed (${res.status}). Try refreshing the page.`,
    };
  }
  try {
    const data = (await res.json()) as T;
    return { data, error: null };
  } catch {
    return { data: null, error: "Invalid response from server" };
  }
}

export function PosTerminal() {
  const router = useRouter();
  const scanRef = useRef<HTMLInputElement>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PosProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENTS)[number]["id"]>("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [amountTendered, setAmountTendered] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [discountType, setDiscountType] = useState<PosDiscountType>("PERCENT");
  const [discountValue, setDiscountValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBranches(attempt = 0) {
      const res = await fetch("/api/admin/context");
      if (cancelled) return;

      if (!res.ok) {
        if (attempt < 3) {
          window.setTimeout(() => void loadBranches(attempt + 1), 400 * (attempt + 1));
          return;
        }
        setBranchError("Could not load branches. Refresh the page.");
        setLoadingBranches(false);
        return;
      }

      const data = await res.json();
      const list = (data?.branches || []) as Branch[];
      if (!list.length) {
        setBranchError("No branch available for your account. Ask an admin to assign you to a branch.");
        setLoadingBranches(false);
        return;
      }

      setBranches(list);
      setBranchError(null);
      const saved = readAdminBranchCookie();
      const pick =
        (saved && list.some((b) => b.id === saved) && saved) ||
        list.find((b) => b.isDefault)?.id ||
        list[0]?.id ||
        "";
      setBranchId(pick);
      setLoadingBranches(false);
    }

    void loadBranches();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (branchId) writeAdminBranchCookie(branchId);
  }, [branchId]);

  const focusScan = useCallback(() => {
    scanRef.current?.focus();
  }, []);

  useEffect(() => {
    focusScan();
  }, [branchId, focusScan]);

  const addProduct = useCallback((product: PosProduct, qty = 1) => {
    if (product.branchQty <= 0) {
      setError("Out of stock at this branch");
      return;
    }
    setError(null);
    const key = lineKey(product);
    setCart((prev) => {
      const existing = prev.find((l) => l.lineKey === key);
      if (existing) {
        const nextQty = existing.quantity + qty;
        if (nextQty > product.branchQty) {
          setError(`Only ${product.branchQty} in stock at this branch`);
          return prev;
        }
        return prev.map((l) =>
          l.lineKey === key ? { ...l, quantity: nextQty, branchQty: product.branchQty } : l
        );
      }
      if (qty > product.branchQty) {
        setError(`Only ${product.branchQty} in stock at this branch`);
        return prev;
      }
      return [
        ...prev,
        {
          ...product,
          quantity: qty,
          lineKey: key,
        },
      ];
    });
  }, []);

  const lookupBarcode = useCallback(
    async (code: string) => {
      if (!branchId || !code.trim()) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/pos/lookup?branchId=${encodeURIComponent(branchId)}&barcode=${encodeURIComponent(code.trim())}`
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Product not found");
          return;
        }
        addProduct(data as PosProduct);
        setScanValue("");
      } finally {
        setBusy(false);
        focusScan();
      }
    },
    [addProduct, branchId, focusScan]
  );

  const runSearch = useCallback(async () => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery.trim() });
      if (branchId) params.set("branchId", branchId);
      const res = await fetch(`/api/admin/pos/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchResults([]);
        setError(data.error || "Search failed");
        return;
      }
      setSearchResults(Array.isArray(data.results) ? data.results : []);
    } finally {
      setSearching(false);
    }
  }, [branchId, searchQuery]);

  useEffect(() => {
    const id = setTimeout(() => void runSearch(), 250);
    return () => clearTimeout(id);
  }, [runSearch]);

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.lineKey !== key) return l;
          const next = l.quantity + delta;
          if (next <= 0) return null;
          if (next > l.branchQty) {
            setError(`Only ${l.branchQty} in stock`);
            return l;
          }
          return { ...l, quantity: next };
        })
        .filter(Boolean) as CartLine[]
    );
    setError(null);
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((l) => l.lineKey !== key));
  };

  const subtotal = roundGhs(
    cart.reduce((s, l) => s + (Number(l.unitPriceGhs) || 0) * l.quantity, 0)
  );
  const parsedDiscountValue = parseGhsInput(discountValue);
  const discountAmount = computePosDiscountAmount(subtotal, {
    type: discountType,
    value: parsedDiscountValue,
  });
  const total = roundGhs(Math.max(0, subtotal - discountAmount));
  const taxes = extractGhanaPosTaxBreakdown(total);
  const tendered =
    paymentMethod === "CASH" ? parseGhsInput(amountTendered) : 0;
  const cashBalance = roundGhs(tendered - total);

  const completeSale = async () => {
    if (!branchId || !cart.length) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          paymentMethod,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          customerEmail: customerEmail || undefined,
          notes: notes || undefined,
          amountTendered: paymentMethod === "CASH" ? tendered || undefined : undefined,
          paymentReference:
            paymentMethod === "MOMO" || paymentMethod === "CARD"
              ? paymentReference.trim() || undefined
              : undefined,
          items: cart.map((l) => ({
            fragranceId: l.fragranceId,
            bottleSize: l.bottleSize,
            quantity: l.quantity,
            unitPriceGhs: l.unitPriceGhs,
          })),
          discount:
            parsedDiscountValue > 0
              ? { type: discountType, value: parsedDiscountValue }
              : undefined,
        }),
      });
      const { data, error: parseError } = await readJsonResponse<{
        error?: string;
        receiptNumber?: string;
        receiptUrl?: string;
      }>(res);
      if (parseError || !data) {
        setError(parseError || "Sale failed");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Sale failed");
        return;
      }
      setMessage(`Sale complete · ${data.receiptNumber}`);
      setCart([]);
      setAmountTendered("");
      setPaymentReference("");
      setDiscountValue("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setNotes("");
      if (data.receiptUrl) router.push(data.receiptUrl);
    } finally {
      setBusy(false);
      focusScan();
    }
  };

  const branch = branches.find((b) => b.id === branchId);

  return (
    <div className="admin-app min-h-screen bg-[#f7f6f3] text-espresso flex flex-col">
      <header className="bg-white shrink-0 shadow-sm ring-1 ring-black/[0.04]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/admin"
              className="text-sm text-mocha hover:text-[#03045e] transition-colors shrink-0"
            >
              Dashboard
            </Link>
            <span className="hidden sm:block h-8 w-px bg-stone-200/90 shrink-0" aria-hidden />
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-[#03045e]/5 ring-1 ring-[#03045e]/10">
                <Store className="w-5 h-5 text-[#03045e]" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-mocha">
                  Point of sale
                </p>
                <h1 className="font-playfair text-xl sm:text-2xl text-[#03045e] leading-tight truncate">
                  Cosy Aura POS
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {branch && !branchError && !loadingBranches && (
              <p className="text-xs text-mocha hidden lg:block">
                Stock deducts from{" "}
                <span className="font-medium text-[#03045e]">{branch.name}</span>
                <span className="text-mocha/70"> · {branch.country}</span>
              </p>
            )}
            <AdminBranchSelect
              branches={branches}
              value={branchId}
              onChange={(next) => {
                setBranchId(next);
                setCart([]);
                setDiscountValue("");
              }}
              disabled={loadingBranches}
              className="flex-1 sm:flex-none"
            />
          </div>
        </div>

        {loadingBranches && (
          <p className="text-center text-xs text-mocha py-2 bg-[#fafafa] border-t border-stone-100">
            Loading branch…
          </p>
        )}
        {branchError && (
          <p className="text-center text-xs text-red-700 py-2 bg-red-50 border-t border-red-100">
            {branchError}
          </p>
        )}
        {branch && !branchError && !loadingBranches && (
          <p className="text-center text-xs text-mocha py-2 bg-[#fafafa] border-t border-stone-100 sm:hidden">
            Stock deducts from <strong className="text-[#03045e]">{branch.name}</strong>
          </p>
        )}
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_22rem] gap-0 min-h-0">
        <section className="p-4 space-y-4 overflow-y-auto">
          <div className="bg-white shadow-sm ring-1 ring-black/[0.04] p-4 sm:p-5 space-y-3">
            <label className={adminLabelClass}>Scan barcode</label>
            <input
              ref={scanRef}
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void lookupBarcode(scanValue);
                }
              }}
              placeholder="Scan or type barcode, then Enter"
              className={cn(adminInputClass, "text-lg font-mono py-3.5")}
              autoComplete="off"
              disabled={!branchId || busy}
            />
            {busy && (
              <p className="text-sm text-mocha inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Looking up…
              </p>
            )}
          </div>

          <div className="bg-white shadow-sm ring-1 ring-black/[0.04] p-4 sm:p-5 space-y-3">
            <label className={adminLabelClass}>Search product</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mocha" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, reference, brand…"
                className={cn(adminInputClass, "pl-10")}
              />
            </div>
            {searching && (
              <p className="text-xs text-mocha">Searching…</p>
            )}
            {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <p className="text-xs text-mocha">No products found</p>
            )}
            {searchResults.length > 0 && (
              <ul className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
                {searchResults.map((p) => (
                  <li key={lineKey(p)}>
                    <button
                      type="button"
                      onClick={() => addProduct(p)}
                      disabled={p.branchQty <= 0}
                      className="w-full text-left py-2.5 px-1 hover:bg-[#fafafa] disabled:opacity-40"
                    >
                      <p className="text-sm font-medium">
                        {p.brand} · {p.model} · {p.bottleSize}ml
                      </p>
                      <p className="text-xs text-mocha">
                        {formatPrice(p.unitPriceGhs, "GHS")} · {p.branchQty} in branch
                        {p.barcode ? ` · ${p.barcode}` : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-stone-100 flex items-center gap-2 bg-[#fafafa]">
              <ShoppingCart className="w-4 h-4 text-[#03045e]" strokeWidth={1.75} />
              <h2 className="font-medium text-[#03045e]">Cart</h2>
              <span className="text-xs text-mocha ml-auto tabular-nums">
                {cart.length} line{cart.length === 1 ? "" : "s"}
              </span>
            </div>
            {cart.length === 0 ? (
              <p className="p-6 text-sm text-mocha text-center">Scan or search to add items</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {cart.map((line) => (
                  <li key={line.lineKey} className="px-4 py-3 flex gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {line.brand} · {line.model}
                      </p>
                      <p className="text-xs text-mocha">
                        {line.bottleSize}ml · {formatPrice(line.unitPriceGhs, "GHS")} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(line.lineKey, -1)}
                        className="p-1.5 border border-stone-200/80 hover:bg-[#fafafa]"
                        aria-label="Decrease"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(line.lineKey, 1)}
                        className="p-1.5 border border-stone-200/80 hover:bg-[#fafafa]"
                        aria-label="Increase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(line.lineKey)}
                        className="p-1.5 text-red-700 hover:bg-red-50 ml-1"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-medium w-20 text-right shrink-0">
                      {formatPrice(line.unitPriceGhs * line.quantity, "GHS")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="bg-white shadow-sm ring-1 ring-black/[0.04] lg:ring-0 lg:shadow-none lg:border-l lg:border-stone-200/80 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="space-y-3 border-b border-stone-100 pb-4">
            <div>
              <p className={cn(adminLabelClass, "mb-2")}>Discount</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {DISCOUNT_TYPES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDiscountType(d.id)}
                    className={cn(
                      "py-2 text-sm border transition-colors",
                      discountType === d.id
                        ? "border-[#03045e] bg-[#03045e] text-white"
                        : "border-stone-200/80 hover:border-[#03045e]/40"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                step={discountType === "PERCENT" ? "1" : "0.01"}
                max={discountType === "PERCENT" ? "100" : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "PERCENT" ? "e.g. 10" : "e.g. 50.00"}
                className={adminInputClass}
              />
              {discountType === "PERCENT" && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_DISCOUNTS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountValue(String(pct))}
                      className="text-xs px-2 py-1 border border-stone-200/80 hover:border-[#03045e]/40 hover:bg-[#fafafa]"
                    >
                      {pct}%
                    </button>
                  ))}
                  {discountValue && (
                    <button
                      type="button"
                      onClick={() => setDiscountValue("")}
                      className="text-xs px-2 py-1 text-mocha hover:text-red-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-mocha">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPosGhs(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <span>
                    Discount
                    {discountType === "PERCENT" && parsedDiscountValue > 0
                      ? ` (${parsedDiscountValue}%)`
                      : ""}
                  </span>
                  <span className="tabular-nums">−{formatPosGhs(discountAmount)}</span>
                </div>
              )}
              {total > 0 && (
                <PosTaxSummary
                  taxes={taxes}
                  formatAmount={formatPosGhs}
                  showTotal={false}
                  className="pt-2 border-t border-stone-100 text-xs"
                />
              )}
            </div>

            <div>
              <p className={adminLabelClass}>Total due</p>
              <p className="font-playfair text-3xl text-[#03045e] tabular-nums">
                {formatPosGhs(total)}
              </p>
            </div>
          </div>

          <div>
            <p className={cn(adminLabelClass, "mb-2")}>Payment</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaymentMethod(p.id)}
                  className={cn(
                    "py-2.5 text-sm border transition-colors",
                    paymentMethod === p.id
                      ? "border-[#03045e] bg-[#03045e] text-white"
                      : "border-stone-200/80 hover:border-[#03045e]/40"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "CASH" && (
            <div className="space-y-2">
              <label className={adminLabelClass}>Amount tendered (GHS)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                className={adminInputClass}
              />
              {tendered > 0 && total > 0 && (
                <p className="text-sm">
                  {cashBalance >= 0 ? (
                    <>
                      Change:{" "}
                      <span className="font-medium">{formatPosGhs(cashBalance)}</span>
                    </>
                  ) : (
                    <>
                      Still due:{" "}
                      <span className="font-medium text-red-700">
                        {formatPosGhs(Math.abs(cashBalance))}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {(paymentMethod === "MOMO" || paymentMethod === "CARD") && (
            <div className="space-y-2">
              <label className={adminLabelClass}>
                {paymentMethod === "MOMO" ? "MoMo transaction ID" : "Card / auth reference"}
              </label>
              <input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={paymentMethod === "MOMO" ? "e.g. MTN ref 1234567890" : "Auth code or last 4"}
                className={cn(adminInputClass, "font-mono")}
              />
            </div>
          )}

          <div className="space-y-2 border-t border-stone-100 pt-4">
            <p className={cn(adminLabelClass, "mb-2")}>Customer (optional)</p>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Name"
              className={cn(adminInputClass, "mb-2")}
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone / WhatsApp"
              className={cn(adminInputClass, "mb-2")}
            />
            <input
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className={adminInputClass}
            />
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            rows={2}
            className={cn(adminInputClass, "resize-none")}
          />

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
          )}
          {message && (
            <p className="text-sm text-green-800 bg-green-50 border border-green-200 px-3 py-2">{message}</p>
          )}

          <button
            type="button"
            onClick={() => void completeSale()}
            disabled={busy || !cart.length || !branchId}
            className="mt-auto w-full bg-[#03045e] text-white font-medium py-3.5 hover:bg-[#020338] disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Complete sale & print
          </button>
        </aside>
      </div>
    </div>
  );
}
