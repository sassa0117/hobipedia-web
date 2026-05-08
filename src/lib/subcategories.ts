export const SUBCATEGORIES: Record<string, RegExp> = {
  // 玩具系（シルバニア・トミカ・プラレール等）
  "お家": /お家|ハウス|お屋敷|住宅/i,
  "家具": /家具|ベッド|ソファ|テーブル|タンス|食器棚|チェスト/i,
  "食器・キッチン": /食器|キッチン|台所|お皿|お料理|レストラン|ベーカリー|カフェ/i,
  "服・衣装": /ドレス|衣装|コスチューム|ポンチョ|お洋服/i,
  "乗り物": /車|カー|電車|バス|フェリー|船/i,
  "庭・遊具": /お庭|公園|遊具|ブランコ|すべり台/i,
  "学校・幼稚園": /学校|幼稚園|ようちえん|教室/i,
  "赤ちゃん": /赤ちゃん|あかちゃん|ベビー/i,

  // アニメ・キャラグッズ系
  "フィギュア": /フィギュア|figure|スケール|プライズ/i,
  "アクスタ": /アクリルスタンド|アクスタ|アクリルフィギュア/i,
  "アクキー": /アクリルキーホルダー|アクキー/i,
  "缶バッジ": /缶バッジ|缶バッチ/i,
  "ぬいぐるみ": /ぬいぐるみ|マスコット|プラッシュ/i,
  "キーホルダー": /キーホルダー|チャーム/i,
  "ラバスト": /ラバーストラップ|ラバスト|ラバマス/i,
  "トレカ": /トレカ|トレーディングカード|カード/i,
  "ブロマイド": /ブロマイド|生写真|写真/i,
  "クリアファイル": /クリアファイル/i,
  "タペストリー": /タペストリー|布ポスター/i,
  "一番くじ": /一番くじ|一番賞/i,
  "食玩": /食玩|お菓子付/i,
  "DX玩具": /DX|変身ベルト|なりきり/i,
  "ぱしゃこれ": /ぱしゃこれ|ぱしゃっつ|ぱしゃけっと/i,

  // 文具・雑貨
  "文具": /ノート|ペン|鉛筆|消しゴム|定規|シャープ/i,
  "シール": /シール|ステッカー/i,
  "カレンダー": /カレンダー/i,
  "バッグ": /トートバッグ|ポーチ|リュック|バックパック/i,
  "アパレル": /Tシャツ|パーカー|キャップ|スウェット/i,

  // 限定性タグ（カテゴリ chip としても機能）
  "プレバン限定": /プレミアムバンダイ|プレバン/i,
  "会場限定": /会場限定|イベント限定|現地限定/i,
  "オンライン限定": /オンラインショップ.{0,3}限定|公式オンライン|オンライン限定/i,
  "コラボカフェ": /コラボカフェ|コラボレストラン|コラボショップ/i,
};

export function classify(name: string): string[] {
  if (!name) return [];
  return Object.entries(SUBCATEGORIES)
    .filter(([, regex]) => regex.test(name))
    .map(([label]) => label);
}

export function classifyMany(items: { id: string; name: string }[]): {
  byLabel: Map<string, Set<string>>;
  countByLabel: Map<string, number>;
} {
  const byLabel = new Map<string, Set<string>>();
  for (const it of items) {
    for (const label of classify(it.name)) {
      if (!byLabel.has(label)) byLabel.set(label, new Set());
      byLabel.get(label)!.add(it.id);
    }
  }
  const countByLabel = new Map<string, number>();
  for (const [k, v] of byLabel) countByLabel.set(k, v.size);
  return { byLabel, countByLabel };
}
