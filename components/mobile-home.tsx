"use client";

import Link from "next/link";
import {
  CalendarDays, DoorOpen, Inbox, ListTodo, Stamp, StickyNote,
} from "lucide-react";
import { canAccessSection } from "@/lib/access";
import { useStore } from "@/lib/store";

const buzz = (ms = 8) => { try { navigator.vibrate?.(ms); } catch { /* غير مدعوم */ } };

/** لوحة اليوم على الجوال: اختصارات صغيرة فقط، والتفاصيل الفعلية تبقى في «برنامج اليوم». */
export default function MobileToday() {
  const { me } = useStore();

  const actions = [
    canAccessSection(me, "diwan", "decisions") ? { href: "/diwan/decisions/", icon: Stamp, label: "القرارات" } : null,
    canAccessSection(me, "diwan", "assignments") ? { href: "/diwan/assignments/", icon: ListTodo, label: "التكليفات" } : null,
    canAccessSection(me, "diwan", "calendar") ? { href: "/diwan/calendar/", icon: CalendarDays, label: "التقويم" } : null,
    canAccessSection(me, "diwan", "halls") ? { href: "/diwan/halls/", icon: DoorOpen, label: "القاعات" } : null,
    canAccessSection(me, "diwan", "correspondence") ? { href: "/diwan/correspondence/", icon: Inbox, label: "الوارد" } : null,
    canAccessSection(me, "diwan", "notes") ? { href: "/diwan/notes/", icon: StickyNote, label: "ملاحظاتي" } : null,
  ].filter((q): q is NonNullable<typeof q> => !!q);

  return (
    <div className="m-today">
      <nav className="mt-quick" aria-label="إجراءات سريعة">
        {actions.map((q) => (
          <Link key={q.href} href={q.href} className="mt-q" onClick={() => buzz()}>
            <span className="mt-q-ico"><q.icon size={19} /></span>
            <span>{q.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
