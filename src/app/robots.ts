import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://hobipedia.jp/sitemap.xml",
    host: "https://hobipedia.jp",
  };
}
