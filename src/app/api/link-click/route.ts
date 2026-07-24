import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EC = new Set([
  "mercari",
  "amazon",
  "rakuten",
  "surugaya",
  "yahoo-shopping",
  "yahoo-auction",
  "paypay-fleamarket",
  "animate",
  "pbandai",
  "mandarake",
  "lashinban",
  "mercari-sold",
]);

const ALLOWED_SECTION = new Set([
  "brand-buttons",
  "primary-actions",
  "comparison-stores",
  "sold-gallery",
  "sold-table",
]);

export async function POST(request: Request) {
  let payload: unknown;
  try {
    const text = await request.text();
    if (!text) return new Response(null, { status: 204 });
    payload = JSON.parse(text);
  } catch {
    return new Response(null, { status: 204 });
  }

  if (!payload || typeof payload !== "object") {
    return new Response(null, { status: 204 });
  }

  const p = payload as Record<string, unknown>;
  const ec = typeof p.ec === "string" ? p.ec : null;
  const section = typeof p.section === "string" ? p.section : null;

  if (!ec || !ALLOWED_EC.has(ec)) return new Response(null, { status: 204 });
  if (!section || !ALLOWED_SECTION.has(section)) {
    return new Response(null, { status: 204 });
  }

  const rank =
    typeof p.rank === "number" && Number.isFinite(p.rank) && p.rank >= 0 && p.rank < 1000
      ? Math.trunc(p.rank)
      : null;
  const itemId = typeof p.itemId === "string" ? p.itemId.slice(0, 64) : null;
  const ipShort = typeof p.ipShort === "string" ? p.ipShort.slice(0, 64) : null;
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 256) || null;

  try {
    await prisma.linkClickEvent.create({
      data: { ec, section, rank, itemId, ipShort, userAgent },
    });
  } catch {
    // 失敗してもクライアント側に影響を出さない
  }

  return new Response(null, { status: 204 });
}
