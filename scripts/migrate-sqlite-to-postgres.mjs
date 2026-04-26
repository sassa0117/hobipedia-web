import "dotenv/config";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH =
  process.env.LOCAL_SQLITE_PATH ??
  "C:/Users/user/ai-skills/sedori-research-app/dev.db";

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const prisma = new PrismaClient();

const BATCH = 500;

async function migrateTable(tableName, model, transform = (r) => r) {
  const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
  console.log(`[${tableName}] ${rows.length} rows`);

  const data = rows.map(transform);

  for (let i = 0; i < data.length; i += BATCH) {
    const chunk = data.slice(i, i + BATCH);
    await prisma[model].createMany({ data: chunk, skipDuplicates: true });
    process.stdout.write(`  ${Math.min(i + BATCH, data.length)}/${data.length}\r`);
  }
  console.log();
}

function toDate(v) {
  if (v == null) return null;
  if (typeof v === "string") return new Date(v);
  if (typeof v === "number") return new Date(v);
  return v;
}

async function main() {
  console.log("Migrating SQLite → Postgres...");

  await migrateTable("CatalogItem", "catalogItem", (r) => ({
    id: r.id,
    createdAt: toDate(r.createdAt),
    updatedAt: toDate(r.updatedAt),
    surugayaUrl: r.surugayaUrl,
    name: r.name,
    category: r.category,
    maker: r.maker,
    listPrice: r.listPrice,
    releaseDate: r.releaseDate,
    description: r.description,
    venueTags: r.venueTags,
    productType: r.productType,
    characterName: r.characterName,
    ipTitle: r.ipTitle,
    eventName: r.eventName,
    limitedType: r.limitedType,
    searchKeyword: r.searchKeyword,
    ipShort: r.ipShort,
    mercariKeyword: r.mercariKeyword,
    imageUrl: r.imageUrl,
  }));

  const INT_MAX = 2_147_483_647;
  const clip = (v) => (v == null ? null : Math.abs(v) > INT_MAX ? null : v);

  await migrateTable("PriceSnapshot", "priceSnapshot", (r) => ({
    id: r.id,
    createdAt: toDate(r.createdAt),
    itemId: r.itemId,
    surugayaPrice: clip(r.surugayaPrice),
    soldOut: !!r.soldOut,
    mercariMedian: clip(r.mercariMedian),
    mercariCount: clip(r.mercariCount) ?? 0,
    weeklyTrend: r.weeklyTrend,
    diffPercent: r.diffPercent,
    trendDirection: r.trendDirection,
  }));

  await migrateTable("MercariSoldRecord", "mercariSoldRecord", (r) => ({
    id: r.id,
    createdAt: toDate(r.createdAt),
    itemId: r.itemId,
    price: r.price,
    soldDate: r.soldDate,
    mercariName: r.mercariName,
    mercariItemId: r.mercariItemId,
    thumbnailUrl: r.thumbnailUrl,
    itemConditionId: r.itemConditionId,
    geminiVerdict: r.geminiVerdict,
    geminiCheckedAt: toDate(r.geminiCheckedAt),
  }));

  await migrateTable("IpEvent", "ipEvent", (r) => ({
    id: r.id,
    createdAt: toDate(r.createdAt),
    ipTitle: r.ipTitle,
    ipShort: r.ipShort,
    eventType: r.eventType,
    eventLabel: r.eventLabel,
    startDate: r.startDate,
    endDate: r.endDate,
  }));

  console.log("Done.");
  await prisma.$disconnect();
  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
