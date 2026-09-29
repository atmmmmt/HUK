"use client";

import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";

export default function Toasts() {
  const { toasts } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          {t.tone === "ok" ? <CheckCircle2 size={18} /> : t.tone === "warn" ? <TriangleAlert size={18} /> : <Info size={18} />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
