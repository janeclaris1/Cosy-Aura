"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type NavigationProgressContextValue = {
  startNavigation: () => void;
};

const NavigationProgressContext = createContext<NavigationProgressContextValue>({
  startNavigation: () => {},
});

export function useNavigationProgress() {
  return useContext(NavigationProgressContext);
}

const FAILSAFE_MS = 15000;

function resolveInternalHref(href: string): URL | null {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return null;
  }

  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return url;
  } catch {
    return null;
  }
}

function hrefChangesRoute(href: string, pathname: string, search: string) {
  const url = resolveInternalHref(href);
  if (!url) return false;

  const current = `${pathname}${search ? `?${search}` : ""}`;
  const target = `${url.pathname}${url.search}`;
  return target !== current;
}

function NavigationProgressInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  const [active, setActive] = useState(false);
  const [completing, setCompleting] = useState(false);
  const failsafeRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (failsafeRef.current) window.clearTimeout(failsafeRef.current);
    if (completeTimerRef.current) window.clearTimeout(completeTimerRef.current);
    failsafeRef.current = null;
    completeTimerRef.current = null;
  }, []);

  const finish = useCallback(() => {
    if (!active) return;
    setCompleting(true);
    clearTimers();
    completeTimerRef.current = window.setTimeout(() => {
      setActive(false);
      setCompleting(false);
    }, 280);
  }, [active, clearTimers]);

  const startNavigation = useCallback(() => {
    clearTimers();
    setCompleting(false);
    setActive(true);
    failsafeRef.current = window.setTimeout(() => {
      setActive(false);
      setCompleting(false);
    }, FAILSAFE_MS);
  }, [clearTimers]);

  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- route settled
  }, [pathname, search]);

  useEffect(() => {
    const { pushState, replaceState } = window.history;

    window.history.pushState = function (state, unused, url) {
      if (typeof url === "string" && hrefChangesRoute(url, pathname, search)) {
        startNavigation();
      }
      return pushState.call(this, state, unused, url);
    };

    window.history.replaceState = function (state, unused, url) {
      if (typeof url === "string" && hrefChangesRoute(url, pathname, search)) {
        startNavigation();
      }
      return replaceState.call(this, state, unused, url);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      if (target?.closest("[data-no-nav]")) return;

      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (anchor) {
        if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
        const href = anchor.getAttribute("href");
        if (!href || !hrefChangesRoute(href, pathname, search)) return;
        startNavigation();
      }
    };

    const onSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.tagName !== "FORM" || form.target === "_blank") return;
      if (form.closest("[data-no-nav]")) return;

      const method = (form.getAttribute("method") || "get").toLowerCase();
      if (method !== "get") return;

      const action = form.getAttribute("action") || window.location.pathname;
      if (!hrefChangesRoute(action, pathname, search)) return;
      startNavigation();
    };

    const onPopState = () => {
      startNavigation();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
  }, [pathname, search, startNavigation, clearTimers]);

  return (
    <NavigationProgressContext.Provider value={{ startNavigation }}>
      {children}
      <div
        className={cn(
          "navigation-progress fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden pointer-events-none transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0"
        )}
        role="progressbar"
        aria-hidden={!active}
        aria-busy={active}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={active ? "Loading page" : undefined}
      >
        <div className="absolute inset-0 bg-[#03045e]/10" aria-hidden />
        <div
          className={cn(
            "navigation-progress__bar relative z-10 h-full bg-[#FFD200]",
            completing && "navigation-progress__bar--complete"
          )}
        />
      </div>
      {active ? (
        <span className="sr-only" aria-live="polite">
          Loading page
        </span>
      ) : null}
    </NavigationProgressContext.Provider>
  );
}

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner>{children}</NavigationProgressInner>
    </Suspense>
  );
}
