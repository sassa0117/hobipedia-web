import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "../../_components/SiteHeader";
import { ItemCard } from "../../_components/ItemCard";
import { BackBar } from "../../_components/BackBar";
import { SectionCard } from "../../_components/cards";
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
  const countRow = await prisma.$queryRawUnsafe<{ c: number }[]>(
    `SELECT COUNT(*)::int as c FROM "CatalogItem" WHERE "ipShort" = $1`,
    ip
  );
  const count = Number(countRow[0]?.c ?? 0);
  const title = `${ip}のグッズ相場一覧（${count}件）`;
  const description = `${ip}関連のアニメ・ホビーグッズ${count}件の相場・推移・出品情報を一覧で確認。駿河屋とメルカリsoldの実取引データから集計。`;
  const url = `https://hobipedia.jp/ip/${ipShort}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return `¥${n.toLocaleString()}`;
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
    priceSampleCount: prices.length,
    rising: filtered.filter((i) => (i.trendDirection ?? 0) > 20).length,
  };

  const groupByYearMonth =
    activeSort === "release_desc" || activeSort === "release_asc";
  const groups: { key: string; label: string; items: ItemRow[] }[] = [];
  if (groupByYearMonth) {
    const map = new Map<string, ItemRow[]>();
    for (const it of sorted) {
      const ym = it.releaseDate ? it.releaseDate.slice(0, 7) : "unknown";
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(it);
    }
    for (const [ym, items] of map) {
      const label =
        ym === "unknown"
          ? "発売日不明"
          : `${ym.slice(0, 4)}年${parseInt(ym.slice(5, 7), 10)}月`;
      groups.push({ key: ym, label, items });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />

      <BackBar href="/" label={ipShort} />

      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6 md:px-8">
        <nav className="mb-4 text-[12px] text-zinc-500">
          <Link href="/" className="hover:underline">
            トップ
          </Link>
          <span className="mx-1.5">›</span>
          <Link
            href={`/ip/${encodeURIComponent(ipShort)}`}
            className="hover:underline"
          >
            {ipShort}
          </Link>
          {activeSubcat && (
            <>
              <span className="mx-1.5">›</span>
              <span className="text-zinc-700">{activeSubcat}</span>
            </>
          )}
        </nav>

        <h1 className="text-2xl font-bold text-zinc-900">
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
            <p className="mt-0.5 text-[10px] text-zinc-400">
              {stats.priceSampleCount > 0
                ? `${stats.priceSampleCount}件のデータから`
                : "データなし"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">最高額</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {fmt(stats.max)}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-400">
              {stats.priceSampleCount > 0
                ? `${stats.priceSampleCount}件のデータから`
                : "データなし"}
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
          <div className="mt-6">
            <SectionCard title="カテゴリ">
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
            </SectionCard>
          </div>
        )}

        <section className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            {stats.count.toLocaleString()}件
          </h2>
          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:overflow-visible sm:px-0">
            <div className="flex w-max items-center gap-2 text-[12px] sm:w-auto sm:flex-wrap">
              <span className="shrink-0 text-zinc-500">並び替え:</span>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => {
                const active = activeSort === k;
                return (
                  <Link
                    key={k}
                    href={buildHref(ipShort, {
                      subcat: activeSubcat,
                      sort: k,
                    })}
                    className={`shrink-0 rounded-full px-3 py-1 transition ${
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
          </div>
        </section>

        <section className="mt-4">
          {sorted.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-zinc-500">
              このカテゴリの商品はまだありません。
            </div>
          ) : groupByYearMonth ? (
            <div className="space-y-8">
              {groups.map((g) => (
                <div key={g.key}>
                  <h2 className="mb-3 flex items-baseline gap-2 border-b border-zinc-300 pb-1.5">
                    <span className="text-lg font-bold text-zinc-800">
                      {g.label}
                    </span>
                    <span className="text-[12px] text-zinc-400">
                      {g.items.length}件
                    </span>
                  </h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {g.items.map((item) => (
                      <ItemCard
                        key={item.id}
                        id={item.id}
                        name={item.name}
                        imageUrl={item.imageUrl}
                        releaseDate={item.releaseDate}
                        mercariMedian={item.mercariMedian}
                        trendDirection={item.trendDirection}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {sorted.map((item) => (
                <ItemCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  imageUrl={item.imageUrl}
                  releaseDate={item.releaseDate}
                  mercariMedian={item.mercariMedian}
                  trendDirection={item.trendDirection}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
