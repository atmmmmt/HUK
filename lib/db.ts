import "server-only";
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
    // طلبات العرض الجديدة في ملف البيانات تُضاف إن غابت، دون المساس بالموجود
    await d.collection("requests").bulkWrite(
      seedRequests.map((r) => ({ updateOne: { filter: { id: r.id }, update: { $setOnInsert: { ...r } }, upsert: true } })),
      { ordered: false },
    );
    await syncPlaceNames(d);
  } catch (err) {
    console.error("[db] تعذّرت مطابقة الأسماء:", err instanceof Error ? err.message : err);
  }
}

/* ───────── نقل المنظومة من حلب إلى الرقة ─────────
   قاعدة قائمة عُبّئت ببيانات حلب: تُستبدل النصوص التي تحمل أسماء أماكنها فقط
   بما في ملف البيانات، وتُحدَّث أسماء دخول حسابات المناطق. الحالات والتقدّم
   وكلمات المرور وكل ما أنشأه المستخدمون لا يُمَسّ. */

const OLD_PLACES = /حلب|تل رفعت|عفرين|منطقة الباب|^الباب$|الجميلية|العزيزية|الخالدية|الأشرفية|حي النور/;
const RENAMED_USERS: Record<string, [string, string]> = {
  p22: ["area.talrifaat", "area.tabqa"], p23: ["area.afrin", "area.telabyad"], p24: ["area.albab", "area.maadan"],
  p27: ["hay.jamiliya", "hay.mashlab"], p28: ["hay.aziziya", "hay.daraiya"], p29: ["hay.khalidiya", "hay.rumaila"],
};

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
  // أسماء دخول حسابات المناطق — فقط إن كانت ما تزال بالاسم القديم
  const users = d.collection("users");
  for (const [id, [from, to]] of Object.entries(RENAMED_USERS)) {
    if (await users.findOne({ username: to })) continue;
    try {
      const r = await users.updateOne({ id, username: from }, { $set: { username: to } });
      fixed += r.modifiedCount;
    } catch (err) {
      console.error(`[db] تعذّر تغيير اسم الدخول ${from}:`, err instanceof Error ? err.message : err);
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
