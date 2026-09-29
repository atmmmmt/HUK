/**
 * قاعدة بيانات محلية للتطوير والعرض — بلا تثبيت على الويندوز.
 *
 *   node scripts/dev-db.mjs          تشغيل
 *   node scripts/dev-db.mjs --stop   إيقاف
 *   node scripts/dev-db.mjs --status الحالة
 *
 * يعمل المحرك كعملية مستقلة، فلا يتوقف بإغلاق هذه النافذة،
 * والبيانات محفوظة في مجلد .mongo-data داخل المشروع.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = join(root, ".mongo-data");
const pidFile = join(dbPath, "dev-db.pid");
const logFile = join(dbPath, "dev-db.log");
const PORT = 27017;

const listening = () =>
  new Promise((resolve) => {
    const s = createConnection(PORT, "127.0.0.1");
    s.on("connect", () => { s.end(); resolve(true); });
    s.on("error", () => resolve(false));
    setTimeout(() => { s.destroy(); resolve(false); }, 1200);
  });

/* ───────── الحالة ───────── */
if (process.argv.includes("--status")) {
  const up = await listening();
  console.log(up ? "✓ القاعدة تعمل على المنفذ " + PORT : "✖ القاعدة متوقفة");
  process.exit(up ? 0 : 1);
}

/* ───────── الإيقاف ───────── */
if (process.argv.includes("--stop")) {
  if (!existsSync(pidFile)) {
    console.log("لا يوجد سجل تشغيل — القاعدة متوقفة على الأرجح");
    process.exit(0);
  }
  const pid = Number(readFileSync(pidFile, "utf8").trim());
  try {
    process.kill(pid);
    console.log("✓ أُوقفت القاعدة (المعرّف " + pid + ")");
  } catch {
    console.log("العملية " + pid + " غير موجودة — أُزيل السجل");
  }
  try { unlinkSync(pidFile); } catch { /* تجاهل */ }
  process.exit(0);
}

/* ───────── التشغيل ───────── */
mkdirSync(dbPath, { recursive: true });

if (await listening()) {
  console.log("✓ القاعدة تعمل أصلاً على المنفذ " + PORT);
  console.log("  الرابط: mongodb://127.0.0.1:" + PORT + "/");
  process.exit(0);
}

/** يبحث عن محرك mongod في مخزن mongodb-memory-server، وينزّله عند الحاجة */
async function findMongod() {
  const caches = [
    join(homedir(), ".cache", "mongodb-binaries"),
    join(root, "node_modules", ".cache", "mongodb-memory-server", "mongodb-binaries"),
  ];
  for (const dir of caches) {
    if (!existsSync(dir)) continue;
    const exe = readdirSync(dir)
      .filter((f) => /^mongod.*\.exe$/i.test(f) || /^mongod[^.]*$/.test(f))
      .sort()
      .pop();
    if (exe) return join(dir, exe);
  }

  console.log("… تنزيل محرك القاعدة لأول مرة (قد يستغرق دقائق)");
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const tmp = await MongoMemoryServer.create();
  await tmp.stop();
  for (const dir of caches) {
    if (!existsSync(dir)) continue;
    const exe = readdirSync(dir).filter((f) => /^mongod.*\.exe$/i.test(f) || /^mongod[^.]*$/.test(f)).sort().pop();
    if (exe) return join(dir, exe);
  }
  throw new Error("تعذّر العثور على محرك mongod");
}

const mongod = await findMongod();
const out = openSync(logFile, "a");

// عملية مستقلة: لا تتأثر بإغلاق هذه النافذة
const child = spawn(
  mongod,
  ["--dbpath", dbPath, "--port", String(PORT), "--bind_ip", "127.0.0.1"],
  { detached: true, stdio: ["ignore", out, out], windowsHide: true },
);
child.unref();
writeFileSync(pidFile, String(child.pid));

// انتظار جاهزية المنفذ
let ready = false;
for (let i = 0; i < 40; i++) {
  if (await listening()) { ready = true; break; }
  await new Promise((r) => setTimeout(r, 750));
}

if (!ready) {
  console.error("\n✖ لم تبدأ القاعدة. راجع السجل: " + logFile);
  process.exit(1);
}

console.log("\n✓ قاعدة البيانات المحلية تعمل كعملية مستقلة");
console.log("  الرابط:   mongodb://127.0.0.1:" + PORT + "/");
console.log("  المعرّف:  " + child.pid);
console.log("  البيانات: " + dbPath);
console.log("  السجل:    " + logFile);
console.log("\n  تستمر بالعمل بعد إغلاق هذه النافذة.");
console.log("  للإيقاف:  npm run db:stop\n");
process.exit(0);
