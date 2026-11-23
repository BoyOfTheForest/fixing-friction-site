// Phase 3 verification: the A Ladder section (order, ordered list, widows, targets, layout, white, screenshots).
// Usage: node tools/ladder_shots.mjs OUTDIR
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

const LINES = `(function(){
  var NB=String.fromCharCode(160);
  var SMALL={a:1,an:1,the:1,and:1,or:1,in:1,of:1,to:1,at:1,for:1,on:1,by:1,with:1,from:1,but:1,as:1,so:1,your:1,our:1,we:1,you:1,it:1,is:1,no:1};
  var bad=[];
  var sel='.ff-ladder-wrap h2, .ff-ladder-intro .ln, .ff-ladder h3, .ff-ladder .ff-step-body > p:not(.ff-step-links), .ff-step-links a:not(.btn), .ff-note .ln, .ff-close .ln';
  [].forEach.call(document.querySelectorAll(sel),function(h){
    var r=document.createRange(), w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT,{acceptNode:function(n){return n.parentElement.closest('.ff-num')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}), n, lines={};
    while((n=w.nextNode())){ for(var i=0;i<n.length;i++){ r.setStart(n,i); r.setEnd(n,i+1); var b=r.getBoundingClientRect(); if(!b.width) continue; var y=Math.round(b.top/4); (lines[y]=lines[y]||[]).push(n.data[i]); } }
    var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b;});
    var txt=ys.map(function(y){return lines[y].join('').replace(new RegExp(NB,'g'),' ').trim()});
    if(ys.length<2) return;
    var last=txt[txt.length-1];
    if(last.indexOf(' ')<0) bad.push('WIDOW: '+txt.join(' | '));
    for(var k=0;k<txt.length-1;k++){ var ws=txt[k].replace(/[,.?!]$/,'').split(' '); var lw=ws[ws.length-1].toLowerCase(); if(SMALL[lw]) bad.push('STRANDED "'+lw+'": '+txt.join(' | ')); }
  });
  return JSON.stringify(bad);
})()`;

const sizes = [["desktop-1440", 1440, 900], ["desktop-1280", 1280, 800], ["tablet-landscape-1024", 1024, 768], ["tablet-portrait-768", 768, 1024], ["phone-390", 390, 844], ["phone-360", 360, 740]];
for (const [name, w, h] of sizes) {
  await load(w, h);
  ok(!(await ev(`document.documentElement.scrollWidth>innerWidth`)), `${name}: no sideways scroll`);
  const lw = await ev(LINES); ok(lw === "[]", `${name}: no widow word and no stranded preposition or conjunction in any heading, line or link ${lw}`);
  const small = await ev(`JSON.stringify([].filter.call(document.querySelectorAll('.ff-ladder-wrap a'),function(a){return a.getBoundingClientRect().height<43.5}).map(function(a){return a.textContent}))`);
  ok(small === "[]", `${name}: every link and button >= 44px tall ${small}`);
  const g = JSON.parse(await ev(`(function(){
    var li=[].map.call(document.querySelectorAll('.ff-ladder > li'),function(e){var r=e.getBoundingClientRect();return {l:Math.round(r.left),t:Math.round(r.top)}});
    var tiles=[].map.call(document.querySelectorAll('.ff-tile'),function(e){var r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height),Math.round(r.left)]});
    var body=[].map.call(document.querySelectorAll('.ff-step-body'),function(e){return Math.round(e.getBoundingClientRect().left)});
    var stairs=[].map.call(document.querySelectorAll('.ff-stair'),function(e){var r=e.getBoundingClientRect();return {h:Math.round(r.height),l:Math.round(r.left),ov:e.querySelector('.ff-stair-t').scrollWidth>e.clientWidth+1}});
    var btn=document.querySelector('.ff-ladder .btn').getBoundingClientRect();
    var links=[].map.call(document.querySelectorAll('.ff-ladder li:first-child .ff-step-links a'),function(e){var r=e.getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom)]});
    var pw=[].map.call(document.querySelectorAll('.ff-step-body > p:not(.ff-step-links)'),function(p){var r=document.createRange(),n=p.firstChild;var max=0,cur=0,y=null,cnt={};var tw=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),t;while(t=tw.nextNode()){for(var i=0;i<t.length;i++){r.setStart(t,i);r.setEnd(t,i+1);var b=r.getBoundingClientRect();if(!b.width)continue;var k=Math.round(b.top/4);cnt[k]=(cnt[k]||0)+1}}return Math.max.apply(null,Object.keys(cnt).map(function(k){return cnt[k]}))});
    var cl=[].map.call(document.querySelectorAll('.ff-close .ln, .ff-note .ln'),function(e){return Math.round(e.getBoundingClientRect().height)});
    return JSON.stringify({li:li,tiles:tiles,body:body,stairs:stairs,btnW:Math.round(btn.width),btnH:Math.round(btn.height),links:links,pw:pw,cl:cl});
  })()`));
  ok(g.li.every((x, i) => i === 0 || (x.l > g.li[i - 1].l && x.t > g.li[i - 1].t)), `${name}: each step offset further right than the one before (${g.li.map((x) => x.l).join(", ")})`);
  ok(g.tiles.length === 5 && g.tiles.every((t) => t[0] === g.tiles[0][0] && t[1] === g.tiles[0][1]) && g.tiles.every((t, i) => t[2] < g.body[i]), `${name}: five equal-size tiles, each beside its step text (${g.tiles[0][0]}px)`);
  ok(g.stairs.length === 5 && g.stairs.every((s, i) => i === 0 || (s.h > g.stairs[i - 1].h && s.l > g.stairs[i - 1].l)) && g.stairs.every((s) => !s.ov), `${name}: summary diagram rises left to right, labels fit`);
  ok(await ev(`(function(){var w=document.getElementById('how-it-works').getBoundingClientRect().right;var b=document.querySelector('.ff-ladder .btn').getBoundingClientRect().right;return b<=w+1})()`), `${name}: Ascend button stays inside the content width`);
  ok(await ev(`[].every.call(document.querySelectorAll('.ff-ladder > li'),function(l){var c=getComputedStyle(l);return c.borderLeftWidth==='0px'&&c.borderTopWidth==='0px'&&c.borderRightWidth==='0px'&&c.borderBottomWidth==='0px'})`), `${name}: no vertical bars or borders beside the steps`);
  ok(g.btnH < 60 && g.btnW < 330, `${name}: Ascend button on one line at natural width (${g.btnW}x${g.btnH})`);
  ok(g.links[1][0] - g.links[0][1] >= 8, `${name}: Assess two links on their own lines, separated by ${g.links[1][0] - g.links[0][1]}px`);
  ok(g.pw.every((c) => c <= 68), `${name}: step sentences max ${Math.max(...g.pw)} characters per line (target 45 to 65)`);
  if (w >= 768) ok(g.cl.every((x) => x < 60), `${name}: note and closing authored lines each stay on one line (${g.cl.join(", ")})`);
  const a = JSON.parse(await ev(`(function(){var e=document.getElementById('how-it-works').getBoundingClientRect();return JSON.stringify({top:e.top+scrollY,h:e.height})})()`));
  await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<12000;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,60)})}window.scrollTo(0,0)})()`); await sleep(500);
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: a.top - 20, width: w, height: a.h + 40, scale: 1 } });
  fs.writeFileSync(path.join(OUT, name + "-a-ladder.png"), Buffer.from(r.data, "base64"));
}

// structure at desktop
await load(1440, 900);
const st = JSON.parse(await ev(`(function(){var w=document.getElementById('how-it-works');var ol=w.querySelector('ol');var p1=w.previousElementSibling,p2=p1.previousElementSibling,p3=p2.previousElementSibling;var eb=function(e){var x=e.querySelector('.eyebrow');return x?x.textContent:''};return JSON.stringify({
  anchor: !!w, olCount: w.querySelectorAll('ol').length, items: ol.children.length, tag: ol.tagName,
  names: [].map.call(ol.querySelectorAll('li > .ff-step-body > h3'),function(h){return h.textContent.trim().replace(/^\\d/,'')}),
  label: w.querySelector('.eyebrow').textContent, h2: w.querySelector('h2').textContent.replace(/\\u00a0/g,' '),
  filled: [].map.call(w.querySelectorAll('.btn'),function(b){return b.textContent.trim()}),
  p1:(p1.querySelector('h2')||{}).textContent, p2:eb(p2), p3:eb(p3), p3h:(p3.querySelector('h2')||{}).textContent, nextCls:w.nextElementSibling.className,
  figLabel: w.querySelector('.ff-stairs').getAttribute('aria-label'), tilesAlt:[].map.call(w.querySelectorAll('.ff-tile'),function(s){return s.getAttribute('aria-label')}),
  inNav: !!document.querySelector('header.site a[href="#how-it-works"], footer.site a[href="#how-it-works"]'),
  links: [].map.call(w.querySelectorAll('ol a'),function(a){return a.textContent.trim()+' -> '+a.getAttribute('href')+(a.getAttribute('data-jump')?' (jump '+a.getAttribute('data-jump')+')':'')}),
  text: w.textContent.replace(/\\u00a0/g,' ').replace(/\\s+/g,' ')
})})()`));
ok(st.anchor && st.tag === "OL" && st.items === 5 && st.olCount === 1, "one real ordered list (ol) with exactly five items, anchor id how-it-works");
ok(JSON.stringify(st.names) === JSON.stringify(["Assess", "Address", "Align", "Advance", "Ascend"]), "step names in exact order: " + st.names.join(", "));
ok(st.label === "HOW IT WORKS" && st.h2 === "Assess, address, align, advance, ascend", "section label and heading exact");
ok(st.filled.length === 1 && st.filled[0] === "Start with a pilot session", "the only filled button is Start with a pilot session");
ok(/Start with the ADA work/.test(st.p1) && st.p2 === "The diagnostic ladder" && /Four kinds of Accessibility Friction/.test(st.p3h) && /proof/.test(st.nextCls), "order: Four Kinds, Diagnostic Ladder, services summary, A Ladder, then proof");
ok(!st.inNav, "section is not linked from the top navigation or the footer");
ok(st.figLabel === "Five rising steps, in order: 1 Assess, 2 Address, 3 Align, 4 Advance, 5 Ascend", "summary diagram alt text lists the five steps in order");
console.log("TILE ALT:", st.tilesAlt.join(" | "));
console.log("LINKS:\n  " + st.links.join("\n  "));
const expected = ["Five steps, in order, for every engagement.", "Friction shows where it builds and what it becomes.", "This is how we work on it, together,", "from where you stand now to actually moving.", "We audit where you stand now, in your building, your systems, or your own working life, before anyone prescribes a fix.", "In a discovery call, we go through the findings together, face to face, and say plainly what needs attention.", "Through Socratic conversation and coaching, we get clear together on what matters most, what comes first, and what good looks like.", "We map the route you need to make progress, step by step, with an order you can follow and owners for each part.", "We put in place what you need to get off the ground and actually start making movement, and the work begins for real.", "Here for yourself? Your first step is the same one.", "Start with the Scorecard,", "and the conversation that follows it.", "Every engagement starts at Assess.", "Nobody starts at Ascend, and nobody is asked to."];
const flat = st.text.replace(/\s+/g, " ");
const miss = expected.filter((e) => !flat.includes(e));
ok(miss.length === 0, "all copy lines present word for word " + JSON.stringify(miss));
// keyboard: tab order follows the steps
await ev(`document.querySelector('.ff-ladder a').focus()`);
const seen = [];
for (let i = 0; i < 6; i++) { seen.push(await ev(`document.activeElement.textContent.trim()`)); await KEY("Tab", "Tab", 9); }
ok(JSON.stringify(seen) === JSON.stringify(["Take the Scorecard", "Start with an assessment", "Start a conversation", "Inside Fixing Friction", "See the Diagnostic Ladder", "Start with a pilot session"]), "keyboard tab order follows the steps: " + seen.join(" > "));
ok(await ev(`document.querySelector('.ff-ladder a').focus(), (function(){var cs=getComputedStyle(document.activeElement);return cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>=2})()`), "focused link shows a visible outline");
// context screenshot: Four Kinds through the A Ladder
const ctx = JSON.parse(await ev(`(function(){var w=document.getElementById('how-it-works');var fk=w.previousElementSibling.previousElementSibling.previousElementSibling.getBoundingClientRect();var e=w.getBoundingClientRect();return JSON.stringify({top:fk.top+scrollY,bottom:e.bottom+scrollY})})()`));
await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,50)})}window.scrollTo(0,0)})()`); await sleep(600);
console.log("context range", Math.round(ctx.top), Math.round(ctx.bottom));
for (const sc of [0.4, 0.25]) { try { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: ctx.top, width: 1440, height: ctx.bottom - ctx.top, scale: sc } }); fs.writeFileSync(path.join(OUT, "desktop-1440-homepage-context-new-order.png"), Buffer.from(r.data, "base64")); break; } catch (e) { console.log("context screenshot retry", sc, e.message); } }
// phone close-ups at 2x
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send("Page.navigate", { url: base + "?closeup#home" }); await sleep(1800);
await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<12000;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,60)})}window.scrollTo(0,0)})()`); await sleep(500);
const box = JSON.parse(await ev(`(function(){var q=function(s){var r=document.querySelector(s).getBoundingClientRect();return {t:r.top+scrollY,b:r.bottom+scrollY}};return JSON.stringify({head:q('#how-it-works .eyebrow'),intro:q('.ff-ladder-intro'),note:q('.ff-note'),close:q('.ff-close')})})()`));
for (const [nm, from, to] of [["heading-and-intro", box.head.t, box.intro.b], ["note-and-closing", box.note.t, box.close.b]]) {
  await ev("window.scrollTo(0," + Math.max(0, Math.round(from - 190)) + ")"); await sleep(400);
  const rr = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(OUT, "phone-390-closeup-" + nm + ".png"), Buffer.from(rr.data, "base64"));
}
// source checks
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
ok(!/accelerate/i.test(html), "the word Accelerate appears nowhere on the site");const sec = html.slice(html.indexOf('id="how-it-works"'), html.indexOf('<p class="eyebrow u20">Proof from the field</p>'));
ok(!sec.includes("\u2014"), "no em dash in the new section");
ok(!/Creative Consulting/i.test(html), "no Creative Consulting");
console.log(fails.length ? "\nFAILED: " + fails.length : "\nALL PHASE 3 CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
