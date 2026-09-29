"use client";

import { useEffect, useState } from "react";
import { Download, ShieldCheck, WifiOff, X } from "lucide-react";

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

  return <>
    {offline && <div className="offline-status" role="status"><WifiOff />أنت تعمل دون اتصال — البيانات المحفوظة متاحة</div>}
    {installPrompt && !dismissed && <aside className="pwa-install" aria-label="تثبيت التطبيق">
      <span className="pwa-install-icon"><ShieldCheck /></span>
      <span><b>ثبّت المكتب التنفيذي</b><small>وصول أسرع وتجربة تطبيق كاملة</small></span>
      <button className="pwa-install-button" onClick={install}><Download /> تثبيت</button>
      <button className="pwa-install-close" aria-label="إخفاء اقتراح التثبيت" onClick={() => setDismissed(true)}><X /></button>
    </aside>}
  </>;
}
