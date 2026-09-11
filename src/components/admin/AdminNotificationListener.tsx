"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import {
  detectOpenOrderCountIncrease,
  filterNewPaidOrderAlerts,
  markAdminNotificationsSeen,
} from "@/lib/admin-order-alert-state";
import {
  bindAdminNotificationAutoUnlock,
  initAdminOrderAlertAudio,
  playAdminOrderAlert,
} from "@/lib/admin-notification-sound";

type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
};

type OrderToast = {
  id: string;
  title: string;
  message: string;
  link: string | null;
};

const POLL_MS = 5000;
const TOAST_MS = 12000;

export function AdminNotificationListener() {
  const polling = useRef(false);
  const [toasts, setToasts] = useState<OrderToast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    initAdminOrderAlertAudio();
    return bindAdminNotificationAutoUnlock();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (polling.current || cancelled) return;
      polling.current = true;
      try {
        const [notificationsRes, countRes] = await Promise.all([
          fetch("/api/admin/notifications", { cache: "no-store" }),
          fetch("/api/admin/orders/count", { cache: "no-store" }),
        ]);
        if (cancelled) return;

        let newOrderAlerts: AdminNotification[] = [];
        if (notificationsRes.ok) {
          const data = (await notificationsRes.json()) as {
            notifications?: AdminNotification[];
          };
          const notifications = data.notifications || [];
          const newOrderIds = new Set(
            filterNewPaidOrderAlerts(notifications).map((notification) => notification.id)
          );
          newOrderAlerts = notifications.filter((notification) =>
            newOrderIds.has(notification.id)
          );
          markAdminNotificationsSeen(notifications.map((notification) => notification.id));
        }

        let orderCountIncreased = false;
        if (countRes.ok) {
          const countData = (await countRes.json()) as { total?: number };
          if (typeof countData.total === "number") {
            orderCountIncreased = detectOpenOrderCountIncrease(countData.total);
          }
        }

        const shouldAlert = newOrderAlerts.length > 0 || orderCountIncreased;

        if (shouldAlert) {
          void playAdminOrderAlert();
          window.dispatchEvent(new CustomEvent("admin:orders-changed"));

          if (newOrderAlerts.length > 0) {
            setToasts((current) => [
              ...current,
              ...newOrderAlerts.map((notification) => ({
                id: notification.id,
                title: notification.title,
                message: notification.message,
                link: notification.link,
              })),
            ]);
          } else if (orderCountIncreased) {
            setToasts((current) => [
              ...current,
              {
                id: `order-count-${Date.now()}`,
                title: "New order received",
                message: "Open the Orders page to review the latest order.",
                link: "/admin/orders",
              },
            ]);
          }
        }
      } catch {
        /* ignore */
      } finally {
        polling.current = false;
      }
    }

    void poll();
    const id = window.setInterval(poll, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), TOAST_MS)
    );
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [toasts, dismissToast]);

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex max-w-sm flex-col gap-2 print:hidden"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex gap-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/[0.06]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFD200]/25 text-[#03045e]">
            <Bell className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-espresso">{toast.title}</p>
            <p className="mt-0.5 text-xs text-mocha line-clamp-2">{toast.message}</p>
            {toast.link ? (
              <Link
                href={toast.link}
                className="mt-2 inline-block text-xs font-medium text-[#03045e] hover:underline"
                onClick={() => dismissToast(toast.id)}
              >
                View order
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded-lg p-1 text-mocha hover:bg-stone-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      ))}
    </div>
  );
}
