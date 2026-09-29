import { db } from "@/lib/db";
import { handle } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const database = await db();
    const stats = await database.command({ ping: 1 });
    const users = await database.collection("users").countDocuments();
    return { ok: stats.ok === 1, db: database.databaseName, users };
  });
}
