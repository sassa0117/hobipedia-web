import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { ARTICLES_PER_PAGE, listArticles } from "@/lib/articles";

// Generated on demand so build-time Neon outages don't fail deploys.
// Split into multiple sitemaps via generateSitemaps to keep each function
// well under Vercel Hobby's 10s timeout.
export const dynamic = "force-dynamic";

const BASE = "https://hobipedia.jp";
const CATALOG_CHUNK_SIZE = 5000;

async function getCatalogChunkCount(): Promise<number> {
  try {
    const total = await prisma.catalogItem.count();
    return Math.max(1, Math.ceil(total / CATALOG_CHUNK_SIZE));
  } catch {
    return 1;
  }
}

export async function generateSitemaps() {
  const catalogChunks = await getCatalogChunkCount();
  const ids: { id: number }[] = [{ id: 0 }];
  for (let i = 1; i <= catalogChunks; i++) ids.push({ id: i });
  return ids;
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const idStr = await props.id;
  const id = Number(idStr);

  if (id === 0) {
    const [articles, ips] = await Promise.all([
      listArticles(),
      prisma.$queryRawUnsafe<{ ipShort: string; lastSeen: Date | null }[]>(
        `SELECT "ipShort" as "ipShort", MAX("updatedAt") as "lastSeen"
         FROM "CatalogItem" WHERE "ipShort" IS NOT NULL
         GROUP BY "ipShort"`
      ),
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
      url: `${BASE}/ip/${encodeURIComponent(r.ipShort)}`,
      lastModified: r.lastSeen ?? now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [
      ...staticUrls,
      ...articleUrls,
      ...articleListPageUrls,
      ...ipUrls,
    ];
  }

  const offset = (id - 1) * CATALOG_CHUNK_SIZE;
  const items = await prisma.catalogItem.findMany({
    select: { id: true, updatedAt: true },
    orderBy: { id: "asc" },
    skip: offset,
    take: CATALOG_CHUNK_SIZE,
  });
  return items.map((it) => ({
    url: `${BASE}/catalog/${it.id}`,
    lastModified: it.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
}
