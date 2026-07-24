import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const [summary] = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*) FROM "CatalogItem")::int AS "items",
      (SELECT COUNT(*) FROM "PriceSnapshot")::int AS "snapshots",
      (SELECT COUNT(*) FROM "MercariSoldRecord")::int AS "soldRecords",
      (SELECT COUNT(*) FROM "CatalogItem" WHERE "ipShort" IS NULL)::int AS "missingIp",
      (SELECT COUNT(*) FROM "CatalogItem" WHERE "productType" IS NULL)::int AS "missingProductType",
      (SELECT COUNT(*) FROM "CatalogItem" WHERE "imageUrl" IS NULL)::int AS "missingImage",
      (SELECT COUNT(*) FROM "CatalogItem" WHERE "mercariKeyword" IS NULL)::int AS "missingMercariKeyword",
      (
        SELECT COUNT(*)
        FROM "CatalogItem" ci
        WHERE NOT EXISTS (
          SELECT 1 FROM "PriceSnapshot" ps WHERE ps."itemId" = ci.id
        )
      )::int AS "itemsWithoutSnapshot",
      (
        SELECT COUNT(*)
        FROM "PriceSnapshot" ps
        LEFT JOIN "CatalogItem" ci ON ci.id = ps."itemId"
        WHERE ci.id IS NULL
      )::int AS "orphanSnapshots",
      (
        SELECT COUNT(*)
        FROM "MercariSoldRecord" mr
        LEFT JOIN "CatalogItem" ci ON ci.id = mr."itemId"
        WHERE ci.id IS NULL
      )::int AS "orphanSoldRecords",
      (
        SELECT COUNT(*)
        FROM (
          SELECT "name", COALESCE("ipShort", ''), COUNT(*)
          FROM "CatalogItem"
          GROUP BY 1, 2
          HAVING COUNT(*) > 1
        ) duplicate_groups
      )::int AS "duplicateNameGroups",
      (SELECT MAX("updatedAt") FROM "CatalogItem") AS "latestItemUpdate",
      (SELECT MAX("createdAt") FROM "PriceSnapshot") AS "latestSnapshot",
      (SELECT MAX("createdAt") FROM "MercariSoldRecord") AS "latestSoldRecord"
  `);

  const verdicts = await prisma.$queryRawUnsafe(`
    SELECT
      COALESCE("geminiVerdict", 'UNSET') AS "verdict",
      COUNT(*)::int AS "count"
    FROM "MercariSoldRecord"
    GROUP BY 1
    ORDER BY 2 DESC
  `);

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), summary, verdicts }, null, 2));
} finally {
  await prisma.$disconnect();
}
