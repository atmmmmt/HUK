"use client";

import Link from "next/link";
import {
  CalendarDays, Inbox, ListTodo, Stamp, StickyNote,
} from "lucide-react";
import { canAccessSection } from "@/lib/access";
import { useStore } from "@/lib/store";

const buzz = (ms = 8) => { try { navigator.vibrate?.(ms); } catch { /* غير مدعوم */ } };

/**
 * اختصارات لوحة اليوم على الجوال:
 * Dock موحّد وهادئ بدل مجموعة بطاقات منفصلة.
 */
export default function MobileToday() {
  const { me, assignments, letters } = useStore();

  const openAssignments = assignments.filter((a) => a.status !== "مُغلق").length;
  const unreadLetters = letters.filter((l) => l.direction === "وارد" && !l.handled).length;

  const actions = [
    canAccessSection(me, "diwan", "decisions")
      ? { href: "/diwan/decisions/", icon: Stamp, label: "القرارات", primary: true, badge: 0 }
      : null,
    canAccessSection(me, "diwan", "assignments")
      ? { href: "/diwan/assignments/", icon: ListTodo, label: "التكليفات", primary: true, badge: openAssignments }
      : null,
    canAccessSection(me, "diwan", "calendar")
      ? { href: "/diwan/calendar/", icon: CalendarDays, label: "التقويم", primary: false, badge: 0 }
      : null,
    canAccessSection(me, "diwan", "correspondence")
      ? { href: "/diwan/correspondence/", icon: Inbox, label: "الوارد", primary: false, badge: unreadLetters }
      : null,
    canAccessSection(me, "diwan", "notes")
      ? { href: "/diwan/notes/", icon: StickyNote, label: "ملاحظاتي", primary: false, badge: 0 }
      : null,
  ].filter((q): q is NonNullable<typeof q> => !!q).slice(0, 5);

  return (
    <div className="m-today">
      <nav className="mt-smart-dock" aria-label="اختصارات لوحة اليوم">
        {actions.map((q, index) => (
          <Link
            key={q.href}
            href={q.href}
            className={`mt-dock-item ${q.primary ? "primary" : ""} ${index === 0 ? "lead" : ""}`}
            onClick={() => buzz()}
          >
            <span className="mt-dock-icon">
              <q.icon size={19} strokeWidth={1.9} />
              {q.badge > 0 && <i aria-label={`${q.badge} عنصر`}>{q.badge > 99 ? "99+" : q.badge}</i>}
            </span>
            <span className="mt-dock-label">{q.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
