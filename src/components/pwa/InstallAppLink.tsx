"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/locale-store";
import { canOfferPwaInstall, requestPwaInstall } from "@/components/pwa/PwaProvider";

export function InstallAppLink({ className }: { className?: string }) {
  const t = useT();
  const [visible, setVisible] = useState(false);

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

  return (
    <button type="button" onClick={() => requestPwaInstall()} className={className}>
      {t("pwa.footerInstall")}
    </button>
  );
}
