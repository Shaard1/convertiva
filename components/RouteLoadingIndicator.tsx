"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const MIN_VISIBLE_MS = 220;

function isInternalNavigationLink(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  if (!href || href.startsWith("#")) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  const url = new URL(anchor.href, window.location.href);

  if (url.origin !== window.location.origin) {
    return false;
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const nextPath = `${url.pathname}${url.search}`;

  return currentPath !== nextPath;
}

export function RouteLoadingIndicator() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (!isInternalNavigationLink(anchor)) {
        return;
      }

      startTimeRef.current = Date.now();
      setIsLoading(true);
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  useEffect(() => {
    if (!isLoading || startTimeRef.current === null) {
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const delay = Math.max(MIN_VISIBLE_MS - elapsed, 0);

    const timeoutId = window.setTimeout(() => {
      setIsLoading(false);
      startTimeRef.current = null;
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading, pathname]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[70] transition-opacity duration-200 ${
        isLoading ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="h-1 w-full overflow-hidden bg-[var(--background-secondary)]/55">
        <div className="route-loading-bar h-full w-[38%] rounded-r-full bg-[var(--primary)]" />
      </div>
    </div>
  );
}
