import Link from "next/link";

export function SiteHeader({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
    <header className="flex h-14 items-center gap-3 bg-sky-300 px-5">
      <Link href="/" className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold text-white">Hobipedia</span>
        <span className="rounded bg-white/30 px-1.5 py-0.5 text-[10px] font-bold text-white">
          β
        </span>
      </Link>
      <form
        action="/search"
        method="get"
        className="ml-2 max-w-md flex-1"
        role="search"
      >
        <input
          type="search"
          name="q"
          defaultValue={defaultQuery}
          placeholder="作品名・商品名・キャラ名で検索..."
          className="w-full rounded-full bg-white/90 px-4 py-2 text-[13px] text-zinc-700 placeholder:text-sky-200 focus:outline-none"
          aria-label="検索"
        />
      </form>
    </header>
  );
}
