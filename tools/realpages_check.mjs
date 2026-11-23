#!/usr/bin/env node
/* Real pages click inventory (Phase 6.7): drives the cross-page navigation in a served context.
     node tools/realpages_check.mjs
   Clicks real controls and reads where they land: nav and CTA links, in-page jump links across pages,
   deep links with a bucket or a scorecard, the footer link, Back and Forward, modified clicks (new tab),
   links the page script creates, the 404 page, and the old hash addresses. Exits 1 on any failure. */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "application/xml" };
const srv = http.createServer((req, rsp) => {
  let u = decodeURIComponent(req.url.split("?")[0]);
  if (u.endsWith("/")) u += "index.html";
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404, { "content-type": "text/html" }); return rsp.end(fs.readFileSync(path.join(ROOT, "404.html"))); }
  rsp.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(rsp);
}).listen(0, "127.0.0.1");
await new Promise((r) => srv.on("listening", r));
const ORIGIN = "http://127.0.0.1:" + srv.address().port;
const chrome = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => p && fs.existsSync(p));
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ffreal-"));
const proc = spawn(chrome, ["--headless=new", "--remote-debugging-port=" + port, "--user-data-dir=" + profile, "--no-sandbox", "--disable-gpu", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (u, method = "GET") => new Promise((res, rej) => { const rq = http.request(u, { method }, (r) => { let b = ""; r.on("data", (d) => (b += d)); r.on("end", () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }); rq.on("error", rej); rq.end(); });
let tgt;
for (let i = 0; i < 50; i++) { try { tgt = await getJSON("http://127.0.0.1:" + port + "/json/new?about:blank", "PUT"); break; } catch (e) { await sleep(200); } }
const ws = new WebSocket(tgt.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const cb = new Map(); const handlers = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && cb.has(d.id)) { cb.get(d.id)(d); cb.delete(d.id); } else handlers.forEach((h) => h(d)); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; cb.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text + " in " + expr.slice(0, 80)); return r.result?.result?.value; };
const errors = [];
handlers.push((d) => { if (d.method === "Runtime.exceptionThrown") errors.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split("\n")[0]); });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

const fails = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const open = async (url, wantPath) => { await send("Page.navigate", { url: ORIGIN + url }); for (let i = 0; i < 80; i++) { await sleep(100); try { if ((await ev("location.pathname + String.fromCharCode(124) + document.readyState")) === wantPath + "|complete") break; } catch (e) {} } await sleep(500); };
const where = () => ev("location.pathname + location.search + location.hash");
const active = () => ev("(document.querySelector('section.page.active')||{}).id");
const waitPath = async (p) => { for (let i = 0; i < 60; i++) { await sleep(100); try { if ((await ev("location.pathname + String.fromCharCode(124) + document.readyState")) === p + "|complete") { await sleep(500); return; } } catch (e) {} } };
const clickSel = (sel) => ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return 'missing';e.click();return 'clicked'})()`);

// 1. Top nav CTA and a dropdown item, from the homepage, then Back
await open("/", "/");
ok((await clickSel("nav.pages a.cta")) === "clicked", "home: the Take the Scorecard button in the top nav can be clicked");
await waitPath("/scorecards/");
ok((await where()) === "/scorecards/" && (await active()) === "page-scorecards", "nav CTA lands on the real page /scorecards/ with its own section active");
ok((await ev("document.title")).length > 20 && (await ev("document.title")) !== (await ev("'Fixing Friction | Accessibility Solutions: Speaking, Training, Compliance, and Consulting'")), "the new page has its own title: " + (await ev("document.title")).slice(0, 60));
await send("Page.navigate", { url: ORIGIN + "/" }); await waitPath("/");
await ev("history.back()"); await sleep(1200);

// 2. Dropdown link inside the nav (hover-free: open by click, then click an item)
await open("/", "/");
const dd = await ev(`(function(){var b=document.querySelector('.nav-drop .drop-btn');b.click();var a=document.querySelector('.nav-drop.open a[href="/training/"]')||document.querySelector('.nav-drop a[href="/training/"]');if(!a)return 'none';a.click();return 'clicked'})()`);
await waitPath("/training/");
ok(dd === "clicked" && (await where()) === "/training/" && (await active()) === "page-training", "a dropdown item opens the real page /training/");

// 3. Back and Forward across real pages
await ev("history.back()"); await waitPath("/");
ok((await where()) === "/" && (await active()) === "page-home", "Back returns to the homepage");
await ev("history.forward()"); await waitPath("/training/");
ok((await where()) === "/training/" && (await active()) === "page-training", "Forward returns to /training/");

// 4. Jump link across pages lands on the anchor under the sticky header
await open("/", "/");
const jumpHref = await ev(`(function(){var a=document.querySelector('a[data-go="audits"][data-jump]');return a?a.getAttribute('href'):''})()`);
ok(/^\/audits\/#[a-z-]+$/.test(jumpHref), "a data-jump link carries the real address with its anchor: " + jumpHref);
await ev(`document.querySelector('a[data-go="audits"][data-jump]').click(); 1`);
await waitPath("/audits/"); await sleep(900);
const jt = JSON.parse(await ev(`(function(){var id=location.hash.slice(1);var e=document.getElementById(id);var h=document.querySelector('header.site');var r=e?e.getBoundingClientRect():null;return JSON.stringify({id:id,found:!!e,top:r?Math.round(r.top):null,hdr:h?Math.round(h.getBoundingClientRect().bottom):0})})()`));
ok(jt.found && jt.top >= jt.hdr - 4 && jt.top < 400, "the jump lands on #" + jt.id + " just under the header (top " + jt.top + ", header bottom " + jt.hdr + ")");

// 5. Scorecard role deep links from other pages keep their bucket
for (const [from, role, bucket] of [["/verticals/", "leader", "lead"], ["/community/", "individual", "self"], ["/community/", "champion", "self"]]) {
  await open(from, from);
  const r = await ev(`(function(){var a=document.querySelector('a[data-role="${role}"]');if(!a)return 'missing';var h=a.getAttribute('href');a.click();return h})()`);
  await waitPath("/scorecard/");
  const st = JSON.parse(await ev(`JSON.stringify({p:location.pathname+location.search,hat:document.querySelectorAll('input[name="scHat"]').length,bucket:!!document.querySelector('input[name="scBucket"]:checked'),lens:document.querySelectorAll('input[name="scLens"]').length,pending:window.__pendingScorecardRole||null})`));
  ok(r === "/scorecard/?role=" + role && st.p === "/scorecard/?role=" + role && st.pending === null, from + " role link (" + role + ") opens /scorecard/?role=" + role + " and the script consumed it");
  const q = await ev(`document.querySelector('#scForm legend, #scForm h2, #scForm .sc-q') ? document.querySelector('#scForm legend, #scForm h2, #scForm .sc-q').textContent.trim().slice(0,60) : ''`);
  ok(st.hat === 4 || st.lens > 0 || st.bucket, from + " (" + role + "): the first question after the bucket is showing (" + q + ")");
}

// 6. AI scorecard links keep their scorecard
await open("/tools/", "/tools/");
const aiHref = await ev(`(function(){var a=document.querySelector('a[data-ai-sc]');return a?a.getAttribute('href')+'|'+a.getAttribute('data-ai-sc'):''})()`);
ok(/^\/ai-scorecards\/\?sc=\d\.\d\|\d\.\d$/.test(aiHref), "an AI scorecard link carries ?sc= in its real address: " + aiHref);
if (aiHref) {
  const sc = aiHref.split("|")[1];
  await ev(`document.querySelector('a[data-ai-sc]').click(); 1`);
  await waitPath("/ai-scorecards/");
  const st = JSON.parse(await ev(`JSON.stringify({p:location.pathname+location.search,runner:!document.getElementById('aiScRunner').hidden,hub:document.getElementById('aiScHub').hidden,code:document.getElementById('aiScRunCode').textContent})`));
  ok(st.p === "/ai-scorecards/?sc=" + sc && st.runner && st.hub, "clicking it opens /ai-scorecards/?sc=" + sc + " with that scorecard running (" + st.code + ")");
}

// 7. Footer Developer Build Out link, and a modified click is left to the browser (new tab)
await open("/", "/");
const fl = await ev(`(function(){var a=document.querySelector('footer.site a[href="/buildout-page/"]');return a?a.getAttribute('href'):''})()`);
ok(fl === "/buildout-page/", "the footer Developer Build Out link is a real link: " + fl);
const prevented = await ev(`(function(){var a=document.querySelector('nav.pages a.cta');var e=new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true,button:0});a.dispatchEvent(e);return e.defaultPrevented})()`);
ok(prevented === false, "a Ctrl-click on a page link is not intercepted, so the browser opens the real address in a new tab");
await ev(`document.querySelector('footer.site a[href="/buildout-page/"]').click(); 1`);
await waitPath("/buildout-page/");
ok((await where()) === "/buildout-page/" && (await active()) === "page-buildout-page", "the footer link opens /buildout-page/");

// 8. Links the page script creates are real links, and a click on one navigates
await open("/scorecard/", "/scorecard/");
const made = await ev(`(function(){var out=[];['scBucket'].forEach(function(){});var all=document.querySelectorAll('a[data-go]');var bad=[].filter.call(all,function(a){return (a.getAttribute('href')||'').charAt(0)==='#'}).length;return JSON.stringify({n:all.length,bad:bad})})()`);
ok(JSON.parse(made).bad === 0, "every link with data-go on a real page holds a real address (none left as #route)");

// 9. The 404 page forwards old typed addresses and keeps unknown ones
await open("/assessments", "/audits/");
ok((await where()) === "/audits/", "/assessments (old alias) forwards to /audits/");
await open("/carecircle", "/buildout-page/");
ok((await where()) === "/buildout-page/", "/carecircle (old product route) forwards to /buildout-page/");
await open("/speaking.html", "/speaking/");
ok((await where()) === "/speaking/", "/speaking.html forwards to /speaking/");
await send("Page.navigate", { url: ORIGIN + "/no-such-page/" }); await sleep(1200);
ok((await ev("document.querySelector('h1').textContent")) === "We could not find that page.", "an unknown address shows the not-found page");

ok(errors.length === 0, "no script errors during the click inventory" + (errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""));
ws.close(); proc.kill(); srv.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
if (fails.length) { console.log("\nFAILED (" + fails.length + "):"); fails.forEach((f) => console.log(" - " + f)); process.exit(1); }
console.log("\nALL REAL PAGES CLICK CHECKS PASSED");
process.exit(0);
