import type { Metadata } from "next";
import { TrustPage } from "../_components/TrustPage";

const CORRECTION_URL =
  "https://github.com/sassa0117/hobipedia-web/issues/new?title=%5B%E3%83%87%E3%83%BC%E3%82%BF%E8%A8%82%E6%AD%A3%5D%20";

export const metadata: Metadata = {
  title: "データ訂正窓口",
  description: "Hobipediaに掲載された商品・価格・権利情報の訂正依頼を受け付けます。",
};

export default function CorrectionPage() {
  return (
    <TrustPage
      title="データ訂正窓口"
      description="商品・価格・画像・権利情報等の誤りや、掲載上の懸念をお知らせください。"
    >
      <h2>訂正を依頼できる内容</h2>
      <ul>
        <li>商品名、作品名、メーカー、発売情報等の誤り</li>
        <li>異なる商品や状態が混在している価格データ</li>
        <li>重複ページ、リンク切れ、表示不具合</li>
        <li>画像、商標、著作物その他の権利に関する連絡</li>
        <li>掲載の停止または検索結果からの除外に関する相談</li>
      </ul>

      <h2>依頼方法</h2>
      <p>
        公開リポジトリのIssueで受け付けています。対象ページのURL、訂正したい箇所、正しい内容、確認できる公開資料のURLを記載してください。
      </p>
      <p>
        <a
          href={CORRECTION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-full bg-sky-500 px-5 py-2.5 font-bold text-white no-underline hover:bg-sky-600 hover:text-white"
        >
          データ訂正を依頼する
        </a>
      </p>

      <blockquote>
        依頼内容はインターネット上に公開されます。個人情報、非公開の契約情報、本人確認書類、公開できない権利資料は投稿しないでください。
      </blockquote>

      <h2>確認と対応</h2>
      <ol>
        <li>対象ページと依頼内容を確認します。</li>
        <li>公開資料、取得元、取得日時、商品の同一性等を照合します。</li>
        <li>確認結果に応じて、訂正、注記、統合、非掲載化等を行います。</li>
        <li>判断できない場合は、追加の公開資料をお願いすることがあります。</li>
      </ol>
      <p>
        市場価格は時点、状態、付属品、取引条件等で変わるため、単に現在の販売価格と異なることだけを理由に過去データを削除するとは限りません。明確な誤紐付けや集計上の問題は優先して確認します。
      </p>

      <h2>権利者からの連絡</h2>
      <p>
        権利侵害の申告では、対象URL、権利の対象、申告者が権利者または正当な代理人であることを確認できる公開情報をお知らせください。公開窓口へ記載できない資料を必要とする場合は、公開情報のみで初回連絡を行い、その旨を記載してください。
      </p>
    </TrustPage>
  );
}
