"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/locale-store";
import {
  canOfferPwaInstall,
  isIosDevice,
  requestPwaInstall,
  sharePageForInstall,
} from "@/components/pwa/PwaProvider";

export function InstallAppLink({ className }: { className?: string }) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(canOfferPwaInstall());
    sync();
    window.addEventListener("beforeinstallprompt", sync);
    const id = window.setInterval(sync, 2000);
    return () => {
      window.removeEventListener("beforeinstallprompt", sync);
      window.clearInterval(id);
    };
  }, []);

  if (!visible) return null;

  async function onInstallTap() {
    // iOS: must call share from this tap (user gesture) — CustomEvent would lose it
    if (isIosDevice() && typeof navigator.share === "function") {
      setBusy(true);
      await sharePageForInstall();
      setBusy(false);
      return;
    }
    requestPwaInstall();
  }

  return (
    <button
      type="button"
      onClick={() => void onInstallTap()}
      disabled={busy}
      className={className}
    >
      {busy ? t("pwa.sharing") : t("pwa.footerInstall")}
    </button>
  );
}
