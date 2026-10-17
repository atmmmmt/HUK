import "server-only";
import bcrypt from "bcryptjs";
import { Db, MongoClient } from "mongodb";
import type {
  Assignment, AuditEntry, Booking, Decision, Delegation, DocFile, Entity, Hall, Letter,
  Meeting, Note, Notification, Person, RequestItem, Role,
} from "./types";
import * as seed from "./seed";

const seedPeople = seed.people;
const seedRequests = seed.requests;

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "governorate";

if (!uri) {
  throw new Error(
    "لم يُضبط MONGODB_URI. أنشئ ملف .env.local وضع فيه رابط الاتصال بقاعدة البيانات.",
  );
}

/** المستخدم كما يُخزَّن — الشخص مع بيانات الدخول */
export interface UserDoc extends Person {
  username: string;
  passwordHash: string;
  active: boolean;
  lastLogin?: string;
  lastLoginISO?: string;
  lastOpen?: string;
  lastOpenISO?: string;
  lastSeen?: string;
  lastSeenISO?: string;
  lastExit?: string;
  lastExitISO?: string;
}

export type UsageEventType = "open" | "login" | "logout" | "page_view" | "denied" | "close";

export interface UsageEvent {
  id: string;
  userId: string;
  type: UsageEventType;
  at: string;
  atISO: string;
  path?: string;
  portal?: string;
  section?: string;
  reason?: string;
}

// الاتصال يُعاد استخدامه بين عمليات إعادة التحميل في بيئة التطوير
const globalForMongo = globalThis as unknown as {
  _mongoClient?: Promise<MongoClient>;
  _namesSynced?: Promise<void>;
  _indexesReady?: Promise<void>;
};

function clientPromise(): Promise<MongoClient> {
  if (!globalForMongo._mongoClient) {
    globalForMongo._mongoClient = new MongoClient(uri!, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 12000,
    }).connect();
  }
  return globalForMongo._mongoClient;
}

export async function db(): Promise<Db> {
  const c = await clientPromise();
  const d = c.db(dbName);
  globalForMongo._namesSynced ??= syncIdentity(d);
  globalForMongo._indexesReady ??= ensureIndexes(d);
  void globalForMongo._indexesReady.catch((err) =>
    console.error("[db] تعذّر إنشاء بعض الفهارس:", err instanceof Error ? err.message : err),
  );
  await globalForMongo._namesSynced;
  return d;
}

async function ensureIndexes(d: Db) {
  await Promise.all([
    d.collection("assignments").createIndexes([
      { key: { entityId: 1, status: 1 }, name: "assignment_entity_status" },
      { key: { ownerId: 1 }, name: "assignment_owner" },
      { key: { issuerId: 1 }, name: "assignment_issuer" },
    ]),
    d.collection("notifications").createIndex({ toId: 1 }, { name: "notification_recipient" }),
    d.collection("notes").createIndexes([
      { key: { authorId: 1, scope: 1 }, name: "note_author_scope" },
      { key: { target: 1 }, name: "note_target" },
    ]),
    d.collection("documents").createIndex({ assignmentId: 1 }, { name: "document_assignment" }),
    d.collection("usage").createIndexes([
      { key: { userId: 1, atISO: -1 }, name: "usage_user_time" },
      { key: { type: 1, atISO: -1 }, name: "usage_type_time" },
      { key: { path: 1, type: 1 }, name: "usage_path_type" },
    ]),
  ]);
}

/**
 * يطابق أسماء الحسابات وصفاتها مع ملف البيانات مرة عند كل تشغيل للخادم،
 * فيصل أي تعديل على الأسماء إلى قاعدة قائمة دون إعادة تعبئتها.
 * لا يمسّ كلمات المرور ولا أي بيانات أخرى.
 */
async function syncIdentity(d: Db) {
  try {
    const ops = seedPeople.map((p) => ({
      updateOne: {
        filter: { id: p.id, $or: [{ name: { $ne: p.name } }, { title: { $ne: p.title } }, { initials: { $ne: p.initials } }] },
        update: { $set: { name: p.name, title: p.title, initials: p.initials } },
      },
    }));
    const res = await d.collection("users").bulkWrite(ops, { ordered: false });
    if (res.modifiedCount) console.log(`[db] حُدّثت أسماء ${res.modifiedCount} حساباً`);

    // مصفوفة الأدوار في لوحة الإدارة مرجعية من الكود؛ الواجهة لا تسمح بتحريرها،
    // لذلك نزامن الوصف والمنح حتى لا تعرض القاعدة القديمة صلاحيات تخالف الحماية الفعلية.
    await d.collection("roles").bulkWrite(
      seed.roles.map((role) => ({
        updateOne: {
          filter: { key: role.key },
          update: { $set: { ...role } },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    // طلبات العرض الجديدة في ملف البيانات تُضاف إن غابت، دون المساس بالموجود
    await d.collection("requests").bulkWrite(
      seedRequests.map((r) => ({ updateOne: { filter: { id: r.id }, update: { $setOnInsert: { ...r } }, upsert: true } })),
      { ordered: false },
    );
    await syncPlaceNames(d);
    await syncStructure(d);
  } catch (err) {
    console.error("[db] تعذّرت مطابقة الأسماء:", err instanceof Error ? err.message : err);
  }
}

/* ───────── هيكل الجهات والحسابات ─────────
   الجهات والحسابات الجديدة في ملف البيانات تُضاف إن غابت (بكلمة مرور البذرة)،
   والملغاة من الهيكل تُحذف. كلمات المرور وما أنشأه المستخدمون لا يُمَسّ. */

/** ترحيل يُطبَّق مرة واحدة فقط على كل قاعدة، فلا يعيد فرض حالة غيّرها المستخدمون لاحقاً */
async function once(d: Db, id: string, run: () => Promise<void>) {
  const done = d.collection("migrations");
  if (await done.findOne({ id })) return;
  await run();
  await done.insertOne({ id, at: new Date().toISOString() });
  console.log(`[db] طُبّق الترحيل ${id}`);
}

async function syncStructure(d: Db) {
  const entities = d.collection("entities");
  await entities.bulkWrite(
    seed.entities.map(({ id, name, short, kind, tier, units, ...rest }, order) => ({
      updateOne: { filter: { id }, update: { $set: { name, short, kind, tier, units, order }, $setOnInsert: rest }, upsert: true },
    })),
    { ordered: false },
  );

  const users = d.collection("users");
  const have = new Set((await users.find({}, { projection: { id: 1, username: 1 } }).toArray()).flatMap((u) => [u.id, u.username]));
  const missing = seedPeople.filter((p) => !have.has(p.id) && !have.has(seed.usernames[p.id]));
  if (missing.length) {
    const hash = await bcrypt.hash(process.env.SEED_PASSWORD ?? seed.defaultPassword, 10);
    await users.insertMany(missing.map((p) => ({ ...p, username: seed.usernames[p.id] ?? p.id, passwordHash: hash, active: !seed.phase2.people.includes(p.id) })));
    console.log(`[db] أُضيف ${missing.length} حساباً جديداً`);
  }

  for (const m of seed.moves) {
    const unit = "unit" in m ? { $set: { entityId: m.to, unit: m.unit } } : { $set: { entityId: m.to }, $unset: { unit: "" } };
    await users.updateOne({ id: m.id, entityId: m.from }, unit);
  }

  // مراجع الحسابات الملغاة تنتقل قبل حذفها: الملكية إلى مدير الجهة، والقاعات إلى المراسم
  const leaving = Object.keys(seed.reassigned);
  if (await users.countDocuments({ id: { $in: leaving } })) {
    const single: [string, string][] = [
      ["assignments", "ownerId"], ["assignments", "issuerId"], ["bookings", "requesterId"], ["meetings", "chairId"],
      ["meetings", "secretaryId"], ["letters", "registrarId"], ["decisions", "submittedBy"], ["delegations", "hostId"],
      ["files", "ownerId"], ["requests", "byId"],
    ];
    const lists: [string, string][] = [["assignments", "partnerIds"], ["meetings", "inviteeIds"], ["meetings", "confirmed"], ["meetings", "apologized"]];
    await d.collection("halls").updateMany({ supervisorId: { $in: leaving } }, { $set: { supervisorId: "p17" } });
    for (const [from, to] of Object.entries(seed.reassigned)) {
      for (const [col, field] of single) await d.collection(col).updateMany({ [field]: from }, { $set: { [field]: to } });
      await d.collection("meetings").updateMany({ "outcomes.ownerId": from }, { $set: { "outcomes.$[o].ownerId": to } }, { arrayFilters: [{ "o.ownerId": from }] });
    }
    for (const [col, field] of lists) await d.collection(col).updateMany({ [field]: { $in: leaving } }, { $pull: { [field]: { $in: leaving } } as never });
    await d.collection("notifications").deleteMany({ toId: { $in: leaving } });
  }

  // المرحلة الأولى: تُعطَّل جهات المرحلة الثانية وحساباتها مرة واحدة، ويبقى تفعيلها بيد لوحة التحكم
  await once(d, "phase1-2026-10", async () => {
    await entities.updateMany({ id: { $in: seed.phase2.entities } }, { $set: { active: false } });
    await users.updateMany({ id: { $in: seed.phase2.people } }, { $set: { active: false } });
    await d.collection("halls").updateMany({ supervisorId: { $in: seed.phase2.people } }, { $set: { supervisorId: "p17" } });
    const username = seed.usernames.p35;
    const taken = await users.findOne({ username, id: { $ne: "p35" } });
    await users.updateOne({ id: "p35" }, { $set: { role: "execdeputy", ...(taken ? {} : { username }) } });
  });

  const goneUsers = await users.deleteMany({ id: { $in: seed.retired.people } });
  const goneEntities = await entities.deleteMany({ id: { $in: seed.retired.entities } });
  await d.collection("roles").deleteMany({ key: { $in: seed.retired.roles } });
  if (goneUsers.deletedCount || goneEntities.deletedCount) {
    console.log(`[db] حُذف ${goneUsers.deletedCount} حساباً و${goneEntities.deletedCount} جهات ملغاة`);
  }
}

/* ───────── نقل المنظومة من حلب إلى الرقة ─────────
   قاعدة قائمة عُبّئت ببيانات حلب: تُستبدل النصوص التي تحمل أسماء أماكنها فقط
   بما في ملف البيانات. الحالات والتقدّم وكلمات المرور وكل ما أنشأه المستخدمون
   لا يُمَسّ. */

const OLD_PLACES = /حلب|تل رفعت|عفرين|منطقة الباب|^الباب$|الجميلية|العزيزية|الخالدية|الأشرفية|حي النور/;

const isOld = (v: unknown) => typeof v === "string" ? OLD_PLACES.test(v) : Array.isArray(v) && v.some((x) => typeof x === "string" && OLD_PLACES.test(x));

async function syncPlaceNames(d: Db) {
  let fixed = 0;
  const sets: [string, { id: string }[]][] = [
    ["entities", seed.entities], ["users", seed.people], ["assignments", seed.assignments], ["meetings", seed.meetings],
    ["letters", seed.letters], ["decisions", seed.decisions], ["requests", seed.requests], ["notifications", seed.notifications],
    ["notes", seed.notes], ["bookings", seed.bookings], ["delegations", seed.delegations], ["files", seed.docFiles],
  ];
  for (const [name, docs] of sets) {
    const col = d.collection(name);
    for (const src of docs as unknown as Record<string, unknown>[]) {
      const cur = await col.findOne({ id: src.id });
      if (!cur) continue;
      const $set: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) {
        if (k === "id" || k === "outcomes") continue;
        if ((typeof v === "string" || Array.isArray(v)) && isOld(cur[k])) $set[k] = v;
      }
      // مخرجات الاجتماعات: يُبدَّل النص فقط، ويبقى الإسناد والحالة كما هما
      if (name === "meetings" && Array.isArray(cur.outcomes)) {
        const texts = new Map(((src.outcomes as { id: string; text: string }[]) ?? []).map((o) => [o.id, o.text]));
        let touched = false;
        const outcomes = (cur.outcomes as { id: string; text: string }[]).map((o) => {
          const t = texts.get(o.id);
          if (t && OLD_PLACES.test(o.text)) { touched = true; return { ...o, text: t }; }
          return o;
        });
        if (touched) $set.outcomes = outcomes;
      }
      if (Object.keys($set).length) {
        try { await col.updateOne({ id: src.id }, { $set }); fixed++; }
        catch (err) { console.error(`[db] تعذّر نقل ${name}/${src.id}:`, err instanceof Error ? err.message : err); }
      }
    }
  }
  if (fixed) console.log(`[db] نُقلت ${fixed} سجلات من أسماء حلب إلى الرقة`);
}

export const collections = {
  users: async () => (await db()).collection<UserDoc>("users"),
  roles: async () => (await db()).collection<Role>("roles"),
  entities: async () => (await db()).collection<Entity>("entities"),
  halls: async () => (await db()).collection<Hall>("halls"),
  bookings: async () => (await db()).collection<Booking>("bookings"),
  assignments: async () => (await db()).collection<Assignment>("assignments"),
  meetings: async () => (await db()).collection<Meeting>("meetings"),
  letters: async () => (await db()).collection<Letter>("letters"),
  decisions: async () => (await db()).collection<Decision>("decisions"),
  delegations: async () => (await db()).collection<Delegation>("delegations"),
  files: async () => (await db()).collection<DocFile>("files"),
  notes: async () => (await db()).collection<Note>("notes"),
  notifications: async () => (await db()).collection<Notification>("notifications"),
  audit: async () => (await db()).collection<AuditEntry>("audit"),
  requests: async () => (await db()).collection<RequestItem>("requests"),
  usage: async () => (await db()).collection<UsageEvent>("usage"),
};

/** يزيل حقل _id من نتائج القراءة حتى تعبر إلى الواجهة كبيانات بسيطة */
export function clean<T extends object>(doc: T): T {
  const { _id, ...rest } = doc as T & { _id?: unknown };
  void _id;
  return rest as T;
}

export function cleanAll<T extends object>(docs: T[]): T[] {
  return docs.map(clean);
}

/** يسجّل عملية في سجل التدقيق — لا يُحذف أبداً */
export async function writeAudit(actorId: string, action: string, target: string, ip = "—") {
  const col = await collections.audit();
  const now = new Date();
  await col.insertOne({
    id: "x" + now.getTime() + Math.floor(Math.random() * 1000),
    at: now.toLocaleString("ar-SY-u-nu-latn", { dateStyle: "short", timeStyle: "short" }),
    actorId, action, target, ip,
  } as AuditEntry);
}

/** يسجّل استخدام النظام ويحدّث آخر ظهور للمستخدم.
 * heartbeat لا يُخزّن كسجل مستقل حتى لا تتضخم القاعدة؛ آخر ظهور فقط.
 */
export async function writeUsageEvent(
  userId: string,
  type: UsageEventType | "heartbeat",
  detail: Pick<UsageEvent, "path" | "portal" | "section" | "reason"> = {},
) {
  const now = new Date();
  const atISO = now.toISOString();
  const at = now.toLocaleString("ar-SY-u-nu-latn", { dateStyle: "short", timeStyle: "short" });
  const users = await collections.users();

  const userSet: Record<string, string> = { lastSeen: at, lastSeenISO: atISO };
  if (type === "login") {
    userSet.lastLogin = at;
    userSet.lastLoginISO = atISO;
  }
  if (type === "open") {
    userSet.lastOpen = at;
    userSet.lastOpenISO = atISO;
  }
  if (type === "logout" || type === "close") {
    userSet.lastExit = at;
    userSet.lastExitISO = atISO;
  }
  await users.updateOne({ id: userId }, { $set: userSet });

  if (type === "heartbeat") return;
  await (await collections.usage()).insertOne({
    id: "u" + now.getTime() + Math.floor(Math.random() * 1000),
    userId,
    type,
    at,
    atISO,
    ...(detail.path ? { path: detail.path } : {}),
    ...(detail.portal ? { portal: detail.portal } : {}),
    ...(detail.section ? { section: detail.section } : {}),
    ...(detail.reason ? { reason: detail.reason } : {}),
  });
}

/** ينشئ إشعاراً موجّهاً لشخص */
export async function pushNotification(n: Omit<Notification, "id" | "at" | "read">) {
  const col = await collections.notifications();
  await col.insertOne({
    ...n,
    id: "n" + Date.now() + Math.floor(Math.random() * 1000),
    at: "الآن",
    read: false,
  } as Notification);
}
