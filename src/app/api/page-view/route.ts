import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ITEM_ID_RE = /^[A-Za-z0-9_-]{5,64}$/;
const HOST_RE = /^[A-Za-z0-9.-]{1,128}$/;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (
    origin &&
    origin !== "https://hobipedia.jp" &&
    origin !== "http://localhost:3000"
  ) {
    return new Response(null, { status: 204 });
  }

  let payload: unknown;
  try {
    const text = await request.text();
    if (!text || text.length > 512) return new Response(null, { status: 204 });
    payload = JSON.parse(text);
  } catch {
    return new Response(null, { status: 204 });
  }

  if (!payload || typeof payload !== "object") {
    return new Response(null, { status: 204 });
  }

  const p = payload as Record<string, unknown>;
  const itemId =
    typeof p.itemId === "string" && ITEM_ID_RE.test(p.itemId) ? p.itemId : null;
  if (!itemId) return new Response(null, { status: 204 });

  const referrerHost =
    typeof p.referrerHost === "string" && HOST_RE.test(p.referrerHost)
      ? p.referrerHost.toLowerCase()
      : null;

  try {
    await prisma.pageViewEvent.create({
      data: { itemId, referrerHost },
    });
  } catch {
    // 計測障害を商品ページの表示障害へ波及させない
  }

  return new Response(null, { status: 204 });
}
