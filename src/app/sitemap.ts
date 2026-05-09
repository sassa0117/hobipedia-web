import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = "https://hobipedia.jp";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [items, ips] = await Promise.all([
    prisma.catalogItem.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
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
      url: `${BASE}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

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

  return [...staticUrls, ...ipUrls, ...itemUrls];
}
