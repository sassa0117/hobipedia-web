import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "./SiteHeader";

export function TrustPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-2xl bg-white px-5 py-7 shadow-[0_1px_6px_rgba(0,0,0,0.04)] sm:px-9 sm:py-10">
          <div className="border-b border-zinc-100 pb-6">
            <p className="text-xs font-bold tracking-wide text-sky-500">
              Hobipedia
            </p>
            <h1 className="mt-2 text-2xl font-bold text-zinc-800 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-500">
              {description}
            </p>
          </div>
          <div className="prose-article pt-2 text-sm leading-7 text-zinc-600 sm:text-base">
            {children}
          </div>
          <div className="mt-9 border-t border-zinc-100 pt-5">
            <Link
              href="/"
              className="text-sm font-semibold text-sky-600 hover:underline"
            >
              ← Hobipediaトップへ戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
