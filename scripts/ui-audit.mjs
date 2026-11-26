import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = new URL(process.env.UI_AUDIT_URL || "http://localhost:3000");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) {
  throw new Error("Use a local test server with disposable seed data.");
}
const password = process.env.UI_AUDIT_PASSWORD;
const sizes = [320, 390, 430, 768];
const roles = [
  ["governor", "/diwan/overview"],
  ["assistant", "/diwan/overview"],
  ["tech.director", "/directorates/inbox"],
  ["sysadmin", "/admin/entities"],
];
const out = "ui-audit";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [];
function check(scope, name, pass, detail = "") {
  checks.push({ scope, name, pass: !!pass, detail });
}
async function visit(page, path) {
  const response = await page.goto(new URL(path, base).href, { waitUntil: "domcontentloaded", timeout: 90000 });
  if (!response?.ok()) throw new Error("Page HTTP " + response?.status());
}
async function fit(page, scope) {
  const m = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  check(scope, "no horizontal page overflow", m.content <= m.viewport + 1, JSON.stringify(m));
}
async function touch(page, scope, locator, name) {
  const box = await locator.boundingBox();
  check(scope, name, !!box && box.height >= 44 && box.width >= 44, box ? Math.round(box.width) + "x" + Math.round(box.height) : "not visible");
}
try {
  for (const width of sizes) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: "block", reducedMotion: "reduce" });
    try {
      const page = await context.newPage();
      const scope = "login/" + width;
      try {
        await visit(page, "/");
        await page.locator("#login-title").waitFor({ state: "visible", timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        check(scope, "root routes to unified login", new URL(page.url()).pathname.replace(/\/$/, "") === "/login");
        check(scope, "single submit", await page.locator("button[type=submit]").count() === 1);
        check(scope, "RTL document", await page.locator("html").getAttribute("dir") === "rtl");
        check(scope, "labelled credentials", await page.locator('label[for=username]').count() === 1 && await page.locator('label[for=password]').count() === 1);
        await fit(page, scope);
        await touch(page, scope, page.locator("#username").locator(".."), "username target");
        await touch(page, scope, page.locator("#password").locator(".."), "password target");
        await touch(page, scope, page.locator(".in-btn"), "password toggle target");
        await touch(page, scope, page.locator(".unified-submit"), "submit target");
        await page.locator(".in-btn").click();
        check(scope, "password reveal works", await page.locator("#password").getAttribute("type") === "text");
        await page.locator(".in-btn").click();
        await page.screenshot({ path: out + "/login-" + width + ".png", fullPage: true, animations: "disabled" });
      } catch (e) { check(scope, "page renders", false, String(e)); }
    } finally { await context.close(); }

    if (!password) continue;
    for (const [role, target] of roles) {
      const scope = role + "/" + width;
      const c = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: "block", reducedMotion: "reduce" });
      try {
        const p = await c.newPage();
        await visit(p, "/");
        await p.locator("#username").fill(role);
        await p.locator("#password").fill(password);
        await p.locator(".unified-submit").click();
        await p.waitForURL(url => url.pathname.replace(/\/$/, "") === target, { timeout: 45000 });
        await p.locator(".shell .canvas h1").waitFor({ state: "visible", timeout: 45000 });
        await p.evaluate(() => document.fonts.ready);
        check(scope, "role routes to correct home", true, target);
        await fit(p, scope);
        const nav = p.locator(".tabbar");
        check(scope, "mobile navigation visible", await nav.isVisible());
        const tabs = nav.locator(".tab");
        for (let i = 0; i < await tabs.count(); i++) await touch(p, scope, tabs.nth(i), "tab " + (i + 1) + " target");
        if (role === "governor" || role === "assistant") {
          check(scope, "compact executive shortcuts", await p.locator(".mt-smart-dock .mt-dock-item").count() === 5);
          const extras = await p.locator(".gov-mobile-hide").evaluateAll(els => els.every(e => getComputedStyle(e).display === "none"));
          check(scope, "duplicate reports hidden", extras);
        }
        await p.screenshot({ path: out + "/" + role + "-" + width + ".png", fullPage: true, animations: "disabled" });
      } catch (e) { check(scope, "authenticated page renders", false, String(e)); }
      finally { await c.close(); }
    }
  }
} finally { await browser.close(); }

const passed = checks.filter(x => x.pass).length;
const report = { score: checks.length ? Math.round(passed * 100 / checks.length) : 0, passed, total: checks.length, authenticated: !!password, checks };
await writeFile(out + "/report.json", JSON.stringify(report, null, 2));
console.log("Mobile UI checks: " + report.score + "/100 (" + passed + "/" + checks.length + ")");
if (!password) console.log("Authenticated checks skipped: set UI_AUDIT_PASSWORD for local seeded accounts.");
for (const c of checks.filter(c => !c.pass)) console.error(c.scope + " | " + c.name + " | " + c.detail);
if (passed !== checks.length || !checks.length) process.exitCode = 1;
