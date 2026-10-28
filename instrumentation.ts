/** يفتح الاتصال بقاعدة البيانات عند إقلاع الخادم، فلا يدفع أول مستخدم ثمن الاتصال والمطابقة */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  void import("./lib/db")
    .then((m) => m.db())
    .catch((err) => console.error("[db] تعذّر الاتصال المسبق:", err instanceof Error ? err.message : err));
}
