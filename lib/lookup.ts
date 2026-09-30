"use client";

import type {
  Assignment, AuditEntry, Booking, Decision, Delegation, DocFile, Entity, Hall, Letter,
  Meeting, Note, Notification, Person, RequestItem, Role,
} from "./types";

/**
 * سجلّ البيانات في المتصفح.
 * يُملأ مرة واحدة من /api/bootstrap ثم تقرأ منه كل الشاشات.
 * الروابط هنا حيّة: إعادة الإسناد داخل هذا الملف تنعكس على كل من استورد منه.
 */

export let roles: Role[] = [];
export let entities: Entity[] = [];
export let people: Person[] = [];
export let halls: Hall[] = [];
export let meetings: Meeting[] = [];
export let letters: Letter[] = [];
export let decisions: Decision[] = [];
export let delegations: Delegation[] = [];
export let docFiles: (DocFile & { locked?: boolean })[] = [];
export let requests: RequestItem[] = [];
export let audit: AuditEntry[] = [];

export interface Bootstrap {
  me: Person;
  roles: Role[];
  entities: Entity[];
  people: Person[];
  halls: Hall[];
  bookings: Booking[];
  assignments: Assignment[];
  meetings: Meeting[];
  letters: Letter[];
  decisions: Decision[];
  delegations: Delegation[];
  files: (DocFile & { locked?: boolean })[];
  notes: Note[];
  notifications: Notification[];
  audit: AuditEntry[];
  requests: RequestItem[];
  settings?: { escalationLevels: number[] | null };
}

export function setData(d: Bootstrap) {
  roles = d.roles ?? [];
  entities = d.entities ?? [];
  people = d.people ?? [];
  halls = d.halls ?? [];
  meetings = d.meetings ?? [];
  letters = d.letters ?? [];
  decisions = d.decisions ?? [];
  delegations = d.delegations ?? [];
  docFiles = d.files ?? [];
  requests = d.requests ?? [];
  audit = d.audit ?? [];
}

/* ───────── عناصر بديلة تمنع الانهيار إذا غاب سجل ───────── */

const unknownPerson = (id: string): Person => ({
  id, name: "غير معروف", title: "—", entityId: "", role: "employee",
  phone: "—", ext: "—", office: "—", duties: [], clearance: "عادي",
  avgResponseHours: 0, initials: "؟",
});

const unknownEntity = (id: string): Entity => ({
  id, name: "جهة غير معروفة", short: "—", kind: "مديرية", managerId: "",
  units: [], staffCount: 0, active: false, compliance: 0, openTasks: 0, lateTasks: 0, accent: "navy",
});

export const personOf = (id: string): Person => people.find((p) => p.id === id) ?? unknownPerson(id);
export const entityOf = (id: string): Entity => entities.find((e) => e.id === id) ?? unknownEntity(id);
export const hallOf = (id: string): Hall | undefined => halls.find((h) => h.id === id);
export const roleOf = (key: string): Role | undefined => roles.find((r) => r.key === key);
