"use client";

import { useEffect, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }

    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setInstallPrompt(null);
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    setOffline(!navigator.onLine);
    window.addEventListener("beforeinstallprompt", handleInstall);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <>
      {offline && (
        <div className="offline-status" role="status">
          <WifiOff />أنت تعمل دون اتصال — البيانات المحفوظة متاحة
        </div>
      )}

      {installPrompt && !dismissed && (
        <aside
          className="pwa-install"
          aria-label="تثبيت التطبيق"
          dir="rtl"
          style={{
            position: "fixed",
            right: 16,
            left: 16,
            bottom: 18,
            margin: "0 auto",
            maxWidth: 620,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "12px 14px",
            borderRadius: 16,
            border: "1px solid #e3e9f2",
            background: "#ffffff",
            color: "#0e1826",
            boxShadow: "0 14px 44px rgba(10, 26, 48, .20)",
          }}
        >
          <span
            className="pwa-install-icon"
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: "#071528",
              flex: "none",
              overflow: "hidden",
            }}
          >
            <img src="/icons/icon.svg" alt="" style={{ width: "100%", height: "100%", display: "block" }} />
          </span>

          <span className="pwa-install-copy" style={{ flex: "1 1 220px", minWidth: 0, lineHeight: 1.45 }}>
            <b style={{ display: "block", fontSize: 14 }}>ثبّت محافظة الرقة</b>
            <small style={{ display: "block", marginTop: 2, color: "#61728c", fontSize: 12 }}>
              وصول أسرع وتجربة تطبيق كاملة
            </small>
          </span>

          <button
            className="pwa-install-button"
            onClick={install}
            style={{
              height: 40,
              padding: "0 16px",
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              background: "#0f2545",
              color: "#ffffff",
              fontWeight: 700,
              flex: "none",
            }}
          >
            <Download size={17} /> تثبيت
          </button>

          <button
            className="pwa-install-close"
            aria-label="إخفاء اقتراح التثبيت"
            onClick={() => setDismissed(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "#f2f6fc",
              color: "#61728c",
              flex: "none",
            }}
          >
            <X size={18} />
          </button>
        </aside>
      )}
    </>
  );
}
