"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlarmClock, Bell, BookOpen, Building2, CalendarDays, Check, CheckCheck, ChevronDown, DoorOpen,
  Flag, FolderOpen, GitFork, IdCard, Inbox, LayoutGrid, ListTodo, Lock, MailQuestion, Menu, Network,
  PanelRightClose, PanelRightOpen, Rows3, ScrollText, Search, Send, ShieldCheck, SlidersHorizontal,
  LogOut, Sparkles, Stamp, StickyNote, TrendingUp, Users,
} from "lucide-react";
import { metaOf, navByPortal } from "@/lib/nav";
import { canAccessSection, homeSectionFor, portalLabels, portalsFor, reachLabel } from "@/lib/access";
import { entityOf } from "@/lib/lookup";
import { useStore } from "@/lib/store";
import type { Portal } from "@/lib/types";
import Section from "@/components/sections";
import TabBar from "@/components/tabbar";
import MobileFx from "@/components/mobile-fx";
import NavGestures from "@/components/nav-gestures";
import ThemeToggle from "@/components/theme-toggle";
import MobileSearch from "@/components/mobile-search";

const icons: Record<string, typeof LayoutGrid> = {
  LayoutGrid, CalendarDays, Users, Stamp, ListTodo, Inbox, DoorOpen, Flag, FolderOpen, IdCard, StickyNote,
  Network, Send, MailQuestion, GitFork, TrendingUp, Building2, ShieldCheck, AlarmClock, ScrollText,
};

export default function Shell({ portal, section }: { portal: Portal; section: string }) {
  const router = useRouter();
  const { me, ready, error, unread, notifications, markRead, markAllRead, dense, setDense, logout, refresh } = useStore();
  const [mini, setMini] = useState(false);
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [more, setMore] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [finding, setFinding] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = useMemo(
    () => ready ? navByPortal[portal].filter((item) => canAccessSection(me, portal, item.key)) : navByPortal[portal],
    [ready, me, portal],
  );
  const meta = metaOf(portal, section);
  const allowed = ready ? portalsFor(me) : [];
  const blocked = ready && !canAccessSection(me, portal, section);

  useEffect(() => { setOpen(false); setMore(false); }, [section, portal]);
  const closeSearch = useCallback(() => setFinding(false), []);

  const groups = useMemo(() => {
    const map = new Map<string, typeof nav>();
    nav.forEach((n) => {
      const list = map.get(n.group) ?? [];
      list.push(n);
      map.set(n.group, list);
    });
    return [...map.entries()];
  }, [nav]);

  const mine = notifications.filter((n) => n.toId === me.id);
  const list = mine.length ? mine : notifications;

  if (!ready) {
    return (
      <div className="boot">
        <div className="boot-inner">
          {error ? (
            <>
              <h3 style={{ marginBottom: 8 }}>تعذّر الاتصال بقاعدة البيانات</h3>
              <p className="muted" style={{ marginBottom: 16 }}>{error}</p>
              <button className="btn primary" onClick={() => void refresh()}>إعادة المحاولة</button>
            </>
          ) : (
            <>
              <div className="boot-spin" />
              <b>جارٍ تحميل بيانات المحافظة…</b>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`shell role-${me.role} ${dense ? "dense" : ""} ${scrolled ? "scrolled" : ""}`}>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <aside className={`rail ${mini ? "mini" : ""} ${open ? "open" : ""}`}>
        <div className="rail-head">
          <div className="rail-crest"><Building2 size={20} /></div>
          <div className="rail-title">
            <b>{portalLabels[portal].title}</b>
            <span>محافظة الرقة</span>
          </div>
        </div>

        <nav className="rail-scroll">
          {groups.map(([group, items]) => (
            <div key={group}>
              <div className="rail-group-label">{group}</div>
              {items.map((item) => {
                const Icon = icons[item.icon] ?? LayoutGrid;
                const on = item.key === section;
                return (
                  <Link
                    key={item.key}
                    href={`/${portal}/${item.key}/`}
                    className={`nav-item ${on ? "on" : ""}`}
                    title={mini ? item.label : undefined}
                  >
                    <Icon size={18} />
                    <span className="nav-text">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          <div className="rail-group-label">التنقّل</div>
          {(["diwan", "directorates", "admin"] as Portal[])
            .filter((p) => p !== portal && allowed.includes(p))
            .map((p) => {
              const Icon = p === "diwan" ? Building2 : p === "directorates" ? Network : SlidersHorizontal;
              return (
                <button
                  key={p}
                  className="nav-item"
                  onClick={() => {
                    const home = homeSectionFor(me, p);
                    if (home) router.push(`/${p}/${home}/`);
                  }}
                  title={mini ? portalLabels[p].title : undefined}
                >
                  <Icon size={18} />
                  <span className="nav-text">{portalLabels[p].title}</span>
                </button>
              );
            })}
        </nav>

        <div className="rail-foot">
          {!mini && <div style={{ marginBottom: 8 }}><ThemeToggle compact /></div>}
          <Link href="/guide/" className="nav-item" style={{ marginBottom: 2 }} title={mini ? "دليل الاستخدام" : undefined}>
            <BookOpen size={18} />
            <span className="nav-text">دليل الاستخدام</span>
          </Link>
          <Link href="/welcome/" className="nav-item" style={{ marginBottom: 6 }} title={mini ? "جولة تعريفية" : undefined}>
            <Sparkles size={18} />
            <span className="nav-text">جولة تعريفية</span>
          </Link>
          <button className="rail-me" onClick={() => router.push("/")}>
            <span className={`ava ${me.role === "governor" ? "gold" : me.role === "director" ? "teal" : ""}`}>{me.initials}</span>
            <span className="rail-foot-text">
              <b>{me.name}</b>
              <span>{me.title}</span>
            </span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="m-me" onClick={() => setMore(true)} aria-label="الحساب">
            <span className={`ava ${me.role === "governor" ? "gold" : me.role === "director" ? "teal" : ""}`}>{me.initials}</span>
          </button>
          <div className="m-title">
            <span>{portalLabels[portal].title}</span>
            <b>{meta.label}</b>
          </div>
          <button className="icon-btn rail-mobile-toggle" onClick={() => setOpen(true)} aria-label="فتح القائمة">
            <Menu size={19} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setMini(!mini)}
            aria-label={mini ? "توسيع القائمة" : "طي القائمة"}
            style={{ display: "grid" }}
          >
            {mini ? <PanelRightOpen size={19} /> : <PanelRightClose size={19} />}
          </button>

          <div className="crumbs">
            <Link href="/" style={{ color: "var(--muted)" }}>البوابات</Link>
            <span className="dot-sep">/</span>
            <span>{portalLabels[portal].title}</span>
            <span className="dot-sep">/</span>
            <b>{meta.label}</b>
          </div>

          <label className="top-search">
            <Search size={16} />
            <input
              placeholder="بحث في التكليفات والكتب والأشخاص…"
              readOnly
              onFocus={(e) => { e.currentTarget.blur(); setFinding(true); }}
              onClick={() => setFinding(true)}
            />
          </label>

          <button
            className="icon-btn"
            onClick={() => setDense(!dense)}
            data-desk
            aria-label="كثافة العرض"
            title="كثافة العرض"
          >
            <Rows3 size={19} />
          </button>

          <button className="icon-btn m-search-btn" onClick={() => setFinding(true)} aria-label="بحث">
            <Search size={19} />
          </button>

          <div style={{ position: "relative" }}>
            <button className="icon-btn bell" onClick={() => {
              const next = !bell;
              setBell(next);
              if (next) void enableDeviceNotifications();
            }} aria-label="الإشعارات">
              <Bell size={19} />
              {unread > 0 && <span className="bell-dot">{unread}</span>}
            </button>
            {bell && typeof document !== "undefined" && createPortal(
              <>
                <div className="pop-scrim" onClick={() => setBell(false)} />
                <div className="pop-panel" role="dialog" aria-modal="true" aria-label="الإشعارات">
                  <span className="m-grab" aria-hidden />
                  <div className="pop-head">
                    <div>
                      <b style={{ fontSize: 16 }}>الإشعارات</b>
                      <span className="tiny muted" style={{ display: "block", marginTop: 2 }}>{unread ? `${unread} غير مقروء` : "كل شيء مقروء"}</span>
                    </div>
                    <button className="btn quiet sm" onClick={markAllRead}>
                      <CheckCheck size={14} /> تعليم الكل مقروءاً
                    </button>
                  </div>
                  <div className="pop-list">
                    {list.length === 0 && <div className="notif-empty"><Bell size={28} /><b>لا توجد إشعارات حالياً</b><span>ستظهر هنا التكليفات والملاحظات والتحديثات الجديدة.</span></div>}
                    {list.map((n) => (
                      <button
                        key={n.id}
                        className={`notif ${n.read ? "" : "unread"} ${n.urgent ? "urgent" : ""}`}
                        onClick={() => {
                          void markRead(n.id);
                          if (n.link) {
                            const query = n.link.itemId ? `?open=${encodeURIComponent(n.link.itemId)}` : "";
                            router.push(`/${n.link.portal}/${n.link.section}/${query}`);
                          }
                          setBell(false);
                        }}
                      >
                        <span className="notif-dot" style={n.read ? { background: "var(--line)" } : undefined} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <b>{n.title}</b>
                          <p>{n.body}</p>
                          <time>{n.at} · {n.channel}</time>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>,
              document.body,
            )}
          </div>

          <button className="icon-btn top-logout" onClick={() => void logout()} aria-label="تسجيل الخروج" title="تسجيل الخروج">
            <LogOut size={18} />
          </button>
        </header>

        <main className="canvas" key={`${portal}-${section}`}>
          <div className="page-head">
            <div>
              <p className="m-greet">{greeting()}، {me.name.split(" ").slice(0, 2).join(" ")}</p>
              <h1>{meta.title}</h1>
              <p className="sub">{meta.sub}</p>
            </div>
            <div className="page-actions">
              <span className="chip navy lg"><ShieldCheck size={14} /> {reachLabel(me, entityOf(me.entityId).short)}</span>
              {me.role !== "governor" && me.role !== "deputy" && me.role !== "admin" && (
                <span className="chip">{entityOf(me.entityId).short}</span>
              )}
            </div>
          </div>

          {blocked ? (
            <div className="card pad rise" style={{ textAlign: "center", padding: 44 }}>
              <Lock size={34} style={{ color: "var(--warn)", marginBottom: 12 }} />
              <h3 style={{ marginBottom: 6 }}>لا تملك صلاحية الدخول إلى هذه البوابة</h3>
              <p className="muted" style={{ marginBottom: 16 }}>
                صفتك الحالية «{me.title}» لا تملك هذا القسم. نطاقك الفعلي هو «{reachLabel(me)}»، وتظهر لك فقط الأدوات المرتبطة باختصاصك.
              </p>
              <button className="btn primary" onClick={() => router.push("/")}>العودة إلى البوابات</button>
            </div>
          ) : (
            <Section portal={portal} section={section} />
          )}
        </main>

        <MobileFx onRefresh={refresh} />
        <NavGestures home={`/${portal}/${nav[0]?.key ?? ""}/`} />
        <MobileSearch open={finding} onClose={closeSearch} />
        <TabBar portal={portal} section={section} moreOpen={more} setMoreOpen={setMore} />
      </div>
    </div>
  );
}

async function enableDeviceNotifications() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  try { await Notification.requestPermission(); } catch { /* المتصفح لا يسمح */ }
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "صباح الخير" : "مساء الخير";
}
