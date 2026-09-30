"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const SHEETS = ".more-sheet, .pop-panel, .sheet";
const HANDLES = ".m-grab, .more-head, .pop-head, .sheet-head";
const RIPPLE = ".btn, .tab, .more-item, .pill, .card.hover, button.card, .kpi, .icon-btn, table.tbl tbody tr, .nav-item";

const buzz = (ms = 10) => { try { navigator.vibrate?.(ms); } catch { /* غير مدعوم */ } };
const mobile = () => window.matchMedia("(max-width: 900px)").matches;

/**
 * تفاعلات التطبيق الأصلي على الجوال:
 * سحب للتحديث · سحب الألواح للأسفل لإغلاقها · تموّج اللمس · تقلّص رأس الصفحة مع التمرير
 */
export default function MobileFx({ onRefresh }: { onRefresh: () => Promise<void> | void }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const pullRef = useRef(0);

  /* تقلّص البطل مع التمرير */
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const k = Math.min(1, Math.max(0, window.scrollY / 180));
        document.documentElement.style.setProperty("--hero-k", k.toFixed(3));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  /* تموّج اللمس */
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (!mobile()) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>(RIPPLE);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const dot = document.createElement("span");
      dot.className = "fx-ripple";
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.classList.add("fx-host");
      el.appendChild(dot);
      window.setTimeout(() => dot.remove(), 650);
    };
    document.addEventListener("pointerdown", down, { passive: true });
    return () => document.removeEventListener("pointerdown", down);
  }, []);

  /* سحب الألواح للأسفل لإغلاقها */
  useEffect(() => {
    let sheet: HTMLElement | null = null;
    let y0 = 0;
    let dy = 0;
    const start = (e: TouchEvent) => {
      if (!mobile()) return;
      const t = e.target as Element;
      const s = t.closest<HTMLElement>(SHEETS);
      if (!s) return;
      const onHandle = !!t.closest(HANDLES);
      const scroller = s.querySelector(".sheet-body, .pop-list") as HTMLElement | null;
      const atTop = s.scrollTop <= 0 && (!scroller || scroller.scrollTop <= 0);
      if (!onHandle && !atTop) return;
      if (t.closest("button, a, input, select, textarea") && !onHandle) return;
      sheet = s; y0 = e.touches[0].clientY; dy = 0;
      s.style.transition = "none";
    };
    const move = (e: TouchEvent) => {
      if (!sheet) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
    };
    const end = () => {
      const s = sheet;
      if (!s) return;
      sheet = null;
      s.style.transition = "transform .32s cubic-bezier(.22,1,.36,1)";
      if (dy > 110) {
        buzz(12);
        s.style.transform = "translateY(110%)";
        const scrim = s.previousElementSibling as HTMLElement | null;
        const close = scrim?.matches(".scrim, .pop-scrim") ? scrim : null;
        window.setTimeout(() => close?.click(), 220);
      } else {
        s.style.transform = "";
      }
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", end);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
    };
  }, []);

  /* سحب للتحديث */
  useEffect(() => {
    let y0 = -1;
    const start = (e: TouchEvent) => {
      if (!mobile() || window.scrollY > 0 || document.querySelector(SHEETS)) { y0 = -1; return; }
      y0 = e.touches[0].clientY;
    };
    const move = (e: TouchEvent) => {
      if (y0 < 0) return;
      const d = e.touches[0].clientY - y0;
      if (d <= 0 || window.scrollY > 0) { if (pullRef.current) { pullRef.current = 0; setPull(0); } return; }
      const eased = Math.min(110, d * 0.45);
      if (eased >= 70 && pullRef.current < 70) buzz(8);
      pullRef.current = eased;
      setPull(eased);
    };
    const end = async () => {
      if (y0 < 0) return;
      y0 = -1;
      const hit = pullRef.current >= 70;
      pullRef.current = 0;
      setPull(0);
      if (!hit) return;
      setBusy(true);
      try { await onRefresh(); } finally { window.setTimeout(() => setBusy(false), 400); }
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", end);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
    };
  }, [onRefresh]);

  const shown = busy ? 70 : pull;
  return (
    <div
      className={`ptr ${busy ? "busy" : ""} ${pull >= 70 ? "armed" : ""}`}
      style={{ transform: `translate(-50%, ${shown - 50}px)`, opacity: Math.min(1, shown / 50) }}
      aria-hidden
    >
      <RefreshCw size={18} style={{ transform: busy ? undefined : `rotate(${pull * 3.2}deg)` }} />
    </div>
  );
}
