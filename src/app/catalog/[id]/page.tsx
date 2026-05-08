import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await prisma.catalogItem.findUnique({
    where: { id },
    select: { name: true, ipShort: true },
  });
  if (!item) return { title: "Not Found" };
  return {
    title: `${item.name} 相場・価格推移`,
    description: `${item.ipShort ?? ""} ${item.name} のメルカリsold相場・駿河屋価格・推移`,
  };
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return `¥${n.toLocaleString()}`;
}

function pct(n: number | null | undefined, withSign = true): string {
  if (n == null) return "—";
  const v = Math.round(n);
  if (!withSign) return `${v}%`;
  return `${v > 0 ? "+" : ""}${v}%`;
}

function colorForPct(n: number | null | undefined): string {
  if (n == null) return "text-zinc-400";
  if (n > 0) return "text-rose-600";
  if (n < 0) return "text-blue-600";
  return "text-zinc-500";
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = (await prisma.$queryRawUnsafe<CatalogItemRow[]>(
    `SELECT id, name, "surugayaUrl", category, maker, "listPrice", "releaseDate",
       description, "productType", "characterName", "ipTitle", "ipShort",
       "imageUrl", "limitedType", "eventName", "mercariKeyword"
     FROM "CatalogItem" WHERE id = $1`,
    id
  ))[0];

  if (!item) notFound();

  const [snapshots, soldRecords, ipEvents] = await Promise.all([
    prisma.$queryRawUnsafe<SnapshotRow[]>(
      `SELECT id, "createdAt", "surugayaPrice", "soldOut", "mercariMedian",
         "mercariCount", "diffPercent", "trendDirection"
       FROM "PriceSnapshot" WHERE "itemId" = $1
       ORDER BY "createdAt" DESC LIMIT 30`,
      id
    ),
    prisma.$queryRawUnsafe<SoldRow[]>(
      `SELECT id, price, "soldDate", "mercariName", "mercariItemId",
         "thumbnailUrl", "itemConditionId"
       FROM "MercariSoldRecord" WHERE "itemId" = $1
         AND ("geminiVerdict" IS NULL OR "geminiVerdict" IN ('same','variant'))
       ORDER BY "soldDate" DESC LIMIT 100`,
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
  ]);

  const latest = snapshots[0] ?? null;
  const soldPrices = soldRecords.map((r) => r.price);
  const soldMin = soldPrices.length ? Math.min(...soldPrices) : null;
  const soldMax = soldPrices.length ? Math.max(...soldPrices) : null;
  const soldCount = soldRecords.length;

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

  const monthlyHistory = aggregateMonthly(snapshots, soldRecords);

  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-8">
        <nav className="text-[12px] text-zinc-500">
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

        {item.ipShort && (
          <p className="mt-3 text-[13px] font-semibold text-sky-700">
            {item.ipShort}
          </p>
        )}
        <h1 className="text-xl font-bold leading-tight text-zinc-900 md:text-2xl">
          {item.name}
        </h1>

        <div className="mt-2 flex flex-wrap gap-2">
          {item.productType && (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-[12px] text-sky-700">
              {item.productType}
            </span>
          )}
          {item.characterName && (
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-0.5 text-[12px] text-zinc-600">
              {item.characterName}
            </span>
          )}
          {item.limitedType && (
            <span className="rounded-full border border-pink-200 bg-pink-50 px-3 py-0.5 text-[12px] text-pink-700">
              {item.limitedType}
            </span>
          )}
          {latest?.soldOut && (
            <span className="rounded-full border border-zinc-300 bg-zinc-200 px-3 py-0.5 text-[12px] text-zinc-700">
              駿河屋売切れ
            </span>
          )}
        </div>

        <SectionCard title="商品画像" accent="#9bc4e6">
          <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg bg-zinc-50">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <p className="text-xs text-zinc-300">画像なし</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="価格情報" accent="#9bc4e6">
          <div className="grid grid-cols-3 gap-x-4 gap-y-4 sm:grid-cols-7">
            <PriceCell
              label="メルカリ中央値"
              value={fmt(latest?.mercariMedian)}
              valueClass="text-sky-600"
            />
            <PriceCell
              label="駿河屋価格"
              value={fmt(latest?.surugayaPrice)}
              valueClass="text-zinc-800"
            />
            <PriceCell
              label="定価"
              value={fmt(item.listPrice)}
              valueClass="text-zinc-800"
            />
            <PriceCell
              label="sold最安"
              value={fmt(soldMin)}
              valueClass="text-emerald-600"
            />
            <PriceCell
              label="sold最高"
              value={fmt(soldMax)}
              valueClass="text-rose-600"
            />
            <PriceCell
              label="駿河屋との差"
              value={pct(latest?.diffPercent)}
              valueClass={colorForPct(latest?.diffPercent)}
            />
            <PriceCell
              label="推移"
              value={pct(latest?.trendDirection)}
              valueClass={colorForPct(latest?.trendDirection)}
            />
          </div>
          <p className="mt-3 text-[11px] text-zinc-400">
            {soldCount > 0
              ? `メルカリsold ${soldCount}件のデータに基づく`
              : "メルカリsoldデータはまだありません"}
          </p>
        </SectionCard>

        {(ipEvents.length > 0 || monthlyHistory.length > 0) && (
          <SectionCard title="価格推移" accent="#9bc4e6">
            {ipEvents.length > 0 && (
              <div className="mb-4 space-y-1">
                {ipEvents.map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-baseline gap-2 text-[12px]"
                  >
                    <span>{EVENT_EMOJI[ev.eventType] ?? "📌"}</span>
                    <span className="font-mono text-zinc-500">
                      {ev.startDate}
                    </span>
                    <span className="text-zinc-700">{ev.eventLabel}</span>
                  </div>
                ))}
              </div>
            )}

            {monthlyHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[11px] text-zinc-500">
                      <th className="px-2 py-1.5 text-left font-medium">日付</th>
                      <th className="px-2 py-1.5 text-right font-medium">メルカリ</th>
                      <th className="px-2 py-1.5 text-right font-medium">駿河屋</th>
                      <th className="px-2 py-1.5 text-right font-medium">sold数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyHistory.map((row) => (
                      <tr
                        key={row.month}
                        className="border-b border-zinc-100 last:border-0"
                      >
                        <td className="px-2 py-2 text-zinc-600">{row.month}</td>
                        <td className="px-2 py-2 text-right text-sky-700">
                          {fmt(row.mercari)}
                        </td>
                        <td className="px-2 py-2 text-right text-zinc-700">
                          {fmt(row.surugaya)}
                        </td>
                        <td className="px-2 py-2 text-right text-zinc-500">
                          {row.soldCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[12px] text-zinc-400">
                履歴データがまだ蓄積されていません。
              </p>
            )}
          </SectionCard>
        )}

        {soldRecords.length > 0 && (
          <SectionCard title={`メルカリsold履歴（${soldRecords.length}件）`} accent="#9bc4e6">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] text-zinc-500">
                    <th className="px-2 py-1.5 text-left font-medium">日付</th>
                    <th className="px-2 py-1.5 text-right font-medium">価格</th>
                    <th className="px-2 py-1.5 text-left font-medium">商品名</th>
                    <th className="px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {soldRecords.slice(0, 30).map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="whitespace-nowrap px-2 py-2 text-zinc-500">
                        {r.soldDate}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-bold text-zinc-800">
                        {fmt(r.price)}
                      </td>
                      <td className="px-2 py-2 text-zinc-600">
                        <span className="line-clamp-1">
                          {r.mercariName ?? "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right">
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
              {soldRecords.length > 30 && (
                <p className="mt-2 text-[11px] text-zinc-400">
                  最新30件を表示中（全{soldRecords.length}件）
                </p>
              )}
            </div>
          </SectionCard>
        )}

        <SectionCard title="今買えるところ" accent="#9bc4e6">
          <div className="grid gap-2 sm:grid-cols-2">
            {item.surugayaUrl && (
              <ExternalLink href={item.surugayaUrl} label="駿河屋で見る" />
            )}
            <ExternalLink href={mercariSearch} label="メルカリで探す" />
            <ExternalLink href={amazonSearch} label="Amazonで探す" />
            <ExternalLink href={rakutenSearch} label="楽天で探す" />
          </div>
          <p className="mt-3 text-[11px] text-zinc-400">
            ※外部リンク（アフィリエイト含む）。終売・限定品の場合は他サイトで見つからないことがあります。
          </p>
        </SectionCard>

        {item.description && (
          <SectionCard title="商品解説" accent="#9bc4e6">
            <p className="whitespace-pre-wrap text-[13px] leading-7 text-zinc-700">
              {item.description}
            </p>
          </SectionCard>
        )}

        <SectionCard title="アイテム情報" accent="#9bc4e6">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
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
      </main>
    </div>
  );
}

function aggregateMonthly(
  snapshots: SnapshotRow[],
  soldRecords: SoldRow[]
): { month: string; mercari: number | null; surugaya: number | null; soldCount: number }[] {
  const buckets = new Map<
    string,
    {
      mercariSum: number;
      mercariN: number;
      surugayaSum: number;
      surugayaN: number;
      soldCount: number;
    }
  >();

  const ensure = (m: string) => {
    if (!buckets.has(m)) {
      buckets.set(m, {
        mercariSum: 0,
        mercariN: 0,
        surugayaSum: 0,
        surugayaN: 0,
        soldCount: 0,
      });
    }
    return buckets.get(m)!;
  };

  for (const s of snapshots) {
    const m = s.createdAt.toISOString().slice(0, 7);
    const b = ensure(m);
    if (s.mercariMedian != null) {
      b.mercariSum += s.mercariMedian;
      b.mercariN += 1;
    }
    if (s.surugayaPrice != null) {
      b.surugayaSum += s.surugayaPrice;
      b.surugayaN += 1;
    }
  }
  for (const r of soldRecords) {
    const m = r.soldDate.slice(0, 7);
    const b = ensure(m);
    b.soldCount += 1;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      mercari: b.mercariN ? Math.round(b.mercariSum / b.mercariN) : null,
      surugaya: b.surugayaN ? Math.round(b.surugayaSum / b.surugayaN) : null,
      soldCount: b.soldCount,
    }));
}

function SectionCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <header
        className="border-b border-zinc-100 px-4 py-2.5"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <h2 className="text-[13px] font-bold text-zinc-700">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function PriceCell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p className={`mt-0.5 text-base font-bold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2.5 text-[13px] text-zinc-700 transition hover:border-sky-300 hover:bg-sky-50"
    >
      <span>{label}</span>
      <span className="text-xs text-zinc-400">↗</span>
    </a>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-0">
      <dt className="shrink-0 text-[11px] text-zinc-400">{label}</dt>
      <dd className="text-right text-zinc-700">{value}</dd>
    </div>
  );
}
