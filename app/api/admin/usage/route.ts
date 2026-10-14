import { canManageSystem } from "@/lib/access";
import { collections } from "@/lib/db";
import { handle } from "@/lib/api";
import { ForbiddenError, requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  return handle(async () => {
    const me = await requireUser();
    if (!canManageSystem(me)) throw new ForbiddenError("تحليلات الاستخدام من صلاحية مدير النظام");

    const url = new URL(request.url);
    const rawDays = Number(url.searchParams.get("days") ?? 14);
    const days = Math.min(30, Math.max(1, Number.isFinite(rawDays) ? Math.round(rawDays) : 14));
    const sinceISO = new Date(Date.now() - days * DAY).toISOString();
    const last24ISO = new Date(Date.now() - DAY).toISOString();

    const [usageCol, usersCol] = await Promise.all([collections.usage(), collections.users()]);
    const [events, users] = await Promise.all([
      usageCol.find({ atISO: { $gte: sinceISO } }).sort({ atISO: -1 }).limit(6000).toArray(),
      usersCol.find({}, {
        projection: {
          passwordHash: 0,
          username: 0,
        },
      }).toArray(),
    ]);

    const pageCounts = new Map<string, Map<string, number>>();
    const deniedCounts = new Map<string, Map<string, number>>();
    const loginCounts = new Map<string, number>();
    const openCounts = new Map<string, number>();
    const deniedByPath = new Map<string, { count: number; users: Set<string> }>();
    const active24 = new Set<string>();
    let sessions24 = 0;
    let deniedTotal = 0;

    for (const event of events) {
      if (event.atISO >= last24ISO) active24.add(event.userId);
      if (event.type === "open") {
        openCounts.set(event.userId, (openCounts.get(event.userId) ?? 0) + 1);
        if (event.atISO >= last24ISO) sessions24++;
      }
      if (event.type === "login") {
        loginCounts.set(event.userId, (loginCounts.get(event.userId) ?? 0) + 1);
      }
      if (event.type === "page_view" && event.path) {
        const map = pageCounts.get(event.userId) ?? new Map<string, number>();
        map.set(event.path, (map.get(event.path) ?? 0) + 1);
        pageCounts.set(event.userId, map);
      }
      if (event.type === "denied" && event.path) {
        deniedTotal++;
        const map = deniedCounts.get(event.userId) ?? new Map<string, number>();
        map.set(event.path, (map.get(event.path) ?? 0) + 1);
        deniedCounts.set(event.userId, map);

        const agg = deniedByPath.get(event.path) ?? { count: 0, users: new Set<string>() };
        agg.count++;
        agg.users.add(event.userId);
        deniedByPath.set(event.path, agg);
      }
    }

    const topOf = (map?: Map<string, number>) => {
      if (!map || map.size === 0) return { path: null as string | null, count: 0 };
      const [path, count] = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
      return { path, count };
    };

    const now = Date.now();
    const rows = users.map((user) => {
      const pages = topOf(pageCounts.get(user.id));
      const trouble = topOf(deniedCounts.get(user.id));
      const lastSeenMs = user.lastSeenISO ? new Date(user.lastSeenISO).getTime() : 0;
      const lastExitMs = user.lastExitISO ? new Date(user.lastExitISO).getTime() : 0;
      const online = !!lastSeenMs && now - lastSeenMs <= 5 * 60 * 1000 && lastSeenMs > lastExitMs;

      return {
        userId: user.id,
        name: user.name,
        title: user.title,
        role: user.role,
        entityId: user.entityId,
        active: user.active !== false,
        online,
        lastLogin: user.lastLogin ?? null,
        lastLoginISO: user.lastLoginISO ?? null,
        lastOpen: user.lastOpen ?? null,
        lastOpenISO: user.lastOpenISO ?? null,
        lastSeen: user.lastSeen ?? null,
        lastSeenISO: user.lastSeenISO ?? null,
        lastExit: user.lastExit ?? null,
        lastExitISO: user.lastExitISO ?? null,
        visits: [...(pageCounts.get(user.id)?.values() ?? [])].reduce((sum, n) => sum + n, 0),
        sessions: openCounts.get(user.id) ?? 0,
        logins: loginCounts.get(user.id) ?? 0,
        topPage: pages.path,
        topPageVisits: pages.count,
        denied: [...(deniedCounts.get(user.id)?.values() ?? [])].reduce((sum, n) => sum + n, 0),
        troublePage: trouble.path,
        troubleCount: trouble.count,
      };
    }).sort((a, b) =>
      Number(b.online) - Number(a.online) ||
      b.denied - a.denied ||
      (b.lastSeenISO ?? "").localeCompare(a.lastSeenISO ?? "")
    );

    const friction = [...deniedByPath.entries()]
      .map(([path, info]) => ({ path, attempts: info.count, users: info.users.size }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 8);

    return {
      ok: true,
      days,
      summary: {
        active24: active24.size,
        sessions24,
        denied: deniedTotal,
        usersTracked: rows.filter((r) => r.lastSeenISO || r.lastLoginISO).length,
      },
      users: rows,
      friction,
    };
  });
}
