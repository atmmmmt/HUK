import "server-only";
import { collections, pushNotification } from "./db";
import type { Assignment, Classification, Priority } from "./types";

export const stampNow = () =>
  new Date().toLocaleString("ar-SY-u-nu-latn", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });

/** «30 أيلول 2026» بالأرقام اللاتينية كما في بقية المنظومة */
export const arDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("ar-SY-u-nu-latn", { day: "2-digit", month: "long", year: "numeric" });

export const PRIORITIES: Priority[] = ["عادي", "هام", "عاجل", "عاجل جداً"];

export function validISO(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T12:00:00").getTime());
}

/** الرقم التالي للتكليف بصيغة «3655485-2026» */
async function nextRef(): Promise<string> {
  const col = await collections.assignments();
  const refs = await col.find({}, { projection: { ref: 1 } }).toArray();
  const max = refs.reduce((m, a) => Math.max(m, parseInt(String(a.ref).split("-")[0], 10) || 0), 3655000);
  return `${max + 1}-${new Date().getFullYear()}`;
}

export interface NewAssignment {
  title: string;
  source: string;
  ownerId: string;
  priority: Priority;
  dueISO: string;
  closeCriteria: string;
  partnerIds?: string[];
  classification?: Classification;
  meetingId?: string;
}

/** ينشئ تكليفاً ويُشعر المكلَّف — مصدر واحد للتكليف اليدوي وتكليفات مخرجات الاجتماعات */
export async function createAssignment(issuerId: string, input: NewAssignment): Promise<Assignment> {
  const users = await collections.users();
  const owner = await users.findOne({ id: input.ownerId, active: true });
  if (!owner) throw new Error("المكلَّف غير موجود أو حسابه معطّل");
  if (!PRIORITIES.includes(input.priority)) throw new Error("الأولوية غير صحيحة");
  if (!validISO(input.dueISO)) throw new Error("تاريخ الاستحقاق غير صحيح");
  const title = input.title?.trim();
  if (!title) throw new Error("عنوان التكليف مطلوب");

  const at = stampNow();
  const a: Assignment = {
    id: "a" + Date.now() + Math.floor(Math.random() * 1000),
    ref: await nextRef(),
    title,
    source: input.source?.trim() || "توجيه السيد المحافظ",
    entityId: owner.entityId,
    issuerId,
    ownerId: owner.id,
    partnerIds: (input.partnerIds ?? []).filter((p) => p && p !== owner.id),
    priority: input.priority,
    due: arDate(input.dueISO),
    dueISO: input.dueISO,
    closeCriteria: input.closeCriteria?.trim() || "تقرير إنجاز معتمد",
    progress: 0,
    status: "مُسند",
    chain: { sent: at, delivered: at },
    attachments: [],
    classification: input.classification === "سرّي" ? "سرّي" : "عادي",
    escalation: 0,
    ...(input.meetingId ? { meetingId: input.meetingId } : {}),
  };

  await (await collections.assignments()).insertOne({ ...a });
  await pushNotification({
    kind: "تكليف",
    title: "تكليف جديد أُسند إليك",
    body: `«${a.title}» — ${a.priority}، يستحق ${a.due}.`,
    channel: "تنبيه التطبيق",
    toId: owner.id,
    link: { portal: "directorates", section: "inbox", itemId: a.id },
    urgent: a.priority === "عاجل جداً",
  });
  return a;
}
