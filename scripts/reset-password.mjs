/** تصفير كلمة مرور حساب:  npm run user:reset -- <اسم المستخدم>
 *  تُولَّد كلمة مرور جديدة وتُطبع مرة واحدة، وتسقط كل جلسات الحساب القائمة. */
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
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
const username = process.argv[2]?.trim().toLowerCase();
if (!uri) {
  console.error("✖ لم يُضبط MONGODB_URI في .env.local");
  process.exit(1);
}
if (!username) {
  console.error("✖ اكتب اسم المستخدم:  npm run user:reset -- sysadmin");
  process.exit(1);
}

// نفس حروف بطاقات الدخول: لا 0/O ولا 1/l/I
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const password = `${group()}-${group()}-${group()}`;

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 12000 });
try {
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");
  const user = await users.findOne({ username });
  if (!user) {
    console.error(`✖ لا يوجد حساب باسم «${username}» في قاعدة «${dbName}»`);
    process.exit(1);
  }
  await users.updateOne(
    { id: user.id },
    { $set: { passwordHash: await bcrypt.hash(password, 10), active: true }, $inc: { sessionVersion: 1 } },
  );
  const now = new Date();
  await db.collection("audit").insertOne({
    id: "x" + now.getTime() + Math.floor(Math.random() * 1000),
    at: now.toLocaleString("ar-SY-u-nu-latn", { dateStyle: "short", timeStyle: "short" }),
    actorId: user.id, action: "صُفّرت كلمة المرور من الخادم", target: username, ip: "—",
  });
  console.log(`✓ صُفّرت كلمة مرور «${username}» (${user.title}) في قاعدة «${dbName}»`);
  console.log(`  كلمة المرور الجديدة:  ${password}`);
  console.log("  تظهر هنا مرة واحدة فقط؛ احفظها الآن.");
} finally {
  await client.close();
}
