"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const MIN_INITIAL_MS = 600;
const MIN_NAV_MS = 450;
const INITIAL_FAILSAFE_MS = 3200;
const NAV_FAILSAFE_MS = 20000;
const EXIT_MS = 280;

function afterPaint(callback: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

function isSkippablePath(path: string | null | undefined) {
  return !!path?.startsWith("/admin") || !!path?.startsWith("/maintenance");
}

function internalNavHref(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }

  const target = event.target as Element | null;
  if (
    target?.closest?.(
      "button, input, textarea, select, label, [role='button'], [data-no-nav]"
    )
  ) {
    return null;
  }

  const anchor = target?.closest?.("a");
  if (!anchor) return null;

  const href = anchor.getAttribute("href");
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return null;
  }
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return null;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;
  if (isSkippablePath(url.pathname)) return null;

  const next = `${url.pathname}${url.search}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (next === current) return null;

  return next;
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

  const show = (duration: number, navigating = false) => {
    clearTimers();
    document.documentElement.classList.remove("preload-skip");
    minMs.current = duration;
    startedAt.current = Date.now();
    pathAtShow.current = window.location.pathname;
    setLeaving(false);
    setVisible(true);
    failsafeTimer.current = window.setTimeout(
      hide,
      navigating ? NAV_FAILSAFE_MS : INITIAL_FAILSAFE_MS
    );
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
    if (skipRoute) return;

    const onClick = (event: MouseEvent) => {
      if (!internalNavHref(event)) return;
      show(MIN_NAV_MS, true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
