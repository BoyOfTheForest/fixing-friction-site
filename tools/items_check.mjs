// Phase 4.6: starting point line, principle line, intent cards, neuro block. Usage: node tools/items_check.mjs OUTDIR
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase46-shots"); fs.mkdirSync(OUT, { recursive: true });
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

const show = async (id) => { await ev("location.hash='#" + id + "'; window.dispatchEvent(new PopStateEvent('popstate')); 1"); await sleep(800); };
const PRESS = (k, code, vk, text) => send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) }).then(() => send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }));
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
const LINE = "Not sure where to begin? Take the Scorecard and get one honest starting point.";
const PRINCIPLE = "Friction is a systems mismatch, never a character flaw.";
const NEURO = "Every workshop is designed to be neuro inclusive. No performative icebreakers. More than one way to take part, in every activity. Sensory decompression intervals built into the session, not added when someone asks.";

// ---------- structure (width independent)
await load(1440, 900);
const ids = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('section.page'),function(s){return s.id.replace('page-','')}))`));
const SKIP = ["home", "scorecards", "scorecard", "ai-scorecards"];
const bad1 = [];
for (const id of ids) {
  const r = JSON.parse(await ev(`(function(){var s=document.getElementById('page-${id}');var l=s.querySelectorAll('.ff-begin');var last=s.lastElementChild;var a=l[0]?l[0].querySelectorAll('a'):[];return JSON.stringify({n:l.length,isLast:last===l[0],txt:l[0]?l[0].textContent.replace(/\\s+/g,' ').trim():'',links:a.length,href:a[0]?a[0].getAttribute('href'):'',linkTxt:a[0]?a[0].textContent:''})})()`));
  if (SKIP.includes(id)) { if (r.n !== 0) bad1.push(id + " should not have the line"); continue; }
  if (r.n !== 1 || !r.isLast || r.txt !== LINE || r.links !== 1 || r.href !== "#scorecards" || r.linkTxt !== "Take the Scorecard") bad1.push(id + " " + JSON.stringify(r));
}
ok(bad1.length === 0, `Change 1: the line is the last element of every interior page (${ids.length - SKIP.length} pages), same wording, one link to the scorecard page ${JSON.stringify(bad1)}`);
ok(await ev(`!document.querySelector('#page-home .ff-begin')`), "Change 1: not on the homepage");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/\r\n/g, "\n");
ok((html.split(PRINCIPLE).length - 1) === 2, "Change 2: the principle line appears exactly twice on the site (homepage and About)");
const home = html.slice(html.indexOf('id="page-home"'), html.indexOf('id="page-prototypes"'));
const sys = home.slice(home.indexOf('class="ff-system"'), home.indexOf('class="ff-system"') + 700);
ok(home.split(PRINCIPLE).length === 2 && sys.includes(PRINCIPLE), "Change 2 place A: the line is on the homepage exactly once, inside the Broken Systems at Work block");
const about = html.slice(html.indexOf('id="page-about"'), html.indexOf('id="page-start"'));
const lede = about.match(/<p class="lede">The story, the team, and the mission[^\n]*?<\/p>/)[0];
ok(about.split(PRINCIPLE).length === 2 && lede.includes("Accessibility Solutions") && lede.endsWith(PRINCIPLE + "</p>"), "Change 2 place B: the line is a sentence inside the About opening paragraph that carries Accessibility Solutions, once");
ok((html.split("Start with what you need today").length - 1) === 1 && (html.match(/class="ff-intent"/g) || []).length === 3, "Change 3: one section, exactly three cards, only once on the site");
const inside = html.slice(html.indexOf('id="page-inside"'), html.indexOf("</section>", html.indexOf('id="page-inside"')));
ok(inside.includes("ff-intent-wrap") && inside.indexOf("ff-intent-wrap") < inside.indexOf("Take the nine-question scorecard"), "Change 3: the section sits above every resource link on the Inside page");
ok((html.split("Built to include everyone in").length - 1) === 1 && html.slice(html.indexOf('id="page-training"'), html.indexOf('id="page-evidence"')).includes("ff-neuro"), "Change 4: the block exists once, on the Training page only");
ok(!/—/.test(LINE + PRINCIPLE + NEURO), "no em dash in the added copy");
ok(!/Creative Consulting|accelerate/i.test(html), "no Creative Consulting, no Accelerate");

// ---------- Change 3 behaviour and text
await show("inside");
const t3 = JSON.parse(await ev(`(function(){var w=document.querySelector('#page-inside .ff-intent-wrap');var c=[].map.call(w.querySelectorAll('a.ff-intent'),function(a){return {h:a.querySelector('h3').textContent,p:a.querySelector('p').textContent,l:a.querySelector('.ff-intent-link').textContent,href:a.getAttribute('href'),go:a.getAttribute('data-go'),jump:a.getAttribute('data-jump'),links:a.querySelectorAll('a').length}});return JSON.stringify({h2:w.querySelector('h2').textContent,c:c,anchor:!!document.getElementById('inside-main')})})()`));
ok(t3.h2 === "Start with what you need today", "Change 3: section heading exact");
const exp = [["Understand my friction", "See where friction builds, and what it becomes if it is left standing.", "Start with the Three Outs"], ["Something practical now", "One plain language tool you can use in a normal working day, starting today.", "Help at work"], ["Explore an idea", "Not ready for a next step yet? Read how other people in the same spot started.", "Inside Fixing Friction"]];
ok(t3.c.length === 3 && exp.every((e, i) => t3.c[i].h === e[0] && t3.c[i].p === e[1] && t3.c[i].l === e[2]) && t3.c.every((c) => c.links === 0), "Change 3: three cards, headings, lines and link texts exact, each card is one link");
console.log("INTENT DESTINATIONS:", t3.c.map((c) => c.l + " -> " + c.href + " (go " + c.go + (c.jump ? ", jump " + c.jump : "") + ")").join(" | "));
ok(t3.anchor, "Change 3: the on-page anchor inside-main exists");
// click, keyboard
await ev(`document.querySelectorAll('#page-inside a.ff-intent')[0].click()`); await sleep(900);
ok(await ev(`document.getElementById('page-home').classList.contains('active')`), "Change 3: clicking card 1 opens the homepage");
const jumped = await ev(`(function(){var e=document.getElementById('three-outs');var r=e.getBoundingClientRect();return r.top<innerHeight*0.7&&r.bottom>0})()`);
ok(jumped, "Change 3: card 1 lands on the Three Outs section");
await show("inside");
await ev(`document.querySelectorAll('#page-inside a.ff-intent')[0].focus()`); await PRESS("Tab", "Tab", 9); await sleep(150);
ok(await ev(`document.activeElement===document.querySelectorAll('#page-inside a.ff-intent')[1]`), "Change 3: Tab moves from card 1 to card 2");
ok(await ev(`(function(){var cs=getComputedStyle(document.activeElement);return cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>=2})()`), "Change 3: a focused card shows a visible outline");
await PRESS("Enter", "Enter", 13, String.fromCharCode(13)); await sleep(900);
ok(await ev(`document.getElementById('page-tools').classList.contains('active')`), "Change 3: keyboard Enter on card 2 opens Tools and Resources");
await show("inside");
await ev(`document.querySelectorAll('#page-inside a.ff-intent')[2].click()`); await sleep(900);
ok(await ev(`(function(){var e=document.getElementById('inside-main');var r=e.getBoundingClientRect();return document.getElementById('page-inside').classList.contains('active')&&r.top<innerHeight*0.7&&r.bottom>0})()`), "Change 3: card 3 jumps to the main content of the same page");

// ---------- per width
for (const [name, w, h] of sizes) {
  await load(w, h);
  await show("inside");
  const g = JSON.parse(await ev(`(function(){var c=[].map.call(document.querySelectorAll('#page-inside a.ff-intent'),function(e){var r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]});var bg=[].map.call(document.querySelectorAll('#page-inside a.ff-intent'),function(e){return getComputedStyle(e).backgroundColor});return JSON.stringify({c:c,bg:bg,ov:document.documentElement.scrollWidth>innerWidth})})()`));
  if (w >= 1100) ok(g.c.every((c, i) => c[1] === g.c[0][1] && c[2] === g.c[0][2] && c[3] === g.c[0][3] && (i === 0 || c[0] > g.c[i - 1][0])), `${name}: three cards side by side, equal size`);
  else ok(g.c.every((c, i) => c[2] === g.c[0][2] && c[3] > 44 && (i === 0 || c[1] > g.c[i - 1][1])), `${name}: three cards stacked in order, equal width`);
  ok(new Set(g.bg).size === 1 && !g.ov, `${name}: cards share one style, no sideways scroll`);
  const lw = await ev(`(${LINEFN})('#page-inside .ff-intent-wrap h2, #page-inside .ff-intent h3')`);
  ok(lw === "[]", `${name}: Inside intent headings, no widow or stranded word ${lw}`);
  await show("training");
  const lw2 = await ev(`(${LINEFN})('#page-training .ff-neuro h3')`);
  ok(lw2 === "[]", `${name}: Training neuro block heading, no widow or stranded word ${lw2}`);
  ok(!(await ev(`document.documentElement.scrollWidth>innerWidth`)), `${name}: Training page no sideways scroll`);
  // Change 1 geometry on a long and a short interior page
  for (const pg of ["advising", "start", "athome"]) {
    await show(pg);
    const l = JSON.parse(await ev(`(function(){var e=document.querySelector('#page-${pg} .ff-begin');var a=e.querySelector('a').getBoundingClientRect();var cs=getComputedStyle(e);var f=document.querySelector('footer.site').getBoundingClientRect();var r=e.getBoundingClientRect();return JSON.stringify({h:a.height,bg:cs.backgroundColor,border:cs.borderTopWidth,display:getComputedStyle(e.querySelector('a')).display,gap:Math.round(f.top+scrollY-(r.bottom+scrollY))})})()`));
    ok(l.h >= 44 && l.bg === "rgba(0, 0, 0, 0)" && l.border === "0px", `${name}: ${pg} starting point line link >= 44px, no tinted block or border`);
    const lw3 = await ev(`(${LINEFN})('#page-${pg} .ff-begin')`);
    ok(lw3 === "[]", `${name}: ${pg} starting point line has no widow or stranded word ${lw3}`);
  }
  await show("about");
  ok(!(await ev(`document.documentElement.scrollWidth>innerWidth`)), `${name}: About no sideways scroll`);
  // screenshots
  const shots = [
    ["change1-interior-close-advising", "advising", `(function(){var e=document.querySelector('#page-advising .ff-begin');var f=document.querySelector('footer.site');return [e.getBoundingClientRect().top+scrollY-260, f.getBoundingClientRect().top+scrollY+200]})()`],
    ["change2-about-opening", "about", `(function(){var e=document.querySelector('#page-about .lede');return [e.getBoundingClientRect().top+scrollY-120, e.getBoundingClientRect().bottom+scrollY+200]})()`],
    ["change3-inside-top", "inside", `(function(){var e=document.querySelector('#page-inside .ff-intent-wrap');var r=e.getBoundingClientRect();return [r.top+scrollY-80, r.bottom+scrollY+80]})()`],
    ["change4-training-neuro", "training", `(function(){var e=document.querySelector('#page-training .ff-neuro');var r=e.getBoundingClientRect();return [r.top+scrollY-420, r.bottom+scrollY+300]})()`],
    ["change2-home-three-outs-principle", "home", `(function(){var e=document.querySelector('.ff-system');var r=e.getBoundingClientRect();return [r.top+scrollY-260, r.bottom+scrollY+180]})()`],
  ];
  for (const [nm, pg, rangeFn] of shots) {
    await show(pg);
    await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<30000;y+=600){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,25)})}window.scrollTo(0,0)})()`);
    const [y0, y1] = JSON.parse(await ev(`JSON.stringify(${rangeFn})`));
    const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: Math.max(0, y0), width: w, height: Math.min(y1 - Math.max(0, y0), 3000), scale: 1 } });
    fs.writeFileSync(path.join(OUT, `${nm}-${name}.png`), Buffer.from(r.data, "base64"));
  }
}
console.log(fails.length ? "FAILED: " + fails.length : "ALL PHASE 4.6 CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
