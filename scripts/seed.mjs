/**
 * تعبئة قاعدة البيانات بالبيانات الأساسية وحسابات المستخدمين.
 * التشغيل:  npm run seed          (يُبقي البيانات القائمة ويضيف الناقص)
 *           npm run seed -- --fresh  (يمسح المجموعات ويعيد البناء من الصفر)
 */
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// قراءة المتغيرات من .env.local يدوياً (السكربت يعمل خارج Next)
function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "governorate";
if (!uri) {
  console.error("\n✖ لم يُضبط MONGODB_URI.\n  أنشئ ملف .env.local وضع فيه رابط الاتصال، مثال:\n  MONGODB_URI=\"mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority\"\n");
  process.exit(1);
}

// بيانات البذرة (Node 22 يزيل أنواع TypeScript تلقائياً)
const seed = await import("../lib/seed.ts");

const fresh = process.argv.includes("--fresh");
const PASSWORD = process.env.SEED_PASSWORD ?? "Aleppo@2026";

/** اسم الدخول لكل شخص */
const usernames = {
  p1: "governor", p2: "deputy", p3: "office.chief", p4: "followup",
  p5: "tech.director", p6: "roads.head", p7: "roads.eng",
  p8: "urban.director", p9: "permits.head",
  p10: "health.director", p11: "primary.head",
  p12: "water.director", p13: "networks.head",
  p14: "legal.director", p15: "legal.advisor",
  p16: "civil.defense", p17: "protocol", p18: "registry", p19: "halls", p20: "sysadmin",
  p21: "finance.director",
  p22: "area.tabqa", p23: "area.telabyad", p24: "area.maadan",
  p27: "hay.mashlab", p28: "hay.daraiya", p29: "hay.rumaila",
  p25: "assistant", p26: "secgen",
};

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });

try {
  console.log("… الاتصال بقاعدة البيانات");
  await client.connect();
  const db = client.db(dbName);
  console.log(`✓ متصل بـ «${dbName}»`);

  const sets = [
    ["roles", seed.roles],
    ["entities", seed.entities],
    ["halls", seed.halls],
    ["bookings", seed.bookings],
    ["assignments", seed.assignments],
    ["meetings", seed.meetings],
    ["letters", seed.letters],
    ["decisions", seed.decisions],
    ["delegations", seed.delegations],
    ["files", seed.docFiles],
    ["notes", seed.notes],
    ["notifications", seed.notifications],
    ["audit", seed.audit],
    ["requests", seed.requests],
  ];

  if (fresh) {
    console.log("… مسح المجموعات القائمة");
    for (const [name] of [...sets, ["users"]]) {
      await db.collection(name).deleteMany({});
    }
  }

  for (const [name, docs] of sets) {
    const col = db.collection(name);
    let added = 0;
    for (const doc of docs) {
      const keyField = name === "roles" ? "key" : "id";
      const res = await col.updateOne(
        { [keyField]: doc[keyField] },
        { $setOnInsert: doc },
        { upsert: true },
      );
      if (res.upsertedCount) added++;
    }
    console.log(`  ${name.padEnd(14)} ${String(await col.countDocuments()).padStart(3)} سجل  (+${added})`);
  }

  // المستخدمون: الشخص + اسم دخول + كلمة مرور مشفّرة
  const users = db.collection("users");
  const hash = await bcrypt.hash(PASSWORD, 10);
  let created = 0;
  for (const person of seed.people) {
    const username = usernames[person.id] ?? person.id;
    const { name, title, initials, ...rest } = person;
    const res = await users.updateOne(
      { id: person.id },
      {
        // الاسم والصفة يتبعان ملف البيانات دائماً، وكلمة المرور والحالة لا تُمَسّ
        $set: { name, title, initials },
        $setOnInsert: { ...rest, username, passwordHash: hash, active: true },
      },
      { upsert: true },
    );
    if (res.upsertedCount) created++;
  }
  console.log(`  users          ${String(await users.countDocuments()).padStart(3)} حساب (+${created})`);

  // الفهارس
  await users.createIndex({ username: 1 }, { unique: true });
  await users.createIndex({ id: 1 }, { unique: true });
  await db.collection("assignments").createIndex({ entityId: 1, ownerId: 1, status: 1 });
  await db.collection("notifications").createIndex({ toId: 1, read: 1 });
  await db.collection("notes").createIndex({ target: 1 });
  await db.collection("audit").createIndex({ at: -1 });
  console.log("✓ الفهارس جاهزة");

  console.log("\n════════════ حسابات الدخول ════════════");
  console.log(` كلمة المرور للجميع: ${PASSWORD}`);
  for (const person of seed.people) {
    const u = usernames[person.id] ?? person.id;
    console.log(`  ${u.padEnd(16)} ${person.name} — ${person.title}`);
  }
  console.log("═══════════════════════════════════════\n");
  console.log("✓ اكتملت التعبئة");
} catch (err) {
  console.error("\n✖ فشلت التعبئة:", err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
