// SQLite側のCatalogItem重複merge（Neon用と同じロジック）
//
// nightlyのmaster側はSQLite。SQLiteで重複を残すと次回migrateで復活する。
//
// 使い方:
//   node scripts/merge-catalog-duplicates-sqlite.mjs            # DRY-RUN
//   node scripts/merge-catalog-duplicates-sqlite.mjs --apply    # 本実行
//
// keeper選定はNeon版と同じ（createdAt最古）。両DBでcreatedAtは一致するので
// 同じkeeperが選ばれる前提。

import "dotenv/config";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const SQLITE_PATH =
  process.env.LOCAL_SQLITE_PATH ??
  "C:/Users/user/ai-skills/sedori-research-app/dev.db";

const DRY_RUN = !process.argv.includes("--apply");

const db = new Database(SQLITE_PATH);

function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "APPLY (本番更新)"}`);
  console.log(`SQLite: ${SQLITE_PATH}`);
  console.log(`Started: ${new Date().toISOString()}`);

  // CatalogItem の総数（参考）
  const total = db
    .prepare("SELECT COUNT(*) AS n FROM CatalogItem")
    .get().n;
  console.log(`\nCatalogItem 総数（before）: ${total}`);

  // 重複グループ
  const groups = db
    .prepare(
      `
      SELECT name, ipShort, COUNT(*) AS n
      FROM CatalogItem
      GROUP BY name, ipShort
      HAVING COUNT(*) > 1
      ORDER BY n DESC
    `
    )
    .all();

  console.log(`重複グループ: ${groups.length}`);
  let totalItems = 0;
  let totalLosers = 0;
  for (const g of groups) {
    totalItems += g.n;
    totalLosers += g.n - 1;
  }
  console.log(`総 itemId: ${totalItems}`);
  console.log(`loser 候補（削除予定）: ${totalLosers}`);

  let snapMove = 0;
  let soldMove = 0;
  let soldConflict = 0;
  const loserIdsAll = [];

  const stmtItems = db.prepare(
    `SELECT id FROM CatalogItem WHERE name = ? AND ${
      "ipShort IS ?"
    } ORDER BY createdAt ASC`
  );
  const stmtItemsNull = db.prepare(
    `SELECT id FROM CatalogItem WHERE name = ? AND ipShort IS NULL ORDER BY createdAt ASC`
  );
  const stmtSnapCount = db.prepare(
    `SELECT COUNT(*) AS n FROM PriceSnapshot WHERE itemId IN (SELECT value FROM json_each(?))`
  );
  const stmtSoldRecords = db.prepare(
    `SELECT id, soldDate, price FROM MercariSoldRecord WHERE itemId IN (SELECT value FROM json_each(?))`
  );
  const stmtKeeperRecords = db.prepare(
    `SELECT soldDate, price FROM MercariSoldRecord WHERE itemId = ?`
  );
  const stmtSoldDelete = db.prepare(`DELETE FROM MercariSoldRecord WHERE id = ?`);
  const stmtSoldUpdate = db.prepare(
    `UPDATE MercariSoldRecord SET itemId = ? WHERE id = ?`
  );
  const stmtSnapUpdate = db.prepare(
    `UPDATE PriceSnapshot SET itemId = ? WHERE itemId IN (SELECT value FROM json_each(?))`
  );
  const stmtCatalogDelete = db.prepare(
    `DELETE FROM CatalogItem WHERE id IN (SELECT value FROM json_each(?))`
  );

  const startedAt = Date.now();
  let processed = 0;

  const apply = !DRY_RUN
    ? db.transaction(() => {
        runAll();
      })
    : runAll;

  function runAll() {
    for (const g of groups) {
      const items =
        g.ipShort == null
          ? stmtItemsNull.all(g.name)
          : stmtItems.all(g.name, g.ipShort);
      const keeperId = items[0].id;
      const loserIds = items.slice(1).map((i) => i.id);
      loserIdsAll.push(...loserIds);

      const loserJson = JSON.stringify(loserIds);

      // PriceSnapshot 件数
      const snapCount = stmtSnapCount.get(loserJson).n;
      snapMove += snapCount;

      // MercariSoldRecord 衝突判定
      const records = stmtSoldRecords.all(loserJson);
      const keeperRecords = stmtKeeperRecords.all(keeperId);
      const keeperKeys = new Set(
        keeperRecords.map((r) => `${r.soldDate}|${r.price}`)
      );
      const seenInLoser = new Set();
      for (const r of records) {
        const key = `${r.soldDate}|${r.price}`;
        if (keeperKeys.has(key) || seenInLoser.has(key)) {
          soldConflict++;
          if (!DRY_RUN) stmtSoldDelete.run(r.id);
        } else {
          seenInLoser.add(key);
          keeperKeys.add(key);
          soldMove++;
          if (!DRY_RUN) stmtSoldUpdate.run(keeperId, r.id);
        }
      }

      if (!DRY_RUN) {
        stmtSnapUpdate.run(keeperId, loserJson);
        stmtCatalogDelete.run(loserJson);
      }

      processed++;
      if (processed % 50 === 0) {
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        process.stdout.write(
          `  ${processed}/${groups.length} groups (${elapsed}s)\r`
        );
      }
    }
  }

  apply();

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
    const totalAfter = db
      .prepare("SELECT COUNT(*) AS n FROM CatalogItem")
      .get().n;
    console.log(`CatalogItem 総数（after）: ${totalAfter}`);

    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const outPath = path.join(
      logsDir,
      "merged-catalog-loser-ids-sqlite.json"
    );
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          executedAt: new Date().toISOString(),
          loserIds: loserIdsAll,
        },
        null,
        2
      )
    );
    console.log(`loser id list 出力: ${outPath}`);
    console.log(`完了: ${new Date().toISOString()}`);
  }

  db.close();
}

main();
