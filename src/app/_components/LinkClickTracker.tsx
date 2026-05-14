"use client";

import { useEffect } from "react";

const ITEM_ID_RE = /^\/catalog\/([^/?#]+)/;

function extractItemId(pathname: string): string | null {
  const m = pathname.match(ITEM_ID_RE);
  return m ? m[1] : null;
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/link-click", blob);
      if (ok) return;
    }
  } catch {
    // sendBeacon 失敗時は fetch にフォールバック
  }
  try {
    fetch("/api/link-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // 計測失敗はサイレント
  }
}

export function LinkClickTracker() {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || typeof target.closest !== "function") return;
      const anchor = target.closest("a[data-ec]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const ec = anchor.dataset.ec;
      const section = anchor.dataset.section;
      if (!ec || !section) return;

      const rankRaw = anchor.dataset.rank;
      const rank = rankRaw != null && rankRaw !== "" ? Number(rankRaw) : null;
      const itemId = extractItemId(window.location.pathname);

      send({
        ec,
        section,
        rank: Number.isFinite(rank as number) ? rank : null,
        itemId,
      });
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  return null;
}
