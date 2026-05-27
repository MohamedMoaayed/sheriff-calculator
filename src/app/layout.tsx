import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";
import ClientProvider from "@/components/ClientProvider";

const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "شريف نوتنغهام - Sheriff of Nottingham",
  description: "حاسبة نقاط نهاية لعبة شريف نوتنغهام متعددة اللاعبين - Multiplayer end game scoring calculator",
  keywords: ["Sheriff of Nottingham", "شريف نوتنغهام", "board game", "calculator"],
  authors: [{ name: "Mohammed Moaayed" }],
  creator: "Mohammed Moaayed",
  applicationName: "Sheriff of Nottingham Calculator",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "شريف نوتنغهام",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#c29b47" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${cinzel.variable} ${inter.variable}`}>
        <ClientProvider>
          {children}
        </ClientProvider>
        {/* PWA Service Worker Registration */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.log('SW registration failed: ', err);
                });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
