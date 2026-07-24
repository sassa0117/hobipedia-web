import type { Metadata } from "next";
import Link from "next/link";
import { TrustPage } from "../_components/TrustPage";

const ISSUE_URL =
  "https://github.com/sassa0117/hobipedia-web/issues/new?title=%5B%E3%81%8A%E5%95%8F%E3%81%84%E5%90%88%E3%82%8F%E3%81%9B%5D%20";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "Hobipediaへのお問い合わせ方法をご案内します。",
};

export default function InquiryPage() {
  return (
    <TrustPage
      title="お問い合わせ"
      description="ご意見、不具合、掲載内容に関する連絡を受け付けています。"
    >
      <h2>お問い合わせ方法</h2>
      <p>
        現在のお問い合わせ窓口は、公開リポジトリのIssueです。次のボタンから内容をお知らせください。
      </p>
      <p>
        <a
          href={ISSUE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-full bg-sky-500 px-5 py-2.5 font-bold text-white no-underline hover:bg-sky-600 hover:text-white"
        >
          お問い合わせを作成する
        </a>
      </p>

      <blockquote>
        Issueの内容はインターネット上に公開されます。氏名、住所、電話番号、メールアドレス、注文番号などの個人情報や非公開情報は記載しないでください。
      </blockquote>

      <h2>連絡時にあると確認しやすい情報</h2>
      <ul>
        <li>対象ページのURL</li>
        <li>確認した日時</li>
        <li>起きていること、または希望する対応</li>
        <li>公開可能な根拠資料のURL</li>
      </ul>

      <h2>データの訂正・削除</h2>
      <p>
        商品名、価格、画像、権利表記など、掲載データに関する依頼は
        <Link href="/correction">データ訂正窓口</Link>
        の案内をご確認ください。
      </p>

      <h2>回答について</h2>
      <p>
        内容を確認し、必要に応じてIssue上で回答または修正を行います。すべての連絡への個別回答や、特定期間内の対応をお約束するものではありません。
      </p>
    </TrustPage>
  );
}
