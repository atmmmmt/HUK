import { destroySession } from "@/lib/session";
import { handle } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return handle(async () => {
    await destroySession();
    return { ok: true };
  });
}
