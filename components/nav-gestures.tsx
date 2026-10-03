"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * الرجوع كتطبيق أصلي:
 * • زر/إيماءة الرجوع في النظام تغلق اللوح المفتوح أولاً بدل مغادرة الصفحة
 * • سحب من حافة الشاشة للرجوع (على آيفون حين يكون التطبيق مثبّتاً — لا إيماءة فيه أصلاً)
 * • انتقال منزلق بين الصفحات يعرف اتجاهه (تقدّم أو رجوع)
 */

const OVERLAYS = ".sheet-open, .more-sheet, .pop-panel, .msearch, .ai-wrap";
const CLOSERS = ".scrim, .pop-scrim, .ai-scrim, .more-scrim, .msearch-cancel, [aria-label='إغلاق']";
const EDGE = 28;

// تبقى عبر إعادة تركيب الصفحات
let depth = 0;
let backAt = 0;
const markBack = () => { backAt = Date.now(); };
if (typeof window !== "undefined") window.addEventListener("popstate", markBack, true);
let lastPath = "";

const isMobile = () => window.matchMedia("(max-width: 900px)").matches;
const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const buzz = (ms = 10) => { try { navigator.vibrate?.(ms); } catch { /* غير مدعوم */ } };

function closeTop(): boolean {
  const all = document.querySelectorAll<HTMLElement>(OVERLAYS);
  const top = all[all.length - 1];
  if (!top) return false;
  const prev = top.previousElementSibling as HTMLElement | null;
  const btn = top.querySelector<HTMLElement>(":scope > .scrim, :scope > .ai-scrim, .msearch-cancel")
    ?? (prev?.matches(".scrim, .pop-scrim") ? prev : null)
    ?? top.querySelector<HTMLElement>(CLOSERS);
  btn?.click();
  return true;
}

export default function NavGestures({ home }: { home: string }) {
  const pathname = usePathname();
  const router = useRouter();

  /* لا تكبير بالقرص على آيفون (يتجاهل إعداد الصفحة أحياناً) */
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
    };
  }, []);

  /* اتجاه الانتقال وعدّاد العمق */
  useEffect(() => {
    if (!lastPath) { lastPath = pathname; return; }
    if (pathname === lastPath) return;
    const back = Date.now() - backAt < 1500;
    backAt = 0;
    const dir = back ? "back" : "fwd";
    depth = back ? Math.max(0, depth - 1) : depth + 1;
    lastPath = pathname;
    const c = document.querySelector<HTMLElement>(".canvas");
    if (!c || !isMobile()) return;
    c.classList.remove("nav-fwd", "nav-back");
    void c.offsetWidth;
    c.classList.add(dir === "back" ? "nav-back" : "nav-fwd");
  }, [pathname]);

  /* زر الرجوع يغلق الألواح أولاً */
  useEffect(() => {
    let guarded = 0;
    let guardHref = "";
    let skip = 0;

    const sync = () => {
      const n = document.querySelectorAll(OVERLAYS).length;
      if (n > guarded) {
        for (let k = guarded; k < n; k++) history.pushState({ ...history.state, __ov: k + 1 }, "");
        guarded = n;
        guardHref = location.href;
      } else if (n < guarded) {
        const diff = guarded - n;
        guarded = n;
        // أُغلق اللوح من الواجهة: نزيل مدخلاته من السجل — إلا إن تغيّرت الصفحة نفسها
        if (location.href === guardHref) { skip += diff; history.go(-diff); }
      }
    };
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true });

    const onPop = () => {
      if (skip > 0) { skip--; backAt = 0; return; }
      if (guarded > 0 && document.querySelector(OVERLAYS)) {
        guarded--;
        backAt = 0;
        closeTop();
        return;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => { mo.disconnect(); window.removeEventListener("popstate", onPop); };
  }, []);

  /* السحب من الحافة للرجوع */
  useEffect(() => {
    let x0 = -1, y0 = 0, dx = 0, side = 0, active = false;
    let el: HTMLElement | null = null;
    let shade: HTMLElement | null = null;

    const start = (e: TouchEvent) => {
      x0 = -1;
      if (!isMobile() || !standalone() || document.querySelector(OVERLAYS)) return;
      if (depth === 0 && location.pathname.replace(/\/$/, "") === home.replace(/\/$/, "")) return;
      const x = e.touches[0].clientX, w = window.innerWidth;
      if (x > w - EDGE) side = -1;        // من الحافة اليمنى (بداية السطر العربي) نحو اليسار
      else if (x < EDGE) side = 1;        // ومن اليسرى نحو اليمين أيضاً
      else return;
      x0 = x; y0 = e.touches[0].clientY; dx = 0; active = false;
    };
    const move = (e: TouchEvent) => {
      if (x0 < 0) return;
      const d = (e.touches[0].clientX - x0) * side;
      const dy = Math.abs(e.touches[0].clientY - y0);
      if (!active) {
        if (dy > 14 && dy > d) { x0 = -1; return; }
        if (d < 10) return;
        active = true;
        el = document.querySelector<HTMLElement>(".canvas");
        if (!el) { x0 = -1; return; }
        el.classList.remove("nav-fwd", "nav-back");
        el.style.transition = "none";
        el.style.animation = "none";
        el.style.willChange = "transform";
        shade = document.createElement("div");
        shade.className = "nav-shade";
        document.body.appendChild(shade);
      }
      if (e.cancelable) e.preventDefault();
      dx = Math.max(0, d);
      const k = Math.min(1, dx / window.innerWidth);
      if (el) el.style.transform = `translateX(${dx * side}px)`;
      if (shade) shade.style.opacity = String(0.22 * (1 - k));
      document.documentElement.style.setProperty("--back-k", k.toFixed(3));
    };
    const end = () => {
      if (x0 < 0) return;
      x0 = -1;
      if (!active || !el) return;
      const w = window.innerWidth;
      const go = dx > w * 0.32;
      const target = el, sh = shade;
      el = null; shade = null;
      target.style.transition = "transform .28s cubic-bezier(.22,1,.36,1)";
      if (sh) { sh.style.transition = "opacity .28s"; sh.style.opacity = "0"; }
      if (go) {
        buzz(12);
        target.style.transform = `translateX(${w * side}px)`;
        window.setTimeout(() => {
          markBack();
          if (depth > 0) history.back();
          else router.push(home);
          window.setTimeout(() => { target.style.transition = ""; target.style.transform = ""; target.style.willChange = ""; target.style.animation = ""; }, 60);
          sh?.remove();
        }, 230);
      } else {
        target.style.transform = "";
        window.setTimeout(() => { target.style.transition = ""; target.style.willChange = ""; target.style.animation = ""; sh?.remove(); }, 300);
      }
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, [router, home]);

  return null;
}
