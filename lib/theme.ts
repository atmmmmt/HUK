/** المظهر: فاتح (الافتراضي) أو داكن أو تلقائي يتبع الجوال */
export type ThemePref = "light" | "dark" | "auto";
export const THEME_KEY = "gov.theme";

export function readTheme(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "dark" || v === "auto" ? v : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function saveTheme(pref: ThemePref) {
  try { localStorage.setItem(THEME_KEY, pref); } catch { /* محجوب */ }
  applyTheme(pref);
}

/** يُحقن في <head> فيُطبَّق المظهر قبل الرسم الأول، بلا وميض */
export const themeBootScript = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");var d=p==="dark"||(p==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;
