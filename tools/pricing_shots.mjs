// Phase 4.5: screenshots and widow checks of every changed pricing and label section. Usage: node tools/pricing_shots.mjs OUTDIR
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
const ORIGIN = "http://127.0.0.1:" + srv.address().port; const base = ORIGIN + "/";
const RP = (id) => ORIGIN + (id === "home" ? "/" : "/" + id.replace(/^frictions-/, "frictions/") + "/");
const goReal = async (url, want) => { await send("Page.navigate", { url }); for (let i = 0; i < 80; i++) { await sleep(100); try { const r = await ev("location.pathname + String.fromCharCode(124) + document.readyState"); if (r === want + String.fromCharCode(124) + "complete") break; } catch (e) {} } };
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
const load = async (w, h) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await send("Page.navigate", { url: base + "?" + w }); await sleep(1800); };
const fails = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const KEY = (k, code, vk) => send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk }).then(() => send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }));

const show = async (id) => { await goReal(RP(id), id === "home" ? "/" : "/" + id.replace(/^frictions-/, "frictions/") + "/"); await sleep(700); };
const WIDFN = `function(root){
  var bad=[], NB=String.fromCharCode(160);
  [].forEach.call(root.querySelectorAll('h1,h2,h3'),function(h){
    var r=document.createRange(), w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT), n, lines={};
    while((n=w.nextNode())){ for(var i=0;i<n.length;i++){ r.setStart(n,i); r.setEnd(n,i+1); var b=r.getBoundingClientRect(); if(!b.width) continue; var y=Math.round(b.top/4); (lines[y]=lines[y]||[]).push(n.data[i]); } }
    var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b;});
    if(ys.length<2) return;
    var last=lines[ys[ys.length-1]].join('').trim();
    if(last.indexOf(' ')<0 && last.indexOf(NB)<0) bad.push(h.textContent.trim().slice(0,60)+' => last line: '+last);
  });
  return JSON.stringify(bad);
}`;
const FIND = `function(pg,tag,text,sel){
  if(tag==='tiles') return document.querySelector('#page-'+pg+' .stattiles');
  var hs=[].filter.call(document.querySelectorAll('#page-'+pg+' '+tag),function(e){return e.textContent.replace(/\\s+/g,' ').trim()===text});
  return hs[0]?hs[0].closest(sel):null;
}`;
const T = [
  ["training", "training-fees", "h2", "Speaking and training formats", ".callout"],
  ["speaking", "speaking-fees", "h2", "Formats and how fees are set", ".callout"],
  ["advising", "advising-fees", "h2", "Advising, scoped to your questions", ".callout"],
  ["support", "support-fractional", "h2", "Fractional ADA Coordinator", "div"],
  ["support", "support-consulting", "h2", "Consulting, scoped to your questions", ".callout"],
  ["plans", "plans-fees", "h2", "Plan scope, by where you are starting from", ".callout"],
  ["materials", "materials-tiers", "h2", "Three tiers, sized to the library in front of you", "div"],
  ["voting", "voting-multisite", "h2", "One program, not a pile of site reports", ".callout"],
  ["voting", "voting-tiles", "tiles", "", ""],
  ["selfeval", "selfeval-fractional", "h3", "Fractional ADA Coordinator", ".card"],
  ["services", "services-options", "h3", "Option 3: Fractional ADA Coordinator with License", ".steps"],
  ["start", "start-closing-path", "h2", "The order of the close does not change.", "div"],
  ["community", "community-fixing-friction", "h2", "The Fixing Friction Community", "div"],
  ["home", "home-summary-row", "h3", "Voting, speaking, and coordinator support", ".summary-row"],
];
const sizes = [["desktop-1440", 1440, 900], ["tablet-landscape-1024", 1024, 768], ["tablet-portrait-768", 768, 1024], ["phone-390", 390, 844]];
for (const [name, w, h] of sizes) {
  await load(w, h);
  for (const [pg, nm, tag, text, sel] of T) {
    await show(pg);
    await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<30000;y+=600){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,25)})}window.scrollTo(0,0)})()`);
    const args = JSON.stringify([pg, tag, text, sel]);
    const boxJ = await ev(`(function(a){var el=(${FIND}).apply(null,a); if(!el) return 'null'; var r=el.getBoundingClientRect(); return JSON.stringify({top:r.top+scrollY,h:r.height})})(${args})`);
    if (boxJ === "null") { ok(false, `${name}: ${nm} container found`); continue; }
    const box = JSON.parse(boxJ);
    const bad = await ev(`(function(a){var el=(${FIND}).apply(null,a); return (${WIDFN})(el)})(${args})`);
    ok(bad === "[]", `${name}: ${nm} no widow word in its headings ${bad}`);
    ok(!(await ev(`document.documentElement.scrollWidth>innerWidth`)), `${name}: ${nm} page has no sideways scroll`);
    const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: Math.max(0, box.top - 14), width: w, height: Math.min(box.h + 28, 4000), scale: 1 } });
    fs.writeFileSync(path.join(OUT, `${nm}-${name}.png`), Buffer.from(r.data, "base64"));
  }
}
console.log(fails.length ? "FAILED: " + fails.length : "ALL PHASE 4.5 SHOT CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
