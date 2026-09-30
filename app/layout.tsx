import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import PwaRegister from "@/components/pwa-register";
import { StoreProvider } from "@/lib/store";
import Toasts from "@/components/toasts";
import Splash from "@/components/splash";
import Assistant from "@/components/assistant";
import "./globals.css";
import "./gate-polish.css";
import "./no-background.css";
import "./mobile-app.css";
import "./guide.css";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "500", "600", "700", "900"], display: "swap" });

export const metadata: Metadata = {
  title: "منظومة العمل التنفيذي | محافظة حلب",
  description: "منظومة محافظة حلب لإدارة العمل التنفيذي والمهام والاجتماعات والتكليفات",
  applicationName: "محافظة حلب",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "محافظة حلب" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
          <Assistant />
        </StoreProvider>
        <Splash />
        <PwaRegister />
      </body>
    </html>
  );
}
