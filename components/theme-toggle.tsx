"use client";

import { useEffect, useState } from "react";
import { Moon, SunMedium, SunMoon } from "lucide-react";
import { applyTheme, readTheme, saveTheme, type ThemePref } from "@/lib/theme";

const OPTIONS: { key: ThemePref; label: string; icon: typeof SunMedium }[] = [
  { key: "light", label: "فاتح", icon: SunMedium },
  { key: "dark", label: "داكن", icon: Moon },
  { key: "auto", label: "تلقائي", icon: SunMoon },
];

/** مبدّل المظهر: يُحفظ على الجهاز، و«تلقائي» يتبع إعداد الجوال لحظياً */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [pref, setPref] = useState<ThemePref>("light");

  useEffect(() => {
    const p = readTheme();
    setPref(p);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (readTheme() === "auto") applyTheme("auto"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className={`theme-toggle ${compact ? "compact" : ""}`} role="radiogroup" aria-label="المظهر">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          role="radio"
          aria-checked={pref === o.key}
          className={pref === o.key ? "on" : ""}
          onClick={() => { setPref(o.key); saveTheme(o.key); }}
          title={o.label}
        >
          <o.icon size={16} />
          {!compact && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  );
}
