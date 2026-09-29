import { notFound } from "next/navigation";
import Shell from "@/components/shell";
import { navByPortal } from "@/lib/nav";
import type { Portal } from "@/lib/types";

const portals = ["diwan", "directorates", "admin"] as const;

export function generateStaticParams() {
  return portals.flatMap((portal) =>
    navByPortal[portal].map((item) => ({ portal, section: item.key })),
  );
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ portal: string; section: string }>;
}) {
  const { portal, section } = await params;
  if (!portals.includes(portal as (typeof portals)[number])) notFound();
  if (!navByPortal[portal as Portal].some((n) => n.key === section)) notFound();
  return <Shell portal={portal as Portal} section={section} />;
}
