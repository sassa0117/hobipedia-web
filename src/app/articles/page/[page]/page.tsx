import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "../../../_components/SiteHeader";
import {
  getArticlesPageCount,
  listArticlesPage,
} from "@/lib/articles";
import { ArticleList } from "../../_components/ArticleList";
import { Pager } from "../../_components/Pager";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateStaticParams() {
  const total = await getArticlesPageCount();
  const params: { page: string }[] = [];
  for (let p = 2; p <= total; p++) params.push({ page: String(p) });
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  const n = Number(page);
  const url = `https://hobipedia.jp/articles/page/${n}`;
  return {
    title: `記事一覧（${n}ページ目）`,
    description:
      "アニメ・ホビーグッズの相場・トレンド・買い時/売り時を解説する記事一覧。",
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `記事一覧（${n}ページ目） | Hobipedia`,
      description:
        "アニメ・ホビーグッズの相場・トレンド・買い時/売り時を解説する記事一覧。",
    },
  };
}

export default async function ArticlesPagedPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page: pageParam } = await params;
  const n = Number(pageParam);
  if (!Number.isInteger(n) || n < 2) notFound();

  const { articles, page, totalPages } = await listArticlesPage(n);
  if (n > totalPages) notFound();
  if (page === 1) redirect("/articles");

  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">
            記事一覧（{page}ページ目）
          </h1>
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
