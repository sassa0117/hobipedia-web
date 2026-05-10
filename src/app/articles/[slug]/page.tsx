import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "../../_components/SiteHeader";
import { prisma } from "@/lib/prisma";
import {
  getAllArticleSlugs,
  getArticle,
  listArticles,
} from "@/lib/articles";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Not Found" };
  const url = `https://hobipedia.jp/articles/${article.slug}`;
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: article.title,
      description: article.description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      ...(article.ogImage ? { images: [{ url: article.ogImage }] } : {}),
    },
    twitter: {
      card: article.ogImage ? "summary_large_image" : "summary",
      title: article.title,
      description: article.description,
      ...(article.ogImage ? { images: [article.ogImage] } : {}),
    },
  };
}

function formatDate(iso: string): string {
  return iso.replace(/-/g, "/").slice(0, 10);
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const [related, others] = await Promise.all([
    article.relatedCatalogIds && article.relatedCatalogIds.length > 0
      ? prisma.catalogItem.findMany({
          where: { id: { in: article.relatedCatalogIds } },
          select: {
            id: true,
            name: true,
            ipShort: true,
            imageUrl: true,
            productType: true,
          },
        })
      : Promise.resolve([]),
    listArticles().then((list) =>
      list.filter((a) => a.slug !== article.slug).slice(0, 4)
    ),
  ]);

  const url = `https://hobipedia.jp/articles/${article.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: {
      "@type": "Person",
      name: article.author ?? "Hobipedia編集部",
    },
    publisher: {
      "@type": "Organization",
      name: "Hobipedia",
      url: "https://hobipedia.jp",
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(article.ogImage ? { image: article.ogImage } : {}),
  };

  return (
    <div className="min-h-screen bg-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <SiteHeader />

      <div className="bg-sky-100 px-5 py-2 text-[13px]">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link href="/articles" className="text-sky-600 hover:underline">
            ← 戻る
          </Link>
          <span className="font-semibold text-sky-700">記事一覧</span>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <article>
          <header className="mb-6">
            <p className="text-[12px] text-zinc-500">
              {formatDate(article.publishedAt)}
              {article.updatedAt && article.updatedAt !== article.publishedAt
                ? ` 更新: ${formatDate(article.updatedAt)}`
                : null}
              {article.tags && article.tags.length > 0 ? (
                <span className="ml-2">
                  {article.tags.map((t) => `#${t}`).join(" ")}
                </span>
              ) : null}
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-zinc-900 md:text-3xl">
              {article.title}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">
              {article.description}
            </p>
          </header>

          <div
            className="prose-article text-[15px] leading-8 text-zinc-800"
            dangerouslySetInnerHTML={{ __html: article.html }}
          />

          {related.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 text-[15px] font-bold text-zinc-700">
                関連商品
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={`/catalog/${item.id}`}
                    className="block overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:bg-zinc-50"
                  >
                    <div className="aspect-square bg-zinc-50">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                    <div className="p-2.5">
                      {item.ipShort && (
                        <p className="text-[11px] text-sky-600">
                          {item.ipShort}
                        </p>
                      )}
                      <p className="line-clamp-2 text-[12px] font-medium text-zinc-700">
                        {item.name}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <footer className="mt-10 border-t border-zinc-200 pt-4 text-[12px] text-zinc-500">
            著者: {article.author ?? "Hobipedia編集部"}
          </footer>
        </article>

        {others.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-[15px] font-bold text-zinc-700">
              他の記事
            </h2>
            <ul className="space-y-2">
              {others.map((a) => (
                <li
                  key={a.slug}
                  className="overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                >
                  <Link
                    href={`/articles/${a.slug}`}
                    className="block p-4 hover:bg-zinc-50"
                  >
                    <p className="text-[11px] text-zinc-400">
                      {formatDate(a.publishedAt)}
                    </p>
                    <p className="mt-0.5 text-[14px] font-bold text-zinc-800">
                      {a.title}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
