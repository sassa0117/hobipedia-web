import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

export type ArticleFrontmatter = {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  relatedCatalogIds?: string[];
  ogImage?: string;
  author?: string;
  draft?: boolean;
};

export type Article = ArticleFrontmatter & {
  slug: string;
  html: string;
};

export type ArticleSummary = ArticleFrontmatter & {
  slug: string;
};

const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");

async function readArticleFile(file: string): Promise<{
  slug: string;
  data: ArticleFrontmatter;
  body: string;
} | null> {
  if (!file.endsWith(".md") || file.startsWith("_")) return null;
  const slug = file.replace(/\.md$/, "");
  const raw = await fs.readFile(path.join(ARTICLES_DIR, file), "utf8");
  const { data, content } = matter(raw);
  const fm = data as Partial<ArticleFrontmatter>;
  if (!fm.title || !fm.description || !fm.publishedAt) return null;
  return {
    slug,
    data: {
      title: fm.title,
      description: fm.description,
      publishedAt: fm.publishedAt,
      updatedAt: fm.updatedAt,
      tags: fm.tags ?? [],
      relatedCatalogIds: fm.relatedCatalogIds ?? [],
      ogImage: fm.ogImage,
      author: fm.author,
      draft: fm.draft ?? false,
    },
    body: content,
  };
}

export async function listArticles(
  options: { includeDraft?: boolean } = {}
): Promise<ArticleSummary[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(ARTICLES_DIR);
  } catch {
    return [];
  }
  const parsed = await Promise.all(entries.map(readArticleFile));
  return parsed
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .filter((p) => options.includeDraft || !p.data.draft)
    .map((p) => ({ slug: p.slug, ...p.data }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getArticle(slug: string): Promise<Article | null> {
  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeSlug || safeSlug !== slug) return null;
  const parsed = await readArticleFile(`${safeSlug}.md`);
  if (!parsed || parsed.data.draft) return null;
  const html = await marked.parse(parsed.body, { gfm: true, breaks: false });
  return { slug: parsed.slug, ...parsed.data, html };
}

export async function getAllArticleSlugs(): Promise<string[]> {
  const articles = await listArticles();
  return articles.map((a) => a.slug);
}
