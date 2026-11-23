// Phase 5.6: the TLCCW method page (route method): content, links, standards, widths. Usage: node tools/method_check.mjs OUTDIR
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase56-shots"); fs.mkdirSync(OUT, { recursive: true });
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
const html = fs.readFileSync(path.join(ROOT, "src", "site.html"), "utf8").replace(/\r\n/g, "\n");
const NB = / |&nbsp;/g;
const cap = async (name, clip) => { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...clip, scale: 1 } }); fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(r.data, "base64")); };
const rectOf = (sel) => ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;var r=e.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height}})()`);
const strip = (x) => x.replace(/<[^>]+>/g, " ").replace(NB, " ").replace(/\s+/g, " ").trim();

// ---------- static
const a0 = html.indexOf('<section class="page" id="page-method"');
ok(a0 > 0, "the method page exists as page-method (route #method)");
const sec = html.slice(a0, html.indexOf("</section>", a0));
const secText = strip(sec);
ok(/var pages = \[[^\]]*"method"/.test(html), "#method is in the page list");
ok(strip((sec.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "") === "TLCCW: Think, Learn, Communicate, Create, Work", "h1 is TLCCW spelled out: Think, Learn, Communicate, Create, Work");
ok(secText.includes("The result names the stage. TLCCW is how you work on it."), "approved framing sentence present, exact");
const PIL = [["Think", "Name what is costing you the most."], ["Learn", "Find out what can be changed, and what the rules actually say."], ["Communicate", "Say what you need in plain words."], ["Create", "Build one small fix that fits how you work."], ["Work", "Use it in a normal day, then adjust."]];
const h2s = [...sec.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => strip(m[1]));
ok(PIL.every((p, i) => h2s[i] === p[0]) && h2s[5] === "Where to start", "five pillar headings in order, then Where to start: " + h2s.join(" | "));
let last = -1; let inOrder = true;
for (const [n, line] of PIL) { const i = secText.indexOf(line); if (i <= last) inOrder = false; last = i; ok(i >= 0, `approved pillar line present, exact: ${n}: ${line}`); }
ok(inOrder, "approved pillar lines appear in order");
ok((sec.match(/For a worker/g) || []).length === 5 && (sec.match(/For a leader/g) || []).length === 5 && sec.indexOf("For a worker") < sec.indexOf("For a leader"), "each pillar is shown for a worker first, then for a leader");
const first = secText.search(/TLCCW/); ok(first >= 0 && /TLCCW: Think, Learn, Communicate, Create, Work/.test(secText.slice(first, first + 60)), "TLCCW is spelled out where it first appears");
ok(!/—|&mdash;/.test(sec) && !/[$€£]|\d+\s?%|\bfree\b/i.test(secText), "no em dash, no price, no percentage and no 'free' claim on the page");
ok(!/<form|<input|<textarea|<select|<button|mailto:/i.test(sec), "no form, field, button or email link on the page");
ok(!/Burn Out|Turn Out|Churn Out|Three Outs|A Ladder|PERP|Diagnostic Ladder/.test([...sec.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)].map((m) => strip(m[1])).join(" ")), "no other framework name appears in any heading beside TLCCW");
ok(!/\bTLCCW\b/.test(html.slice(html.indexOf("<header"), html.indexOf("</header>"))) && !/\bTLCCW\b/.test(html.slice(html.indexOf("<footer"), html.indexOf("</footer>"))) && !/href="#method"|data-go="method"/.test(html.slice(html.indexOf("<header"), html.indexOf("</header>")) + html.slice(html.indexOf("<footer"), html.indexOf("</footer>"))), "not in navigation or footer");
ok(!/method/i.test(fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8")) && !/#method|TLCCW/i.test(fs.readFileSync(path.join(ROOT, "llms.txt"), "utf8")), "not in sitemap.xml or the llms.txt lists");
const homeSec = html.slice(html.indexOf('id="page-home"'), html.indexOf('id="page-home"') + 60000);
const trainSec = html.slice(html.indexOf('id="page-training"'), html.indexOf("</section>", html.indexOf('id="page-training"')));
ok((homeSec.match(/data-go="method"/g) || []).length === 1 && homeSec.indexOf('data-go="method"') > homeSec.indexOf("For Everyday Workers &amp; Families"), "the homepage For Everyday Workers door carries exactly one method link");
ok((trainSec.match(/data-go="method"/g) || []).length === 1 && trainSec.indexOf('data-go="method"') > trainSec.length * 0.6, "the Training page carries exactly one method link, below the fold");
const total = (html.match(/data-go="method"/g) || []).length;
ok(total === 2, `exactly two method links in the page markup (home door, Training): ${total}`);
ok(/a\.setAttribute\("href", "#method"\)/.test(html) && /a\.textContent = "TLCCW"/.test(html), "the scorecard result builds its method link to #method");

const INTRO = "TLCCW stands for Think, Learn, Communicate, Create, Work. It is a philosophy and a mindset before it is a method: a way of moving through the world when your brain or body works differently, whether you are on your own, with your family, out in the world, or at work. It was built for neurodivergent people, disabled people, and people living with chronic conditions, and for the leaders who shape the environments they move through. Five steps, in order, each one small enough to start today. Each step is shown here for a worker first, then for a leader.";
ok(secText.includes(INTRO), "the polished introduction paragraph is present, exact");
ok(secText.includes("Start with the cost, not the verdict. The question is what is costing you the most, not what is wrong with you."), "the Think worker card is exact");
ok(secText.includes("Name the barrier in plain words and ask for what would fix it. Your own words are the evidence: you are the one who lives with the barrier."), "the Communicate worker card is exact");
ok(!/systems mismatch, never a character flaw/.test(secText) && (html.match(/systems mismatch, never a character flaw/g) || []).length === 2, "the method page does not carry the principle line, and it appears exactly twice on the site");
// ---------- dynamic
for (const [sn, w, h] of sizes) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  await send("Page.navigate", { url: "about:blank" }); await sleep(200);
  await send("Page.navigate", { url: RP("method") + "?m" + w }); await sleep(1600);
  ok(await ev(`document.querySelector('section.page.active').id==='page-method'`), `[${sn}] #method opens the method page on a fresh load`);
  ok(await ev(`document.documentElement.scrollWidth<=innerWidth+1`), `[${sn}] no sideways overflow`);
  const bad = JSON.parse(await ev(`(${LINEFN})('#page-method h1, #page-method h2, #page-method .method-line')`));
  ok(bad.length === 0, `[${sn}] headings and pillar lines: no widow, no stranded preposition ${bad.join(" ; ")}`);
  const chips = JSON.parse(await ev(`JSON.stringify({n:document.querySelectorAll('#page-method nav.on-this-page a').length,small:[].filter.call(document.querySelectorAll('#page-method nav.on-this-page a, #page-method .btn'),function(e){return e.getBoundingClientRect().height<43.5}).length,scroll:(function(){var r=document.querySelector('#page-method .otp-row');return r.scrollWidth>r.clientWidth+1})()})`));
  ok(chips.n === 5 && chips.small === 0 && !chips.scroll, `[${sn}] chip row: ${chips.n} chips, all at least 44 px, no sideways scroll; buttons at least 44 px`);
  const lk = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('#page-method .quiet-link'),function(e){var r=e.getBoundingClientRect();return Math.round(r.height)}))`));
  ok(lk.length >= 1, `[${sn}] inline link in the Learn card present`);
  // keyboard: tab into the first chip, focus ring visible, Enter jumps to the heading
  await ev(`document.activeElement&&document.activeElement.blur(); window.scrollTo(0,0); 1`);
  for (let k = 0; k < 80; k++) { await KEY("Tab", "Tab", 9); if (await ev(`!!document.activeElement.closest('#page-method nav.on-this-page')`)) break; }
  const ring = await ev(`(function(){var cs=getComputedStyle(document.activeElement);return cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>=2})()`);
  ok(ring, `[${sn}] focus is visible on the chip row`);
  await KEY("Tab", "Tab", 9); await KEY("Enter", "Enter", 13); await sleep(500);
  ok(await ev(`(function(){var h=document.getElementById(document.activeElement.id||'');return !!h&&/Learn/.test(h.textContent)})()`), `[${sn}] keyboard: Tab then Enter on the second chip lands on the Learn heading`);
  const r = await rectOf("#page-method"); await cap("method-" + sn, { x: 0, y: Math.max(0, r.y - 10), width: w, height: Math.min(r.h, 4200) });
}
// links open the page: scorecard result (worker and leader), the homepage door, the Training page
async function runPath(bucket, hats, lens, stage) {
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "about:blank" }); await sleep(200);
  await send("Page.navigate", { url: RP("scorecard") + "?p" + bucket }); await sleep(1500);
  await ev(`document.querySelector('input[name="scBucket"][value="${bucket}"]').click(); document.getElementById('scContinue').click(); 1`);
  if (bucket !== "self") { for (const x of hats) await ev(`document.querySelector('input[name="scHat"][value="${x}"]').click(); 1`); await ev("document.getElementById('scContinue').click(); 1"); }
  if (bucket !== "lead") { for (const x of lens) await ev(`document.querySelector('input[name="scLens"][value="${x}"]').click(); 1`); await ev("document.getElementById('scContinue').click(); 1"); }
  for (let i = 0; i < 7; i++) await ev(`document.querySelector('input[name="scStage${i}"][value="${stage}"]').click(); document.getElementById('scContinue').click(); 1`);
  await sleep(300);
}
await runPath("lead", ["people"], [], "turn");
ok(await ev(`(function(){var m=document.getElementById('scResMethod');var a=m.querySelectorAll('a');return a.length===1&&a[0].textContent==='TLCCW'&&a[0].getAttribute('href')==='/method/'&&/The method behind this result is TLCCW: Think, Learn, Communicate, Create, Work\\./.test(m.textContent)})()`), "leader result: the one method line names TLCCW and links to #method, text unchanged");
await ev(`document.querySelector('#scResMethod a').click(); 1`); await sleep(700);
ok(await ev(`document.querySelector('section.page.active').id==='page-method'`), "leader result: the TLCCW link opens the method page");
await runPath("self", [], ["brain"], "burn");
ok(await ev(`(function(){var m=document.getElementById('scResMethod');var a=m.querySelectorAll('a');return a.length===1&&a[0].getAttribute('href')==='/method/'&&/The result names the stage\\. TLCCW, which stands for Think, Learn, Communicate, Create, Work, is how you work on it\\./.test(m.textContent)&&m.querySelectorAll('li').length===5})()`), "worker result: the teaching paragraph links TLCCW to #method, text and five pillar lines unchanged");
await ev(`document.querySelector('#scResMethod a').click(); 1`); await sleep(700);
ok(await ev(`document.querySelector('section.page.active').id==='page-method'`), "worker result: the TLCCW link opens the method page");
await send("Page.navigate", { url: "about:blank" }); await sleep(200); await send("Page.navigate", { url: base + "?h" }); await sleep(1500);
ok(await ev(`(function(){var a=document.querySelector('#page-home .doors a[data-go="method"]');if(!a)return false;var r=a.getBoundingClientRect();return r.height>=43.5&&a.textContent.trim()==='How the method works'})()`), "homepage door: method link is present and at least 44 px tall");
await ev(`document.querySelector('#page-home .doors a[data-go="method"]').click(); 1`); await sleep(700);
ok(await ev(`document.querySelector('section.page.active').id==='page-method'`), "homepage door link opens the method page");
await send("Page.navigate", { url: "about:blank" }); await sleep(200); await send("Page.navigate", { url: RP("training") + "?t" }); await sleep(1500);
ok(await ev(`(function(){var a=document.querySelector('#page-training a[data-go="method"]');if(!a)return false;return a.getBoundingClientRect().height>=43.5})()`), "Training page: method link is present and at least 44 px tall");
await ev(`document.querySelector('#page-training a[data-go="method"]').click(); 1`); await sleep(700);
ok(await ev(`document.querySelector('section.page.active').id==='page-method'`), "Training page link opens the method page");
console.log(fails.length ? "FAILED: " + fails.length : "ALL PHASE 5.6 CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
