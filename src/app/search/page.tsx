import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "../_components/SiteHeader";
import { BackBar } from "../_components/BackBar";
import { SectionCard } from "../_components/cards";

export const dynamic = "force-dynamic";

type ItemRow = {
  id: string;
  name: string;
  ipShort: string | null;
  ipTitle: string | null;
  productType: string | null;
  characterName: string | null;
  limitedType: string | null;
  imageUrl: string | null;
  mercariMedian: number | null;
  surugayaPrice: number | null;
  trendDirection: number | null;
};

type IpHit = { ipShort: string; itemCount: number };

const SEARCH_LIMIT = 60;

async function runSearch(q: string) {
  const pattern = `%${q}%`;

  const [items, ipHits] = await Promise.all([
    prisma.$queryRawUnsafe<ItemRow[]>(
      `
      SELECT ci.id, ci.name, ci."ipShort", ci."ipTitle", ci."productType",
        ci."characterName", ci."limitedType", ci."imageUrl",
        ps."mercariMedian", ps."surugayaPrice", ps."trendDirection"
      FROM "CatalogItem" ci
      LEFT JOIN "PriceSnapshot" ps ON ps."itemId" = ci.id
        AND ps."createdAt" = (SELECT MAX("createdAt") FROM "PriceSnapshot" WHERE "itemId" = ci.id)
      WHERE
        ci.name ILIKE $1
        OR ci."ipShort" ILIKE $1
        OR ci."ipTitle" ILIKE $1
        OR ci."characterName" ILIKE $1
        OR ci."productType" ILIKE $1
      ORDER BY ps."mercariMedian" DESC NULLS LAST, ci."createdAt" DESC
      LIMIT ${SEARCH_LIMIT + 1}
      `,
      pattern
    ),
    prisma.$queryRawUnsafe<IpHit[]>(
      `
      SELECT "ipShort", COUNT(*)::int AS "itemCount"
      FROM "CatalogItem"
      WHERE "ipShort" IS NOT NULL
        AND ("ipShort" ILIKE $1 OR "ipTitle" ILIKE $1)
      GROUP BY "ipShort"
      ORDER BY "itemCount" DESC
      LIMIT 8
      `,
      pattern
    ),
  ]);

  return {
    items: items.slice(0, SEARCH_LIMIT),
    truncated: items.length > SEARCH_LIMIT,
    ipHits: ipHits.map((h) => ({ ...h, itemCount: Number(h.itemCount) })),
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const title = q ? `「${q}」の検索結果` : "検索";
  return {
    title,
    robots: q ? { index: false, follow: true } : undefined,
  };
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return `¥${n.toLocaleString()}`;
}

function ResultRow({ item }: { item: ItemRow }) {
  return (
    <Link
      href={`/catalog/${item.id}`}
      className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-0 hover:bg-zinc-50"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-50">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] text-zinc-800">{item.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-zinc-400">
          {item.ipShort ?? "—"}
          {item.productType ? ` · ${item.productType}` : ""}
          {item.limitedType ? ` · ${item.limitedType}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[14px] font-bold text-zinc-800">
          {fmt(item.mercariMedian)}
        </p>
        {item.trendDirection != null && (
          <p
            className={`text-[11px] ${
              item.trendDirection > 0
                ? "text-emerald-600"
                : item.trendDirection < 0
                ? "text-rose-500"
                : "text-zinc-400"
            }`}
          >
            {item.trendDirection > 0 ? "+" : ""}
            {Math.round(item.trendDirection)}%
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();

  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader defaultQuery={q} />

      <BackBar href="/" label="検索" />

      <main className="mx-auto max-w-4xl px-3 py-5 sm:px-4 sm:py-6 md:px-8">
        <nav className="mb-4 text-[12px] text-zinc-500">
          <Link href="/" className="hover:underline">
            トップ
          </Link>
          <span className="mx-1.5">›</span>
          <span className="text-zinc-700">検索</span>
        </nav>

        {q.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-sm text-zinc-500">
              上の検索バーから作品名・商品名・キャラ名を入力してください。
            </p>
          </div>
        ) : (
          <SearchResults q={q} />
        )}
      </main>
    </div>
  );
}

async function SearchResults({ q }: { q: string }) {
  const { items, truncated, ipHits } = await runSearch(q);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-900">
        「{q}」の検索結果（{items.length}件{truncated ? "+" : ""}）
      </h1>

      {ipHits.length > 0 && (
        <SectionCard title="作品で絞り込む">
          <div className="flex flex-wrap gap-2">
            {ipHits.map((h) => (
              <Link
                key={h.ipShort}
                href={`/ip/${encodeURIComponent(h.ipShort)}`}
                className="flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3.5 py-1.5"
              >
                <span className="text-[13px] font-medium text-sky-700">
                  {h.ipShort}
                </span>
                <span className="text-[11px] text-sky-300">{h.itemCount}</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <p className="text-sm text-zinc-500">該当する商品が見つかりませんでした。</p>
          <p className="mt-2 text-[12px] text-zinc-400">
            別のキーワードでお試しください。
          </p>
        </div>
      ) : (
        <SectionCard noPad>
          {items.map((item) => (
            <ResultRow key={item.id} item={item} />
          ))}
        </SectionCard>
      )}
    </div>
  );
}
