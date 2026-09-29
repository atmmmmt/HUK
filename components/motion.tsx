"use client";

import { useEffect, useRef, useState } from "react";

/**
 * بارالاكس: طبقات تتحرك بسرعات مختلفة مع حركة المؤشر والتمرير.
 * يحترم تفضيل تقليل الحركة في النظام فيتوقف تماماً.
 */
export function useParallax() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const layers = Array.from(host.querySelectorAll<HTMLElement>("[data-depth]"));
    if (!layers.length) return;

    let mx = 0, my = 0, sy = 0, raf = 0;

    const apply = () => {
      raf = 0;
      for (const el of layers) {
        const d = parseFloat(el.dataset.depth ?? "0");
        const x = mx * d * 26;
        const y = my * d * 26 + sy * d * 0.35;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
      schedule();
    };

    const onScroll = () => {
      sy = window.scrollY;
      schedule();
    };

    host.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      host.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}

/** يكشف العناصر تدريجياً عند وصولها إلى الشاشة */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const items = Array.from(host.querySelectorAll<HTMLElement>(".reveal"));
    if (!items.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((el) => el.classList.add("seen"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("seen");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return ref;
}

/** الخلفية الداكنة المشتركة: أشكال مصمتة بعمق بارالاكس */
export function DarkStage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useParallax();
  return (
    <div ref={ref} className={`dark-stage ${className}`}>
      <span className="stage-shape ring plx" data-depth="0.9" style={{ width: 540, height: 540, insetInlineStart: -170, top: -160 }} />
      <span className="stage-shape ring-2 plx" data-depth="0.55" style={{ width: 760, height: 760, insetInlineEnd: -280, bottom: -340 }} />
      <span className="stage-shape gold-dot plx" data-depth="1.4" style={{ width: 190, height: 190, insetInlineEnd: "-60px", top: "18%" }} />
      <span className="stage-shape block plx" data-depth="0.7" style={{ width: 120, height: 120, insetInlineStart: "-40px", bottom: "18%", opacity: .6 }} />
      <span className="stage-shape ring plx" data-depth="1.1" style={{ width: 170, height: 170, insetInlineStart: "30%", top: "-70px" }} />
      {children}
    </div>
  );
}

/** عدّاد تصاعدي مستقر */
export function useCountUp(value: number, duration = 750) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return shown;
}
