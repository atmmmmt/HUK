import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "منظومة العمل التنفيذي — محافظة حلب",
    short_name: "العمل التنفيذي",
    description: "نظام موحّد لإدارة المهام والاجتماعات والقاعات والصلاحيات والإشعارات في محافظة حلب.",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#F2F6FB",
    theme_color: "#071528",
    categories: ["business", "productivity", "government"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "لوحة اليوم", short_name: "اليوم", url: "/diwan/overview/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "التكليفات", short_name: "التكليفات", url: "/diwan/assignments/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "مديريات المحافظة", short_name: "المديريات", url: "/directorates/entities/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
