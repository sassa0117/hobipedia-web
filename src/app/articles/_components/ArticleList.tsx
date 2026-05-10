import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";

function formatDate(iso: string): string {
  return iso.replace(/-/g, "/").slice(0, 10);
}

export function ArticleList({ articles }: { articles: ArticleSummary[] }) {
  if (articles.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-[13px] text-zinc-400 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        記事はまだありません。
      </p>
    );
  }

  return (
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
            <h2 className="mt-1 text-lg font-bold text-zinc-900">{a.title}</h2>
            <p className="mt-1.5 line-clamp-2 text-[13px] text-zinc-600">
              {a.description}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
