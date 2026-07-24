"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ITEM_PATH_RE = /^\/catalog\/([A-Za-z0-9_-]{5,64})\/?$/;
const RECENT_VIEW_MS = 5_000;

function referrerHost(): string | null {
  if (!document.referrer) return null;
  try {
    const host = new URL(document.referrer).hostname;
    return /^[A-Za-z0-9.-]{1,128}$/.test(host) ? host : null;
  } catch {
    return null;
  }
}

function sendPageView(itemId: string) {
  const body = JSON.stringify({ itemId, referrerHost: referrerHost() });
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/page-view", blob)) return;
    }
  } catch {
    // sendBeacon 失敗時は fetch にフォールバック
  }

  try {
    fetch("/api/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // 計測失敗は商品ページへ波及させない
  }
}

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (navigator.webdriver) return;

    const match = pathname.match(ITEM_PATH_RE);
    if (!match) return;

    const itemId = match[1];
    const key = `hobipedia:page-view:${itemId}`;
    const now = Date.now();
    const previous = Number(sessionStorage.getItem(key) ?? "0");
    if (Number.isFinite(previous) && now - previous < RECENT_VIEW_MS) return;

    sessionStorage.setItem(key, String(now));
    sendPageView(itemId);
  }, [pathname]);

  return null;
}
