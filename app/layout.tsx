import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import PwaRegister from "@/components/pwa-register";
import { StoreProvider } from "@/lib/store";
import Toasts from "@/components/toasts";
import "./globals.css";
import "./gate-polish.css";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "500", "600", "700", "900"], display: "swap" });

export const metadata: Metadata = {
  title: "منظومة العمل التنفيذي | محافظة حلب",
  description: "نظام موحّد لإدارة المهام والاجتماعات والقاعات والصلاحيات والإشعارات في محافظة حلب",
  applicationName: "منظومة العمل التنفيذي",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "العمل التنفيذي" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#071528",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <body className={cairo.className}>
        <StoreProvider>
          {children}
          <Toasts />
        </StoreProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
