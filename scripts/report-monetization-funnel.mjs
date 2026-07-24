import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const requestedDays = Number(process.argv[2] ?? 7);
const days =
  Number.isFinite(requestedDays) && requestedDays > 0 && requestedDays <= 90
    ? requestedDays
    : 7;
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

try {
  const [pageViews, clicks, clickSections, referrers] = await Promise.all([
    prisma.pageViewEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.linkClickEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.linkClickEvent.groupBy({
      by: ["section"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.pageViewEvent.groupBy({
      by: ["referrerHost"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  clickSections.sort((a, b) => b._count._all - a._count._all);
  referrers.sort((a, b) => b._count._all - a._count._all);

  const outboundClicksPerView =
    pageViews > 0 ? Math.round((clicks / pageViews) * 10_000) / 100 : null;

  console.log(`Period: last ${days} days (since ${since.toISOString()})`);
  console.log(`Catalog page views: ${pageViews}`);
  console.log(`Outbound clicks: ${clicks}`);
  console.log(
    `Outbound clicks per 100 page views: ${outboundClicksPerView ?? "n/a"}`,
  );

  console.log("\nClicks by section:");
  if (clickSections.length === 0) console.log("  none");
  for (const row of clickSections) {
    console.log(`  ${row.section}: ${row._count._all}`);
  }

  console.log("\nPage views by referrer host:");
  if (referrers.length === 0) console.log("  none");
  for (const row of referrers.slice(0, 20)) {
    console.log(`  ${row.referrerHost ?? "direct/unknown"}: ${row._count._all}`);
  }
} finally {
  await prisma.$disconnect();
}
