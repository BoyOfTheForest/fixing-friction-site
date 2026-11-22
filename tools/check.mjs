#!/usr/bin/env node
/* Site check: one command, no installs beyond Node 22+ and Chrome.
   node tools/check.mjs                 full check (static + browser)
   node tools/check.mjs --static        static checks only (fast)
   node tools/check.mjs --pages a,b     only these page ids in the browser
   node tools/check.mjs --shots DIR     also save a full-page screenshot per page at 1280 (reduced motion, for before/after diffs)
   node tools/check.mjs --shots-only DIR  only the screenshots (use with --shots DIR)
   node tools/check.mjs --json FILE     write the report as JSON
   Exits 1 if anything fails. */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true) : null; };
const STATIC_ONLY = args.includes("--static");
const ONLY = opt("--pages") ? String(opt("--pages")).split(",") : null;
const SHOTS = opt("--shots");
const SHOTS_ONLY = args.includes("--shots-only");
const JSON_OUT = opt("--json");

const failures = [];
const notes = [];
const fail = (area, msg) => failures.push(area + ": " + msg);
const note = (msg) => notes.push(msg);

/* ---------------- static checks ---------------- */
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const pageIds = [...ids].filter((i) => i.startsWith("page-")).map((i) => i.slice(5));
const pagesArr = (html.match(/var pages = \[([^\]]*)\]/) || [])[1];
const pagesList = pagesArr ? [...pagesArr.matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
for (const p of pagesList) if (!pageIds.includes(p)) fail("pages", "pages array lists " + p + " but there is no section");
for (const p of pageIds) if (!pagesList.includes(p)) fail("pages", "section page-" + p + " is missing from the pages array");
if (pageIds.length < 30) fail("pages", "only " + pageIds.length + " sections found");

// links
let linkCount = 0;
for (const m of html.matchAll(/<a\s[^>]*>/g)) {
  const tag = m[0];
  const href = (tag.match(/\shref="([^"]*)"/) || [])[1];
  const go = (tag.match(/\sdata-go="([^"]*)"/) || [])[1];
  const jump = (tag.match(/\sdata-jump="([^"]*)"/) || [])[1];
  linkCount++;
  if (go && !pageIds.includes(go) && !["assessments", "consulting", "apps"].includes(go)) fail("links", "data-go to unknown page " + go);
  if (jump && !ids.has(jump) && !pageIds.includes(jump)) fail("links", "data-jump target missing: " + jump);
  if (href && href.startsWith("#") && href.length > 1) {
    const t = href.slice(1).split("?")[0];
    if (!ids.has(t) && !pageIds.includes(t) && !["main", "assessments", "consulting", "apps"].includes(t)) fail("links", "href target missing: " + href);
  }
}
note("links checked: " + linkCount);

// assets referenced exist
const assets = new Set();
for (const m of html.matchAll(/assets\/[A-Za-z0-9_.\-]+\.[a-z0-9]+/g)) assets.add(m[0]);
let missing = 0;
for (const a of assets) if (!fs.existsSync(path.join(ROOT, a))) { missing++; fail("assets", "missing file " + a); }
note("assets referenced: " + assets.size + ", missing: " + missing);

// structured data parses, and the FAQ schema matches the FAQ in the page script
const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
let faqLd = null;
for (const m of lds) {
  try { const d = JSON.parse(m[1]); if (d["@type"] === "FAQPage") faqLd = d; }
  catch (e) { fail("jsonld", "does not parse: " + e.message); }
}
const faqSrc = html.match(/var FAQ = (\[[\s\S]*?\n      \]);/);
if (faqLd && faqSrc) {
  const FAQ = new Function("return " + faqSrc[1])();
  const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  FAQ.forEach((f, i) => {
    const e = faqLd.mainEntity[i];
    if (!e || e.name !== f.q || e.acceptedAnswer.text !== strip(f.a)) fail("jsonld", "FAQPage entry " + i + " differs from the page FAQ");
    if (!html.includes("<summary>" + f.q.replace(/&/g, "&amp;") + "</summary>") && !html.includes("<summary>" + f.q + "</summary>")) fail("faq", "FAQ question not written into the page source: " + f.q);
  });
} else fail("jsonld", "FAQPage schema or FAQ data not found");

// hygiene
// internal build-out pages are not published: they must not exist in the repository (served by GitHub Pages)
for (const d of ["buildout", "launch", "changes", "docs"]) if (fs.existsSync(path.join(ROOT, d))) fail("unpublish", "/" + d + "/ is in the repository and would be served publicly");
if (/info@/i.test(html)) fail("email", "old info@ address found");
for (const f of ["robots.txt", "sitemap.xml", "llms.txt", "404.html", "CNAME"]) if (!fs.existsSync(path.join(ROOT, f))) fail("files", f + " missing");
const robots = fs.existsSync(path.join(ROOT, "robots.txt")) ? fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8") : "";
note("robots.txt gate: " + (/^Disallow:\s*\/\s*$/m.test(robots) ? "BLOCKING all crawlers (launch gate on)" : "open to crawlers"));
for (const bad of ["\x00"]) if (html.includes(bad)) fail("file", "contains control characters");
const open = (t) => (html.match(new RegExp("<" + t + "[\\s>]", "g")) || []).length;
const close = (t) => (html.match(new RegExp("</" + t + ">", "g")) || []).length;
for (const t of ["div", "section", "details", "ul", "li", "figure", "p"]) if (open(t) !== close(t)) fail("markup", "<" + t + "> opens " + open(t) + " closes " + close(t));

/* ---------------- browser checks ---------------- */
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "application/xml", ".json": "application/json" };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      let u = decodeURIComponent(req.url.split("?")[0]);
      if (u.endsWith("/")) u += "index.html";
      const f = path.join(ROOT, u);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end("nf"); }
      rsp.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, "127.0.0.1", () => res(srv));
  });
}
function findChrome() {
  const c = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean);
  return c.find((p) => fs.existsSync(p));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u, method = "GET") => new Promise((res, rej) => { const rq = http.request(u, { method }, (r) => { let b = ""; r.on("data", (d) => (b += d)); r.on("end", () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }); rq.on("error", rej); rq.end(); });

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.cb = new Map(); this.handlers = []; ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && this.cb.has(d.id)) { const { res, rej } = this.cb.get(d.id); this.cb.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } else if (d.method) this.handlers.forEach((h) => h(d)); }; }
  send(method, params = {}) { return new Promise((res, rej) => { const id = ++this.id; this.cb.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  on(h) { this.handlers.push(h); }
  async eval(expr) { const r = await this.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed"); return r.result.value; }
}

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
async function browserChecks() {
  const chrome = findChrome();
  if (!chrome) { fail("browser", "Chrome not found (set CHROME=path)"); return; }
  const srv = await serve();
  const base = "http://127.0.0.1:" + srv.address().port + "/index.html";
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ffcheck-"));
  const proc = spawn(chrome, ["--headless=new", "--remote-debugging-port=" + port, "--user-data-dir=" + profile, "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "about:blank"], { stdio: "ignore" });
  try {
    let tgt;
    for (let i = 0; i < 50; i++) { try { tgt = await getJSON("http://127.0.0.1:" + port + "/json/new?about:blank", "PUT"); break; } catch (e) { await sleep(200); } }
    if (!tgt) { fail("browser", "could not start Chrome"); return; }
    const ws = new WebSocket(tgt.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    const c = new CDP(ws);
    const errors = [];
    c.on((d) => { if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); });
    await c.send("Page.enable"); await c.send("Runtime.enable");
    const axeSrc = fs.readFileSync(path.join(ROOT, "tools/vendor/axe.min.js"), "utf8");
    const list = ONLY || pageIds;
    const showHash = (id) => c.eval("(function(){location.hash='#" + id + "';window.dispatchEvent(new PopStateEvent('popstate'));return 1})()");
    async function load(width, reduced) {
      await c.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
      await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
      await c.send("Page.navigate", { url: base + "#home" });
      await sleep(1200);
      await c.eval(axeSrc);
    }
    for (const width of (SHOTS_ONLY ? [] : [1280, 375, 320])) {
      await load(width, false);
      for (const id of list) {
        await showHash(id); await sleep(450);
        const over = await c.eval("document.documentElement.scrollWidth>innerWidth+1");
        if (over) fail("overflow", id + " scrolls sideways at " + width + "px");
        if (width !== 320) {
          const v = await c.eval("axe.run(document.getElementById('page-" + id + "'),{runOnly:{type:'tag',values:" + JSON.stringify(AXE_TAGS) + "}}).then(function(r){return r.violations.map(function(x){return x.id+'('+x.nodes.length+')'})})");
          if (v.length) fail("axe", id + " @" + width + ": " + v.join(", "));
        }
      }
      note("viewport " + width + "px: " + list.length + " pages scanned");
    }
    if (!SHOTS_ONLY) {
    // text spacing override (WCAG 1.4.12): nothing important may clip
    await load(1280, false);
    await c.eval("(function(){var s=document.createElement('style');s.id='ts';s.textContent='*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p{margin-bottom:2em !important}';document.head.appendChild(s)})()");
    for (const id of list) {
      await showHash(id); await sleep(350);
      const clipped = await c.eval("(function(){var sec=document.getElementById('page-" + id + "');var out=[];sec.querySelectorAll('*').forEach(function(e){var cs=getComputedStyle(e);if((cs.overflowY==='hidden'||cs.overflowX==='hidden')&&e.clientHeight>20&&(e.scrollHeight>e.clientHeight+3)&&!/IMG|SVG|FIGURE/.test(e.tagName)&&!e.closest('svg,.band-clip,.hero-bleed-media,figure'))out.push(e.tagName+'.'+String(e.className).slice(0,30))});return out.slice(0,3)})()");
      if (clipped.length) fail("text-spacing", id + " clips text with WCAG spacing: " + clipped.join(" | "));
    }
    // keyboard: Tab order lands on visible, focus-styled elements
    await load(1280, false);
    for (const id of list) {
      await showHash(id); await sleep(350);
      await c.eval("document.activeElement&&document.activeElement.blur();window.scrollTo(0,0);1");
      let prev = "", stuck = 0;
      for (let i = 0; i < 14; i++) {
        await c.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
        await c.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
        const r = await c.eval("(function(){var e=document.activeElement;if(!e||e===document.body)return null;var b=e.getBoundingClientRect();var cs=getComputedStyle(e);var ring=(cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>0)||cs.boxShadow!=='none';return {k:e.tagName+(e.id?'#'+e.id:'')+(e.className?'.'+String(e.className).split(' ')[0]:'')+'|'+(e.textContent||'').trim().slice(0,24),vis:b.width>0&&b.height>0&&cs.visibility!=='hidden',ring:ring}})()");
        if (!r) continue;
        if (!r.vis) fail("keyboard", id + ": focus landed on an invisible element " + r.k);
        if (!r.ring) fail("keyboard", id + ": no visible focus style on " + r.k);
        stuck = r.k === prev ? stuck + 1 : 0; prev = r.k;
        if (stuck > 2) { fail("keyboard", id + ": focus stuck on " + r.k); break; }
      }
    }
    // Escape closes a desktop dropdown and it stays closed
    await load(1280, false); await showHash("home"); await sleep(300);
    const opened = await c.eval("(function(){var b=document.querySelector('.nav-drop .drop-btn');b.focus();b.click();return !!document.querySelector('.nav-drop.open')})()");
    if (opened) {
      await c.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await c.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await sleep(900);
      const still = await c.eval("!!document.querySelector('.nav-drop.open')");
      if (still) fail("dropdown", "a dropdown reopened or stayed open after Escape");
      else note("dropdown stays closed after Escape: ok");
    } else note("dropdown Escape test: dropdown did not open by script, skipped");
    }
    // script errors
    if (errors.length) fail("script", errors.slice(0, 3).join(" | "));
    // screenshots (reduced motion so counters and reveals are settled)
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      await load(1280, true);
      for (const id of list) {
        await showHash(id); await sleep(600);
        // scroll through the page so lazy images load, then wait for them
        await c.eval("(async function(){var h=document.documentElement.scrollHeight;for(var y=0;y<h;y+=600){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,70)})}var t0=Date.now();while(Date.now()-t0<4000&&[].some.call(document.querySelectorAll('section.page.active img'),function(i){return !i.complete})){await new Promise(function(r){setTimeout(r,100)})}window.scrollTo(0,0);return 1})()");
        await sleep(200);
        const h = await c.eval("Math.min(16000,Math.ceil(document.documentElement.scrollHeight))");
        const shot = await c.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1280, height: h, scale: 1 } });
        fs.writeFileSync(path.join(SHOTS, id + ".png"), Buffer.from(shot.data, "base64"));
      }
      note("screenshots saved to " + SHOTS);
    }
    ws.close();
  } finally { proc.kill(); srv.close(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} }
}

if (!STATIC_ONLY) { try { await browserChecks(); } catch (e) { fail("browser", String(e.message || e)); } }

const report = { ok: failures.length === 0, failures, notes };
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
console.log(notes.map((n) => "  " + n).join("\n"));
if (failures.length) { console.log("\nFAILED (" + failures.length + "):"); failures.slice(0, 60).forEach((f) => console.log(" - " + f)); if (failures.length > 60) console.log(" ... " + (failures.length - 60) + " more"); process.exit(1); }
console.log("\nALL CHECKS PASSED");
