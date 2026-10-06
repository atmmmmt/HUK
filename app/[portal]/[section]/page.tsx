import { notFound, redirect } from "next/navigation";
import Shell from "@/components/shell";
import { canAccessSection, homeSectionFor, portalsFor } from "@/lib/access";
import { navByPortal } from "@/lib/nav";
import { currentUser } from "@/lib/session";
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

  const typedPortal = portal as Portal;
  if (!navByPortal[typedPortal].some((n) => n.key === section)) notFound();

  const me = await currentUser();
  if (!me) redirect(`/login/?next=${encodeURIComponent(`/${portal}/${section}/`)}`);

  if (!canAccessSection(me, typedPortal, section)) {
    const samePortalHome = homeSectionFor(me, typedPortal);
    if (samePortalHome) redirect(`/${typedPortal}/${samePortalHome}/`);

    const fallbackPortal = portalsFor(me)[0];
    if (!fallbackPortal) redirect("/");
    const fallbackSection = homeSectionFor(me, fallbackPortal);
    redirect(fallbackSection ? `/${fallbackPortal}/${fallbackSection}/` : "/");
  }

  return <Shell portal={typedPortal} section={section} />;
}
