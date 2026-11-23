// Phase 5 fix: no horizontal scrollbar on any page, and the On this page chip row wraps instead of scrolling. Usage: node tools/overflow_check.mjs OUTDIR
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase5-shots"); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = await new Promise((res) => {
  const s = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split("?")[0]); if (u.endsWith("/")) u += "index.html";
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    const t = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" }[path.extname(f)] || "application/octet-stream";
    r.writeHead(200, { "content-type": t }); fs.createReadStream(f).pipe(r);
  }).listen(0, "127.0.0.1", () => res(s));
});
const ORIGIN = "http://127.0.0.1:" + srv.address().port; const base = ORIGIN + "/";
const RP = (id) => ORIGIN + (id === "home" ? "/" : "/" + id + "/");
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

const show = async (id) => { await goReal(RP(id), id === "home" ? "/" : "/" + id + "/"); await sleep(800); };
const LINEFN = `function(sel){
  var NB=String.fromCharCode(160), SMALL={a:1,an:1,the:1,and:1,or:1,in:1,of:1,to:1,at:1,for:1,on:1,by:1,with:1,from:1,but:1,as:1,so:1};
  var bad=[];
  [].forEach.call(document.querySelectorAll(sel),function(h){
    if(!h.offsetParent) return;
    var r=document.createRange(), w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT), n, lines={};
    while((n=w.nextNode())){ for(var i=0;i<n.length;i++){ r.setStart(n,i); r.setEnd(n,i+1); var b=r.getBoundingClientRect(); if(!b.width) continue; var y=Math.round(b.top/4); (lines[y]=lines[y]||[]).push(n.data[i]); } }
    var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b;});
    if(ys.length<2) return;
    var txt=ys.map(function(y){return lines[y].join('').replace(new RegExp(NB,'g'),' ').trim()});
    if(txt[txt.length-1].indexOf(' ')<0) bad.push('WIDOW: '+txt.join(' | '));
    if(txt[0].indexOf(' ')<0) bad.push('LONE FIRST WORD: '+txt.join(' | '));
    for(var k=0;k<txt.length-1;k++){ var ws=txt[k].replace(/[,.?!]$/,'').split(' '); if(SMALL[ws[ws.length-1].toLowerCase()]) bad.push('STRANDED: '+txt.join(' | ')); }
  });
  return JSON.stringify(bad);
}`;
const sizes = [["desktop-1440", 1440, 900], ["tablet-landscape-1024", 1024, 768], ["tablet-portrait-768", 768, 1024], ["phone-390", 390, 844]];
const cap = async (name, clip) => { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...clip, scale: 1 } }); fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(r.data, "base64")); };
await load(1440, 900);
const ids = [...(fs.readFileSync(path.join(ROOT, "src", "site.html"), "utf8").match(/var pages = \[([^\]]*)\]/)[1]).matchAll(/"([^"]+)"/g)].map((m) => m[1]); /* every route comes from the source route table; a real page holds only its own section */
const withRow = [];
const bad = {};
for (const [sn, w, h] of sizes) {
  await load(w, h);
  for (const id of ids) {
    await show(id);
    const r = JSON.parse(await ev(`(function(){var s=document.querySelector('section.page.active');var n=s&&s.querySelector('nav.on-this-page');var row=n&&n.querySelector('.otp-row');var d=document.documentElement;return JSON.stringify({has:!!n,rowOver:row?row.scrollWidth>row.clientWidth+1:false,rowScroll:row?/(auto|scroll)/.test(getComputedStyle(row).overflowX):false,navOver:n?n.scrollWidth>n.clientWidth+1:false,pageOver:d.scrollWidth>window.innerWidth+1||document.body.scrollWidth>window.innerWidth+1,rowH:row?Math.round(row.getBoundingClientRect().height):0,chips:n?n.querySelectorAll('a').length:0,minChip:n?Math.min.apply(null,[].map.call(n.querySelectorAll('a'),function(a){return Math.round(a.getBoundingClientRect().height)})):0})})()`));
    if (r.has && !withRow.includes(id)) withRow.push(id);
    if (r.rowOver || r.navOver || r.pageOver || (r.has && r.rowScroll)) (bad[id] = bad[id] || []).push(`${sn}${r.rowOver ? " chip-row-scrolls" : ""}${r.rowScroll ? " overflow-x:auto" : ""}${r.pageOver ? " PAGE-OVERFLOW" : ""}`);
    ok(!r.rowOver && !r.navOver && !r.pageOver && !(r.has && r.rowScroll), `[${sn}] #${id}: no horizontal scrollbar${r.has ? " (chip row of " + r.chips + ", " + r.rowH + "px tall, chips >= " + r.minChip + "px)" : ""}`);
    if (r.has) ok(r.minChip >= 44, `[${sn}] #${id}: chips are at least 44 px tall`);
    if (r.has && id === "speaking") { const nr = JSON.parse(await ev(`(function(){var e=document.querySelector('section.page.active nav.on-this-page');var b=e.getBoundingClientRect();return JSON.stringify({x:b.left+scrollX,y:b.top+scrollY,w:b.width,h:b.height})})()`)); await cap("on-this-page-speaking-" + sn, { x: 0, y: Math.max(0, nr.y - 60), width: w, height: nr.h + 140 }); }
  }
}
console.log("pages with the On this page chip row: " + withRow.join(", "));
console.log("pages with overflow: " + (Object.keys(bad).length ? JSON.stringify(bad) : "none"));
console.log(fails.length ? "FAILED: " + fails.length : "ALL OVERFLOW CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
