"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlarmClock, Building2, CalendarDays, DoorOpen, Flag, FolderOpen, GitFork, IdCard, Inbox,
  LayoutGrid, ListTodo, LogOut, MailQuestion, MoreHorizontal, Network, ScrollText, Send,
  ShieldCheck, SlidersHorizontal, Sparkles, Stamp, StickyNote, TrendingUp, Users, X,
} from "lucide-react";
import { navByPortal } from "@/lib/nav";
import { portalLabels, portalsFor } from "@/lib/access";
import { useStore } from "@/lib/store";
import type { Portal } from "@/lib/types";

const icons: Record<string, typeof LayoutGrid> = {
  LayoutGrid, CalendarDays, Users, Stamp, ListTodo, Inbox, DoorOpen, Flag, FolderOpen, IdCard,
  StickyNote, Network, Send, MailQuestion, GitFork, TrendingUp, Building2, ShieldCheck, AlarmClock, ScrollText,
};

/** الأقسام الأربعة الأهم في كل بوابة — تظهر في الشريط السفلي */
const primary: Record<Portal, string[]> = {
  diwan: ["overview", "assignments", "meetings", "halls"],
  directorates: ["entities", "inbox", "tasks", "performance"],
  admin: ["entities", "users", "roles", "audit"],
};

export default function TabBar({
  portal, section, moreOpen, setMoreOpen,
}: {
  portal: Portal; section: string; moreOpen: boolean; setMoreOpen: (v: boolean) => void;
}) {
  const router = useRouter();
  const { me, logout } = useStore();
  const nav = navByPortal[portal];
  const keys = primary[portal];
  const tabs = keys.map((k) => nav.find((n) => n.key === k)).filter(Boolean) as typeof nav;
  const rest = nav.filter((n) => !keys.includes(n.key));
  const allowed = portalsFor(me);
  const tap = () => { try { navigator.vibrate?.(8); } catch {} };

  return (
    <>
      <nav className="tabbar" aria-label="التنقّل الرئيسي">
        {tabs.map((t) => {
          const Icon = icons[t.icon] ?? LayoutGrid;
          const on = t.key === section && !moreOpen;
          return (
            <Link
              key={t.key}
              href={`/${portal}/${t.key}/`}
              className={`tab ${on ? "on" : ""}`}
              onClick={() => { tap(); setMoreOpen(false); }}
            >
              <span className="tab-ico"><Icon size={21} /></span>
              <span>{t.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        <button className={`tab ${moreOpen ? "on" : ""}`} onClick={() => { tap(); setMoreOpen(!moreOpen); }}>
          <span className="tab-ico"><MoreHorizontal size={21} /></span>
          <span>المزيد</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <div className="scrim" style={{ zIndex: 58 }} onClick={() => setMoreOpen(false)} />
          <div className="more-sheet" role="dialog" aria-label="المزيد">
            <span className="m-grab" aria-hidden />
            <div className="more-head">
              <span className={`ava lg ${me.role === "governor" ? "gold" : me.role === "director" ? "teal" : ""}`}>{me.initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{portalLabels[portal].title}</b>
                <span>{me.name} · {me.title}</span>
              </div>
              <button className="icon-btn" onClick={() => setMoreOpen(false)} aria-label="إغلاق">
                <X size={20} />
              </button>
            </div>

            <div className="more-body">
              <div className="more-label">أقسام أخرى</div>
              <div className="more-grid">
                {rest.map((n) => {
                  const Icon = icons[n.icon] ?? LayoutGrid;
                  return (
                    <Link
                      key={n.key}
                      href={`/${portal}/${n.key}/`}
                      className={`more-item ${n.key === section ? "on" : ""}`}
                      onClick={() => setMoreOpen(false)}
                    >
                      <Icon size={20} />
                      <span>{n.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="more-label">مساحات العمل</div>
              <div className="more-grid">
                {(["diwan", "directorates", "admin"] as Portal[]).map((p) => {
                  const Icon = p === "diwan" ? Building2 : p === "directorates" ? Network : SlidersHorizontal;
                  const locked = !allowed.includes(p);
                  return (
                    <button
                      key={p}
                      className={`more-item ${p === portal ? "on" : ""}`}
                      style={locked ? { opacity: .4 } : undefined}
                      onClick={() => {
                        if (locked) return;
                        setMoreOpen(false);
                        router.push(`/${p}/${p === "diwan" ? "overview" : "entities"}/`);
                      }}
                    >
                      <Icon size={20} />
                      <span>{portalLabels[p].title}</span>
                    </button>
                  );
                })}
              </div>

              <div className="more-label">الحساب</div>
              <div className="more-grid">
                <Link href="/welcome/" className="more-item" onClick={() => setMoreOpen(false)}>
                  <Sparkles size={20} /><span>جولة تعريفية</span>
                </Link>
                <button className="more-item danger" onClick={() => void logout()}>
                  <LogOut size={20} /><span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
