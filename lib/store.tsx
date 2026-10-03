"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setData, type Bootstrap } from "./lookup";
import type {
  Assignment, AssignmentStatus, Booking, Classification, Letter, Meeting, Note, Notification, Person, Priority,
  DocFile, RequestItem, RoleKey, UploadedDoc,
} from "./types";

export interface NewAssignmentInput {
  title: string; source: string; ownerId: string; priority: Priority; dueISO: string;
  closeCriteria: string; partnerIds?: string[]; classification?: Classification;
}
export type RequestResponse =
  | { action: "approve" | "reject"; note?: string }
  | { action: "schedule" | "propose"; dayISO: string; time: string; note?: string };
export interface NewUserInput {
  name: string; title: string; username: string; password: string; role: RoleKey;
  entityId: string; unit?: string; clearance?: Classification; phone?: string;
}

type Toast = { id: number; text: string; tone: "ok" | "info" | "warn" };

interface Store {
  ready: boolean;
  /** لم يسجّل الدخول بعد — شاشة الاختيار تعمل بدونه */
  anon: boolean;
  error: string | null;
  me: Person;
  assignments: Assignment[];
  bookings: Booking[];
  notes: Note[];
  notifications: Notification[];
  unread: number;
  decisionIds: string[];
  advance: (id: string, status: AssignmentStatus) => Promise<void>;
  markSeen: (id: string) => Promise<void>;
  setProgress: (id: string, progress: number) => Promise<void>;
  setBookingStatus: (id: string, status: Booking["status"]) => Promise<void>;
  addNote: (n: { target: string; targetLabel: string; text: string; scope: Note["scope"]; mentions?: string[] }) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  resolveDecision: (id: string, action: "approve" | "return") => Promise<void>;
  addEntity: (input: { name: string; kind: string; units: string[] }) => Promise<void>;
  toggleEntity: (id: string, active: boolean) => Promise<void>;
  logout: () => Promise<void>;
  meetings: Meeting[];
  letters: Letter[];
  requests: RequestItem[];
  people: Person[];
  escalationLevels: number[] | null;
  issueAssignment: (input: NewAssignmentInput) => Promise<Assignment>;
  approveMinutes: (meetingId: string) => Promise<void>;
  assignOutcomes: (meetingId: string, items: { outcomeId: string; ownerId: string; priority: Priority; dueISO: string }[]) => Promise<void>;
  raiseRequest: (input: { kind: RequestItem["kind"]; title: string; detail: string }) => Promise<void>;
  respondRequest: (id: string, input: RequestResponse) => Promise<void>;
  registerLetter: (input: Pick<Letter, "direction" | "party" | "subject" | "referredTo" | "action" | "classification"> & { dueHours?: number }) => Promise<void>;
  letterAction: (id: string, action: "handle" | "archive") => Promise<void>;
  createUser: (input: NewUserInput) => Promise<void>;
  setUserActive: (id: string, active: boolean) => Promise<void>;
  saveEscalation: (levels: number[]) => Promise<void>;
  documents: UploadedDoc[];
  files: (DocFile & { locked?: boolean })[];
  uploadDocument: (file: File, target: { folderId?: string; assignmentId?: string; decisionId?: string }, classification?: Classification) => Promise<void>;
  submitDecision: (input: DecisionInput, files: File[]) => Promise<void>;
  scheduleMeeting: (input: MeetingInput) => Promise<void>;
  rsvpMeeting: (id: string, answer: "confirm" | "apologize") => Promise<void>;
  refresh: () => Promise<void>;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
  dense: boolean;
  setDense: (v: boolean) => void;
}

export type DecisionInput = { title: string; note?: string; amount?: string; priority: Priority; awaiting: "governor" | "deputy" | "assistant"; entityId?: string; classification: Classification };

export type MeetingInput = { title: string; kind: string; dateISO: string; time: string; hallId?: string; online: boolean; inviteeIds: string[]; agenda: string[]; summary?: string };

const Ctx = createContext<Store | null>(null);
const DENSE_KEY = "gov.dense";

async function call(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "تعذّر تنفيذ الطلب");
  return data;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [anon, setAnon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dense, setDenseState] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = (await call("/api/bootstrap")) as Bootstrap;
      setData(data);
      setBoot(data);
      setAnon(false);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذّر تحميل البيانات";
      if (/الجلسة/.test(msg)) {
        // شاشة الاختيار والمقدمة تعملان بلا جلسة
        const open = ["/", "/welcome"].includes((window.location.pathname.replace(/\/$/, "") || "/"));
        setAnon(true);
        if (!open) router.replace("/login");
        return;
      }
      setError(msg);
    }
  }, [router]);

  // لا تُطلب البيانات في صفحة الدخول، وتُطلب مرة واحدة بعد نجاح الدخول
  useEffect(() => {
    if (pathname?.startsWith("/login")) return;
    if (boot) return;
    void load();
  }, [pathname, boot, load]);

  useEffect(() => {
    try { setDenseState(localStorage.getItem(DENSE_KEY) === "1"); } catch { /* محجوب */ }
  }, []);

  /* مزامنة حيّة: ما يكتبه الآخرون (ملاحظات، قراءة، إشعارات) يصل دون إعادة فتح التطبيق —
     كل 20 ثانية والتطبيق ظاهر، وفوراً عند العودة إليه */
  const signedIn = !!boot;
  useEffect(() => {
    if (!signedIn) return;
    let busy = false;
    const sync = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const res = await fetch("/api/bootstrap", { headers: { "Content-Type": "application/json" } });
        if (res.ok) { const data = (await res.json()) as Bootstrap; setData(data); setBoot(data); }
      } catch { /* بلا شبكة: نحاول لاحقاً */ } finally { busy = false; }
    };
    const t = window.setInterval(sync, 20000);
    const onShow = () => { if (document.visibilityState === "visible") void sync(); };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
    };
  }, [signedIn]);

  const setDense = useCallback((v: boolean) => {
    setDenseState(v);
    try { localStorage.setItem(DENSE_KEY, v ? "1" : "0"); } catch { /* محجوب */ }
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  /** ينفّذ طلباً ويعرض رسالة الخادم عند الرفض */
  const guard = useCallback(async (fn: () => Promise<void>, okMsg?: string) => {
    try {
      await fn();
      if (okMsg) toast(okMsg);
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر تنفيذ الطلب", "warn");
      throw e;
    }
  }, [toast]);

  const patchLocal = useCallback((fn: (b: Bootstrap) => Bootstrap) => {
    setBoot((b) => {
      if (!b) return b;
      const next = fn(b);
      setData(next);
      return next;
    });
  }, []);

  const advance = useCallback(async (id: string, status: AssignmentStatus) => {
    await guard(async () => {
      const { assignment } = await call(`/api/assignments/${id}/`, {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      patchLocal((b) => ({ ...b, assignments: b.assignments.map((a) => (a.id === id ? assignment : a)) }));
    }, `تم نقل التكليف إلى «${status}» وسُجّل في سجل التدقيق`);
  }, [guard, patchLocal]);

  const markSeen = useCallback(async (id: string) => {
    try {
      const { assignment } = await call(`/api/assignments/${id}/`, { method: "PATCH", body: JSON.stringify({ seen: true }) });
      if (assignment) patchLocal((b) => ({ ...b, assignments: b.assignments.map((a) => (a.id === id ? assignment : a)) }));
    } catch { /* غير حرج */ }
  }, [patchLocal]);

  const setProgress = useCallback(async (id: string, progress: number) => {
    await guard(async () => {
      const { assignment } = await call(`/api/assignments/${id}/`, {
        method: "PATCH", body: JSON.stringify({ progress }),
      });
      patchLocal((b) => ({ ...b, assignments: b.assignments.map((a) => (a.id === id ? assignment : a)) }));
    }, "حُدّثت نسبة الإنجاز");
  }, [guard, patchLocal]);

  const setBookingStatus = useCallback(async (id: string, status: Booking["status"]) => {
    await guard(async () => {
      const { booking } = await call(`/api/bookings/${id}/`, {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      patchLocal((b) => ({ ...b, bookings: b.bookings.map((x) => (x.id === id ? booking : x)) }));
    }, status === "مؤكد" ? "تم تأكيد الحجز وإشعار الطالب" : "حُدّثت حالة الحجز");
  }, [guard, patchLocal]);

  const addNote = useCallback(async (input: { target: string; targetLabel: string; text: string; scope: Note["scope"]; mentions?: string[] }) => {
    await guard(async () => {
      const { note } = await call("/api/notes/", { method: "POST", body: JSON.stringify(input) });
      patchLocal((b) => ({ ...b, notes: [note, ...b.notes] }));
    }, "أُضيفت الملاحظة وسُجّلت باسمك");
  }, [guard, patchLocal]);

  const markRead = useCallback(async (id: string) => {
    patchLocal((b) => ({ ...b, notifications: b.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    await call("/api/notifications/", { method: "PATCH", body: JSON.stringify({ id }) }).catch(() => {});
  }, [patchLocal]);

  const markAllRead = useCallback(async () => {
    patchLocal((b) => ({ ...b, notifications: b.notifications.map((n) => ({ ...n, read: true })) }));
    await call("/api/notifications/", { method: "PATCH", body: JSON.stringify({ all: true }) }).catch(() => {});
  }, [patchLocal]);

  const resolveDecision = useCallback(async (id: string, action: "approve" | "return") => {
    await guard(async () => {
      await call(`/api/decisions/${id}/`, { method: "PATCH", body: JSON.stringify({ action }) });
      patchLocal((b) => ({ ...b, decisions: b.decisions.filter((d) => d.id !== id) }));
    }, action === "approve" ? "اعتُمدت المعاملة وسُجّلت في سجل التدقيق" : "أُعيدت المعاملة مع الملاحظات");
  }, [guard, patchLocal]);

  const addEntity = useCallback(async (input: { name: string; kind: string; units: string[] }) => {
    await guard(async () => {
      const { entity } = await call("/api/entities/", { method: "POST", body: JSON.stringify(input) });
      patchLocal((b) => ({ ...b, entities: [...b.entities, entity] }));
    }, "أُضيفت الجهة وظهرت فوراً في بوابة المديريات");
  }, [guard, patchLocal]);

  const toggleEntity = useCallback(async (id: string, active: boolean) => {
    await guard(async () => {
      const { entity } = await call("/api/entities/", { method: "PATCH", body: JSON.stringify({ id, active }) });
      patchLocal((b) => ({ ...b, entities: b.entities.map((e) => (e.id === id ? entity : e)) }));
    }, "تغيّرت حالة التفعيل — البيانات محفوظة ولم تُحذف");
  }, [guard, patchLocal]);

  /* ───────── الإنشاء والإدارة اليومية ───────── */

  const issueAssignment = useCallback(async (input: NewAssignmentInput) => {
    let created!: Assignment;
    await guard(async () => {
      const { assignment } = await call("/api/assignments/", { method: "POST", body: JSON.stringify(input) });
      created = assignment;
      patchLocal((b) => ({ ...b, assignments: [assignment, ...b.assignments] }));
    }, "صدر التكليف ووصل إشعار إلى المكلَّف");
    return created;
  }, [guard, patchLocal]);

  const patchMeeting = useCallback(async (id: string, payload: unknown, okMsg: string) => {
    await guard(async () => {
      const { meeting, assignments } = await call(`/api/meetings/${id}/`, { method: "PATCH", body: JSON.stringify(payload) });
      patchLocal((b) => ({
        ...b,
        meetings: b.meetings.map((m) => (m.id === id && meeting ? meeting : m)),
        assignments: [...(assignments ?? []), ...b.assignments],
      }));
    }, okMsg);
  }, [guard, patchLocal]);

  const approveMinutes = useCallback((id: string) =>
    patchMeeting(id, { action: "approve_minutes" }, "اعتُمد المحضر وأُبلغ المدعوون"), [patchMeeting]);

  const assignOutcomes = useCallback((id: string, items: { outcomeId: string; ownerId: string; priority: Priority; dueISO: string }[]) =>
    patchMeeting(id, { action: "assign_outcomes", items }, "تحوّلت المخرجات إلى تكليفات وأُشعر المكلَّفون"), [patchMeeting]);

  const rsvpMeeting = useCallback((id: string, answer: "confirm" | "apologize") =>
    patchMeeting(id, { action: "rsvp", answer }, answer === "confirm" ? "أكّدت حضورك وأُبلغ رئيس الجلسة" : "سُجّل اعتذارك وأُبلغ رئيس الجلسة"), [patchMeeting]);

  const scheduleMeeting = useCallback(async (input: MeetingInput) => {
    await guard(async () => {
      const { meeting } = await call("/api/meetings/", { method: "POST", body: JSON.stringify(input) });
      patchLocal((b) => ({ ...b, meetings: [meeting, ...b.meetings] }));
    }, "جُدول الاجتماع ووصلت الدعوة إلى المدعوين");
  }, [guard, patchLocal]);

  const raiseRequest = useCallback(async (input: { kind: RequestItem["kind"]; title: string; detail: string }) => {
    await guard(async () => {
      const { request } = await call("/api/requests/", { method: "POST", body: JSON.stringify(input) });
      patchLocal((b) => ({ ...b, requests: [request, ...b.requests] }));
    }, "رُفع الطلب إلى الديوان");
  }, [guard, patchLocal]);

  const respondRequest = useCallback(async (id: string, input: RequestResponse) => {
    await guard(async () => {
      const { request, meeting } = await call(`/api/requests/${id}/`, { method: "PATCH", body: JSON.stringify(input) });
      patchLocal((b) => ({
        ...b,
        requests: b.requests.map((r) => (r.id === id && request ? request : r)),
        meetings: meeting ? [meeting, ...b.meetings] : b.meetings,
      }));
    }, input.action === "schedule" ? "حُدّد الموعد وأُضيف إلى الاجتماعات" : input.action === "propose" ? "أُرسل الوقت المقترح إلى صاحب الطلب" : input.action === "approve" ? "تمت الموافقة وأُبلغ صاحب الطلب" : "رُفض الطلب وأُبلغ صاحبه");
  }, [guard, patchLocal]);

  const registerLetter = useCallback(async (input: Pick<Letter, "direction" | "party" | "subject" | "referredTo" | "action" | "classification"> & { dueHours?: number }) => {
    await guard(async () => {
      const { letter } = await call("/api/letters/", { method: "POST", body: JSON.stringify(input) });
      patchLocal((b) => ({ ...b, letters: [letter, ...b.letters] }));
    }, "قُيّد الكتاب برقم تسلسلي");
  }, [guard, patchLocal]);

  const letterAction = useCallback(async (id: string, action: "handle" | "archive") => {
    await guard(async () => {
      const { letter } = await call(`/api/letters/${id}/`, { method: "PATCH", body: JSON.stringify({ action }) });
      patchLocal((b) => ({ ...b, letters: b.letters.map((l) => (l.id === id && letter ? letter : l)) }));
    }, action === "handle" ? "عُلّم الكتاب معالَجاً" : "أُرشف الكتاب");
  }, [guard, patchLocal]);

  const createUser = useCallback(async (input: NewUserInput) => {
    await guard(async () => {
      const { person } = await call("/api/users/", { method: "POST", body: JSON.stringify(input) });
      patchLocal((b) => ({ ...b, people: [...b.people, person] }));
    }, "أُنشئ الحساب — سلّم صاحبه اسم المستخدم وكلمة المرور");
  }, [guard, patchLocal]);

  const setUserActive = useCallback(async (id: string, active: boolean) => {
    await guard(async () => {
      await call(`/api/users/${id}/`, { method: "PATCH", body: JSON.stringify({ active }) });
      patchLocal((b) => ({ ...b, people: b.people.map((p) => (p.id === id ? { ...p, active } as Person : p)) }));
    }, active ? "فُعّل الحساب" : "عُطّل الحساب — لا يستطيع صاحبه الدخول");
  }, [guard, patchLocal]);

  const saveEscalation = useCallback(async (levels: number[]) => {
    await guard(async () => {
      await call("/api/settings/", { method: "PUT", body: JSON.stringify({ levels }) });
      patchLocal((b) => ({ ...b, settings: { ...(b.settings ?? { escalationLevels: null }), escalationLevels: levels } }));
    }, "حُفظ سُلّم التصعيد");
  }, [guard, patchLocal]);

  const uploadDocument = useCallback(async (file: File, target: { folderId?: string; assignmentId?: string; decisionId?: string }, classification?: Classification) => {
    await guard(async () => {
      const fd = new FormData();
      fd.append("file", file);
      if (target.folderId) fd.append("folderId", target.folderId);
      if (target.assignmentId) fd.append("assignmentId", target.assignmentId);
      if (target.decisionId) fd.append("decisionId", target.decisionId);
      if (classification) fd.append("classification", classification);
      // بلا ترويسة Content-Type حتى يضبط المتصفح حدود multipart بنفسه
      const res = await fetch("/api/documents/", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "تعذّر رفع الملف");
      const { document, attachment } = data;
      patchLocal((b) => ({
        ...b,
        documents: [document, ...(b.documents ?? [])],
        files: b.files.map((f) => (f.id === target.folderId ? { ...f, items: f.items + 1, updated: "الآن" } : f)),
        assignments: attachment ? b.assignments.map((a) => (a.id === target.assignmentId ? { ...a, attachments: [...a.attachments, attachment] } : a)) : b.assignments,
      }));
    }, "رُفع المستند");
  }, [guard, patchLocal]);

  const submitDecision = useCallback(async (input: DecisionInput, files: File[]) => {
    await guard(async () => {
      const { decision } = await call("/api/decisions/", { method: "POST", body: JSON.stringify(input) });
      patchLocal((b) => ({ ...b, decisions: [decision, ...b.decisions] }));
      // المرفقات بعد إنشاء المعاملة؛ فشل ملف لا يُسقط المعاملة
      const failed: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("decisionId", decision.id);
        const res = await fetch("/api/documents/", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { failed.push(file.name); continue; }
        patchLocal((b) => ({ ...b, documents: [data.document, ...(b.documents ?? [])] }));
      }
      if (failed.length) toast(`لم يُرفق: ${failed.join("، ")}`, "warn");
    }, files.length ? "رُفعت المعاملة مع مرفقاتها إلى صندوق التوقيع" : "رُفعت المعاملة إلى صندوق التوقيع");
  }, [guard, patchLocal, toast]);

  const logout = useCallback(async () => {
    await call("/api/auth/logout/", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }, [router]);

  const value = useMemo<Store>(() => ({
    ready: !!boot,
    anon,
    error,
    me: (boot?.me ?? {}) as Person,
    assignments: boot?.assignments ?? [],
    bookings: boot?.bookings ?? [],
    notes: boot?.notes ?? [],
    notifications: boot?.notifications ?? [],
    unread: (boot?.notifications ?? []).filter((n) => !n.read).length,
    decisionIds: (boot?.decisions ?? []).map((d) => d.id),
    advance, markSeen, setProgress, setBookingStatus, addNote, markRead, markAllRead,
    resolveDecision, addEntity, toggleEntity, logout, refresh: load,
    toasts, toast, dense, setDense,
    meetings: boot?.meetings ?? [],
    letters: boot?.letters ?? [],
    requests: boot?.requests ?? [],
    people: boot?.people ?? [],
    escalationLevels: boot?.settings?.escalationLevels ?? null,
    issueAssignment, approveMinutes, assignOutcomes, raiseRequest, respondRequest,
    registerLetter, letterAction, createUser, setUserActive, saveEscalation,
    documents: boot?.documents ?? [], files: boot?.files ?? [], uploadDocument, submitDecision, scheduleMeeting, rsvpMeeting,
  }), [boot, anon, error, advance, markSeen, setProgress, setBookingStatus, addNote, markRead, markAllRead,
    resolveDecision, addEntity, toggleEntity, logout, load, toasts, toast, dense, setDense,
    issueAssignment, approveMinutes, assignOutcomes, raiseRequest, respondRequest,
    registerLetter, letterAction, createUser, setUserActive, saveEscalation, uploadDocument, submitDecision, scheduleMeeting, rsvpMeeting]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore خارج نطاق StoreProvider");
  return v;
}
