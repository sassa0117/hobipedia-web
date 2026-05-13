import "dotenv/config";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH =
  process.env.LOCAL_SQLITE_PATH ??
  "C:/Users/user/ai-skills/sedori-research-app/dev.db";

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const prisma = new PrismaClient();

const BATCH = 500;

function toDate(v) {
  if (v == null) return null;
  if (typeof v === "string") return new Date(v);
  if (typeof v === "number") return new Date(v);
  return v;
}

const INT_MAX = 2_147_483_647;
const clip = (v) => (v == null ? null : Math.abs(v) > INT_MAX ? null : v);

// ISO文字列に正規化（SQLiteのDATETIME比較用）
function toIso(d) {
  if (!d) return "1970-01-01T00:00:00.000Z";
  return new Date(d).toISOString();
}

// SQLite の datetime('now') 形式 "YYYY-MM-DD HH:MM:SS" に変換。
// batch-gemini-match.mjs が geminiCheckedAt を SQLite datetime() で書いているため、
// ISO8601 と文字列比較すると ASCII スペース(0x20) < T(0x54) で常に false 判定になる。
// geminiCheckedAt 比較時はこちらを使う。
function toSqliteDatetime(d) {
  if (!d) return "1970-01-01 00:00:00";
  return new Date(d).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

// 新規のみcreateMany skipDuplicates（PriceSnapshot/IpEvent向け、不変レコード用）
async function appendNew(tableName, model, sqliteWhere, sqliteParams, transform) {
  const rows = sqlite.prepare(`SELECT * FROM ${tableName} WHERE ${sqliteWhere}`).all(...sqliteParams);
  console.log(`[${tableName}] new=${rows.length}`);
  if (rows.length === 0) return;

  const data = rows.map(transform);
  for (let i = 0; i < data.length; i += BATCH) {
    const chunk = data.slice(i, i + BATCH);
    await prisma[model].createMany({ data: chunk, skipDuplicates: true });
    process.stdout.write(`  ${Math.min(i + BATCH, data.length)}/${data.length}\r`);
  }
  console.log();
}

// 差分upsert（CatalogItem/MercariSoldRecord向け、更新のあるレコード）
// whereBuilder: (row) => Prisma upsert.where 句
async function upsertDiff(tableName, model, whereBuilder, sqliteWhere, sqliteParams, transform) {
  const rows = sqlite.prepare(`SELECT * FROM ${tableName} WHERE ${sqliteWhere}`).all(...sqliteParams);
  console.log(`[${tableName}] upsert=${rows.length}`);
  if (rows.length === 0) return;

  let n = 0;
  let skipped = 0;
  for (const r of rows) {
    const data = transform(r);
    const where = whereBuilder(r);
    // 既存レコードのidを変えないため、updateからidを除外
    const { id: _omit, ...updateData } = data;
    try {
      await prisma[model].upsert({ where, create: data, update: updateData });
    } catch (e) {
      if (e.code === "P2002") {
        skipped++; // 別の一意制約衝突、スキップして継続
      } else {
        throw e;
      }
    }
    n++;
    if (n % 100 === 0) process.stdout.write(`  ${n}/${rows.length}\r`);
  }
  console.log(`  ${n}/${rows.length} (P2002 skip=${skipped})`);
}

async function main() {
  console.log("Sync SQLite → Postgres (差分upsert)...");

  // CatalogItem: updatedAt > Postgres max(updatedAt) のものをupsert
  const catalogLast = (await prisma.catalogItem.aggregate({ _max: { updatedAt: true } }))._max.updatedAt;
  await upsertDiff(
    "CatalogItem",
    "catalogItem",
    (r) => ({ id: r.id }),
    "updatedAt > ?",
    [toIso(catalogLast)],
    (r) => ({
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
    })
  );

  // PriceSnapshot: 不変なのでcreatedAt > 最終 のものだけ追加
  const snapLast = (await prisma.priceSnapshot.aggregate({ _max: { createdAt: true } }))._max.createdAt;
  await appendNew(
    "PriceSnapshot",
    "priceSnapshot",
    "createdAt > ?",
    [toIso(snapLast)],
    (r) => ({
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
    })
  );

  // MercariSoldRecord: createdAt OR geminiCheckedAt の更新があったらupsert
  const msLastCreate = (await prisma.mercariSoldRecord.aggregate({ _max: { createdAt: true } }))._max.createdAt;
  const msLastGemini = (await prisma.mercariSoldRecord.aggregate({ _max: { geminiCheckedAt: true } }))._max.geminiCheckedAt;
  // 早い方を採用（取りこぼし防止）
  const msSinceDate =
    msLastCreate && msLastGemini
      ? new Date(Math.min(msLastCreate.getTime(), msLastGemini.getTime()))
      : msLastCreate ?? msLastGemini;
  const msSinceIso = toIso(msSinceDate);          // createdAt 用（ISO8601）
  const msSinceSqlite = toSqliteDatetime(msSinceDate); // geminiCheckedAt 用（SQLite datetime）
  await upsertDiff(
    "MercariSoldRecord",
    "mercariSoldRecord",
    (r) => ({ itemId_soldDate_price: { itemId: r.itemId, soldDate: r.soldDate, price: r.price } }),
    "createdAt > ? OR (geminiCheckedAt IS NOT NULL AND geminiCheckedAt > ?)",
    [msSinceIso, msSinceSqlite],
    (r) => ({
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
    })
  );

  // IpEvent: 新規のみ
  const ipLast = (await prisma.ipEvent.aggregate({ _max: { createdAt: true } }))._max.createdAt;
  await appendNew(
    "IpEvent",
    "ipEvent",
    "createdAt > ?",
    [toIso(ipLast)],
    (r) => ({
      id: r.id,
      createdAt: toDate(r.createdAt),
      ipTitle: r.ipTitle,
      ipShort: r.ipShort,
      eventType: r.eventType,
      eventLabel: r.eventLabel,
      startDate: r.startDate,
      endDate: r.endDate,
    })
  );

  console.log("Done.");
  await prisma.$disconnect();
  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
