import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { listArticlesForCatalog } from "@/lib/articles";
import { SiteHeader } from "../../_components/SiteHeader";

export const dynamic = "force-dynamic";

const AMAZON_TAG = "aberyuki0117-22";
const RAKUTEN_AFFILIATE_ID = "533370a1.099bb0f6.533370a2.d87efbc1";
const MERCARI_AMBASSADOR_ID = "1057058815";

const EVENT_EMOJI: Record<string, string> = {
  anime_start: "📺",
  anime_end: "📺",
  movie: "🎬",
  manga_end: "📕",
  exhibition: "🏛️",
  collaboration: "🤝",
  game: "🎮",
};

type CatalogItemRow = {
  id: string;
  name: string;
  surugayaUrl: string | null;
  category: string | null;
  maker: string | null;
  listPrice: number | null;
  releaseDate: string | null;
  description: string | null;
  productType: string | null;
  characterName: string | null;
  ipTitle: string | null;
  ipShort: string | null;
  imageUrl: string | null;
  limitedType: string | null;
  eventName: string | null;
  mercariKeyword: string | null;
};

type SnapshotRow = {
  id: string;
  createdAt: Date;
  surugayaPrice: number | null;
  soldOut: boolean;
  mercariMedian: number | null;
  mercariCount: number;
  diffPercent: number | null;
  trendDirection: number | null;
};

type SoldRow = {
  id: string;
  price: number;
  soldDate: string;
  mercariName: string | null;
  mercariItemId: string | null;
  thumbnailUrl: string | null;
  itemConditionId: number | null;
};

type EventRow = {
  ipTitle: string;
  ipShort: string | null;
  eventType: string;
  eventLabel: string;
  startDate: string;
  endDate: string | null;
};

const CONDITION_LABEL: Record<number, string> = {
  1: "新品",
  2: "未使用に近い",
  3: "目立った傷なし",
  4: "やや傷汚れあり",
  5: "傷汚れあり",
  6: "全体的に状態悪い",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await prisma.catalogItem.findUnique({
    where: { id },
    select: { name: true, ipShort: true, imageUrl: true, productType: true },
  });
  if (!item) return { title: "Not Found" };
  const title = `${item.name} 相場・価格推移`;
  const description = `${item.ipShort ?? ""} ${item.name}${
    item.productType ? `（${item.productType}）` : ""
  } のメルカリsold相場・駿河屋価格・推移を一画面で確認。`;
  const url = `https://hobipedia.jp/catalog/${id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      ...(item.imageUrl ? { images: [{ url: item.imageUrl }] } : {}),
    },
    twitter: {
      card: item.imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
    },
  };
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return `¥${n.toLocaleString()}`;
}

function pct(n: number | null | undefined): string {
  if (n == null) return "—";
  const v = Math.round(n);
  return `${v > 0 ? "+" : ""}${v}%`;
}

function colorForPct(n: number | null | undefined): string {
  if (n == null) return "text-zinc-400";
  if (n > 0) return "text-rose-600";
  if (n < 0) return "text-blue-600";
  return "text-zinc-500";
}

function buildAffiliateLinks(name: string, surugayaUrl: string | null) {
  const kw = encodeURIComponent(name);
  return {
    mercari: `https://jp.mercari.com/search?afid=${MERCARI_AMBASSADOR_ID}&keyword=${kw}`,
    amazon: `https://www.amazon.co.jp/s?k=${kw}&tag=${AMAZON_TAG}`,
    rakuten: `https://hb.afl.rakuten.co.jp/ichiba/${RAKUTEN_AFFILIATE_ID}/?pc=${encodeURIComponent(
      `https://search.rakuten.co.jp/search/mall/${kw}/`
    )}&link_type=hybrid_url`,
    surugaya:
      surugayaUrl ??
      `https://www.suruga-ya.jp/search?category=&search_word=${kw}`,
    yahooShopping: `https://shopping.yahoo.co.jp/search?p=${kw}`,
    yahooAuction: `https://auctions.yahoo.co.jp/search/search?p=${kw}`,
    paypayFleamarket: `https://paypayfleamarket.yahoo.co.jp/search/${kw}`,
    animate: `https://www.animate-onlineshop.jp/products/search.php?keyword=${kw}`,
    pbandai: `https://p-bandai.jp/search/?q=${kw}`,
    mandarake: `https://order.mandarake.co.jp/order/listPage/list?keyword=${kw}`,
    lashinban: `https://www.lashinbang.com/search?keyword=${kw}`,
  };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = (
    await prisma.$queryRawUnsafe<CatalogItemRow[]>(
      `SELECT id, name, "surugayaUrl", category, maker, "listPrice", "releaseDate",
         description, "productType", "characterName", "ipTitle", "ipShort",
         "imageUrl", "limitedType", "eventName", "mercariKeyword"
       FROM "CatalogItem" WHERE id = $1`,
      id
    )
  )[0];

  if (!item) notFound();

  const [snapshots, soldRecords, ipEvents, relatedArticles] = await Promise.all([
    prisma.$queryRawUnsafe<SnapshotRow[]>(
      `SELECT id, "createdAt", "surugayaPrice", "soldOut", "mercariMedian",
         "mercariCount", "diffPercent", "trendDirection"
       FROM "PriceSnapshot" WHERE "itemId" = $1
       ORDER BY "createdAt" DESC LIMIT 60`,
      id
    ),
    prisma.$queryRawUnsafe<SoldRow[]>(
      `SELECT id, price, "soldDate", "mercariName", "mercariItemId",
         "thumbnailUrl", "itemConditionId"
       FROM "MercariSoldRecord" WHERE "itemId" = $1
         AND ("geminiVerdict" IS NULL OR "geminiVerdict" IN ('same','variant'))
       ORDER BY "soldDate" DESC LIMIT 200`,
      id
    ),
    item.ipShort || item.ipTitle
      ? prisma.$queryRawUnsafe<EventRow[]>(
          `SELECT "ipTitle", "ipShort", "eventType", "eventLabel", "startDate", "endDate"
           FROM "IpEvent"
           WHERE "ipShort" = $1 OR "ipTitle" = $2
           ORDER BY "startDate" ASC LIMIT 12`,
          item.ipShort ?? "",
          item.ipTitle ?? ""
        )
      : Promise.resolve([]),
    listArticlesForCatalog(id),
  ]);

  const latest = snapshots[0] ?? null;
  const soldCount = soldRecords.length;

  const links = buildAffiliateLinks(item.name, item.surugayaUrl);
  const breadcrumbBack = item.ipShort
    ? `/ip/${encodeURIComponent(item.ipShort)}`
    : "/";

  const chartPoints = buildChartPoints(snapshots, soldRecords);

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    url: `https://hobipedia.jp/catalog/${item.id}`,
  };
  if (item.imageUrl) productSchema.image = item.imageUrl;
  if (item.description) {
    productSchema.description = item.description.slice(0, 500);
  } else {
    productSchema.description = `${item.ipShort ?? ""} ${item.name}${
      item.productType ? `（${item.productType}）` : ""
    } のメルカリsold相場・駿河屋価格・推移情報。`;
  }
  if (item.maker) productSchema.brand = { "@type": "Brand", name: item.maker };
  if (item.category) productSchema.category = item.category;
  if (latest?.surugayaPrice != null) {
    productSchema.offers = {
      "@type": "Offer",
      priceCurrency: "JPY",
      price: latest.surugayaPrice,
      availability: latest.soldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url: item.surugayaUrl ?? `https://hobipedia.jp/catalog/${item.id}`,
      seller: { "@type": "Organization", name: "駿河屋" },
    };
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <SiteHeader />

      {/* ← 戻る サブバー */}
      <div className="bg-sky-100 px-5 py-2 text-[13px]">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href={breadcrumbBack} className="text-sky-600 hover:underline">
            ← 戻る
          </Link>
          <span className="font-semibold text-sky-700">グッズカタログ</span>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <nav className="mb-4 text-[12px] text-zinc-500">
          <Link href="/" className="hover:underline">
            トップ
          </Link>
          {item.ipShort && (
            <>
              <span className="mx-1.5">›</span>
              <Link
                href={`/ip/${encodeURIComponent(item.ipShort)}`}
                className="hover:underline"
              >
                {item.ipShort}
              </Link>
            </>
          )}
          {item.productType && (
            <>
              <span className="mx-1.5">›</span>
              <span>{item.productType}</span>
            </>
          )}
          <span className="mx-1.5">›</span>
          <span className="text-zinc-700">{item.name}</span>
        </nav>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* 左サイドバー */}
          <aside className="space-y-3 order-1 lg:order-none">
            <SectionCard noPad>
              <div className="aspect-square flex items-center justify-center bg-zinc-50">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <p className="text-[12px] text-zinc-300">画像なし</p>
                )}
              </div>
            </SectionCard>

            <SectionCard noHeader>
              <div className="p-1 space-y-2">
                <button
                  type="button"
                  disabled
                  className="w-full rounded-lg bg-sky-300 text-white text-[13px] font-bold py-2 cursor-not-allowed"
                  title="相場報告は今後の認証機能と一緒に実装"
                >
                  相場を報告する（準備中）
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-zinc-200 text-[12px] py-1.5 text-zinc-400 cursor-not-allowed"
                  >
                    ★ 持ってる
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-zinc-200 text-[12px] py-1.5 text-zinc-400 cursor-not-allowed"
                  >
                    ♡ 欲しい
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="アイテム情報">
              <dl className="space-y-1.5 text-[12px]">
                <InfoRow label="メーカー" value={item.maker} />
                <InfoRow label="発売日" value={item.releaseDate} />
                <InfoRow label="商品種別" value={item.productType} />
                <InfoRow label="キャラクター" value={item.characterName} />
                <InfoRow label="限定性" value={item.limitedType} />
                <InfoRow label="イベント" value={item.eventName} />
                <InfoRow label="駿河屋カテゴリ" value={item.category} />
                <InfoRow label="作品" value={item.ipTitle ?? item.ipShort} />
              </dl>
            </SectionCard>
          </aside>

          {/* メインカラム */}
          <div className="lg:col-span-2 space-y-4 order-2">
            {/* ヘッダー */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {item.productType && (
                  <span className="rounded-full border border-sky-300 px-3 py-0.5 text-[12px] text-sky-600">
                    {item.productType}
                  </span>
                )}
                {item.characterName && (
                  <span className="rounded-full border border-pink-300 px-3 py-0.5 text-[12px] text-pink-600">
                    {item.characterName}
                  </span>
                )}
                {item.limitedType && (
                  <span className="rounded-full border border-amber-300 px-3 py-0.5 text-[12px] text-amber-600">
                    {item.limitedType}
                  </span>
                )}
                {latest?.soldOut && (
                  <span className="rounded-full border border-zinc-300 bg-zinc-200 px-3 py-0.5 text-[12px] text-zinc-700">
                    駿河屋売切れ
                  </span>
                )}
              </div>
              {item.ipShort && (
                <p className="text-[13px] text-sky-600">{item.ipShort}</p>
              )}
              <h1 className="text-xl md:text-2xl font-bold leading-tight text-zinc-900">
                {item.name}
              </h1>
            </div>

            {/* 3カード相場サマリー */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white p-3 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-[10px] text-zinc-400 mb-1">推定相場</div>
                <div className="text-lg font-black text-sky-600">
                  {fmt(latest?.mercariMedian)}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">メルカリ中央値</div>
              </div>
              <div className="rounded-xl bg-white p-3 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-[10px] text-zinc-400 mb-1">駿河屋価格</div>
                <div className="text-lg font-black text-amber-600">
                  {fmt(latest?.surugayaPrice)}
                </div>
              </div>
              <div className="rounded-xl bg-white p-3 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-[10px] text-zinc-400 mb-1">駿河屋との差</div>
                <div className={`text-lg font-black ${colorForPct(latest?.diffPercent)}`}>
                  {pct(latest?.diffPercent)}
                </div>
              </div>
            </div>

            {/* 5セル価格情報 */}
            <SectionCard title="価格情報">
              <div className="grid grid-cols-3 gap-x-4 gap-y-4 sm:grid-cols-5">
                <PriceCell
                  label="メルカリ中央値"
                  value={fmt(latest?.mercariMedian)}
                  cls="text-sky-600"
                />
                <PriceCell
                  label="駿河屋価格"
                  value={fmt(latest?.surugayaPrice)}
                  cls="text-amber-600"
                />
                <PriceCell
                  label="定価"
                  value={fmt(item.listPrice)}
                  cls="text-zinc-800"
                />
                <PriceCell
                  label="駿河屋との差"
                  value={pct(latest?.diffPercent)}
                  cls={colorForPct(latest?.diffPercent)}
                />
                <PriceCell
                  label="推移"
                  value={pct(latest?.trendDirection)}
                  cls={colorForPct(latest?.trendDirection)}
                />
              </div>
              <p className="mt-3 text-[11px] text-zinc-400">
                {soldCount > 0
                  ? `メルカリsold ${soldCount}件のデータに基づく`
                  : "メルカリsoldデータはまだありません"}
              </p>
            </SectionCard>

            {/* 価格推移グラフ */}
            {chartPoints.length >= 2 && (
              <SectionCard title="価格推移">
                <PriceChart points={chartPoints} />
              </SectionCard>
            )}

            {/* 今買えるところ（11ボタン） */}
            <SectionCard title="今買えるところ">
              <div className="grid grid-cols-2 gap-2">
                <BrandButton href={links.mercari} label="メルカリで探す" bg="#ff4655" />
                <BrandButton href={links.amazon} label="Amazonで探す" bg="#ff9900" />
                <BrandButton href={links.rakuten} label="楽天で探す" bg="#bf0000" />
                <BrandButton href={links.surugaya} label="駿河屋で見る" bg="#333333" />
                <BrandButton href={links.yahooShopping} label="Yahoo!ショッピング" bg="#ff0033" />
                <BrandButton href={links.yahooAuction} label="ヤフオク" bg="#7b0099" />
                <BrandButton href={links.paypayFleamarket} label="Yahoo!フリマ" bg="#ff0033" />
                <BrandButton href={links.animate} label="アニメイト" bg="#0099d4" />
                <BrandButton href={links.pbandai} label="プレバン" bg="#d70a18" />
                <BrandButton href={links.mandarake} label="まんだらけ" bg="#003e80" />
                <BrandButton href={links.lashinban} label="らしんばん" bg="#ed1c24" />
              </div>
              <p className="mt-3 text-[11px] text-zinc-400">
                ※外部リンク。Mercari/Amazon/楽天はアフィリエイト。Yahoo系・楽天はValueCommerce LinkSwitchで自動アフィリ化。
              </p>
            </SectionCard>

            {/* 作品の出来事 */}
            {ipEvents.length > 0 && (
              <SectionCard title="作品の出来事">
                <div className="space-y-1">
                  {ipEvents.map((ev, i) => (
                    <div key={i} className="flex items-baseline gap-2 text-[12px]">
                      <span>{EVENT_EMOJI[ev.eventType] ?? "📌"}</span>
                      <span className="font-mono text-zinc-500">{ev.startDate}</span>
                      <span className="text-zinc-700">{ev.eventLabel}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* メルカリsold履歴ギャラリー */}
            {soldRecords.length > 0 && (
              <SectionCard title={`メルカリ sold 履歴（${soldRecords.length}件）`}>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {soldRecords.slice(0, 12).map((r) => (
                    <a
                      key={r.id}
                      href={
                        r.mercariItemId
                          ? `https://jp.mercari.com/item/${r.mercariItemId}?afid=${MERCARI_AMBASSADOR_ID}`
                          : "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
                        {r.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.thumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : null}
                        <span className="absolute left-1.5 top-1.5 rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          SOLD
                        </span>
                      </div>
                      <p className="mt-1.5 text-[14px] font-bold text-zinc-800">
                        {fmt(r.price)}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {r.soldDate}
                        {r.itemConditionId &&
                          ` / ${CONDITION_LABEL[r.itemConditionId] ?? "—"}`}
                      </p>
                    </a>
                  ))}
                </div>
                {soldRecords.length > 12 && (
                  <p className="mt-3 text-[11px] text-zinc-400 text-center">
                    最新12件を表示中（全{soldRecords.length}件）
                  </p>
                )}
              </SectionCard>
            )}

            {/* sold 詳細テーブル */}
            {soldRecords.length > 0 && (
              <SectionCard title="相場履歴" noPad>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[11px] text-zinc-500">
                        <th className="px-3 py-2 text-left font-medium">日時</th>
                        <th className="px-3 py-2 text-right font-medium">価格</th>
                        <th className="px-3 py-2 text-left font-medium">商品名</th>
                        <th className="px-3 py-2 text-left font-medium">状態</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {soldRecords.slice(0, 30).map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-zinc-100 last:border-0"
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                            {r.soldDate}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-zinc-800">
                            {fmt(r.price)}
                          </td>
                          <td className="px-3 py-2 text-zinc-600 max-w-xs">
                            <span className="line-clamp-1">
                              {r.mercariName ?? "—"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-[11px] text-zinc-500">
                            {r.itemConditionId
                              ? CONDITION_LABEL[r.itemConditionId] ?? "—"
                              : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            {r.mercariItemId && (
                              <a
                                href={`https://jp.mercari.com/item/${r.mercariItemId}?afid=${MERCARI_AMBASSADOR_ID}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-sky-600 hover:underline"
                              >
                                開く ↗
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {/* 商品解説 */}
            {item.description && (
              <SectionCard title="商品解説">
                <p className="whitespace-pre-wrap text-[13px] leading-7 text-zinc-700">
                  {item.description}
                </p>
              </SectionCard>
            )}

            {/* 関連記事 */}
            {relatedArticles.length > 0 && (
              <SectionCard title="関連記事">
                <ul className="space-y-2">
                  {relatedArticles.map((a) => (
                    <li
                      key={a.slug}
                      className="overflow-hidden rounded-lg border border-zinc-100"
                    >
                      <Link
                        href={`/articles/${a.slug}`}
                        className="block p-3 hover:bg-zinc-50"
                      >
                        <p className="text-[11px] text-zinc-400">
                          {a.publishedAt.replace(/-/g, "/").slice(0, 10)}
                          {a.tags && a.tags.length > 0 ? (
                            <span className="ml-2">
                              {a.tags.map((t) => `#${t}`).join(" ")}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[14px] font-bold text-zinc-800">
                          {a.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[12px] text-zinc-600">
                          {a.description}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function buildChartPoints(
  snapshots: SnapshotRow[],
  sold: SoldRow[]
): { date: string; mercari?: number; surugaya?: number }[] {
  const map = new Map<string, { date: string; mercari?: number; surugaya?: number }>();
  for (const s of snapshots) {
    const date = s.createdAt.toISOString().slice(0, 10);
    const cur = map.get(date) ?? { date };
    if (s.mercariMedian != null) cur.mercari = s.mercariMedian;
    if (s.surugayaPrice != null) cur.surugaya = s.surugayaPrice;
    map.set(date, cur);
  }
  for (const s of sold) {
    if (!map.has(s.soldDate)) map.set(s.soldDate, { date: s.soldDate });
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function PriceChart({
  points,
}: {
  points: { date: string; mercari?: number; surugaya?: number }[];
}) {
  const W = 600;
  const H = 200;
  const PAD_L = 50;
  const PAD_R = 10;
  const PAD_T = 10;
  const PAD_B = 25;

  const all = points.flatMap((p) => [p.mercari, p.surugaya]).filter(
    (n): n is number => n != null
  );
  if (all.length === 0) return null;
  const yMax = Math.max(...all);
  const yMin = 0;
  const xCount = points.length;

  const xOf = (i: number) =>
    PAD_L + (i / Math.max(1, xCount - 1)) * (W - PAD_L - PAD_R);
  const yOf = (v: number) =>
    PAD_T + (1 - (v - yMin) / Math.max(1, yMax - yMin)) * (H - PAD_T - PAD_B);

  const merc = points.map((p, i) =>
    p.mercari != null ? `${xOf(i)},${yOf(p.mercari)}` : null
  );
  const surg = points.map((p, i) =>
    p.surugaya != null ? `${xOf(i)},${yOf(p.surugaya)}` : null
  );
  const mercSegs = splitSegments(merc);
  const surgSegs = splitSegments(surg);

  const xLabelStep = Math.max(1, Math.floor(xCount / 6));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[200px]">
        <g stroke="#e5e7eb" strokeDasharray="3 3" strokeWidth={1}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={PAD_L}
              y1={PAD_T + t * (H - PAD_T - PAD_B)}
              x2={W - PAD_R}
              y2={PAD_T + t * (H - PAD_T - PAD_B)}
            />
          ))}
        </g>
        <g fontSize={10} fill="#9ca3af">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text
              key={t}
              x={PAD_L - 6}
              y={PAD_T + t * (H - PAD_T - PAD_B) + 4}
              textAnchor="end"
            >
              ¥{Math.round((1 - t) * yMax).toLocaleString()}
            </text>
          ))}
        </g>
        {mercSegs.map((seg, idx) => (
          <polyline
            key={`m${idx}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
            points={seg}
          />
        ))}
        {surgSegs.map((seg, idx) => (
          <polyline
            key={`s${idx}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 3"
            points={seg}
          />
        ))}
        {points.map((p, i) =>
          p.mercari != null ? (
            <circle key={`mc${i}`} cx={xOf(i)} cy={yOf(p.mercari)} r={3} fill="#22c55e" />
          ) : null
        )}
        {points.map((p, i) =>
          p.surugaya != null ? (
            <circle key={`sc${i}`} cx={xOf(i)} cy={yOf(p.surugaya)} r={3} fill="#f59e0b" />
          ) : null
        )}
        <g fontSize={10} fill="#9ca3af" textAnchor="middle">
          {points.map((p, i) =>
            i % xLabelStep === 0 || i === xCount - 1 ? (
              <text key={i} x={xOf(i)} y={H - 5}>
                {p.date.slice(5)}
              </text>
            ) : null
          )}
        </g>
      </svg>
      <div className="flex gap-4 text-[11px] text-zinc-500 mt-2 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-emerald-500"></span>
          メルカリsold
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 border-t border-dashed border-amber-500"></span>
          駿河屋
        </span>
      </div>
    </div>
  );
}

function splitSegments(values: (string | null)[]): string[] {
  const segs: string[] = [];
  let cur: string[] = [];
  for (const v of values) {
    if (v) cur.push(v);
    else {
      if (cur.length > 1) segs.push(cur.join(" "));
      cur = [];
    }
  }
  if (cur.length > 1) segs.push(cur.join(" "));
  return segs;
}

function SectionCard({
  title,
  children,
  noPad,
  noHeader,
}: {
  title?: string;
  children: React.ReactNode;
  noPad?: boolean;
  noHeader?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {!noHeader && title && (
        <header className="border-l-[3px] border-sky-300 border-b border-zinc-100 px-4 py-2.5">
          <h2 className="text-[13px] font-bold text-zinc-700">{title}</h2>
        </header>
      )}
      <div className={noPad ? "" : "p-4"}>{children}</div>
    </section>
  );
}

function PriceCell({
  label,
  value,
  cls,
}: {
  label: string;
  value: string;
  cls: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p className={`mt-0.5 text-base font-bold tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

function BrandButton({
  href,
  label,
  bg,
}: {
  href: string;
  label: string;
  bg: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-lg px-4 py-2.5 text-[13px] font-bold text-white"
      style={{ background: bg }}
    >
      <span>{label}</span>
      <span className="text-xs opacity-80">↗</span>
    </a>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-2 border-b border-zinc-100 py-1 last:border-0">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="text-right text-zinc-700">{value}</dd>
    </div>
  );
}
