import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const AMAZON_TAG = "aberyuki0117-22";
const RAKUTEN_AFFILIATE_ID = "533370a1.099bb0f6.533370a2.d87efbc1";
const MERCARI_AMBASSADOR_ID = "1057058815";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return `¥${n.toLocaleString()}`;
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = await prisma.catalogItem.findUnique({
    where: { id },
    include: {
      snapshots: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!item) notFound();

  const latest = item.snapshots[0] ?? null;
  const ipKeyword = item.ipTitle ?? item.ipShort ?? "";
  const searchKeyword = item.mercariKeyword ?? item.name;

  const mercariSearch = `https://jp.mercari.com/search?afid=${MERCARI_AMBASSADOR_ID}&keyword=${encodeURIComponent(
    searchKeyword
  )}`;
  const amazonSearch = `https://www.amazon.co.jp/s?k=${encodeURIComponent(
    searchKeyword
  )}&tag=${AMAZON_TAG}`;
  const rakutenSearch = `https://hb.afl.rakuten.co.jp/ichiba/${RAKUTEN_AFFILIATE_ID}/?pc=${encodeURIComponent(
    `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(searchKeyword)}/`
  )}&link_type=hybrid_url`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-6 text-sm text-zinc-500">
        <a href="/" className="hover:underline">
          Hobipedia
        </a>
        {ipKeyword && (
          <>
            <span className="mx-2">/</span>
            <span>{ipKeyword}</span>
          </>
        )}
      </nav>

      <h1 className="text-2xl font-bold leading-tight text-zinc-900">
        {item.name}
      </h1>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
        {item.ipTitle && (
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            {item.ipTitle}
          </span>
        )}
        {item.productType && (
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            {item.productType}
          </span>
        )}
        {item.characterName && (
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            {item.characterName}
          </span>
        )}
        {item.limitedType && (
          <span className="rounded-full bg-pink-100 px-3 py-1 text-pink-800">
            {item.limitedType}
          </span>
        )}
      </div>

      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.name}
          className="mt-6 w-full max-w-md rounded-lg border border-zinc-200"
        />
      )}

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500">中央値</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            {fmt(latest?.mercariMedian)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {latest?.mercariCount ? `${latest.mercariCount}件` : ""}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500">駿河屋価格</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            {fmt(latest?.surugayaPrice)}
          </p>
          {latest?.soldOut && (
            <p className="mt-1 text-xs text-red-500">売切れ</p>
          )}
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500">定価</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            {fmt(item.listPrice)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500">変動率</p>
          <p
            className={`mt-1 text-xl font-bold ${
              (latest?.trendDirection ?? 0) > 0
                ? "text-rose-600"
                : (latest?.trendDirection ?? 0) < 0
                ? "text-blue-600"
                : "text-zinc-400"
            }`}
          >
            {latest?.trendDirection != null
              ? `${latest.trendDirection > 0 ? "+" : ""}${latest.trendDirection.toFixed(1)}%`
              : "—"}
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-zinc-900">
          今買えるところ
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {item.surugayaUrl && (
            <a
              href={item.surugayaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 hover:border-zinc-400"
            >
              <span>駿河屋で見る</span>
              <span className="text-xs text-zinc-400">↗</span>
            </a>
          )}
          <a
            href={mercariSearch}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 hover:border-zinc-400"
          >
            <span>メルカリで探す</span>
            <span className="text-xs text-zinc-400">↗</span>
          </a>
          <a
            href={amazonSearch}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 hover:border-zinc-400"
          >
            <span>Amazonで探す</span>
            <span className="text-xs text-zinc-400">↗</span>
          </a>
          <a
            href={rakutenSearch}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 hover:border-zinc-400"
          >
            <span>楽天で探す</span>
            <span className="text-xs text-zinc-400">↗</span>
          </a>
        </div>
      </section>

      {item.description && (
        <section className="mt-8">
          <h2 className="text-base font-semibold text-zinc-900">商品解説</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
            {item.description}
          </p>
        </section>
      )}

      <section className="mt-8 text-xs text-zinc-500">
        <p>メーカー: {item.maker ?? "—"}</p>
        <p>発売日: {item.releaseDate ?? "—"}</p>
        <p>カテゴリ: {item.category ?? "—"}</p>
      </section>
    </main>
  );
}
