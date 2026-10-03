"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Download, FileText, Loader2, Share2 } from "lucide-react";
import type { UploadedDoc } from "@/lib/types";

/**
 * عارض المستندات داخل التطبيق — لا يغادر المستخدم المنظومة ولا يفتح المتصفح.
 * PDF يُرسم صفحةً صفحة، والصور تُعرض مباشرة، وWord وExcel والنص تُحوَّل لعرض مقروء.
 */

type Kind = "pdf" | "image" | "docx" | "xlsx" | "text" | "other";

const kindOf = (d: UploadedDoc): Kind => {
  const n = d.name.toLowerCase();
  if (d.mime === "application/pdf") return "pdf";
  if (d.mime.startsWith("image/") && !n.endsWith(".heic")) return "image";
  if (n.endsWith(".docx")) return "docx";
  if (n.endsWith(".xlsx")) return "xlsx";
  if (d.mime === "text/plain") return "text";
  return "other";
};

const fileUrl = (d: UploadedDoc, view = true) => `/api/documents/${d.id}/${view ? "?view=1" : ""}`;

async function fetchBlob(d: UploadedDoc) {
  const r = await fetch(fileUrl(d), { credentials: "same-origin" });
  if (!r.ok) throw new Error(String(r.status));
  return r.blob();
}

/** حفظ أو مشاركة الملف دون مغادرة التطبيق */
async function saveDoc(d: UploadedDoc) {
  try {
    const blob = await fetchBlob(d);
    const file = new File([blob], d.name, { type: d.mime });
    const nav = navigator as Navigator & { canShare?: (x: unknown) => boolean };
    if (nav.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: d.name }); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = d.name; document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch { /* أُلغيت المشاركة */ }
}

function PdfView({ doc }: { doc: UploadedDoc }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"load" | "ok" | "err">("load");
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        const data = new Uint8Array(await (await fetchBlob(doc)).arrayBuffer());
        const pdf = await pdfjs.getDocument({ data, isEvalSupported: false, cMapUrl: "/pdfjs/cmaps/", cMapPacked: true, standardFontDataUrl: "/pdfjs/standard_fonts/", useSystemFonts: false }).promise;
        if (dead || !host.current) return;
        setPages(pdf.numPages);
        setState("ok");
        const width = host.current.clientWidth;
        const dpr = Math.min(2.5, window.devicePixelRatio || 1);
        for (let i = 1; i <= pdf.numPages && !dead; i++) {
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: (width / base.width) * dpr });
          const c = document.createElement("canvas");
          c.width = vp.width; c.height = vp.height;
          c.style.width = "100%";
          c.className = "dv-page";
          host.current?.appendChild(c);
          await page.render({ canvasContext: c.getContext("2d")!, viewport: vp }).promise;
        }
      } catch (e) { console.error("pdf", e); if (!dead) setState("err"); }
    })();
    return () => { dead = true; };
  }, [doc]);

  return (
    <>
      {state === "load" && <Busy />}
      {state === "err" && <Fail doc={doc} />}
      {pages > 0 && <p className="dv-meta">{pages} صفحة</p>}
      <div ref={host} className="dv-pages" />
    </>
  );
}

function ImageView({ doc }: { doc: UploadedDoc }) {
  const [ok, setOk] = useState<boolean | null>(null);
  return (
    <>
      {ok === null && <Busy />}
      {ok === false && <Fail doc={doc} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="dv-img" src={fileUrl(doc)} alt={doc.name} onLoad={() => setOk(true)} onError={() => setOk(false)} style={ok ? undefined : { display: "none" }} />
    </>
  );
}

function DocxView({ doc }: { doc: UploadedDoc }) {
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const mammoth = await import("mammoth/mammoth.browser");
        const res = await mammoth.convertToHtml({ arrayBuffer: await (await fetchBlob(doc)).arrayBuffer() });
        // mammoth يُخرج وسوماً بنيوية فقط؛ ننزع أي سمة حدث احتياطاً
        setHtml(res.value.replace(/\son\w+="[^"]*"/gi, "").replace(/\shref="[^"]*"/gi, ""));
      } catch { setErr(true); }
    })();
  }, [doc]);
  if (err) return <Fail doc={doc} />;
  if (html === null) return <Busy />;
  return <article className="dv-doc selectable" dangerouslySetInnerHTML={{ __html: html || "<p>المستند فارغ</p>" }} />;
}

function XlsxView({ doc }: { doc: UploadedDoc }) {
  const [sheets, setSheets] = useState<{ sheet: string; data: unknown[][] }[] | null>(null);
  const [at, setAt] = useState(0);
  const [err, setErr] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { default: readXlsx } = await import("read-excel-file/browser");
        const all = await readXlsx(await fetchBlob(doc));
        setSheets(all.map((x) => ({ sheet: x.sheet, data: x.data as unknown[][] })));
      } catch { setErr(true); }
    })();
  }, [doc]);
  if (err) return <Fail doc={doc} />;
  if (!sheets) return <Busy />;
  const rows = sheets[at]?.data ?? [];
  return (
    <>
      {sheets.length > 1 && (
        <div className="dv-tabs">
          {sheets.map((x, i) => <button key={x.sheet + i} className={i === at ? "on" : ""} onClick={() => setAt(i)}>{x.sheet}</button>)}
        </div>
      )}
      <div className="dv-sheet">
        <table>
          <tbody>
            {rows.slice(0, 1000).map((r, i) => (
              <tr key={i}>{r.map((c, j) => i === 0 ? <th key={j}>{c == null ? "" : String(c)}</th> : <td key={j}>{c == null ? "" : String(c)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TextView({ doc }: { doc: UploadedDoc }) {
  const [t, setT] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetchBlob(doc).then((b) => b.text()).then(setT, () => setErr(true)); }, [doc]);
  if (err) return <Fail doc={doc} />;
  if (t === null) return <Busy />;
  return <pre className="dv-text selectable">{t}</pre>;
}

const Busy = () => <div className="dv-state"><Loader2 size={26} className="spin" /><span>جارٍ فتح المستند…</span></div>;

function Fail({ doc, note }: { doc: UploadedDoc; note?: string }) {
  return (
    <div className="dv-state">
      <span className="dv-big"><FileText size={34} /></span>
      <b>{doc.name}</b>
      <span>{note ?? "تعذّر عرض هذا المستند هنا."}</span>
      <button className="btn gold" onClick={() => saveDoc(doc)}><Download size={16} /> حفظ نسخة على الجهاز</button>
    </div>
  );
}

export function DocViewer({ doc, onClose }: { doc: UploadedDoc; onClose: () => void }) {
  const kind = kindOf(doc);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <div className="docview" role="dialog" aria-modal="true" aria-label={doc.name}>
      <header className="dv-bar">
        <button className="dv-btn dv-close" onClick={onClose} aria-label="إغلاق"><ChevronRight size={22} /> رجوع</button>
        <b className="dv-title">{doc.name}</b>
        <button className="dv-btn" onClick={() => saveDoc(doc)} aria-label="حفظ أو مشاركة"><Share2 size={19} /></button>
      </header>
      <div className="dv-body">
        {kind === "pdf" && <PdfView doc={doc} />}
        {kind === "image" && <ImageView doc={doc} />}
        {kind === "docx" && <DocxView doc={doc} />}
        {kind === "xlsx" && <XlsxView doc={doc} />}
        {kind === "text" && <TextView doc={doc} />}
        {kind === "other" && <Fail doc={doc} note="هذا النوع لا يُعرض داخل التطبيق — احفظه لفتحه بالتطبيق المناسب." />}
      </div>
    </div>,
    document.body,
  );
}
