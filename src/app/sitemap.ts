import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { listArticles } from "@/lib/articles";

// Generated on demand so build-time Neon outages don't fail deploys.
// Vercel's edge cache + the inherent request-time DB hit keep this cheap
// enough at ~11k URLs.
export const dynamic = "force-dynamic";

const BASE = "https://hobipedia.jp";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const ipUrls: MetadataRoute.Sitemap = ips.map((r) => ({
    url: `${BASE}/ip/${encodeURIComponent(r.ipShort)}`,
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

  return [...staticUrls, ...articleUrls, ...ipUrls, ...itemUrls];
}
