import type { Action, Assignment, Entity, Grant, Person, Portal, Priority, Role, RoleKey } from "./types";

/**
 * مصدر الصلاحيات المركزي.
 *
 * القاعدة الأساسية:
 * - الصلاحية ليست «بوابة فقط»، بل بوابة + قسم + إجراء + نطاق بيانات.
 * - إخفاء زر أو قائمة ليس حماية؛ نفس الدوال تُستعمل على الخادم أيضاً.
 * - الاختصاصات المساندة (المراسم، القاعات، أمانة السر...) لا ترث صلاحيات القيادة.
 */

export interface Ctx {
  people?: Person[];
  entities?: Entity[];
  roles?: Role[];
}

export const defaultGrants: Record<RoleKey, Record<Action, Grant>> = {
  governor: { view: "full", create: "full", edit: "full", assign: "full", approve: "full", close: "full", archive: "full", delete: "full" },
  deputy: { view: "full", create: "full", edit: "full", assign: "full", approve: "full", close: "full", archive: "full", delete: "full" },
  assistant: { view: "partial", create: "full", edit: "full", assign: "full", approve: "full", close: "full", archive: "partial", delete: "none" },
  secgen: { view: "full", create: "full", edit: "full", assign: "full", approve: "none", close: "none", archive: "full", delete: "none" },
  chief: { view: "full", create: "full", edit: "full", assign: "full", approve: "none", close: "none", archive: "full", delete: "none" },
  followup: { view: "full", create: "none", edit: "none", assign: "none", approve: "none", close: "none", archive: "none", delete: "none" },
  director: { view: "partial", create: "full", edit: "full", assign: "full", approve: "partial", close: "partial", archive: "full", delete: "none" },
  branch: { view: "partial", create: "full", edit: "full", assign: "full", approve: "partial", close: "partial", archive: "full", delete: "none" },
  office: { view: "partial", create: "full", edit: "partial", assign: "full", approve: "none", close: "none", archive: "none", delete: "none" },
  head: { view: "partial", create: "full", edit: "partial", assign: "full", approve: "none", close: "none", archive: "none", delete: "none" },
  employee: { view: "partial", create: "none", edit: "partial", assign: "none", approve: "none", close: "none", archive: "none", delete: "none" },
  registry: { view: "partial", create: "full", edit: "full", assign: "partial", approve: "none", close: "none", archive: "full", delete: "none" },
  protocol: { view: "partial", create: "full", edit: "full", assign: "none", approve: "partial", close: "none", archive: "none", delete: "none" },
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

/* ─────────────── نطاق الأقسام لكل دور ─────────────── */

const ALL_DIWAN = [
  "overview", "followup", "calendar", "meetings", "decisions", "assignments", "correspondence",
  "halls", "delegations", "files", "people", "notes",
] as const;

const ALL_DIRECTORATES = [
  "entities", "inbox", "tasks", "replies", "meetings", "decisions", "requests", "structure", "performance", "notes",
] as const;

const ALL_ADMIN = ["entities", "users", "roles", "escalation", "usage", "audit"] as const;

export const sectionAccess: Record<RoleKey, Partial<Record<Portal, readonly string[]>>> = {
  // القيادة
  governor: {
    diwan: ALL_DIWAN,
    directorates: ALL_DIRECTORATES,
  },
  deputy: {
    diwan: ALL_DIWAN,
    directorates: ALL_DIRECTORATES,
  },

  // المعاون يعمل من الديوان ضمن الملفات التنفيذية المكلف بها، وليس كمدير لكل المديريات.
  assistant: {
    diwan: ["overview", "calendar", "meetings", "decisions", "assignments", "correspondence", "files", "people", "notes"],
  },

  // الأمين العام ينسّق بين الديوان والجهات ويحتاج رقابة تشغيلية، لا إدارة داخلية للمديريات.
  secgen: {
    diwan: ["overview", "calendar", "meetings", "decisions", "assignments", "correspondence", "files", "people", "notes"],
    directorates: ["entities", "inbox", "replies", "performance", "notes"],
  },

  // مدير المكتب يدير مكتب المحافظ والمتابعة المرتبطة به فقط.
  chief: {
    diwan: ["overview", "calendar", "meetings", "decisions", "assignments", "correspondence", "files", "people", "notes"],
  },

  // مكتب المتابعة: قراءة ومتابعة عابرة للجهات بلا إنشاء أو اعتماد.
  followup: {
    diwan: ["overview", "assignments", "people", "notes"],
    directorates: ["entities", "inbox", "replies", "performance", "notes"],
  },

  // الجهات التابعة
  director: {
    directorates: ["inbox", "tasks", "replies", "meetings", "decisions", "requests", "structure", "performance", "notes"],
  },
  // مدير الفرع يدير فرعه كما يدير المدير مديريته.
  branch: {
    directorates: ["inbox", "tasks", "replies", "meetings", "decisions", "requests", "structure", "performance", "notes"],
  },
  // مدير المكتب يعمل ضمن مكتبه داخل الجهة كرئيس القسم.
  office: {
    directorates: ["inbox", "tasks", "replies", "meetings", "requests", "structure", "notes"],
  },
  head: {
    directorates: ["inbox", "tasks", "replies", "meetings", "requests", "structure", "notes"],
  },
  employee: {
    directorates: ["inbox", "tasks", "replies", "meetings", "requests", "notes"],
  },

  // اختصاصات الديوان
  registry: {
    diwan: ["calendar", "meetings", "decisions", "assignments", "correspondence", "files", "notes"],
  },
  protocol: {
    diwan: ["calendar", "meetings", "assignments", "halls", "delegations", "notes"],
  },
  halls: {
    diwan: ["calendar", "assignments", "halls", "notes"],
  },

  // مدير النظام لا يدخل محتوى العمل التنفيذي.
  admin: {
    admin: ALL_ADMIN,
  },
};

/** الأقسام المسموحة داخل بوابة محددة. */
export function sectionsFor(person: Person, portal: Portal): readonly string[] {
  return sectionAccess[person.role]?.[portal] ?? [];
}

/** هل يحق للمستخدم فتح قسم بعينه؟ */
export function canAccessSection(person: Person, portal: Portal, section: string): boolean {
  return sectionsFor(person, portal).includes(section);
}

/** البوابات التي تحتوي قسماً واحداً على الأقل لهذا المستخدم. */
export function portalsFor(person: Person): Portal[] {
  return (["diwan", "directorates", "admin"] as Portal[]).filter((portal) => sectionsFor(person, portal).length > 0);
}

/** أول قسم صالح داخل البوابة، للاستعمال عند التحويل والتنقل. */
export function homeSectionFor(person: Person, portal: Portal): string | null {
  return sectionsFor(person, portal)[0] ?? null;
}

/** مدير الجهة: مدير المديرية أو مدير الفرع — يملكان الصلاحيات نفسها على جهتهما. */
export function isEntityManager(person: Pick<Person, "role">): boolean {
  return person.role === "director" || person.role === "branch";
}

export function clearanceRank(c: string): number {
  return ["عادي", "سرّي"].indexOf(c);
}

/** أدوار الرقابة العليا التي ترى كل التكليفات بحكم الوظيفة. */
const assignmentOversight: RoleKey[] = ["governor", "deputy", "secgen", "chief", "followup"];

/** استعلام أولي لتقليل ما يُقرأ من MongoDB قبل تطبيق seesAssignment. */
export function assignmentQueryFor(person: Person): Record<string, unknown> {
  if (assignmentOversight.includes(person.role)) return {};
  if (person.role === "admin") return { id: "__no_assignments__" };
  if (person.role === "assistant") {
    return {
      $or: [
        { entityId: person.entityId },
        { ownerId: person.id },
        { issuerId: person.id },
        { partnerIds: person.id },
      ],
    };
  }
  if (["employee", "registry", "protocol", "halls"].includes(person.role)) {
    return {
      $or: [
        { ownerId: person.id },
        { issuerId: person.id },
        { partnerIds: person.id },
      ],
    };
  }
  return { entityId: person.entityId };
}

/** هل يرى هذا الشخص تكليفاً بعينه؟ يُطبَّق على الخادم قبل إرسال أي بيانات. */
export function seesAssignment(person: Person, a: Assignment, ctx: Ctx = {}): boolean {
  const involved =
    a.ownerId === person.id ||
    a.issuerId === person.id ||
    (a.partnerIds ?? []).includes(person.id);

  // إسناد التكليف لشخص بعينه هو تخويل مباشر لرؤية التكليف، حتى لو كان سرياً.
  // منع هذا سابقاً كان يسمح بوصول الإشعار للمكلَّف ثم يحجب التكليف نفسه عنه.
  if (!involved && clearanceRank(person.clearance) < clearanceRank(a.classification)) return false;

  if (assignmentOversight.includes(person.role)) return true;

  switch (person.role) {
    case "assistant":
      // المعاون لا يرى جميع تكليفات المديريات تلقائياً؛ فقط ما يخص الديوان أو ما شارك فيه.
      return a.entityId === person.entityId || involved;
    case "director":
    case "branch":
      return a.entityId === person.entityId;
    case "office":
    case "head": {
      if (a.entityId !== person.entityId) return false;
      if (involved) return true;
      const owner = ctx.people?.find((p) => p.id === a.ownerId);
      return !!owner && !!person.unit && owner.unit === person.unit;
    }
    case "employee":
      return involved;
    case "registry":
    case "protocol":
    case "halls":
      return involved;
    case "admin":
      return false;
    default:
      return a.entityId === person.entityId;
  }
}

/** من يملك تغيير حالة تكليف، وإلى أي حالة. */
export function canAdvance(person: Person, a: Assignment, to: string): boolean {
  const isOwner = a.ownerId === person.id;
  const isIssuer = a.issuerId === person.id;
  const canSign = canApproveDecision(person);
  const isDirectorOfEntity = isEntityManager(person) && person.entityId === a.entityId;

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

/** الاعتماد الرسمي: المحافظ ونائبه والمعاون المخوّل. */
export function canApproveDecision(person: Person): boolean {
  return ["governor", "deputy", "assistant"].includes(person.role);
}

/** اعتماد حجوزات القاعات محصور بسلسلة الحجز الفعلية. */
export function canApproveBooking(person: Person): boolean {
  return ["halls", "protocol", "governor", "deputy"].includes(person.role);
}

export function canManageSystem(person: Person): boolean {
  return person.role === "admin";
}

/* ─────────────── أولوية القاعات عند التعارض ─────────────── */

export const bookingLadder: RoleKey[] = ["governor", "deputy", "assistant", "secgen", "director", "branch"];

export function bookingRank(role: RoleKey): number {
  const i = bookingLadder.indexOf(role);
  return i === -1 ? bookingLadder.length + 1 : i;
}

export function bookingRankLabel(role: RoleKey): string {
  const i = bookingLadder.indexOf(role);
  return i === -1 ? "خارج سلّم الأولوية" : `الأولوية ${i + 1}`;
}

export function winsConflict(a: Person, b: Person): Person {
  return bookingRank(a.role) <= bookingRank(b.role) ? a : b;
}

/* ─────────────── المهل ─────────────── */

export const slaHours: Record<Priority, number | null> = {
  "عاجل وسري": 24,
  "عاجل جداً": 24, // توافق مع سجلات قديمة فقط
  "عاجل": 24,
  "هام": 48,
  "عادي": null,
};

export function slaLabel(p: Priority): string {
  const h = slaHours[p];
  return h ? `رد خلال ${h} ساعة` : "حسب الجدول الزمني المحدد مع التكليف";
}

/** وصف نطاق الرؤية بالعربية لعرضه في الواجهة. */
export function reachLabel(person: Person, entityShort?: string): string {
  switch (person.role) {
    case "governor":
      return "كل جهات المحافظة";
    case "deputy":
      return "كل جهات المحافظة — نيابة المحافظ";
    case "assistant":
      return "الديوان والملفات المكلّف بها";
    case "secgen":
      return "تنسيق الديوان ومتابعة الجهات";
    case "chief":
      return "مكتب المحافظ والمتابعة";
    case "followup":
      return "التكليفات ومؤشرات الجهات — اطلاع";
    case "director":
      return (entityShort ?? "جهته") + " فقط";
    case "branch":
      return (entityShort ?? "فرعه") + " فقط";
    case "office":
      return person.unit ?? "مكتبه";
    case "head":
      return person.unit ?? "وحدته";
    case "employee":
      return "المهام المسندة إليه";
    case "registry":
      return "المراسلات والمحاضر";
    case "protocol":
      return "الوفود والمراسم والحجوزات";
    case "halls":
      return "القاعات والحجوزات";
    case "admin":
      return "إعدادات النظام فقط";
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
  directorates: { title: "مديريات المحافظة", sub: "المديريات والمؤسسات والهيئات" },
  admin: { title: "لوحة التحكم", sub: "إدارة الجهات والأدوار والإعدادات" },
};

/* ─────────────── صلاحيات الإجراءات اليومية ─────────────── */

export function canIssueAssignment(person: Person): boolean {
  return ["governor", "deputy", "assistant", "secgen", "chief"].includes(person.role);
}

export function canManageMeetings(person: Person): boolean {
  return ["governor", "deputy", "assistant", "secgen", "chief", "registry"].includes(person.role);
}

/** المراسم يستطيع جدولة لقاء/زيارة، لكنه لا يعتمد محاضر أو يحوّل المخرجات إلى تكليفات. */
export function canScheduleMeeting(person: Person): boolean {
  return canManageMeetings(person) || person.role === "protocol";
}

export function canRespondRequest(person: Person, kind?: string): boolean {
  if (kind === "حجز قاعة") return canApproveBooking(person);
  return ["governor", "deputy", "assistant", "secgen", "chief"].includes(person.role);
}

export function canRaiseRequest(person: Person): boolean {
  return ["director", "branch", "office", "head", "employee"].includes(person.role);
}

export function canSubmitDecision(person: Person): boolean {
  return ["director", "branch", "registry", "chief", "secgen", "governor", "deputy", "assistant"].includes(person.role);
}

/** من يستطيع اختيار جهة أخرى عند رفع معاملة؛ البقية يرفعون باسم جهتهم فقط. */
export function canSubmitDecisionForAnyEntity(person: Person): boolean {
  return ["governor", "deputy", "assistant", "secgen", "chief"].includes(person.role);
}

export function canRegisterLetters(person: Person): boolean {
  return ["registry", "chief", "secgen", "governor", "deputy", "assistant"].includes(person.role);
}
