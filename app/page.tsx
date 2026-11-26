import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { homeSectionFor, portalsFor } from "@/lib/access";

export const dynamic = "force-dynamic";

// بوابة واحدة: تُحدد مساحة العمل حسب حساب المستخدم بعد التحقق من الجلسة.
export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/login/");
  for (const portal of portalsFor(user)) {
    const section = homeSectionFor(user, portal);
    if (section) redirect(`/${portal}/${section}/`);
  }
  redirect("/login/");
}
