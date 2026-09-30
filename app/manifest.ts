import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "منظومة العمل التنفيذي - محافظة الرقة",
    short_name: "محافظة الرقة",
    description: "منظومة محافظة الرقة لإدارة العمل التنفيذي والمهام والاجتماعات والتكليفات.",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#071528",
    theme_color: "#071528",
    categories: ["business", "productivity", "government"],
    icons: [
      { src: "/icons/icon-192.png?v=3", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png?v=3", sizes: "512x512", type: "image/png", purpose: "any" },
      // أندرويد يقصّ الأيقونة دائرةً أو مربعاً مدوّراً — الشعار داخل المنطقة الآمنة
      { src: "/icons/icon-maskable-512.png?v=3", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "لوحة اليوم", short_name: "اليوم", url: "/diwan/overview/", icons: [{ src: "/icons/icon-192.png?v=3", sizes: "192x192", type: "image/png" }] },
      { name: "التكليفات", short_name: "التكليفات", url: "/diwan/assignments/", icons: [{ src: "/icons/icon-192.png?v=3", sizes: "192x192", type: "image/png" }] },
      { name: "مديريات المحافظة", short_name: "المديريات", url: "/directorates/entities/", icons: [{ src: "/icons/icon-192.png?v=3", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
