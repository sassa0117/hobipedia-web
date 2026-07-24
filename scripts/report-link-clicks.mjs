import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const total = await prisma.linkClickEvent.count();
  const first = await prisma.linkClickEvent.findFirst({
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  const last = await prisma.linkClickEvent.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const grouped = await prisma.linkClickEvent.groupBy({
    by: ["itemId", "ec", "section"],
    where: { itemId: { not: null } },
    _count: { _all: true },
  });
  grouped.sort((a, b) => b._count._all - a._count._all);

  const itemIds = [...new Set(grouped.map(({ itemId }) => itemId).filter(Boolean))];
  const items = await prisma.catalogItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, ipShort: true },
  });
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const totalsByItem = new Map();
  for (const row of grouped) {
    totalsByItem.set(row.itemId, (totalsByItem.get(row.itemId) ?? 0) + row._count._all);
  }

  console.log(`Total: ${total}`);
  console.log(
    `Period: ${first?.createdAt.toISOString() ?? "-"} -> ${last?.createdAt.toISOString() ?? "-"}`,
  );
  console.log("\nClicks by item:");
  for (const [itemId, count] of [...totalsByItem].sort((a, b) => b[1] - a[1])) {
    const item = itemsById.get(itemId);
    console.log(
      [
        count.toString().padStart(3),
        itemId,
        item?.ipShort ?? "-",
        item?.name ?? "-",
      ].join(" | "),
    );
  }

  console.log("\nClicks by item / destination / section:");

  for (const row of grouped) {
    const item = itemsById.get(row.itemId);
    console.log(
      [
        row._count._all.toString().padStart(3),
        row.ec.padEnd(18),
        row.section.padEnd(14),
        item?.ipShort ?? "-",
        item?.name ?? row.itemId,
      ].join(" | "),
    );
  }
} finally {
  await prisma.$disconnect();
}
