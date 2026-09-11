"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const MIN_INITIAL_MS = 600;
const INITIAL_FAILSAFE_MS = 3200;
const EXIT_MS = 280;

function afterPaint(callback: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

function isSkippablePath(path: string | null | undefined) {
  return !!path?.startsWith("/admin") || !!path?.startsWith("/maintenance");
}

function LogoSpinner({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/brand/preloader-atomizer.png"
      alt=""
      width={size}
      height={size}
      className="preloader__mark"
      aria-hidden="true"
    />
  );
}

export function Preloader() {
  const pathname = usePathname();
  const skipRoute = isSkippablePath(pathname);

  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const startedAt = useRef(0);
  const minMs = useRef(MIN_INITIAL_MS);
  const hideTimer = useRef<number | null>(null);
  const failsafeTimer = useRef<number | null>(null);
  const pathAtShow = useRef(pathname);

  const clearTimers = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (failsafeTimer.current) window.clearTimeout(failsafeTimer.current);
    hideTimer.current = null;
    failsafeTimer.current = null;
  };

  const hide = () => {
    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, minMs.current - elapsed);

    hideTimer.current = window.setTimeout(() => {
      setLeaving(true);
      hideTimer.current = window.setTimeout(() => {
        setVisible(false);
        setLeaving(false);
      }, EXIT_MS);
    }, wait);
  };

  const show = (duration: number) => {
    clearTimers();
    document.documentElement.classList.remove("preload-skip");
    minMs.current = duration;
    startedAt.current = Date.now();
    pathAtShow.current = window.location.pathname;
    setLeaving(false);
    setVisible(true);
    failsafeTimer.current = window.setTimeout(hide, INITIAL_FAILSAFE_MS);
  };

  useEffect(() => {
    if (skipRoute) return;

    show(MIN_INITIAL_MS);

    const onLoad = () => hide();
    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", onLoad);
    }

    return () => {
      window.removeEventListener("load", onLoad);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial mount only
  }, [skipRoute]);

  useEffect(() => {
    if (skipRoute || !visible || leaving) return;
    if (pathname === pathAtShow.current) return;

    afterPaint(() => {
      hide();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, skipRoute, visible, leaving]);

  if (skipRoute || !visible) return null;

  return (
    <div
      className={`preloader ${leaving ? "preloader--leave" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="preloader__spinner" aria-hidden="true">
        <LogoSpinner />
      </div>
    </div>
  );
}
