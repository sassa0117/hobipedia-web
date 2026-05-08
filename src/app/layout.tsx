import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

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
