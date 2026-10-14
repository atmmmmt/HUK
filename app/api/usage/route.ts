import { writeUsageEvent, type UsageEventType } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { body, handle } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClientUsageType = UsageEventType | "heartbeat";
const TYPES: ClientUsageType[] = ["open", "page_view", "close", "heartbeat"];

export async function POST(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    const input = await body<{
      type: ClientUsageType;
      portal?: string;
      section?: string;
      path?: string;
    }>(request);

    if (!TYPES.includes(input.type)) throw new Error("نوع حدث الاستخدام غير صحيح");

    const clean = (value: unknown, max = 120) =>
      typeof value === "string" ? value.trim().slice(0, max) : undefined;

    await writeUsageEvent(me.id, input.type, {
      portal: clean(input.portal, 30),
      section: clean(input.section, 50),
      path: clean(input.path, 180),
    });

    return { ok: true };
  });
}
