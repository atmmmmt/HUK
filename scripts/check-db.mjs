/** فحص سريع للاتصال بقاعدة البيانات ومحتوياتها:  npm run db:check */
import { MongoClient } from "mongodb";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env.local", ".env"]) {
  const p = join(root, name);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "governorate";
if (!uri) {
  console.error("✖ لم يُضبط MONGODB_URI في .env.local");
  process.exit(1);
}

const safe = uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:••••@");
console.log("… الاتصال بـ", safe);

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 12000 });
try {
  await client.connect();
  const db = client.db(dbName);
  await db.command({ ping: 1 });
  console.log(`✓ الاتصال ناجح بقاعدة «${dbName}»\n`);

  const names = ["users", "roles", "entities", "halls", "bookings", "assignments", "meetings",
    "letters", "decisions", "delegations", "files", "notes", "notifications", "audit", "requests"];
  let total = 0;
  for (const n of names) {
    const c = await db.collection(n).countDocuments();
    total += c;
    console.log(`  ${n.padEnd(14)} ${String(c).padStart(4)}`);
  }
  console.log(`\n  المجموع ${total} سجل`);
  if (total === 0) console.log("\n! القاعدة فارغة — نفّذ:  npm run seed");
} catch (err) {
  console.error("✖ فشل الاتصال:", err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
