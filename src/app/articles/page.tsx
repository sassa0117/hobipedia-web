import type { Metadata } from "next";
import { SiteHeader } from "../_components/SiteHeader";
import { listArticlesPage } from "@/lib/articles";
import { ArticleList } from "./_components/ArticleList";
import { Pager } from "./_components/Pager";

export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "記事一覧",
  description:
    "アニメ・ホビーグッズの相場・トレンド・買い時/売り時を解説する記事一覧。",
  alternates: { canonical: "https://hobipedia.jp/articles" },
  openGraph: {
    type: "website",
    url: "https://hobipedia.jp/articles",
    title: "記事一覧 | Hobipedia",
    description:
      "アニメ・ホビーグッズの相場・トレンド・買い時/売り時を解説する記事一覧。",
  },
};

export default async function ArticlesIndexPage() {
  const { articles, page, totalPages } = await listArticlesPage(1);

  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">記事一覧</h1>
          <p className="mt-2 text-[13px] text-zinc-500">
            グッズ相場・トレンド・買い時/売り時を独占データから解説。
          </p>
        </header>

        <ArticleList articles={articles} />
        <Pager page={page} totalPages={totalPages} />
      </main>
    </div>
  );
}
