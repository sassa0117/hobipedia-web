import "dotenv/config";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH =
  process.env.LOCAL_SQLITE_PATH ??
  "C:/Users/user/ai-skills/sedori-research-app/dev.db";

const DRY_RUN = !process.argv.includes("--apply");
const BATCH_SIZE = 1000;

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const prisma = new PrismaClient();

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "APPLY (本番削除)"}`);
  console.log(`SQLite: ${SQLITE_PATH}`);

  const sqliteRows = sqlite.prepare("SELECT id FROM MercariSoldRecord").all();
  const sqliteIds = new Set(sqliteRows.map((r) => r.id));
  console.log(`SQLite MercariSoldRecord 総数: ${sqliteIds.size}件`);

  const neonRows = await prisma.mercariSoldRecord.findMany({
    select: { id: true },
  });
  console.log(`Neon  MercariSoldRecord 総数: ${neonRows.length}件`);

  const toDelete = neonRows
    .filter((r) => !sqliteIds.has(r.id))
    .map((r) => r.id);
  console.log(`削除対象（Neon のみに存在）: ${toDelete.length}件`);

  if (toDelete.length === 0) {
    console.log("削除対象なし。終了。");
    await prisma.$disconnect();
    sqlite.close();
    return;
  }

  // サンプル表示（汚染ケース目視確認用）
  const sample = await prisma.mercariSoldRecord.findMany({
    where: { id: { in: toDelete.slice(0, 15) } },
  });
  const itemIds = [...new Set(sample.map((s) => s.itemId))];
  const items = await prisma.catalogItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, ipShort: true },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));
  console.log("\nサンプル（先頭15件）:");
  for (const r of sample) {
    const item = itemMap.get(r.itemId);
    const name = (item?.name ?? "(no item)").slice(0, 50);
    console.log(
      `  id=${r.id.slice(0, 8)} ip=${item?.ipShort ?? "-"} item=${name} price=${r.price} verdict=${r.geminiVerdict ?? "null"}`
    );
  }

  // verdict 分布
  const verdictCounts = await prisma.mercariSoldRecord.groupBy({
    by: ["geminiVerdict"],
    where: { id: { in: toDelete } },
    _count: { _all: true },
  });
  console.log("\n削除対象の verdict 分布:");
  for (const v of verdictCounts) {
    console.log(`  ${v.geminiVerdict ?? "null"}: ${v._count._all}件`);
  }

  if (DRY_RUN) {
    console.log("\nDRY-RUN: 削除スキップ。本番実行は --apply を付けて再実行。");
    await prisma.$disconnect();
    sqlite.close();
    return;
  }

  console.log("\n--- 本番削除開始 ---");
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    const result = await prisma.mercariSoldRecord.deleteMany({
      where: { id: { in: chunk } },
    });
    deleted += result.count;
    process.stdout.write(`  ${deleted}/${toDelete.length}\r`);
  }
  console.log(`\n削除完了: ${deleted}件`);

  await prisma.$disconnect();
  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
