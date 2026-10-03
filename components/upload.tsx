"use client";

import { useRef, useState } from "react";
import { ChevronLeft, FileImage, FileSpreadsheet, FileText, Loader2, Paperclip, UploadCloud } from "lucide-react";
import { DocViewer } from "@/components/doc-viewer";
import { personOf } from "@/lib/lookup";
import { useStore } from "@/lib/store";
import type { Classification, UploadedDoc } from "@/lib/types";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.pptx,.txt";

const sizeLabel = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} ك.ب` : `${(n / 1048576).toFixed(1)} م.ب`);

/** زر رفع ملف — يفتح منتقي الملفات (أو الكاميرا على الجوال) ويرفع مباشرة */
export function UploadButton({
  target, classification, label = "رفع مستند", className = "btn gold",
}: {
  target: { folderId?: string; assignmentId?: string; decisionId?: string }; classification?: Classification; label?: string; className?: string;
}) {
  const { uploadDocument, toast } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast("حجم الملف أكبر من 8 ميغابايت", "warn");
    setBusy(true);
    try { await uploadDocument(file, target, classification); } catch { /* المتجر يعرض السبب */ } finally { setBusy(false); }
  }

  return (
    <>
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={onPick} />
      <button type="button" className={className} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />} {busy ? "جارٍ الرفع…" : label}
      </button>
    </>
  );
}

/** قائمة مستندات — اللمس يفتحها داخل التطبيق */
export function DocList({ docs, empty = "لا مستندات بعد" }: { docs: UploadedDoc[]; empty?: string }) {
  const [open, setOpen] = useState<UploadedDoc | null>(null);
  if (!docs.length) return empty ? <p className="tiny muted" style={{ padding: "6px 0" }}>{empty}</p> : null;
  return (
    <div className="doc-list">
      {docs.map((d) => {
        const Ico = d.mime.startsWith("image/") ? FileImage : /sheet|excel/.test(d.mime) ? FileSpreadsheet : FileText;
        return (
          <button type="button" key={d.id} className="doc-row" onClick={() => setOpen(d)}>
            <span className="doc-ico"><Ico size={18} /></span>
            <span style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
              <b>{d.name}</b>
              <small>{sizeLabel(d.size)} · {personOf(d.uploadedBy).name} · {d.at}</small>
            </span>
            <ChevronLeft size={18} className="doc-go" />
          </button>
        );
      })}
      {open && <DocViewer doc={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function AttachIcon() { return <Paperclip size={14} />; }
