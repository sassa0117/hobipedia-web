import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "../../_components/SiteHeader";
import { classify, SUBCATEGORIES } from "@/lib/subcategories";

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

type SortKey =
  | "release_desc"
  | "release_asc"
  | "price_desc"
  | "trend_desc"
  | "name_asc";

const SORT_LABEL: Record<SortKey, string> = {
  release_desc: "発売日（新→古）",
  release_asc: "発売日（古→新）",
  price_desc: "相場（高→低）",
  trend_desc: "変動率（高→低）",
  name_asc: "名前順",
};

const MIN_CHIP_COUNT = 3;

async function getIpItems(ipShort: string): Promise<ItemRow[]> {
  return prisma.$queryRawUnsafe<ItemRow[]>(
    `
    SELECT ci.id, ci.name, ci."ipShort", ci."productType", ci."characterName",
      ci."limitedType", ci."imageUrl", ci."releaseDate",
      ps."surugayaPrice", ps."mercariMedian", ps."trendDirection", ps."diffPercent"
    FROM "CatalogItem" ci
    LEFT JOIN "PriceSnapshot" ps ON ps."itemId" = ci.id
      AND ps."createdAt" = (SELECT MAX("createdAt") FROM "PriceSnapshot" WHERE "itemId" = ci.id)
    WHERE ci."ipShort" = $1
    `,
    ipShort
  );
}

function sortItems(items: ItemRow[], sort: SortKey): ItemRow[] {
  const arr = [...items];
  switch (sort) {
    case "release_desc":
      return arr.sort((a, b) =>
        (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "")
      );
    case "release_asc":
      return arr.sort((a, b) =>
        (a.releaseDate ?? "9999").localeCompare(b.releaseDate ?? "9999")
      );
    case "price_desc":
      return arr.sort(
        (a, b) => (b.mercariMedian ?? -1) - (a.mercariMedian ?? -1)
      );
    case "trend_desc":
      return arr.sort(
        (a, b) =>
          (b.trendDirection ?? -Infinity) - (a.trendDirection ?? -Infinity)
      );
    case "name_asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
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
                td > 0
                  ? "text-emerald-600"
                  : td < 0
                  ? "text-rose-500"
                  : "text-zinc-400"
              }`}
            >
              {td > 0 ? "+" : ""}
              {Math.round(td)}%
            </span>
          )}
        </div>
        {item.releaseDate && (
          <p className="text-[10px] text-zinc-400">{item.releaseDate}</p>
        )}
      </div>
    </Link>
  );
}

function buildHref(
  ipShort: string,
  patch: { subcat?: string | null; sort?: SortKey | null }
): string {
  const params = new URLSearchParams();
  if (patch.subcat) params.set("subcat", patch.subcat);
  if (patch.sort && patch.sort !== "release_desc") params.set("sort", patch.sort);
  const qs = params.toString();
  return `/ip/${encodeURIComponent(ipShort)}${qs ? `?${qs}` : ""}`;
}

export default async function IpPage({
  params,
  searchParams,
}: {
  params: Promise<{ ipShort: string }>;
  searchParams: Promise<{ subcat?: string; sort?: string }>;
}) {
  const { ipShort: rawIp } = await params;
  const sp = await searchParams;
  const ipShort = decodeURIComponent(rawIp);
  const activeSubcat = sp.subcat ?? null;
  const activeSort: SortKey = (
    sp.sort && sp.sort in SORT_LABEL ? sp.sort : "release_desc"
  ) as SortKey;

  const allItems = await getIpItems(ipShort);
  if (allItems.length === 0) notFound();

  const labelCount = new Map<string, number>();
  const itemLabels = new Map<string, string[]>();
  for (const it of allItems) {
    const labels = classify(it.name);
    itemLabels.set(it.id, labels);
    for (const lb of labels) {
      labelCount.set(lb, (labelCount.get(lb) ?? 0) + 1);
    }
  }

  const chips = Array.from(labelCount.entries())
    .filter(([, c]) => c >= MIN_CHIP_COUNT)
    .filter(([label]) => label in SUBCATEGORIES)
    .sort((a, b) => b[1] - a[1]);

  const filtered = activeSubcat
    ? allItems.filter((it) => itemLabels.get(it.id)?.includes(activeSubcat))
    : allItems;
  const sorted = sortItems(filtered, activeSort);

  const prices = filtered
    .map((i) => i.mercariMedian)
    .filter((n): n is number => n != null);
  const stats = {
    count: filtered.length,
    totalCount: allItems.length,
    median: median(prices),
    max: prices.length ? Math.max(...prices) : null,
    rising: filtered.filter((i) => (i.trendDirection ?? 0) > 20).length,
  };

  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <nav className="text-sm text-zinc-500">
          <Link href="/" className="hover:underline">
            Hobipedia
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/ip/${encodeURIComponent(ipShort)}`}
            className="hover:underline"
          >
            {ipShort}
          </Link>
          {activeSubcat && (
            <>
              <span className="mx-2">/</span>
              <span className="text-zinc-700">{activeSubcat}</span>
            </>
          )}
        </nav>

        <h1 className="mt-3 text-2xl font-bold text-zinc-900">
          {ipShort}のグッズ相場
          {activeSubcat && (
            <span className="ml-2 text-base text-sky-600">— {activeSubcat}</span>
          )}
        </h1>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">
              {activeSubcat ? "絞り込み" : "登録商品"}
            </p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {stats.count.toLocaleString()}
              {activeSubcat && (
                <span className="ml-1 text-xs font-normal text-zinc-400">
                  / {stats.totalCount.toLocaleString()}
                </span>
              )}
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

        {chips.length > 0 && (
          <section className="mt-6">
            <p className="mb-2 text-[12px] font-bold text-zinc-400">カテゴリ</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref(ipShort, { subcat: null, sort: activeSort })}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] transition ${
                  activeSubcat == null
                    ? "border-sky-400 bg-sky-100 font-semibold text-sky-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-sky-200"
                }`}
              >
                すべて
                <span className="ml-1.5 text-[11px] text-zinc-400">
                  {allItems.length}
                </span>
              </Link>
              {chips.map(([label, count]) => {
                const active = activeSubcat === label;
                return (
                  <Link
                    key={label}
                    href={buildHref(ipShort, {
                      subcat: active ? null : label,
                      sort: activeSort,
                    })}
                    className={`rounded-full border px-3.5 py-1.5 text-[13px] transition ${
                      active
                        ? "border-sky-400 bg-sky-100 font-semibold text-sky-700"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-sky-200"
                    }`}
                  >
                    {label}
                    <span className="ml-1.5 text-[11px] text-zinc-400">
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-6 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-900">
            {stats.count.toLocaleString()}件
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-zinc-500">並び替え:</span>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => {
              const active = activeSort === k;
              return (
                <Link
                  key={k}
                  href={buildHref(ipShort, {
                    subcat: activeSubcat,
                    sort: k,
                  })}
                  className={`rounded-full px-3 py-1 transition ${
                    active
                      ? "bg-zinc-800 text-white"
                      : "bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {SORT_LABEL[k]}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-4">
          {sorted.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-zinc-500">
              このカテゴリの商品はまだありません。
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {sorted.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
