// CatalogItem 同名重複の merge スクリプト
//
// 重複判定: name + ipShort が一致する複数の CatalogItem
// keeper 選定: createdAt 最古
// 移動: PriceSnapshot / MercariSoldRecord の itemId を keeper に書き換え
//       MercariSoldRecord は @@unique([itemId, soldDate, price]) のため衝突時は削除
// 後始末: loser CatalogItem を削除
//
// 使い方:
//   node scripts/merge-catalog-duplicates.mjs            # DRY-RUN（件数のみ）
//   node scripts/merge-catalog-duplicates.mjs --apply    # 本実行
//
// 削除した loser id は logs/merged-catalog-loser-ids.json に出力。
// SQLite 側同期は別スクリプト (cleanup-merged-catalog-sqlite.mjs) で。

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const DRY_RUN = !process.argv.includes("--apply");
const prisma = new PrismaClient();

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "APPLY (本番更新)"}`);
  console.log(`Started: ${new Date().toISOString()}`);

  // 重複グループ取得
  const groups = await prisma.$queryRawUnsafe(`
    SELECT name, "ipShort", COUNT(*) AS n
    FROM "CatalogItem"
    GROUP BY name, "ipShort"
    HAVING COUNT(*) > 1
    ORDER BY n DESC
  `);

  console.log(`\n重複グループ: ${groups.length}`);
  let totalItems = 0;
  let totalLosers = 0;
  for (const g of groups) {
    totalItems += Number(g.n);
    totalLosers += Number(g.n) - 1;
  }
  console.log(`総 itemId: ${totalItems}`);
  console.log(`loser 候補（削除予定）: ${totalLosers}`);

  // DRY-RUN: 連動 PriceSnapshot/MercariSoldRecord も件数だけ把握する
  let snapMove = 0;
  let soldMove = 0;
  let soldConflict = 0;
  const loserIdsAll = [];

  const startedAt = Date.now();
  let processed = 0;

  for (const g of groups) {
    const items = await prisma.catalogItem.findMany({
      where: { name: g.name, ipShort: g.ipShort },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const keeperId = items[0].id;
    const loserIds = items.slice(1).map((i) => i.id);
    loserIdsAll.push(...loserIds);

    const snapCount = await prisma.priceSnapshot.count({
      where: { itemId: { in: loserIds } },
    });
    snapMove += snapCount;

    // MercariSoldRecord は衝突判定が必要
    const records = await prisma.mercariSoldRecord.findMany({
      where: { itemId: { in: loserIds } },
      select: { id: true, soldDate: true, price: true },
    });

    // keeper 側の既存 (soldDate, price) セット
    const keeperRecords = await prisma.mercariSoldRecord.findMany({
      where: { itemId: keeperId },
      select: { soldDate: true, price: true },
    });
    const keeperKeys = new Set(
      keeperRecords.map((r) => `${r.soldDate}|${r.price}`)
    );

    // loser 側の records を処理
    const seenInLoser = new Set();
    for (const r of records) {
      const key = `${r.soldDate}|${r.price}`;
      if (keeperKeys.has(key) || seenInLoser.has(key)) {
        soldConflict++;
        if (!DRY_RUN) {
          await prisma.mercariSoldRecord.delete({ where: { id: r.id } });
        }
      } else {
        seenInLoser.add(key);
        keeperKeys.add(key); // 同じグループ内 loser 同士の衝突も防ぐ
        soldMove++;
        if (!DRY_RUN) {
          await prisma.mercariSoldRecord.update({
            where: { id: r.id },
            data: { itemId: keeperId },
          });
        }
      }
    }

    if (!DRY_RUN) {
      // PriceSnapshot を一括移動
      await prisma.priceSnapshot.updateMany({
        where: { itemId: { in: loserIds } },
        data: { itemId: keeperId },
      });
      // loser CatalogItem を削除
      await prisma.catalogItem.deleteMany({
        where: { id: { in: loserIds } },
      });
    }

    processed++;
    if (processed % 50 === 0) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      process.stdout.write(
        `  ${processed}/${groups.length} groups (${elapsed}s)\r`
      );
    }
  }

  console.log(`\n\n--- 集計 ---`);
  console.log(`PriceSnapshot 移動: ${snapMove}`);
  console.log(`MercariSoldRecord 移動: ${soldMove}`);
  console.log(`MercariSoldRecord 衝突削除: ${soldConflict}`);
  console.log(`CatalogItem 削除: ${loserIdsAll.length}`);

  if (DRY_RUN) {
    console.log(
      "\nDRY-RUN 完了。本実行は --apply を付けて再実行（破壊的）。"
    );
  } else {
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const outPath = path.join(logsDir, "merged-catalog-loser-ids.json");
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          executedAt: new Date().toISOString(),
          backupTimestamp: "2026-05-13T11:40:32Z",
          loserIds: loserIdsAll,
        },
        null,
        2
      )
    );
    console.log(`\nloser id list 出力: ${outPath}`);
    console.log(`完了: ${new Date().toISOString()}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
