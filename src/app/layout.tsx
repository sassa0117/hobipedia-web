import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { LinkClickTracker } from "./_components/LinkClickTracker";
import { PageViewTracker } from "./_components/PageViewTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hobipedia.jp"),
  title: {
    default: "Hobipedia | アニメ・ホビーグッズ相場ウィキ",
    template: "%s | Hobipedia",
  },
  description:
    "アニメ・特撮・キャラクターグッズの網羅的な相場・コレクションウィキ。実取引データから算出した中央値・推移グラフ・出品情報を一画面で。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://hobipedia.jp",
    siteName: "Hobipedia",
    title: "Hobipedia | アニメ・ホビーグッズ相場ウィキ",
    description:
      "アニメ・特撮・キャラクターグッズの網羅的な相場・コレクションウィキ。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hobipedia",
    description:
      "アニメ・特撮・キャラクターグッズの網羅的な相場・コレクションウィキ。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        {children}
        <footer className="mt-12 border-t border-zinc-200 bg-white px-5 py-6 text-xs text-zinc-500">
          <div className="mx-auto max-w-7xl space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-bold text-zinc-700">姉妹サイト</span>
              <a
                href="https://comic.hobipedia.jp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 hover:underline"
              >
                初版コミック相場 — メルカリsoldで追う帯付き・シュリンク・鑑定品の中央値
              </a>
            </div>
            <nav
              aria-label="サイト情報"
              className="flex flex-wrap gap-x-4 gap-y-2"
            >
              <a href="/operator" className="hover:text-sky-600 hover:underline">
                運営者情報
              </a>
              <a href="/terms" className="hover:text-sky-600 hover:underline">
                利用規約
              </a>
              <a href="/privacy" className="hover:text-sky-600 hover:underline">
                プライバシーポリシー
              </a>
              <a href="/inquiry" className="hover:text-sky-600 hover:underline">
                お問い合わせ
              </a>
              <a href="/correction" className="hover:text-sky-600 hover:underline">
                データ訂正
              </a>
            </nav>
            <div>© {new Date().getFullYear()} Hobipedia</div>
          </div>
        </footer>
        <PageViewTracker />
        <LinkClickTracker />
        <Analytics />
        <SpeedInsights sampleRate={0.5} />
        <Script id="vc-linkswitch-pid" strategy="afterInteractive">
          {`var vc_pid = "892608852";`}
        </Script>
        <Script
          src="https://aml.valuecommerce.com/vcdal.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
