"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setData, type Bootstrap } from "./lookup";
import type { Assignment, AssignmentStatus, Booking, Note, Notification, Person } from "./types";

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
  setProgress: (id: string, progress: number) => Promise<void>;
  setBookingStatus: (id: string, status: Booking["status"]) => Promise<void>;
  addNote: (n: { target: string; targetLabel: string; text: string; scope: Note["scope"]; mentions?: string[] }) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  resolveDecision: (id: string, action: "approve" | "return") => Promise<void>;
  addEntity: (input: { name: string; kind: string; units: string[] }) => Promise<void>;
  toggleEntity: (id: string, active: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
  dense: boolean;
  setDense: (v: boolean) => void;
}

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
    advance, setProgress, setBookingStatus, addNote, markRead, markAllRead,
    resolveDecision, addEntity, toggleEntity, logout, refresh: load,
    toasts, toast, dense, setDense,
  }), [boot, anon, error, advance, setProgress, setBookingStatus, addNote, markRead, markAllRead,
    resolveDecision, addEntity, toggleEntity, logout, load, toasts, toast, dense, setDense]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore خارج نطاق StoreProvider");
  return v;
}
