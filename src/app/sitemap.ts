import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildIpCanonicalUrl } from "@/lib/ip-path";
import { ARTICLES_PER_PAGE, listArticles } from "@/lib/articles";

// Generated on demand so build-time Neon outages don't fail deploys.
// Vercel's edge cache + the inherent request-time DB hit keep this cheap
// enough at ~11k URLs.
export const dynamic = "force-dynamic";

const BASE = "https://hobipedia.jp";

const getSitemap = unstable_cache(async function getSitemap(): Promise<MetadataRoute.Sitemap> {
  const [items, ips, articles] = await Promise.all([
    prisma.catalogItem.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.$queryRawUnsafe<{ ipShort: string; lastSeen: Date | null }[]>(
      `SELECT "ipShort" as "ipShort", MAX("updatedAt") as "lastSeen"
       FROM "CatalogItem" WHERE "ipShort" IS NOT NULL
       GROUP BY "ipShort"`
    ),
    listArticles(),
  ]);

  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${BASE}/articles`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  const articleUrls: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${BASE}/articles/${a.slug}`,
    lastModified: new Date(a.updatedAt ?? a.publishedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const articlePageCount = Math.max(
    1,
    Math.ceil(articles.length / ARTICLES_PER_PAGE)
  );
  const articleListPageUrls: MetadataRoute.Sitemap = [];
  for (let p = 2; p <= articlePageCount; p++) {
    articleListPageUrls.push({
      url: `${BASE}/articles/page/${p}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  const ipUrls: MetadataRoute.Sitemap = ips.map((r) => ({
    url: buildIpCanonicalUrl(r.ipShort),
    lastModified: r.lastSeen ?? now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const itemUrls: MetadataRoute.Sitemap = items.map((it) => ({
    url: `${BASE}/catalog/${it.id}`,
    lastModified: it.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    ...staticUrls,
    ...articleUrls,
    ...articleListPageUrls,
    ...ipUrls,
    ...itemUrls,
  ];
}, ["sitemap-v1"], { revalidate: 86400 });

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemap();
}
