import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // خادم كامل: صفحات ديناميكية + مسارات API + قاعدة بيانات MongoDB
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["mongodb", "bcryptjs"],
};

export default nextConfig;
