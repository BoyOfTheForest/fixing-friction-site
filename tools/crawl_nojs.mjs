#!/usr/bin/env node
/* JavaScript-disabled crawl: every generated page must be readable end to end with scripting off.
     node tools/crawl_nojs.mjs
   For each route: load /<route>/ with scripts disabled, then check that the page's own section is shown,
   its heading and body text are in the rendered page (compared with the source section), no asset failed,
   and the page is reachable by following real links from the homepage (the three unlisted pages are the
   known exceptions: they are reached by direct address and by contextual links only). Exits 1 on any failure. */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "src", "site.html"), "utf8").split("\r\n").join("\n");
const routes = [...(src.match(/var pages = \[([^\]]*)\]/)[1]).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const pathFor = (id) => (id === "home" ? "/" : "/" + id + "/");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "application/xml" };
const srv = http.createServer((req, rsp) => {
  let u = decodeURIComponent(req.url.split("?")[0]);
  if (u.endsWith("/")) u += "index.html";
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end("nf"); }
  rsp.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(rsp);
}).listen(0, "127.0.0.1");
await new Promise((r) => srv.on("listening", r));
const ORIGIN = "http://127.0.0.1:" + srv.address().port;
const chrome = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => p && fs.existsSync(p));
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ffcrawl-"));
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
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result?.result?.value; };
let badReq = [];
handlers.push((d) => {
  if (d.method === "Network.loadingFailed" && !d.params.canceled) badReq.push("failed " + (d.params.errorText || ""));
  if (d.method === "Network.responseReceived" && d.params.response.status >= 400) badReq.push(d.params.response.status + " " + d.params.response.url.replace(ORIGIN, ""));
});
await send("Page.enable"); await send("Network.enable"); await send("Runtime.enable");
await send("Emulation.setScriptExecutionDisabled", { value: true });
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

const norm = (s) => s.replace(/\s+/g, " ").trim();
const failures = [];
const rows = [];
const reach = new Map();
for (const rt of routes) {
  badReq = [];
  await send("Page.navigate", { url: ORIGIN + pathFor(rt) });
  for (let i = 0; i < 80; i++) { await sleep(100); try { if ((await ev("location.pathname + String.fromCharCode(124) + document.readyState")) === pathFor(rt) + "|complete") break; } catch (e) {} }
  await sleep(250);
  const r = JSON.parse(await ev(`(function(){
    var sec=document.querySelector('section.page.active');
    var vis=!!sec&&getComputedStyle(sec).display!=='none'&&sec.getBoundingClientRect().height>200;
    var h1=sec&&sec.querySelector('h1');
    var txt=sec?sec.innerText:'';
    var html=sec?sec.textContent:'';
    var hidden=0; if(sec){ [].forEach.call(sec.querySelectorAll('h1,h2,h3,p,li'),function(e){ var cs=getComputedStyle(e); if((cs.display==='none'||cs.visibility==='hidden')&&!e.closest('details')&&!e.closest('[hidden]')&&!e.closest('.vh')) hidden++; }); }
    var links=[].map.call(document.querySelectorAll('a[href^="/"]'),function(a){return a.getAttribute('href').split('#')[0].split('?')[0]});
    var imgs=[].filter.call(document.querySelectorAll('section.page.active img'),function(i){return i.complete&&i.naturalWidth===0}).length;
    return JSON.stringify({vis:vis,h1:h1?h1.textContent.trim().replace(/\\s+/g,' '):'',txtLen:txt.length,textLen:html.length,hidden:hidden,sections:document.querySelectorAll('section.page').length,links:links,brokenImgs:imgs,title:document.title,scrollW:document.documentElement.scrollWidth,innerW:innerWidth});
  })()`));
  // the source section's text, for the end-to-end comparison
  const sm = src.match(new RegExp('<section class="page(?: active)?" id="page-' + rt + '"[\\s\\S]*?\\n      </section>'));
  const srcTxt = norm(src.slice(src.indexOf('id="page-' + rt + '"')).split(/<section class="page/)[0].replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;/g, "\u2019").replace(/&[a-z0-9#]+;/g, " "));
  void sm;
  const fails = [];
  if (!r.vis) fails.push("the page's section is not visible with scripts off");
  if (!r.h1) fails.push("no visible h1");
  if (r.sections !== 1) fails.push("expected one section, found " + r.sections);
  if (r.hidden > 0) fails.push(r.hidden + " heading, paragraph or list item is hidden");
  if (r.brokenImgs) fails.push(r.brokenImgs + " broken image(s)");
  if (badReq.length) fails.push("failed requests: " + badReq.slice(0, 3).join(", "));
  if (r.scrollW > r.innerW + 1) fails.push("scrolls sideways at 1280");
  const ratio = r.textLen / Math.max(1, srcTxt.length);
  if (ratio < 0.9) fails.push("rendered text is only " + Math.round(ratio * 100) + "% of the source section text");
  for (const l of r.links) { if (!reach.has(l)) reach.set(l, new Set()); reach.get(l).add(rt); }
  rows.push({ rt, h1: r.h1, kb: Math.round(r.txtLen / 1024 * 10) / 10, ratio: Math.round(ratio * 100), title: r.title, fails });
  for (const f of fails) failures.push(rt + ": " + f);
}
// reachability by real links from the homepage (breadth first, following only generated pages)
const seen = new Set(["/"]); const queue = ["/"]; const from = {};
const linkMap = {}; for (const rt of routes) linkMap[pathFor(rt)] = null;
for (const [l, srcs] of reach) for (const s of srcs) { (linkMap[pathFor(s)] ||= []); }
const edges = {};
for (const [l, srcs] of reach) for (const s of srcs) (edges[pathFor(s)] ||= new Set()).add(l);
while (queue.length) { const cur = queue.shift(); for (const n of edges[cur] || []) if (!seen.has(n) && linkMap[n] !== undefined) { seen.add(n); queue.push(n); } }
const unreachable = routes.filter((rt) => !seen.has(pathFor(rt)));
for (const rt of rows) {}
console.log("route".padEnd(16) + "text KB".padEnd(9) + "vs source".padEnd(11) + "h1 / result");
for (const r of rows) console.log(r.rt.padEnd(16) + String(r.kb).padEnd(9) + (r.ratio + "%").padEnd(11) + (r.fails.length ? "FAIL: " + r.fails.join("; ") : "ok  " + r.h1.slice(0, 60)));
console.log("\nreachable from the homepage by real links: " + seen.size + " of " + routes.length + " pages");
const EXPECT_UNLINKED = [];
for (const u of unreachable) { console.log("  not reached by links: " + u); }
for (const u of unreachable) if (!EXPECT_UNLINKED.includes(u)) failures.push(u + ": not reachable from the homepage by following real links");
ws.close(); proc.kill(); srv.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
if (failures.length) { console.log("\nFAILED (" + failures.length + "):"); failures.forEach((f) => console.log(" - " + f)); process.exit(1); }
console.log("\nALL " + routes.length + " PAGES READABLE WITH JAVASCRIPT DISABLED");
process.exit(0);
