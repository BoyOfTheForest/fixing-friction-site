// Phase 4 verification: wording sweep (changed headings, labels, leftovers). Usage: node tools/wording_check.mjs
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase3-shots"); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = await new Promise((res) => {
  const s = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split("?")[0]); if (u.endsWith("/")) u += "index.html";
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    const t = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2" }[path.extname(f)] || "application/octet-stream";
    r.writeHead(200, { "content-type": t }); fs.createReadStream(f).pipe(r);
  }).listen(0, "127.0.0.1", () => res(s));
});
const base = "http://127.0.0.1:" + srv.address().port + "/index.html";
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find((p) => fs.existsSync(p));
const port = 9950 + Math.floor(Math.random() * 40);
const proc = spawn(chrome, ["--headless=new", "--remote-debugging-port=" + port, "--user-data-dir=" + fs.mkdtempSync(path.join(os.tmpdir(), "ffl-")), "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "about:blank"], { stdio: "ignore" });
const getJSON = (u, m = "GET") => new Promise((res, rej) => { const rq = http.request(u, { method: m }, (r) => { let b = ""; r.on("data", (d) => (b += d)); r.on("end", () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }); rq.on("error", rej); rq.end(); });
let tgt; for (let i = 0; i < 50; i++) { try { tgt = await getJSON("http://127.0.0.1:" + port + "/json/new?about:blank", "PUT"); break; } catch (e) { await sleep(200); } }
const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const cb = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && cb.has(d.id)) { const { res, rej } = cb.get(d.id); cb.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; cb.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result.value; };
await send("Page.enable"); await send("Runtime.enable");
const load = async (w, h) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await send("Page.navigate", { url: base + "?" + w + "#home" }); await sleep(1800); };
const fails = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const KEY = (k, code, vk) => send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk }).then(() => send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }));

const show = async (id) => { await ev("location.hash='#" + id + "'; window.dispatchEvent(new PopStateEvent('popstate')); 1"); await sleep(700); };
const WID = `(function(sel){
  var bad=[], NB=String.fromCharCode(160);
  [].forEach.call(document.querySelectorAll(sel),function(h){
    if(!h.offsetParent) return;
    var r=document.createRange(), w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT), n, lines={};
    while((n=w.nextNode())){ for(var i=0;i<n.length;i++){ r.setStart(n,i); r.setEnd(n,i+1); var b=r.getBoundingClientRect(); if(!b.width) continue; var y=Math.round(b.top/4); (lines[y]=lines[y]||[]).push(n.data[i]); } }
    var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b;});
    if(ys.length<2) return;
    var last=lines[ys[ys.length-1]].join('').trim();
    if(last.indexOf(' ')<0 && last.indexOf(NB)<0) bad.push(h.textContent.trim().slice(0,60)+' => last line: '+last);
  });
  return JSON.stringify(bad);
})`;
const sizes = [["desktop-1440", 1440, 900], ["desktop-1280", 1280, 800], ["tablet-landscape-1024", 1024, 768], ["tablet-portrait-768", 768, 1024], ["phone-390", 390, 844], ["phone-360", 360, 740]];
// headings changed in this pass, by page: services (ADA Speaking and Training), training (Speaking and training figures)
const targets = [["services", "h3"], ["training", "h2"], ["about", "h3"]];
for (const [name, w, h] of sizes) {
  await load(w, h);
  for (const [pg, tag] of targets) {
    await show(pg);
    const bad = await ev(WID + "('#page-" + pg + " " + tag + "')");
    // compare against headings flagged before this pass is not possible here, so only the changed headings are judged
    const mine = JSON.parse(bad).filter((x) => /Speaking|Training|Accessibility audits|Consulting/.test(x));
    ok(mine.length === 0, `${name}: ${pg} page changed headings have no widow word ${JSON.stringify(mine)}`);
    ok(!(await ev(`document.documentElement.scrollWidth>innerWidth`)), `${name}: ${pg} page has no sideways scroll`);
  }
  await show("home");
  ok(!(await ev(`document.documentElement.scrollWidth>innerWidth`)), `${name}: home has no sideways scroll`);
}
// every page: nothing in the page order or labels broke, summaries are not generic, labels exist
const ids = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('section.page'),function(s){return s.id.replace('page-','')}))`));
let generic = [];
await load(1280, 800);
for (const id of ids) {
  await show(id);
  const g = await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#page-${id} a, #page-${id} button, #page-${id} summary'),function(e){return /^(click here|learn more|read more|find out more|explore|more detail|get started|start inside|more)$/i.test(e.textContent.trim())}).map(function(e){return e.textContent.trim()}))`);
  if (g !== "[]") generic.push(id + ": " + g);
}
ok(generic.length === 0, "no generic link, button or expander labels remain " + JSON.stringify(generic));
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const navFoot = ((html.match(/<header class="site">[\s\S]*?<\/header>/) || [""])[0]) + ((html.match(/<footer class="site">[\s\S]*?<\/footer>/) || [""])[0]);
ok(!/For Individuals|ADA Consulting and Compliance/.test(html), "For Individuals and ADA Consulting and Compliance appear nowhere on the site");
ok(!/Speaking, Training, Consulting, and Compliance/.test(html), "the old services order is gone from the page, titles, meta and structured text");
ok(!/accelerate/i.test(html) && !/Creative Consulting/i.test(html), "no Accelerate and no Creative Consulting");
ok(!navFoot.includes("—"), "no em dash in navigation or footer");
console.log(fails.length ? "\nFAILED: " + fails.length : "\nALL PHASE 4 CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
