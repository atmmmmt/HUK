"use client";

import { useRef } from "react";

const buzz = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* غير مدعوم */ } };

/**
 * سحب سطر القائمة نحو اليسار لكشف إجراء سريع، والإفلات بعد الحد ينفّذه — كتطبيق البريد.
 * يعمل على الجوال فقط، ويمنع النقرة التي تلي السحب.
 */
export function useSwipeRow(onCommit: (() => void) | null) {
  const s = useRef<{ x: number; y: number; dx: number; on: boolean; el: HTMLElement | null; armed: boolean; moved: boolean }>(
    { x: 0, y: 0, dx: 0, on: false, el: null, armed: false, moved: false },
  );
  if (!onCommit) return {};

  const set = (el: HTMLElement, dx: number, anim: boolean) => {
    el.style.setProperty("--sx", `${dx}px`);
    el.classList.toggle("swiping", !anim);
  };

  return {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      if (e.pointerType === "mouse" || !window.matchMedia("(max-width: 900px)").matches) return;
      s.current = { x: e.clientX, y: e.clientY, dx: 0, on: false, el: e.currentTarget, armed: false, moved: false };
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      const c = s.current;
      if (!c.el) return;
      const dx = e.clientX - c.x;
      const dy = e.clientY - c.y;
      if (!c.on) {
        if (Math.abs(dy) > 10) { c.el = null; return; }
        if (dx < -12) { c.on = true; c.moved = true; c.el.setPointerCapture(e.pointerId); } else return;
      }
      c.dx = Math.max(-160, Math.min(0, dx));
      const armed = c.dx < -96;
      if (armed !== c.armed) { c.armed = armed; buzz(8); c.el.classList.toggle("armed", armed); }
      set(c.el, c.dx, false);
    },
    onPointerUp() {
      const c = s.current;
      if (!c.el) return;
      const el = c.el;
      c.el = null;
      set(el, 0, true);
      el.classList.remove("armed");
      if (c.on && c.armed) { buzz(16); onCommit(); }
    },
    onPointerCancel() {
      const c = s.current;
      if (c.el) { set(c.el, 0, true); c.el.classList.remove("armed"); c.el = null; }
    },
    onClickCapture(e: React.MouseEvent) {
      if (s.current.moved) { e.stopPropagation(); e.preventDefault(); s.current.moved = false; }
    },
  };
}
