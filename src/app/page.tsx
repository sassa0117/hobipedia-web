import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildIpPath } from "@/lib/ip-path";
import { SiteHeader } from "./_components/SiteHeader";

export const revalidate = 21600;

type ItemRow = {
  id: string;
  name: string;
  ipShort: string | null;
  productType: string | null;
  characterName: string | null;
  limitedType: string | null;
  surugayaPrice: number | null;
  mercariMedian: number | null;
  mercariCount: number | null;
  snapshotAt: Date | null;
  trendDirection: number | null;
  diffPercent: number | null;
};

type IpSummaryRow = {
  ip: string;
  itemCount: number;
  avgPrice: number | null;
  maxPrice: number | null;
};

type TypeDistRow = { productType: string; count: number };

type EventRow = {
  ipTitle: string;
  ipShort: string | null;
  eventType: string;
  eventLabel: string;
  startDate: string;
  endDate: string | null;
};

const EVENT_EMOJI: Record<string, string> = {
  anime_start: "📺",
  movie: "🎬",
  manga_end: "📕",
  exhibition: "🏛️",
  collaboration: "🤝",
};

const getTopData = unstable_cache(async function getTopData() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().slice(0, 10);

  const [
    itemCount,
    ipCountRow,
    snapshotCount,
    rising,
    newItems,
    ipSummary,
    todayEvents,
    recentEvents,
    upcomingEvents,
    typeDist,
    highValue,
  ] = await Promise.all([
    prisma.catalogItem.count(),
    prisma.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(DISTINCT "ipShort")::int as c FROM "CatalogItem" WHERE "ipShort" IS NOT NULL`
    ),
    prisma.priceSnapshot.count(),
    prisma.$queryRawUnsafe<ItemRow[]>(`
      SELECT ci.id, ci.name, ci."ipShort", ci."productType", ci."characterName", ci."limitedType",
        ps."surugayaPrice", ps."mercariMedian", ps."mercariCount",
        ps."createdAt" AS "snapshotAt", ps."trendDirection", ps."diffPercent"
      FROM "CatalogItem" ci
      JOIN "PriceSnapshot" ps ON ps."itemId" = ci.id
      WHERE ps."createdAt" = (SELECT MAX("createdAt") FROM "PriceSnapshot" WHERE "itemId" = ci.id)
        AND ps."createdAt" >= NOW() - INTERVAL '3 days'
        AND ps."trendDirection" IS NOT NULL AND ps."mercariMedian" >= 2000
        AND ps."mercariCount" >= 4
      ORDER BY ps."trendDirection" DESC LIMIT 8
    `),
    prisma.$queryRawUnsafe<ItemRow[]>(`
      WITH ranked AS (
        SELECT ci.id, ci.name, ci."ipShort", ci."productType", ci."characterName", ci."limitedType",
          ci."createdAt",
          ROW_NUMBER() OVER (PARTITION BY ci."ipShort" ORDER BY ci."createdAt" DESC) AS rn
        FROM "CatalogItem" ci
        WHERE ci."ipShort" IS NOT NULL
      )
      SELECT r.id, r.name, r."ipShort", r."productType", r."characterName", r."limitedType",
        ps."surugayaPrice", ps."mercariMedian", ps."mercariCount",
        ps."createdAt" AS "snapshotAt", ps."trendDirection", ps."diffPercent"
      FROM ranked r
      LEFT JOIN "PriceSnapshot" ps ON ps."itemId" = r.id
        AND ps."createdAt" = (SELECT MAX("createdAt") FROM "PriceSnapshot" WHERE "itemId" = r.id)
      WHERE r.rn = 1
      ORDER BY r."createdAt" DESC LIMIT 10
    `),
    prisma.$queryRawUnsafe<IpSummaryRow[]>(`
      SELECT
        ci."ipShort" as ip,
        COUNT(*)::int as "itemCount",
        AVG(ps."mercariMedian") as "avgPrice",
        MAX(ps."mercariMedian") as "maxPrice"
      FROM "CatalogItem" ci
      LEFT JOIN "PriceSnapshot" ps ON ps."itemId" = ci.id
        AND ps."createdAt" = (SELECT MAX("createdAt") FROM "PriceSnapshot" WHERE "itemId" = ci.id)
      WHERE ci."ipShort" IS NOT NULL
      GROUP BY ci."ipShort"
      ORDER BY "itemCount" DESC
    `),
    prisma.$queryRawUnsafe<EventRow[]>(
      `SELECT "ipTitle", "ipShort", "eventType", "eventLabel", "startDate", "endDate"
       FROM "IpEvent" WHERE substr("startDate", 6, 5) = $1
       ORDER BY "startDate"`,
      mmdd
    ),
    prisma.$queryRawUnsafe<EventRow[]>(
      `SELECT "ipTitle", "ipShort", "eventType", "eventLabel", "startDate", "endDate"
       FROM "IpEvent" WHERE "startDate" >= $1 AND "startDate" <= $2
       ORDER BY "startDate" DESC LIMIT 8`,
      threeMonthsAgoStr,
      todayStr
    ),
    prisma.$queryRawUnsafe<EventRow[]>(
      `SELECT "ipTitle", "ipShort", "eventType", "eventLabel", "startDate", "endDate"
       FROM "IpEvent" WHERE "startDate" > $1
       ORDER BY "startDate" ASC LIMIT 5`,
      todayStr
    ),
    prisma.$queryRawUnsafe<TypeDistRow[]>(`
      SELECT "productType", COUNT(*)::int as count FROM "CatalogItem"
      WHERE "productType" IS NOT NULL
      GROUP BY "productType" ORDER BY count DESC
    `),
    prisma.$queryRawUnsafe<ItemRow[]>(`
      WITH latest AS (
        SELECT ci.id, ci.name, ci."ipShort", ci."productType", ci."characterName", ci."limitedType",
          ps."surugayaPrice", ps."mercariMedian", ps."mercariCount",
          ps."createdAt" AS "snapshotAt", ps."trendDirection", ps."diffPercent"
        FROM "CatalogItem" ci
        JOIN "PriceSnapshot" ps ON ps."itemId" = ci.id
        WHERE ps."createdAt" = (SELECT MAX("createdAt") FROM "PriceSnapshot" WHERE "itemId" = ci.id)
          AND ps."mercariMedian" IS NOT NULL
      ), ranked AS (
        SELECT *, ROW_NUMBER() OVER (
          PARTITION BY name, "ipShort", "productType", "characterName", "limitedType"
          ORDER BY "mercariCount" DESC, "snapshotAt" DESC, id
        ) AS rn
        FROM latest
      )
      SELECT id, name, "ipShort", "productType", "characterName", "limitedType",
        "surugayaPrice", "mercariMedian", "mercariCount", "snapshotAt",
        "trendDirection", "diffPercent"
      FROM ranked WHERE rn = 1
      ORDER BY "mercariMedian" DESC LIMIT 5
    `),
  ]);

  return {
    stats: {
      items: itemCount,
      ips: Number(ipCountRow[0]?.c ?? 0),
      snapshots: snapshotCount,
    },
    rising,
    newItems,
    ipSummary: ipSummary.map((r) => ({
      ...r,
      itemCount: Number(r.itemCount),
    })),
    todayEvents,
    recentEvents,
    upcomingEvents,
    typeDist: typeDist.map((r) => ({ ...r, count: Number(r.count) })),
    highValue,
  };
}, ["home-top-data-v3"], { revalidate: 21600 });

function StatBadge({
  num,
  label,
  color,
}: {
  num: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="text-2xl font-bold tabular-nums sm:text-3xl"
        style={{ color }}
      >
        {num.toLocaleString()}
      </span>
      <span className="mt-1 text-[11px] text-zinc-400 sm:text-xs">{label}</span>
    </div>
  );
}

function Card({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
      <header
        className="border-b border-zinc-100 px-5 py-3"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <h2 className="text-sm font-bold text-zinc-700">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function TrendRow({ item }: { item: ItemRow }) {
  const td = item.trendDirection ?? 0;
  const positive = td > 0;
  return (
    <Link
      href={`/catalog/${item.id}`}
      className="flex items-center gap-2 border-b border-zinc-100 py-2.5 last:border-0 hover:bg-zinc-50"
    >
      <span
        className={`shrink-0 min-w-[48px] rounded px-1.5 py-0.5 text-right text-[13px] font-bold tabular-nums ${
          td > 50
            ? "bg-emerald-50 text-emerald-600"
            : positive
            ? "text-emerald-600"
            : "text-rose-600"
        }`}
      >
        {positive ? "+" : ""}
        {Math.round(td)}%
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] leading-snug text-zinc-700 sm:line-clamp-1 sm:truncate">
          {item.name}
        </p>
        <p className="truncate text-[11px] text-zinc-400">
          {item.ipShort}
          {item.limitedType ? ` · ${item.limitedType}` : ""}
        </p>
        <p className="truncate text-[10px] text-zinc-400">
          sold {item.mercariCount ?? 0}件 · 直近7〜14日と過去15日以前を比較 ·
          更新 {item.snapshotAt ? new Date(item.snapshotAt).toLocaleDateString("ja-JP") : "—"}
        </p>
      </div>
      <span className="shrink-0 text-[13px] font-semibold text-zinc-700 tabular-nums">
        {item.mercariMedian ? `¥${item.mercariMedian.toLocaleString()}` : "—"}
      </span>
    </Link>
  );
}

function HighValueRow({ item }: { item: ItemRow }) {
  return (
    <Link
      href={`/catalog/${item.id}`}
      className="flex items-center gap-3 border-b border-zinc-100 py-2.5 last:border-0 hover:bg-zinc-50"
    >
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] leading-snug text-zinc-700 sm:line-clamp-1 sm:truncate">
          {item.name}
        </p>
        <p className="truncate text-[11px] text-zinc-400">
          {item.ipShort}
          {item.productType ? ` / ${item.productType}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-[15px] font-bold text-zinc-700 tabular-nums">
        ¥{item.mercariMedian?.toLocaleString()}
      </span>
    </Link>
  );
}

function SimpleRow({ item }: { item: ItemRow }) {
  return (
    <Link
      href={`/catalog/${item.id}`}
      className="flex items-center gap-2 border-b border-zinc-50 py-1.5 last:border-0 hover:bg-zinc-50"
    >
      <span className="shrink-0 text-[11px] text-zinc-400">{item.ipShort ?? "—"}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-600">
        {item.name}
      </span>
    </Link>
  );
}

function EventRowEl({ ev, showDate }: { ev: EventRow; showDate?: boolean }) {
  const dateStr =
    showDate && ev.endDate
      ? `${ev.startDate} 〜 ${ev.endDate}`
      : ev.startDate;
  return (
    <div className="flex items-start gap-1.5 border-b border-zinc-50 py-2 text-[13px] last:border-0">
      <span className="shrink-0 mt-0.5">{EVENT_EMOJI[ev.eventType] || "📌"}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-zinc-400">{dateStr}</p>
        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="font-medium text-sky-700">
            {ev.ipShort || ev.ipTitle}
          </span>
          <span className="text-zinc-500">{ev.eventLabel}</span>
        </p>
      </div>
    </div>
  );
}

export default async function Home() {
  const data = await getTopData();

  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6 md:px-8">
        <section className="rounded-2xl bg-sky-50 p-5 text-center sm:p-7">
          <p className="text-sm font-semibold text-sky-500">
            アニメ・ホビーグッズの相場データベース
          </p>
          <div className="mt-4 flex justify-center gap-5 sm:gap-10">
            <StatBadge num={data.stats.items} label="商品" color="#6ec6e6" />
            <StatBadge num={data.stats.ips} label="作品" color="#8fd4c8" />
            <StatBadge
              num={data.stats.snapshots}
              label="価格データ"
              color="#c4a8e0"
            />
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <Card title="今日の急上昇" accent="#4caf50">
              {data.rising.length === 0 ? (
                <p className="py-2 text-[13px] text-zinc-300">該当なし</p>
              ) : (
                data.rising.map((item) => (
                  <TrendRow key={item.id} item={item} />
                ))
              )}
            </Card>
            <Card title="高額商品" accent="#f0a030">
              {data.highValue.map((item) => (
                <HighValueRow key={item.id} item={item} />
              ))}
            </Card>
            <Card title="新しい商品" accent="#6ec6e6">
              {data.newItems.slice(0, 8).map((item) => (
                <SimpleRow key={item.id} item={item} />
              ))}
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="最近の出来事" accent="#64b5f6">
              {data.recentEvents.length > 0 ? (
                data.recentEvents.map((ev, i) => (
                  <EventRowEl key={i} ev={ev} />
                ))
              ) : (
                <p className="py-2 text-[13px] text-zinc-300">
                  現在進行中のイベントはありません
                </p>
              )}
              {data.upcomingEvents.length > 0 && (
                <div className="mt-3.5">
                  <p className="mb-2 text-[12px] font-bold text-zinc-400">
                    今後の予定
                  </p>
                  {data.upcomingEvents.map((ev, i) => (
                    <EventRowEl key={i} ev={ev} showDate />
                  ))}
                </div>
              )}
            </Card>

            <Card title="今日は何の日" accent="#ce93d8">
              {data.todayEvents.length > 0 ? (
                data.todayEvents.map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 border-b border-zinc-50 py-1.5 text-[13px] last:border-0"
                  >
                    <span className="text-[11px] text-zinc-400">
                      {ev.startDate.slice(0, 4)}年
                    </span>
                    <span className="font-semibold text-zinc-600">
                      {ev.ipTitle}
                    </span>
                    <span className="text-zinc-400">{ev.eventLabel}</span>
                  </div>
                ))
              ) : (
                <p className="py-2 text-[13px] text-zinc-300">
                  今日に関連するイベントはありません
                </p>
              )}
            </Card>


            <Card title="インフォメーション" accent="#90a4ae">
              <p className="text-[13px] leading-7 text-zinc-500">
                データ収集開始: 2026-04-18
                <br />
                定期更新: 毎週水曜・日曜 06:00
                <br />
                データソース: 駿河屋 / メルカリsold
              </p>
            </Card>
          </div>
        </div>

        <Card title="カテゴリポータル" accent="#6ec6e6">
          {(() => {
            const EXCLUDED_IPS = new Set([
              "プリキュア横断",
              "プリキュア変身玩具",
              "プリキュアリボン",
            ]);
            const IP_MIN = 10;
            const TYPE_MIN = 20;
            const ips = data.ipSummary.filter(
              (ip) => ip.itemCount >= IP_MIN && !EXCLUDED_IPS.has(ip.ip)
            );
            const types = data.typeDist.filter((t) => t.count >= TYPE_MIN);
            return (
              <>
                <div className="mb-2 flex items-baseline gap-2">
                  <p className="text-[12px] font-bold text-zinc-400">作品別</p>
                  <p className="text-[10px] text-zinc-300">
                    {IP_MIN}件以上を表示（全{data.ipSummary.length}作品中{ips.length}件）
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ips.map((ip) => (
                    <Link
                      key={ip.ip}
                      href={buildIpPath(ip.ip)}
                      className="flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3.5 py-1.5"
                    >
                      <span className="text-[13px] font-medium text-sky-700">
                        {ip.ip}
                      </span>
                      <span className="text-[11px] text-sky-300 tabular-nums">
                        {ip.itemCount}
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="mt-5 mb-2 flex items-baseline gap-2">
                  <p className="text-[12px] font-bold text-zinc-400">商品種別</p>
                  <p className="text-[10px] text-zinc-300">
                    {TYPE_MIN}件以上を表示（全{data.typeDist.length}種別中{types.length}件）
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {types.map((t) => (
                    <span
                      key={t.productType}
                      className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5"
                    >
                      <span className="text-[12px] text-stone-500">
                        {t.productType}
                      </span>
                      <span className="text-[11px] text-stone-300 tabular-nums">
                        {t.count}
                      </span>
                    </span>
                  ))}
                </div>
              </>
            );
          })()}
        </Card>

      </main>
    </div>
  );
}
