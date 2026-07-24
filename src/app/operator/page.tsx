import type { Metadata } from "next";
import Link from "next/link";
import { TrustPage } from "../_components/TrustPage";

export const metadata: Metadata = {
  title: "運営者情報",
  description: "Hobipediaの運営方針とサイト情報を掲載しています。",
};

export default function OperatorPage() {
  return (
    <TrustPage
      title="運営者情報"
      description="Hobipediaの運営方針、収益の仕組み、連絡窓口を掲載しています。"
    >
      <h2>サイト情報</h2>
      <table>
        <tbody>
          <tr>
            <th>サイト名</th>
            <td>Hobipedia</td>
          </tr>
          <tr>
            <th>URL</th>
            <td>https://hobipedia.jp</td>
          </tr>
          <tr>
            <th>運営</th>
            <td>Hobipedia運営</td>
          </tr>
          <tr>
            <th>開始</th>
            <td>2026年4月</td>
          </tr>
          <tr>
            <th>連絡窓口</th>
            <td>
              <Link href="/inquiry">お問い合わせ</Link>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>運営目的</h2>
      <p>
        アニメ・特撮・キャラクターグッズ等について、商品情報と実取引をもとにした価格情報を整理し、収集、売買、相場確認の際に比較しやすい資料を提供します。
      </p>

      <h2>収益について</h2>
      <p>
        当サイトは、外部ショップへのアフィリエイトリンクを掲載しています。リンクを経由して商品が購入されるなど、各プログラム所定の条件を満たした場合に報酬を受け取ることがあります。報酬の有無によって、掲載価格そのものを変更することはありません。
      </p>

      <h2>権利者・事業者の方へ</h2>
      <p>
        掲載内容の確認、権利に関する連絡、データの訂正依頼は、
        <Link href="/correction">データ訂正窓口</Link>
        からお知らせください。根拠資料を確認のうえ、訂正、注記、非掲載化等を検討します。
      </p>

      <p className="text-xs text-zinc-400">
        ※ 氏名、所在地等、確認できていない情報は掲載していません。法令上表示が必要となる取引を当サイトが直接行う場合は、取引開始前に必要事項を該当ページへ表示します。
      </p>
    </TrustPage>
  );
}
