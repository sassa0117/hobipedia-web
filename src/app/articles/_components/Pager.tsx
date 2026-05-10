import Link from "next/link";

export function Pager({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const prevHref =
    page === 2 ? "/articles" : page > 2 ? `/articles/page/${page - 1}` : null;
  const nextHref =
    page < totalPages ? `/articles/page/${page + 1}` : null;

  return (
    <nav className="mt-8 flex items-center justify-between text-[13px]">
      <div>
        {prevHref ? (
          <Link
            href={prevHref}
            rel="prev"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 font-medium text-sky-600 hover:bg-zinc-50"
          >
            ← 前のページ
          </Link>
        ) : (
          <span />
        )}
      </div>
      <p className="text-[12px] text-zinc-400">
        {page} / {totalPages}
      </p>
      <div>
        {nextHref ? (
          <Link
            href={nextHref}
            rel="next"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 font-medium text-sky-600 hover:bg-zinc-50"
          >
            次のページ →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}
