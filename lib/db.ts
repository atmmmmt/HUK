import "server-only";
import { Db, MongoClient } from "mongodb";
import type {
  Assignment, AuditEntry, Booking, Decision, Delegation, DocFile, Entity, Hall, Letter,
  Meeting, Note, Notification, Person, RequestItem, Role,
} from "./types";

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
const globalForMongo = globalThis as unknown as { _mongoClient?: Promise<MongoClient> };

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
  return c.db(dbName);
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
    at: now.toLocaleString("ar-SY", { dateStyle: "short", timeStyle: "short" }),
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
