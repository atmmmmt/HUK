/** درجة السرّية — درجتان فقط بقرار مكتب السيد المحافظ */
export type Classification = "عادي" | "سرّي";

export type Portal = "diwan" | "directorates" | "admin";

export type RoleKey =
  | "governor"
  | "deputy"
  | "assistant"
  | "secgen"
  | "chief"
  | "followup"
  | "director"
  | "head"
  | "employee"
  | "area"
  | "registry"
  | "protocol"
  | "halls"
  | "admin";

export type Action = "view" | "create" | "edit" | "assign" | "approve" | "close" | "archive" | "delete";

export type Grant = "full" | "partial" | "none";

export interface Role {
  key: RoleKey;
  title: string;
  scope: string;
  summary: string;
  grants: Record<Action, Grant>;
  /** تسمية مختصرة لنطاق الرؤية */
  reach: string;
}

export interface Entity {
  id: string;
  name: string;
  short: string;
  kind: "ديوان" | "مديرية" | "مؤسسة" | "دائرة" | "مجلس" | "منطقة" | "حي";
  managerId: string;
  units: string[];
  staffCount: number;
  active: boolean;
  /** نسبة الالتزام بالمواعيد */
  compliance: number;
  openTasks: number;
  lateTasks: number;
  accent: "navy" | "gold" | "teal" | "plum";
}

export interface Person {
  id: string;
  name: string;
  title: string;
  entityId: string;
  unit?: string;
  role: RoleKey;
  phone: string;
  ext: string;
  office: string;
  duties: string[];
  deputyOf?: string;
  clearance: Classification;
  avgResponseHours: number;
  initials: string;
}

export interface Hall {
  id: string;
  name: string;
  building: string;
  floor: string;
  capacity: number;
  layout: string;
  equipment: string[];
  protocol: "عادية" | "رسمية" | "تشريفات";
  supervisorId: string;
  hours: string;
  policy: string;
  occupancy: number;
  notes: string[];
}

export interface Booking {
  id: string;
  hallId: string;
  title: string;
  requesterId: string;
  entityId: string;
  day: string;
  start: string;
  end: string;
  attendees: number;
  status: "مؤكد" | "بانتظار الموافقة" | "مرفوض" | "منتهٍ";
  protocolPriority: boolean;
  prep: { label: string; done: boolean }[];
}

export type AssignmentStatus =
  | "جديد"
  | "مُسند"
  | "مُستلَم"
  | "قيد التنفيذ"
  | "قيد المراجعة"
  | "مُغلق"
  | "مُعاد للتصحيح"
  | "متأخر"
  | "مُجمَّد";

export type Priority = "عادي" | "هام" | "عاجل" | "عاجل جداً";

export interface DeliveryChain {
  sent?: string;
  delivered?: string;
  read?: string;
  acknowledged?: string;
  started?: string;
  submitted?: string;
}

export interface Assignment {
  id: string;
  ref: string;
  title: string;
  source: string;
  entityId: string;
  /** من أصدر التكليف — إليه يصل إشعار المراجعة عند انتهاء المهلة */
  issuerId: string;
  ownerId: string;
  partnerIds: string[];
  priority: Priority;
  due: string;
  /** التاريخ الآلي للاستحقاق — يحسب عليه الخادم المهل والمراجعة */
  dueISO: string;
  closeCriteria: string;
  progress: number;
  status: AssignmentStatus;
  chain: DeliveryChain;
  attachments: { name: string; size: string }[];
  meetingId?: string;
  classification: Classification;
  escalation: 0 | 1 | 2 | 3;
  /** الجدول الزمني المتفق عليه بالأيام — يُحدَّد عند الإسناد للأولوية العادية */
  scheduleDays?: number;
  /** صار مستحق المراجعة وأُشعر مُصدِره */
  reviewNotified?: boolean;
}

export interface MeetingOutcome {
  id: string;
  text: string;
  assignmentRef?: string;
  ownerId?: string;
  closed: boolean;
  reason?: string;
}

export interface Meeting {
  id: string;
  title: string;
  kind: string;
  day: string;
  time: string;
  hallId?: string;
  online?: boolean;
  chairId: string;
  secretaryId: string;
  inviteeIds: string[];
  confirmed: string[];
  apologized: string[];
  agenda: string[];
  minutes?: string;
  minutesApproved: boolean;
  outcomes: MeetingOutcome[];
  status: "قادم" | "جارٍ الآن" | "منعقد" | "مؤجل";
  summary: string;
}

export interface Letter {
  id: string;
  number: string;
  direction: "وارد" | "صادر" | "مؤرشف";
  party: string;
  date: string;
  subject: string;
  referredTo: string;
  action: string;
  registrarId: string;
  classification: Classification;
  dueHours?: number;
  handled: boolean;
}

export interface Decision {
  id: string;
  title: string;
  source: string;
  entityId: string;
  age: string;
  priority: Priority;
  awaiting: RoleKey;
  amount?: string;
}

export interface Delegation {
  id: string;
  name: string;
  purpose: string;
  arrival: string;
  departure: string;
  status: string;
  progress: number;
  hostId: string;
  program: { time: string; item: string; place: string }[];
}

export interface DocFile {
  id: string;
  name: string;
  ref: string;
  kind: string;
  items: number;
  updated: string;
  ownerId: string;
  entityId: string;
  classification: Classification;
}

export interface Note {
  id: string;
  target: string;
  targetLabel: string;
  authorId: string;
  text: string;
  at: string;
  scope: "خاصة" | "الوحدة" | "رسمية" | "توجيه المحافظ";
  mentions?: string[];
}

export interface Notification {
  id: string;
  kind: "تكليف" | "اجتماع" | "قاعة" | "مراسلة" | "تصعيد" | "طوارئ";
  title: string;
  body: string;
  at: string;
  read: boolean;
  channel: "تنبيه التطبيق" | "رسالة نصية" | "البريد";
  toId: string;
  link?: { portal: Portal; section: string };
  urgent?: boolean;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  action: string;
  target: string;
  ip: string;
}

export interface RequestItem {
  id: string;
  kind: "حجز قاعة" | "موعد لدى المحافظ" | "طلب اجتماع" | "تمديد مهلة";
  title: string;
  entityId: string;
  byId: string;
  at: string;
  status: "بانتظار الرد" | "موافق" | "مرفوض";
  detail: string;
}
