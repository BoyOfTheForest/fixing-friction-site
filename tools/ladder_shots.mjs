// Phase 3 verification: the A Ladder section (order, ordered list, widows, targets, layout, white, screenshots).
// Usage: node tools/ladder_shots.mjs OUTDIR
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || "docs/phase3-shots"; fs.mkdirSync(OUT, { recursive: true });
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

const HEADS = `(function(){
  var bad=[], NB=String.fromCharCode(160);
  [].forEach.call(document.querySelectorAll('.ff-ladder-wrap h2, .ff-ladder-wrap h3, .ff-close'),function(h){
    var r=document.createRange(), w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT), n, lines={};
    while((n=w.nextNode())){ for(var i=0;i<n.length;i++){ r.setStart(n,i); r.setEnd(n,i+1); var b=r.getBoundingClientRect(); if(!b.width) continue; var y=Math.round(b.top/4); (lines[y]=lines[y]||[]).push(n.data[i]); } }
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
  const wid = await ev(HEADS); ok(wid === "[]", `${name}: no widow word in the section headings ${wid}`);
  const small = await ev(`JSON.stringify([].filter.call(document.querySelectorAll('.ff-ladder-wrap a'),function(a){return a.getBoundingClientRect().height<43.5}).map(function(a){return a.textContent}))`);
  ok(small === "[]", `${name}: every link and button >= 44px tall ${small}`);
  const pos = JSON.parse(await ev(`(function(){var l=[].map.call(document.querySelectorAll('.ff-ladder > li'),function(e){var r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top)]});return JSON.stringify(l)})()`));
  if (w >= 1100) ok(pos.every((p, i) => p[1] === pos[0][1] && (i === 0 || p[0] > pos[i - 1][0])), `${name}: five steps in one stepped row, left to right`);
  else ok(pos.every((p, i) => i === 0 || (p[1] > pos[i - 1][1] && p[0] === pos[0][0])), `${name}: five steps in a vertical stepped list, top to bottom`);
  const bg = await ev(`JSON.stringify([].filter.call(document.querySelectorAll('.ff-ladder-wrap, .ff-ladder-wrap *'),function(e){var c=getComputedStyle(e).backgroundColor;return c!=='rgba(0, 0, 0, 0)'&&c!=='rgb(255, 255, 255)'&&!e.classList.contains('btn')}).map(function(e){return e.className+':'+getComputedStyle(e).backgroundColor}))`);
  ok(bg === "[]", `${name}: no tinted or dark surface in the section (the one button excepted) ${bg}`);
  const a = JSON.parse(await ev(`(function(){var e=document.getElementById('how-it-works').getBoundingClientRect();return JSON.stringify({top:e.top+scrollY,h:e.height})})()`));
  await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<9000;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,60)})}window.scrollTo(0,0)})()`); await sleep(500);
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: a.top - 20, width: w, height: a.h + 40, scale: 1 } });
  fs.writeFileSync(path.join(OUT, name + "-a-ladder.png"), Buffer.from(r.data, "base64"));
}

// structure at desktop
await load(1440, 900);
const st = JSON.parse(await ev(`(function(){var w=document.getElementById('how-it-works');var ol=w.querySelector('ol');var prev=w.previousElementSibling, next=w.nextElementSibling;return JSON.stringify({
  anchor: !!w, olCount: w.querySelectorAll('ol').length, items: ol.children.length, tag: ol.tagName,
  names: [].map.call(ol.querySelectorAll('li > h3'),function(h){return h.textContent.trim()}),
  label: w.querySelector('.eyebrow').textContent, h2: w.querySelector('h2').textContent,
  filled: [].map.call(w.querySelectorAll('.btn'),function(b){return b.textContent.trim()}),
  prevText: prev.querySelector('h2')?prev.querySelector('h2').textContent:'', nextEyebrow: next.querySelector('.eyebrow')?next.querySelector('.eyebrow').textContent:'',
  links: [].map.call(w.querySelectorAll('a'),function(a){return a.textContent.trim()+' -> '+a.getAttribute('href')+(a.getAttribute('data-jump')?' (jump '+a.getAttribute('data-jump')+')':'')}),
  levelWords: /Level\\s*\\d|\\$\\d/.test(w.textContent)
})})()`));
ok(st.anchor && st.tag === "OL" && st.items === 5 && st.olCount === 1, "one real ordered list (ol) with exactly five items, anchor id how-it-works");
ok(JSON.stringify(st.names) === JSON.stringify(["Assess", "Address", "Align", "Advance", "Ascend"]), "step names in exact order: " + st.names.join(", "));
ok(st.label === "HOW IT WORKS" && st.h2 === "Assess, address, align, advance, ascend", "section label and heading exact");
ok(st.filled.length === 1 && st.filled[0] === "Start with a pilot session", "the only filled button is Start with a pilot session");
ok(!st.levelWords, "no level wording and no prices inside the section");
ok(/Four kinds of Accessibility Friction/.test(st.prevText), "section sits directly after Four Kinds of Friction");
console.log("NEXT SIBLING eyebrow:", st.nextEyebrow);
console.log("LINKS:\n  " + st.links.join("\n  "));
// keyboard: tab order through the section follows the step order
await ev(`document.querySelector('.ff-ladder a').focus()`);
const seen = [];
for (let i = 0; i < 6; i++) { seen.push(await ev(`document.activeElement.textContent.trim()`)); await KEY("Tab", "Tab", 9); }
ok(JSON.stringify(seen) === JSON.stringify(["Take the Scorecard", "Start with an assessment", "Start a conversation", "Inside Fixing Friction", "See the Diagnostic Ladder", "Start with a pilot session"]), "keyboard tab order follows the steps: " + seen.join(" > "));
const ring = await ev(`document.querySelector('.ff-ladder a').focus(), (function(){var cs=getComputedStyle(document.activeElement);return cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>=2})()`);
ok(ring, "focused link shows a visible outline");
// full-page screenshot context crop: Four Kinds to Where to start
const ctx = JSON.parse(await ev(`(function(){var w=document.getElementById('how-it-works');var p=w.previousElementSibling.getBoundingClientRect();var n=w.nextElementSibling.nextElementSibling.getBoundingClientRect();return JSON.stringify({top:p.top+scrollY,bottom:n.bottom+scrollY,total:document.documentElement.scrollHeight})})()`));
await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,50)})}window.scrollTo(0,0)})()`); await sleep(600);
let r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: ctx.top, width: 1440, height: ctx.bottom - ctx.top, scale: 0.6 } });
fs.writeFileSync(path.join(OUT, "desktop-1440-homepage-context-four-kinds-to-where-to-start.png"), Buffer.from(r.data, "base64"));
r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: Math.min(ctx.total, 16000), scale: 0.25 } });
fs.writeFileSync(path.join(OUT, "desktop-1440-full-homepage-small.png"), Buffer.from(r.data, "base64"));
// source checks
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
ok(!/accelerate/i.test(html), "the word Accelerate appears nowhere on the site");
const sec = html.slice(html.indexOf('id="how-it-works"'), html.indexOf('<p class="eyebrow">The diagnostic ladder</p>'));
ok(!sec.includes("\u2014"), "no em dash in the new section");
ok(!/Creative Consulting/i.test(html), "no Creative Consulting");
console.log(fails.length ? "\nFAILED: " + fails.length : "\nALL PHASE 3 CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
