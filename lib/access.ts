import type { Action, Assignment, Entity, Grant, Person, Portal, Priority, Role, RoleKey } from "./types";

/* هذا الملف نقيّ: لا يقرأ من قاعدة بيانات ولا من بيانات ثابتة،
   فيُستعمل على الخادم (للتحقق الفعلي) وفي المتصفح (لإخفاء ما لا يلزم).

   الصلاحيات هنا مبنية على قرارات مكتب السيد المحافظ:
   · الاعتماد للسيد المحافظ ونوابه فقط.
   · نائب المحافظ كامل الصلاحيات.
   · مدير المكتب: اطلاع وترتيب ومتابعة — بلا اعتماد. */

export interface Ctx {
  people?: Person[];
  entities?: Entity[];
  roles?: Role[];
}

export const defaultGrants: Record<RoleKey, Record<Action, Grant>> = {
  governor: { view: "full", create: "full", edit: "full", assign: "full", approve: "full", close: "full", archive: "full", delete: "full" },
  // كامل الصلاحيات بقرار المكتب
  deputy: { view: "full", create: "full", edit: "full", assign: "full", approve: "full", close: "full", archive: "full", delete: "full" },
  assistant: { view: "full", create: "full", edit: "full", assign: "full", approve: "full", close: "full", archive: "full", delete: "none" },
  // الأمين العام: تنظيم ومتابعة وأرشفة — بلا اعتماد
  secgen: { view: "full", create: "full", edit: "full", assign: "full", approve: "none", close: "none", archive: "full", delete: "none" },
  // مدير المكتب: اطلاع · ترتيب · متابعة — لا يعتمد ولا يغلق
  chief: { view: "full", create: "full", edit: "full", assign: "full", approve: "none", close: "none", archive: "full", delete: "none" },
  followup: { view: "full", create: "none", edit: "none", assign: "none", approve: "none", close: "none", archive: "none", delete: "none" },
  director: { view: "partial", create: "full", edit: "full", assign: "full", approve: "partial", close: "partial", archive: "full", delete: "none" },
  head: { view: "partial", create: "full", edit: "partial", assign: "full", approve: "none", close: "none", archive: "none", delete: "none" },
  employee: { view: "partial", create: "none", edit: "partial", assign: "none", approve: "none", close: "none", archive: "none", delete: "none" },
  // مسؤول منطقة: يرفع إحصائيات منطقته ويستقبل ما يخصّها
  area: { view: "partial", create: "full", edit: "partial", assign: "partial", approve: "none", close: "none", archive: "none", delete: "none" },
  registry: { view: "full", create: "full", edit: "full", assign: "partial", approve: "none", close: "none", archive: "full", delete: "none" },
  protocol: { view: "partial", create: "full", edit: "full", assign: "none", approve: "none", close: "none", archive: "none", delete: "none" },
  halls: { view: "partial", create: "full", edit: "full", assign: "none", approve: "partial", close: "none", archive: "none", delete: "none" },
  admin: { view: "partial", create: "full", edit: "full", assign: "none", approve: "none", close: "none", archive: "none", delete: "partial" },
};

export function grantOf(person: Person, action: Action, ctx: Ctx = {}): Grant {
  const fromDb = ctx.roles?.find((r) => r.key === person.role)?.grants?.[action];
  return fromDb ?? defaultGrants[person.role][action];
}

export function can(person: Person, action: Action, ctx: Ctx = {}): boolean {
  return grantOf(person, action, ctx) !== "none";
}

/** البوابات المتاحة لهذا الشخص */
export function portalsFor(person: Person): Portal[] {
  switch (person.role) {
    case "governor":
    case "deputy":
    case "assistant":
      return ["diwan", "directorates", "admin"];
    case "admin":
      return ["admin"];
    case "secgen":
    case "chief":
    case "registry":
    case "protocol":
    case "halls":
      return ["diwan"];
    case "followup":
      return ["diwan", "directorates"];
    default:
      return ["directorates"];
  }
}

export function clearanceRank(c: string): number {
  return ["عادي", "سرّي"].indexOf(c);
}

/** القيادة العليا — ترى البوابتين وتتجاوز الفصل بينهما */
const topBrass: RoleKey[] = ["governor", "deputy", "assistant", "secgen", "chief", "followup"];

/** هل يرى هذا الشخص تكليفاً بعينه؟ يُطبَّق على الخادم قبل إرسال أي بيانات */
export function seesAssignment(person: Person, a: Assignment, ctx: Ctx = {}): boolean {
  if (clearanceRank(person.clearance) < clearanceRank(a.classification)) return false;

  if (topBrass.includes(person.role)) return true;

  switch (person.role) {
    case "director":
    case "area":
      return a.entityId === person.entityId;
    case "head": {
      if (a.entityId !== person.entityId) return false;
      if (a.ownerId === person.id || a.partnerIds.includes(person.id)) return true;
      const owner = ctx.people?.find((p) => p.id === a.ownerId);
      return !!owner && !!person.unit && owner.unit === person.unit;
    }
    case "employee":
      return a.ownerId === person.id || a.partnerIds.includes(person.id);
    default:
      return a.entityId === person.entityId;
  }
}

/** من يملك تغيير حالة تكليف، وإلى أي حالة */
export function canAdvance(person: Person, a: Assignment, to: string): boolean {
  const isOwner = a.ownerId === person.id;
  const isIssuer = a.issuerId === person.id;
  // الاعتماد والإغلاق للسيد المحافظ ونوابه فقط
  const canSign = canApproveDecision(person);
  const isDirectorOfEntity = person.role === "director" && person.entityId === a.entityId;

  switch (to) {
    case "مُستلَم":
      return isOwner;
    case "قيد التنفيذ":
      return isOwner;
    case "قيد المراجعة":
      return isOwner || isDirectorOfEntity;
    case "مُغلق":
    case "مُعاد للتصحيح":
      return canSign || (isIssuer && person.role === "chief");
    case "مُجمَّد":
      return canSign || isDirectorOfEntity;
    default:
      return false;
  }
}

/** الاعتماد: السيد المحافظ ونوابه فقط — بقرار مكتب المحافظ */
export function canApproveDecision(person: Person): boolean {
  return ["governor", "deputy", "assistant"].includes(person.role);
}

export function canApproveBooking(person: Person): boolean {
  return ["halls", "chief", "secgen", "governor", "deputy", "assistant", "registry"].includes(person.role);
}

export function canManageSystem(person: Person): boolean {
  return person.role === "admin" || person.role === "governor";
}

/* ─────────────── أولوية القاعات عند التعارض ───────────────
   السلّم المعتمد: المحافظ ← النائب ← المعاون ← الأمين العام ← المدراء المركزيون */

export const bookingLadder: RoleKey[] = ["governor", "deputy", "assistant", "secgen", "director"];

export function bookingRank(role: RoleKey): number {
  const i = bookingLadder.indexOf(role);
  return i === -1 ? bookingLadder.length + 1 : i;
}

export function bookingRankLabel(role: RoleKey): string {
  const i = bookingLadder.indexOf(role);
  return i === -1 ? "خارج سلّم الأولوية" : `الأولوية ${i + 1}`;
}

/** من تُقدَّم حجزه عند تعارض موعدين على القاعة نفسها */
export function winsConflict(a: Person, b: Person): Person {
  return bookingRank(a.role) <= bookingRank(b.role) ? a : b;
}

/* ─────────────── المهل المعتمدة ───────────────
   عاجل جداً وعاجل: رد خلال 24 ساعة · هام: 48 ساعة كحد أقصى
   عادي: جدول زمني يُحدَّد مع التكليف، ثم إشعار مراجعة لمُصدِره */

export const slaHours: Record<Priority, number | null> = {
  "عاجل جداً": 24,
  "عاجل": 24,
  "هام": 48,
  "عادي": null, // يُحدَّد جدولها الزمني عند الإسناد
};

export function slaLabel(p: Priority): string {
  const h = slaHours[p];
  return h ? `رد خلال ${h} ساعة` : "حسب الجدول الزمني المحدد مع التكليف";
}

/** وصف نطاق الرؤية بالعربية لعرضه في الواجهة */
export function reachLabel(person: Person, entityShort?: string): string {
  switch (person.role) {
    case "governor":
    case "deputy":
    case "assistant":
      return "كل جهات المحافظة";
    case "secgen":
      return "الديوان وكل الجهات";
    case "chief":
      return "اطلاع وترتيب ومتابعة";
    case "followup":
      return "كل التكليفات — اطلاع فقط";
    case "director":
      return (entityShort ?? "جهته") + " فقط";
    case "area":
      return (entityShort ?? "نطاقه") + " — إحصائيات";
    case "head":
      return person.unit ?? "وحدته";
    case "employee":
      return "المهام المسندة إليه";
    case "registry":
      return "المراسلات والمحاضر";
    case "protocol":
      return "الوفود والفعاليات";
    case "halls":
      return "القاعات والحجوزات";
    case "admin":
      return "إعدادات النظام";
  }
}

export const actionLabels: Record<Action, string> = {
  view: "اطلاع",
  create: "إنشاء",
  edit: "تعديل",
  assign: "إسناد",
  approve: "اعتماد",
  close: "إغلاق",
  archive: "أرشفة",
  delete: "حذف",
};

export const portalLabels: Record<Portal, { title: string; sub: string }> = {
  diwan: { title: "مديرية المحافظة", sub: "مكتب السيد المحافظ — الديوان المركزي" },
  directorates: { title: "مديريات المحافظة", sub: "المديريات المركزية والمناطق" },
  admin: { title: "لوحة التحكم", sub: "إدارة الجهات والأدوار والإعدادات" },
};

/* ─────────────── صلاحيات الإنشاء والإدارة اليومية ─────────────── */

/** إصدار تكليف جديد: المحافظ ونوابه والأمين العام ومدير المكتب */
export function canIssueAssignment(person: Person): boolean {
  return ["governor", "deputy", "assistant", "secgen", "chief"].includes(person.role);
}

/** إدارة الاجتماعات (اعتماد المحضر وإسناد المخرجات) */
export function canManageMeetings(person: Person): boolean {
  return ["governor", "deputy", "assistant", "secgen", "chief", "registry"].includes(person.role);
}

/** الرد على طلبات المديريات؛ وطلبات حجز القاعات لمشرف القاعات أيضاً */
export function canRespondRequest(person: Person, kind?: string): boolean {
  if (["governor", "deputy", "assistant", "secgen", "chief"].includes(person.role)) return true;
  return kind === "حجز قاعة" && person.role === "halls";
}

/** رفع طلب إلى الديوان: كل من يعمل في جهة تابعة */
export function canRaiseRequest(person: Person): boolean {
  return ["director", "head", "area", "employee"].includes(person.role);
}

/** قيد الكتب ومعالجتها */
export function canRegisterLetters(person: Person): boolean {
  return ["registry", "chief", "secgen", "governor", "deputy", "assistant"].includes(person.role);
}
