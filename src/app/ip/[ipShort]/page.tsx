import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "../../_components/SiteHeader";

export const dynamic = "force-dynamic";

type ItemRow = {
  id: string;
  name: string;
  ipShort: string | null;
  productType: string | null;
  characterName: string | null;
  limitedType: string | null;
  imageUrl: string | null;
  releaseDate: string | null;
  surugayaPrice: number | null;
  mercariMedian: number | null;
  trendDirection: number | null;
  diffPercent: number | null;
};

type Stats = {
  itemCount: number;
  median: number | null;
  max: number | null;
  rising: number;
};

async function getIpData(ipShort: string) {
  const items = await prisma.$queryRawUnsafe<ItemRow[]>(
    `
    SELECT ci.id, ci.name, ci."ipShort", ci."productType", ci."characterName",
      ci."limitedType", ci."imageUrl", ci."releaseDate",
      ps."surugayaPrice", ps."mercariMedian", ps."trendDirection", ps."diffPercent"
    FROM "CatalogItem" ci
    LEFT JOIN "PriceSnapshot" ps ON ps."itemId" = ci.id
      AND ps."createdAt" = (SELECT MAX("createdAt") FROM "PriceSnapshot" WHERE "itemId" = ci.id)
    WHERE ci."ipShort" = $1
    ORDER BY ps."mercariMedian" DESC NULLS LAST, ci."createdAt" DESC
    `,
    ipShort
  );

  const statsRow = await prisma.$queryRawUnsafe<
    { median: number | null; max: number | null; rising: number }[]
  >(
    `
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY ps."mercariMedian")::int AS median,
      MAX(ps."mercariMedian")::int AS max,
      COUNT(*) FILTER (WHERE ps."trendDirection" > 20)::int AS rising
    FROM "CatalogItem" ci
    LEFT JOIN "PriceSnapshot" ps ON ps."itemId" = ci.id
      AND ps."createdAt" = (SELECT MAX("createdAt") FROM "PriceSnapshot" WHERE "itemId" = ci.id)
    WHERE ci."ipShort" = $1 AND ps."mercariMedian" IS NOT NULL
    `,
    ipShort
  );

  const stats: Stats = {
    itemCount: items.length,
    median: statsRow[0]?.median ?? null,
    max: statsRow[0]?.max ?? null,
    rising: Number(statsRow[0]?.rising ?? 0),
  };

  const trendingTop = [...items]
    .filter((i) => i.trendDirection != null && (i.mercariMedian ?? 0) >= 1000)
    .sort((a, b) => (b.trendDirection ?? 0) - (a.trendDirection ?? 0))
    .slice(0, 5);

  const typeBreakdown = items.reduce<Record<string, number>>((acc, it) => {
    const k = it.productType ?? "—";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return { items, stats, trendingTop, typeBreakdown };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ipShort: string }>;
}): Promise<Metadata> {
  const { ipShort } = await params;
  const ip = decodeURIComponent(ipShort);
  return {
    title: `${ip}のグッズ相場一覧`,
    description: `${ip}関連のアニメ・ホビーグッズの相場・推移・出品情報をまとめています。`,
  };
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return `¥${n.toLocaleString()}`;
}

function ItemCard({ item }: { item: ItemRow }) {
  const td = item.trendDirection;
  return (
    <Link
      href={`/catalog/${item.id}`}
      className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-sky-300"
    >
      <div className="aspect-square w-full overflow-hidden bg-zinc-50">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-300">
            no image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-[13px] leading-snug text-zinc-700">
          {item.name}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <span className="text-[15px] font-bold text-zinc-800">
            {fmt(item.mercariMedian)}
          </span>
          {td != null && (
            <span
              className={`text-[12px] font-bold ${
                td > 0 ? "text-emerald-600" : td < 0 ? "text-rose-500" : "text-zinc-400"
              }`}
            >
              {td > 0 ? "+" : ""}
              {Math.round(td)}%
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {item.productType && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
              {item.productType}
            </span>
          )}
          {item.limitedType && (
            <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] text-pink-700">
              {item.limitedType}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function IpPage({
  params,
}: {
  params: Promise<{ ipShort: string }>;
}) {
  const { ipShort: raw } = await params;
  const ipShort = decodeURIComponent(raw);

  const { items, stats, trendingTop, typeBreakdown } = await getIpData(ipShort);

  if (items.length === 0) notFound();

  const typeEntries = Object.entries(typeBreakdown).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <nav className="text-sm text-zinc-500">
          <Link href="/" className="hover:underline">
            Hobipedia
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-700">{ipShort}</span>
        </nav>

        <h1 className="mt-3 text-2xl font-bold text-zinc-900">
          {ipShort}のグッズ相場
        </h1>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">登録商品</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {stats.itemCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">中央値</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {fmt(stats.median)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">最高額</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {fmt(stats.max)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">上昇中</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              {stats.rising}件
            </p>
          </div>
        </section>

        {typeEntries.length > 0 && (
          <section className="mt-6">
            <p className="mb-2 text-[12px] font-bold text-zinc-400">商品種別</p>
            <div className="flex flex-wrap gap-2">
              {typeEntries.map(([t, c]) => (
                <span
                  key={t}
                  className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5"
                >
                  <span className="text-[12px] text-stone-600">{t}</span>
                  <span className="text-[11px] text-stone-400">{c}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {trendingTop.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-zinc-900">急上昇</h2>
            <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              {trendingTop.map((item) => (
                <Link
                  key={item.id}
                  href={`/catalog/${item.id}`}
                  className="flex items-center gap-3 border-b border-zinc-100 px-4 py-2.5 last:border-0 hover:bg-zinc-50"
                >
                  <span className="min-w-[54px] rounded bg-emerald-50 px-1.5 py-0.5 text-right text-[13px] font-bold text-emerald-600">
                    +{Math.round(item.trendDirection ?? 0)}%
                  </span>
                  <span className="flex-1 truncate text-[13px] text-zinc-700">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-[13px] text-zinc-600">
                    {fmt(item.mercariMedian)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-base font-semibold text-zinc-900">
            すべての商品（{stats.itemCount.toLocaleString()}件）
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
