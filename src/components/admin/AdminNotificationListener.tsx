"use client";

import { useEffect, useRef } from "react";
import {
  playAdminOrderAlert,
  unlockAdminNotificationAudio,
} from "@/lib/admin-notification-sound";

type AdminNotification = {
  id: string;
  type: string;
};

const POLL_MS = 15000;

export function AdminNotificationListener() {
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    const unlock = () => unlockAdminNotificationAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/admin/notifications", { cache: "no-store" });
        if (!res.ok || cancelled) return;

        const data = (await res.json()) as {
          notifications?: AdminNotification[];
        };
        const notifications = data.notifications || [];

        if (!initialized.current) {
          for (const notification of notifications) {
            seenIds.current.add(notification.id);
          }
          initialized.current = true;
          return;
        }

        const newOrderAlerts = notifications.filter(
          (notification) =>
            notification.type === "ORDER_PAID" &&
            !seenIds.current.has(notification.id)
        );

        for (const notification of notifications) {
          seenIds.current.add(notification.id);
        }

        if (newOrderAlerts.length > 0) {
          playAdminOrderAlert();
        }
      } catch {
        /* ignore */
      }
    }

    void poll();
    const id = window.setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return null;
}
