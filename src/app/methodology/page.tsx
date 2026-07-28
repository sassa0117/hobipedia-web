import type { Metadata } from "next";
import Link from "next/link";
import { TrustPage } from "../_components/TrustPage";

export const metadata: Metadata = {
  title: "データの見方・方法論",
  description:
    "Hobipediaが表示する相場・価格データの出所、数値の意味、確からしさの区別、更新時点、限界と訂正窓口を説明します。",
  alternates: { canonical: "https://hobipedia.jp/methodology" },
};

export default function MethodologyPage() {
  return (
    <TrustPage
      title="データの見方・方法論"
      description="Hobipediaが表示する相場・価格情報について、出所・数値の意味・確からしさ・更新時点・限界・訂正の6点を説明します。"
    >
      <section>
        <h2 className="mt-7 text-base font-bold text-zinc-800 sm:text-lg">
          1. データの出所
        </h2>
        <p className="mt-2">
          Hobipediaが取り込んでいるデータは次の2種類です。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>駿河屋の商品・価格情報</strong>
            ：商品名・カテゴリ・メーカー・定価・発売日・販売価格・在庫状況。駿河屋が公開している情報を定期的に取得しています。
          </li>
          <li>
            <strong>メルカリSOLDの実取引記録</strong>
            ：売値・売却日・状態・サムネイル。実際に取引が成立した記録（sold）だけを対象にしており、現在出品中の希望価格は相場の計算に使いません。
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mt-7 text-base font-bold text-zinc-800 sm:text-lg">
          2. 数値の意味
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>推定相場</strong>
            ：収集済みのメルカリSOLD記録の中央値です。平均値ではありません。
          </li>
          <li>
            <strong>駿河屋価格</strong>
            ：最新スナップショット取得時点の駿河屋販売価格です。
          </li>
          <li>
            <strong>駿河屋との差</strong>
            ：「推定相場 ÷ 駿河屋価格 − 1」をパーセントで表した比較値です。
          </li>
          <li>
            <strong>推移</strong>
            ：SOLD記録を日付でバケツ分けし（直近7日・なければ8〜14日前を「直近」、15〜30日前・なければ31日以上前を「過去」として探索）、各バケツ2件以上になる2区間の中央値を比較した変化率です。条件を満たすバケツがない場合は「—」になります。
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mt-7 text-base font-bold text-zinc-800 sm:text-lg">
          3. 確からしさの区別
        </h2>
        <p className="mt-2">
          メルカリSOLDの件数によって表示を変えています。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>SOLD 0件</strong>：推定相場を表示しません（「—」表示）。
          </li>
          <li>
            <strong>SOLD 1〜19件</strong>
            ：推定相場に「参考値」の注記を付けます。外れ値1件で中央値が大きく変わりやすい件数です。
          </li>
          <li>
            <strong>SOLD 20件以上</strong>：参考値注記なしで中央値を表示します。
          </li>
        </ul>
        <p className="mt-2">
          参考値・少数の成約履歴を売買判断の唯一の根拠にしないでください。
        </p>
      </section>

      <section>
        <h2 className="mt-7 text-base font-bold text-zinc-800 sm:text-lg">
          4. 更新時点
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            商品ページに表示する「<strong>価格データ更新</strong>
            」は、その商品の最新価格スナップショットを取得した日付です。メルカリSOLDの最終取得日と常に同じとは限りません。
          </li>
          <li>
            トップページの商品・価格件数はページ生成時点の集計値です。
          </li>
          <li>
            収集バッチは定期的に実行していますが、実行間隔や対象範囲はシステム状況により変わります。
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mt-7 text-base font-bold text-zinc-800 sm:text-lg">
          5. 外れ値・同一性・限界
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            セット販売・状態差・同名異商品・高額単発取引で相場が歪むことがあります。
          </li>
          <li>
            メルカリSOLDの収集対象は自動的に絞り込んでいますが、商品の同一性を完全に保証するものではありません。
          </li>
          <li>
            画像・商品説明・カテゴリ情報が欠けている商品があります。
          </li>
          <li>
            本サイトの情報は参考目的であり、売買の最終判断はご自身でお願いします。
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mt-7 text-base font-bold text-zinc-800 sm:text-lg">
          6. 訂正
        </h2>
        <p className="mt-2">
          データの誤りや気になる点は{" "}
          <Link href="/correction" className="text-sky-600 hover:underline">
            データ訂正
          </Link>{" "}
          ページからお知らせください。カタログページのURLを添えていただくと対応しやすくなります。公開のIssue形式のため、個人情報・非公開資料は送らないようにお願いします。
        </p>
      </section>
    </TrustPage>
  );
}
