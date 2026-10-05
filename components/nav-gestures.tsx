"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * تنقّل PWA أقرب للتطبيق الأصلي:
 * - الرجوع يعتمد على سجل الصفحات الحقيقي، لا عدّاد محلي قد يضيع بعد إعادة التركيب.
 * - الألواح التفصيلية فقط تحصل على history guard حتى يغلقها زر الرجوع أولاً.
 * - «المزيد» والإشعارات لا تعبثان بسجل الصفحات، حتى لا تلغيا الانتقال بعد الضغط.
 */
const GUARDED_OVERLAYS = ".docview, .sheet-open, .msearch, .ai-wrap";
const ALL_OVERLAYS = ".docview, .sheet-open, .more-sheet, .pop-panel, .msearch, .ai-wrap";
const CLOSERS = ".scrim, .pop-scrim, .ai-scrim, .more-scrim, .msearch-cancel, [aria-label='إغلاق']";
const EDGE = 28;
const STACK_KEY = "gov.pwa.nav-stack";

const isMobile = () => window.matchMedia("(max-width: 900px)").matches;
const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const buzz = (ms = 10) => { try { navigator.vibrate?.(ms); } catch { /* غير مدعوم */ } };

function readStack(): string[] {
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}

function writeStack(stack: string[]) {
  try { sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-40))); } catch { /* محجوب */ }
}

function closeTop(): boolean {
  const all = document.querySelectorAll<HTMLElement>(ALL_OVERLAYS);
  const top = all[all.length - 1];
  if (!top) return false;
  const prev = top.previousElementSibling as HTMLElement | null;
  const btn = top.querySelector<HTMLElement>(":scope > .scrim, :scope > .ai-scrim, .msearch-cancel, .dv-close")
    ?? (prev?.matches(".scrim, .pop-scrim") ? prev : null)
    ?? top.querySelector<HTMLElement>(CLOSERS);
  btn?.click();
  return true;
}

export default function NavGestures({ home }: { home: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const backRef = useRef(false);
  const lastPathRef = useRef("");

  useEffect(() => {
    const onPop = () => { backRef.current = true; };
    window.addEventListener("popstate", onPop, true);
    return () => window.removeEventListener("popstate", onPop, true);
  }, []);

  /* لا تكبير بالقرص على آيفون */
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
    };
  }, []);

  /* حفظ مسار تنقّل داخلي واتجاه الحركة */
  useEffect(() => {
    if (!pathname) return;
    const back = backRef.current;
    backRef.current = false;

    let stack = readStack();
    const last = stack[stack.length - 1];
    if (!stack.length) stack = [pathname];
    else if (back) {
      const previousIndex = stack.lastIndexOf(pathname);
      stack = previousIndex >= 0 ? stack.slice(0, previousIndex + 1) : [...stack, pathname];
    } else if (last !== pathname) {
      stack.push(pathname);
    }
    writeStack(stack);

    const previous = lastPathRef.current;
    lastPathRef.current = pathname;
    if (!previous || previous === pathname || !isMobile()) return;

    const canvas = document.querySelector<HTMLElement>(".canvas");
    if (!canvas) return;
    canvas.classList.remove("nav-fwd", "nav-back");
    void canvas.offsetWidth;
    canvas.classList.add(back ? "nav-back" : "nav-fwd");
  }, [pathname]);

  /* الألواح التفصيلية: زر الرجوع يغلق اللوح أولاً من دون تخريب history الصفحات */
  useEffect(() => {
    let guarded = document.querySelectorAll(GUARDED_OVERLAYS).length;
    let suppress = 0;
    let guardUrl = location.href;

    const sync = () => {
      const count = document.querySelectorAll(GUARDED_OVERLAYS).length;
      if (count > guarded) {
        for (let i = guarded; i < count; i++) history.pushState({ ...history.state, __pwaOverlay: true }, "");
        guarded = count;
        guardUrl = location.href;
        return;
      }
      if (count < guarded) {
        const diff = guarded - count;
        guarded = count;
        // عند الإغلاق اليدوي ننظف مدخل اللوح فقط إذا بقي المستخدم في نفس الصفحة.
        // التأخير يمنع سباق Link/router.push الذي كان يعيد المستخدم للرئيسية.
        window.setTimeout(() => {
          if (location.href !== guardUrl || diff <= 0) return;
          suppress += diff;
          history.go(-diff);
        }, 120);
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    const onPop = () => {
      if (suppress > 0) { suppress--; backRef.current = false; return; }
      if (guarded > 0 && document.querySelector(GUARDED_OVERLAYS)) {
        guarded = Math.max(0, guarded - 1);
        backRef.current = false;
        closeTop();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  /* سحب من حافة الشاشة للرجوع داخل التطبيق */
  useEffect(() => {
    let x0 = -1, y0 = 0, dx = 0, side = 0, active = false;
    let el: HTMLElement | null = null;
    let viewer = false;
    let shade: HTMLElement | null = null;

    const start = (e: TouchEvent) => {
      x0 = -1;
      if (!isMobile() || !standalone()) return;
      const overlays = document.querySelectorAll(ALL_OVERLAYS);
      viewer = overlays.length > 0 && overlays[overlays.length - 1].matches(".docview");
      if (overlays.length && !viewer) return;

      const x = e.touches[0].clientX;
      const w = window.innerWidth;
      if (x > w - EDGE) side = -1;
      else if (x < EDGE) side = 1;
      else return;

      const stack = readStack();
      if (!viewer && stack.length <= 1 && location.pathname.replace(/\/$/, "") === home.replace(/\/$/, "")) return;
      x0 = x;
      y0 = e.touches[0].clientY;
      dx = 0;
      active = false;
    };

    const move = (e: TouchEvent) => {
      if (x0 < 0) return;
      const d = (e.touches[0].clientX - x0) * side;
      const dy = Math.abs(e.touches[0].clientY - y0);
      if (!active) {
        if (dy > 14 && dy > d) { x0 = -1; return; }
        if (d < 10) return;
        active = true;
        el = document.querySelector<HTMLElement>(viewer ? ".docview" : ".canvas");
        if (!el) { x0 = -1; return; }
        el.classList.remove("nav-fwd", "nav-back");
        el.style.transition = "none";
        el.style.animation = "none";
        el.style.willChange = "transform";
        shade = document.createElement("div");
        shade.className = "nav-shade";
        document.body.classList.add("nav-dragging");
        document.body.appendChild(shade);
      }
      if (e.cancelable) e.preventDefault();
      dx = Math.max(0, d);
      const k = Math.min(1, dx / window.innerWidth);
      el?.style.setProperty("transform", `translateX(${dx * side}px)`, "important");
      if (shade) shade.style.opacity = String(0.16 * (1 - k));
    };

    const end = () => {
      if (x0 < 0) return;
      x0 = -1;
      if (!active || !el) return;
      const w = window.innerWidth;
      const go = dx > w * 0.28;
      const target = el;
      const sh = shade;
      el = null;
      shade = null;
      target.style.transition = "transform .22s cubic-bezier(.22,1,.36,1)";

      if (sh) { sh.style.transition = "opacity .22s"; sh.style.opacity = "0"; }
      if (go) {
        buzz(12);
        target.style.setProperty("transform", `translateX(${w * side}px)`, "important");
        window.setTimeout(() => {
          if (viewer) {
            document.querySelector<HTMLElement>(".docview .dv-close")?.click();
          } else {
            const stack = readStack();
            backRef.current = true;
            if (stack.length > 1) history.back();
            else router.replace(home);
          }
          target.style.transition = "";
          target.style.transform = "";
          target.style.willChange = "";
          target.style.animation = "";
          document.body.classList.remove("nav-dragging");
          sh?.remove();
        }, 170);
      } else {
        target.style.transform = "";
        document.body.classList.remove("nav-dragging");
        window.setTimeout(() => {
          target.style.transition = "";
          target.style.willChange = "";
          target.style.animation = "";
          sh?.remove();
        }, 240);
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
