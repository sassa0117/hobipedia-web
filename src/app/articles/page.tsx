import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "../_components/SiteHeader";
import { listArticles } from "@/lib/articles";

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

function formatDate(iso: string): string {
  return iso.replace(/-/g, "/").slice(0, 10);
}

export default async function ArticlesIndexPage() {
  const articles = await listArticles();

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

        {articles.length === 0 ? (
          <p className="rounded-xl bg-white p-8 text-center text-[13px] text-zinc-400 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            記事はまだありません。
          </p>
        ) : (
          <ul className="space-y-3">
            {articles.map((a) => (
              <li
                key={a.slug}
                className="overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
              >
                <Link
                  href={`/articles/${a.slug}`}
                  className="block p-5 hover:bg-zinc-50"
                >
                  <p className="text-[11px] text-zinc-400">
                    {formatDate(a.publishedAt)}
                    {a.tags && a.tags.length > 0 ? (
                      <span className="ml-2">
                        {a.tags.map((t) => `#${t}`).join(" ")}
                      </span>
                    ) : null}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-zinc-900">
                    {a.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-[13px] text-zinc-600">
                    {a.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
