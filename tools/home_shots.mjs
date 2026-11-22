// Phase 2 homepage verification: widows, target sizes, white surfaces, overflow, equal cards, stacking, screenshots.
// Usage: node tools/home_shots.mjs OUTDIR
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || "docs/phase2-shots"; fs.mkdirSync(OUT, { recursive: true });
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
const port = 9900 + Math.floor(Math.random() * 90);
const proc = spawn(chrome, ["--headless=new", "--remote-debugging-port=" + port, "--user-data-dir=" + fs.mkdtempSync(path.join(os.tmpdir(), "ffh-")), "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "about:blank"], { stdio: "ignore" });
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

const HEADS = `(function(){
  var bad=[], NB=String.fromCharCode(160);
  var sel='.hero-h1 .h1-line, .ff-ss h2, .ff-ss h3, .ff-outs h2, .ff-stage h3, .ff-h3, .ff-group, .ff-lens-list h5, .ff-system h5, .ff-close';
  [].forEach.call(document.querySelectorAll(sel),function(h){
    var r=document.createRange(), w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT), n, lines={};
    while((n=w.nextNode())){ if(n.parentElement.closest('.vh')) continue; for(var i=0;i<n.length;i++){ r.setStart(n,i); r.setEnd(n,i+1); var b=r.getBoundingClientRect(); if(!b.width) continue; var y=Math.round(b.top/4); (lines[y]=lines[y]||[]).push(n.data[i]); } }
    var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b;});
    if(ys.length<2) return;
    var last=lines[ys[ys.length-1]].join('').trim();
    if(last.indexOf(' ')<0 && last.indexOf(NB)<0) bad.push(h.textContent.trim().slice(0,50)+' => last line: '+last);
  });
  return JSON.stringify(bad);
})()`;

const sizes = [["desktop-1440", 1440, 900], ["desktop-1280", 1280, 800], ["tablet-landscape-1024", 1024, 768], ["tablet-portrait-768", 768, 1024], ["phone-390", 390, 844], ["phone-360", 360, 740]];
for (const [name, w, h] of sizes) {
  await load(w, h);
  ok(!(await ev(`document.documentElement.scrollWidth>innerWidth`)), `${name}: no sideways scroll`);
  const wid = await ev(HEADS); ok(wid === "[]", `${name}: no widow word in hero, self select or Three Outs headings ${wid}`);
  const small = await ev(`JSON.stringify([].filter.call(document.querySelectorAll('.ff-ss a, .ff-outs a'),function(a){return a.getBoundingClientRect().height<43.5}).map(function(a){return a.textContent}))`);
  ok(small === "[]", `${name}: every added link >= 44px tall ${small}`);
  const lay = JSON.parse(await ev(`(function(){var c=[].map.call(document.querySelectorAll('.ff-ss-card'),function(e){var r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]});return JSON.stringify({cards:c})})()`));
  const [c1, c2] = lay.cards;
  if (w > 860) ok(c1[1] === c2[1] && c1[2] === c2[2] && c1[3] === c2[3] && c1[0] < c2[0], `${name}: two cards side by side, equal size`);
  else ok(c2[1] > c1[1] && c1[0] === c2[0] && c1[2] === c2[2], `${name}: two cards stacked, card 1 then card 2, equal width`);
  const st = JSON.parse(await ev(`(function(){var s=[].map.call(document.querySelectorAll('.ff-stage'),function(e){var r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top)]});var l=[].map.call(document.querySelectorAll('.ff-lens-list li'),function(e){var r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top)]});var sys=document.querySelector('.ff-system').getBoundingClientRect();var lt=document.querySelector('.ff-lens-list').getBoundingClientRect();return JSON.stringify({s:s,l:l,sysTop:Math.round(sys.top),listBottom:Math.round(lt.bottom)})})()`));
  ok(w > 900 ? st.s[0][1] === st.s[2][1] : st.s[1][1] > st.s[0][1], `${name}: three stages ${w > 900 ? "in a row" : "stacked"} in order`);
  ok(st.sysTop > st.listBottom, `${name}: Broken Systems block sits apart, below the three lenses`);
  // whiteness of every added surface
  const bg = await ev(`JSON.stringify([].filter.call(document.querySelectorAll('.ff-ss, .ff-ss *, .ff-outs, .ff-outs *'),function(e){var c=getComputedStyle(e).backgroundColor;return c!=='rgba(0, 0, 0, 0)'&&c!=='rgb(255, 255, 255)'}).map(function(e){return e.className+':'+getComputedStyle(e).backgroundColor}))`);
  ok(bg === "[]", `${name}: added sections use only white backgrounds ${bg}`);
  // page order
  const ord = await ev(`(function(){var p=document.getElementById('page-home');var k=[].map.call(p.children,function(e){return e.className.split(' ')[0]}).filter(function(c){return c!=='on-this-page'}).slice(0,5);return k.join(',')})()`);
  if (name === "desktop-1440") ok(ord.startsWith("hero-bleed,ff-ss,ff-outs"), `order: hero, self select, Three Outs directly below (${ord})`);
  // screenshots: hero + new area
  const a = JSON.parse(await ev(`(function(){var hb=document.querySelector('.hero-bleed').getBoundingClientRect();var o=document.querySelector('.ff-outs').getBoundingClientRect();return JSON.stringify({top:hb.top+scrollY,bottom:o.bottom+scrollY})})()`));
  await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<9000;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,60)})}window.scrollTo(0,0)})()`); await sleep(500);
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: a.top, width: w, height: a.bottom - a.top, scale: 1 } });
  fs.writeFileSync(path.join(OUT, name + "-hero-to-three-outs.png"), Buffer.from(r.data, "base64"));
}
// content checks from the source
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const home = html.slice(html.indexOf('id="page-home"'), html.indexOf('id="page-prototypes"'));
const mine = home.slice(home.indexOf('<div class="hero-bleed">'), home.indexOf('<div class="logo-banner"'));
ok(!mine.includes("\u2014"), "no em dash in the hero, self select or Three Outs copy");
ok((html.match(/corporate bullshit/g) || []).length === 1, "the phrase corporate bullshit appears exactly once on the site");
ok((html.match(/systems mismatch, never a character flaw/g) || []).length === 1, "the principle line appears exactly once on the site (homepage)");
ok(!/Creative Consulting|Accelerate/i.test(mine), "no Creative Consulting or Accelerate in the new copy");
ok((mine.match(/class="card ff-ss-card"/g) || []).length === 2, "exactly two self select cards");
ok((mine.match(/class="btn /g) || []).length === 2, "hero still has exactly two calls to action");
console.log(fails.length ? "\nFAILED: " + fails.length : "\nALL PHASE 2 CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
