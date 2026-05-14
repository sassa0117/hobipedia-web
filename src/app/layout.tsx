import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { LinkClickTracker } from "./_components/LinkClickTracker";

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
          <div className="mx-auto max-w-7xl space-y-2">
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
            <div>© {new Date().getFullYear()} Hobipedia</div>
          </div>
        </footer>
        <LinkClickTracker />
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
