import { notFound, redirect } from "next/navigation";
import { homeSectionFor, portalsFor } from "@/lib/access";
import { currentUser } from "@/lib/session";
import type { Portal } from "@/lib/types";

const portals = ["diwan", "directorates", "admin"] as const;

/** رابط البوابة دون قسم (مثل /admin/) يفتح أول قسم مسموح للمستخدم فيها */
export default async function PortalPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = await params;
  if (!portals.includes(portal as (typeof portals)[number])) notFound();
  const typedPortal = portal as Portal;

  const me = await currentUser();
  if (!me) redirect(`/login/?portal=${typedPortal}`);

  const home = homeSectionFor(me, typedPortal);
  if (home) redirect(`/${typedPortal}/${home}/`);

  const fallbackPortal = portalsFor(me)[0];
  const fallbackSection = fallbackPortal && homeSectionFor(me, fallbackPortal);
  redirect(fallbackSection ? `/${fallbackPortal}/${fallbackSection}/` : "/");
}
