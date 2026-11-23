// Phase 5: scorecard bucket, hat, lens, stage routing, guide map, results, promise line, preliminary items. Usage: node tools/scorecard_check.mjs OUTDIR
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
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/\r\n/g, "\n");
const ll = fs.readFileSync(path.join(ROOT, "llms.txt"), "utf8");
const cap = async (name, clip) => { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...clip, scale: 1 } }); fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(r.data, "base64")); };
const rectOf = (sel) => ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;var r=e.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height}})()`);

// ---------- static: preliminary items
ok(html.includes("Matthew is a practitioner who is Deaf on his right.") && !html.includes("Deaf on one side"), "P1: Training line reads \"Matthew is a practitioner who is Deaf on his right.\"");
ok((html.match(/<h2 class="u11">Hitting friction for yourself, your family, or your job\?<\/h2>/g) || []).length === 1 && !html.includes("Hitting friction at work, or at home"), "P2: individuals card heading changed, once");
ok((html.match(/<h2 class="u11">Tired of seeing your team unhappy, disappearing, and(?:&nbsp;| )eventually leaving\?<\/h2>/g) || []).length === 1 && !html.includes("Leading an organization?"), "P3: organizations card heading changed, once");
ok(/access <br class="hero-rights-br" \/><span[^>]*>they deserve and have a right to\.<\/span>/.test(html.replace(/&nbsp;/g, " ")), "P4: authored break sits immediately before \"they deserve\" in the hero subhead, wording unchanged");
ok(!/Speaking, Training, Consulting|Speaking, Training, and Consulting/.test(html + ll) && /hero-services">Speaking, Training, Compliance, Consulting</.test(html), "P5: hero services line and every machine-readable copy read Speaking, Training, Compliance, Consulting (locked order)");

// ---------- static: scorecard copy and persistence
const scStart = html.indexOf("var SC_BUCKETS"); const scEnd = html.indexOf('scForm.classList.add("sc-stepped")', scStart) + 400;
const scCode = html.slice(scStart, scEnd);
ok(scStart > 0, "new scorecard script present");
ok(!/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon|gtag|dataLayer|mailto:|WebSocket/.test(scCode), "scorecard script has no storage, network, analytics or email calls");
ok(!/ff_scorecard_state|SC_SAVE_KEY|scStoreSet|restoreSavedScorecard|scReturnBar/.test(html), "old persistence (sessionStorage save, restore, return banner) is removed everywhere");
for (const s of ["Which sounds most like you today?", "I lead a team or an organization", "I feel the friction in my own work or home life", "Both. I lead people, and I feel it myself", "What sits on your desk?", "People and performance", "ADA, compliance, or facilities", "Hiring, HR, or people and culture", "Deadlines I am worried about", "What makes a normal day harder than it should be?", "Pick any that fit. There are no wrong answers, and you can skip this.", "My body or my health", "My brain works differently", "An ongoing health condition I manage every day", "The systems, tools, or rules at work", "It is just too much, and I cannot point to one thing", "Your answers change only which starting point you are shown. Nothing here asks what condition you have.", "Burn Out is the stage you are in", "Turn Out is dropping. This is the early warning stage", "Churn Out is happening. Act on the cause, not just the vacancy"]) ok(html.includes(s), "exact text present: " + s);
ok(/<\/h1>\s*<p class="sc-promise">A few short questions\. No email needed to see your result\. One honest starting point, shown straight away\.<\/p>/.test(html) && (html.match(/No email needed to see your result/g) || []).length === 1, "promise line: exact new wording, once, directly under the scorecard h1 on the scorecard page only");
{
  const promo = html.slice(html.indexOf("Find your clearest first step"), html.indexOf("Find your clearest first step") + 700);
  const tools = html.slice(html.indexOf(">The Scorecard</h3>"), html.indexOf(">The Scorecard</h3>") + 600);
  const tab = html.slice(html.indexOf('scorecard:"Answer'), html.indexOf('scorecard:"Answer') + 200);
  const aud = html.slice(html.indexOf("A few short questions. One suggested first step."), html.indexOf("A few short questions. One suggested first step.") + 500);
  const NUM = /\b(nine|9|ten|10|eight|8|seven|7|six|five|four|three|two|2)[- ](short |plain[- ]language )?(\w+ )?questions?\b/i;
  ok(!NUM.test(promo) && !NUM.test(tools) && !NUM.test(tab) && !NUM.test(aud), "no numeric question count in the promise line, the Tools card, the tab description or the Audits promo");
  ok(html.includes("Answer a few short questions about who you are answering as") && html.includes('scorecard:"Answer a few short questions and get one honest starting point') && html.includes("A few short questions. One suggested first step."), "Tools card, tab description and Audits promo use the approved wording");
  const body = html.replace(/<script[\s\S]*?<\/script>/g, (m) => (m.includes("var descMap") ? m : ""));
  const stray = [...body.matchAll(/\b(nine|9)[- ](short )?questions?\b|Nine[- ]question/gi)].map((m) => m[0]);
  ok(stray.length === 0 && !/nine[- ]question|Nine questions/i.test(ll), "no 'nine questions' count anywhere on the site, in meta, JSON-LD or llms.txt " + stray.join(","));
  {
    const h1 = (html.match(/<div class="sc-intro">[\s\S]*?<h1>([\s\S]*?)<\/h1>/) || [])[1] || "";
    const pl = (html.match(/<p class="sc-promise">([\s\S]*?)<\/p>/) || [])[1] || "";
    const TIME = /\b(under|in|within|less than|about|just)?\s*(a|one|two|three|five|ten|2|3|5|10|\d+)[- ]?(minutes?|mins?|seconds?)\b|\b(quick|fast|instant|two-minute|2-minute)\b|\btakes?\b[^.]*\b(minutes?|seconds?)\b/i;
    ok(h1 === "Find your clearest first step." && !TIME.test(h1) && !TIME.test(pl), "the scorecard h1 and promise line make no time promise (h1 is exactly: Find your clearest first step.)");
    ok(!/under two minutes/i.test(h1 + pl + html.slice(html.indexOf('id="page-scorecard"'), html.indexOf('id="page-scorecard"') + 1500)), "no 'under two minutes' in the scorecard entry block");
    ok(!/service, program, or (product|app)|points to the service|point to the matching service|point you to the service|sort the (seven )?services|for the service you need first/i.test(html), "no sentence anywhere says the Scorecard points to a service, program, or product");
    const NEWP = "Your result points to one starting point, a pilot session, an assessment, or Inside Fixing Friction, matched to the problem";
    const blocks = [...html.matchAll(/Let the Scorecard route you/g)].map((m) => html.slice(m.index, m.index + 700));
    ok(blocks.length === 18 && blocks.every((b) => b.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").includes(NEWP)), "all 18 remaining Let the Scorecard route you blocks use the approved starting point wording (" + blocks.length + " found)");
    const promo = html.slice(html.indexOf("A few short questions. One suggested first step."), html.indexOf("A few short questions. One suggested first step.") + 600);
    ok(promo.includes("The Scorecard points to the starting point that fits first, and one concrete next step."), "the Pathways promo uses the approved wording");
  }
  ok(!/startSummaryBox|startCopyAgain|summary has been copied|Copy summary again/.test(html), "the dead Get Started summary banner is gone and nothing references it");
}
ok(!/diagnos|disability status/i.test(scCode), "no question in the flow asks for a diagnosis, condition name or status");
const tl = [...html.matchAll(/TLCCW/g)].map((m) => m.index);
ok(tl.length > 0 && tl.every((i) => i >= scStart && i <= scEnd), "TLCCW appears only inside the scorecard result script (not in nav, footer, hero, headings or any other page)");
ok(!/Creative Consulting/.test(html), "no Creative Consulting anywhere");
ok(!/—|&mdash;/.test(html), "no em dash in the page");
const scSec = html.slice(html.indexOf('id="page-scorecard"'), html.indexOf("</section>", html.indexOf('id="page-scorecard"')));
ok(!/<input[^>]*type="(email|text|tel|password)"|name="email"|<textarea/.test(scSec + scCode), "no email, text or account field anywhere on the scorecard page or created by its script");

// ---------- dynamic: flow
const LABEL = `document.getElementById('scProgressLabel').textContent`;
async function startFresh(w, h) { await load(w, h); await show("scorecard"); await ev("document.getElementById('scReset').click(); 1"); await sleep(150); }
async function run(bucket, hats, lens, stages) {
  const labels = [];
  const lab = async () => labels.push(await ev(LABEL));
  await lab();
  await ev(`document.querySelector('input[name="scBucket"][value="${bucket}"]').click(); document.getElementById('scContinue').click(); 1`); await sleep(60);
  if (bucket !== "self") { await lab(); for (const x of hats) await ev(`document.querySelector('input[name="scHat"][value="${x}"]').click(); 1`); await ev("document.getElementById('scContinue').click(); 1"); await sleep(60); }
  if (bucket !== "lead") { await lab(); for (const x of lens) await ev(`document.querySelector('input[name="scLens"][value="${x}"]').click(); 1`); await ev("document.getElementById('scContinue').click(); 1"); await sleep(60); }
  for (let i = 0; i < 7; i++) { await lab(); await ev(`document.querySelector('input[name="scStage${i}"][value="${stages[i]}"]').click(); document.getElementById('scContinue').click(); 1`); await sleep(60); }
  const res = JSON.parse(await ev(`(function(){var r=document.getElementById('scResult');var p=document.getElementById('scResPrimary');var s=document.getElementById('scResSecondary');var sw=document.getElementById('scResSecondaryWrap');var b=document.getElementById('scResBoth');return JSON.stringify({visible:!r.hidden,head:document.getElementById('scResHead').textContent,primary:p.textContent,primaryHref:p.getAttribute('href'),secondary:sw.hidden?null:s.textContent,secondaryHref:sw.hidden?null:s.getAttribute('href'),secondaryJump:sw.hidden?null:s.getAttribute('data-jump'),both:b.hidden?null:b.textContent,bothHref:b.hidden?null:b.querySelector('a').getAttribute('href'),method:document.getElementById('scResMethod').textContent,methodLinks:document.getElementById('scResMethod').querySelectorAll('a').length,close:document.getElementById('scResClose').textContent,text:r.innerText,btns:r.querySelectorAll('.btnrow .btn').length,formHidden:document.getElementById('scForm').hidden})})()`));
  res.labels = labels; return res;
}
const all7 = (s) => Array(7).fill(s);
const specs = {
  "1 leader, people hat, Turn Out answers": ["lead", ["people"], [], all7("turn")],
  "2 leader, ADA hat, Burn Out answers": ["lead", ["ada"], [], all7("burn")],
  "3 Both, deadline selected, Burn Out answers": ["both", ["deadline"], [], all7("burn")],
  "4 worker, two lens options": ["self", [], ["brain", "body"], all7("churn")],
  "5 worker, lens skipped": ["self", [], [], all7("turn")],
  "6 worker, systems option": ["self", [], ["systems"], all7("burn")]
};
const expect = {
  "1 leader, people hat, Turn Out answers": { head: "Turn Out is dropping. This is the early warning stage", primary: "Start with a pilot session", ph: "#start", sec: null },
  "2 leader, ADA hat, Burn Out answers": { head: "Burn Out is the stage you are in", primary: "Start with an assessment", ph: "#audits", sec: null },
  "3 Both, deadline selected, Burn Out answers": { head: "Burn Out is the stage you are in", primary: "Start with an assessment", ph: "#audits", sec: null, both: true },
  "4 worker, two lens options": { head: "Churn Out is happening. Act on the cause, not just the vacancy", primary: "Inside Fixing Friction", ph: "#inside", sec: "Help at work", sh: "#inside" },
  "5 worker, lens skipped": { head: "Turn Out is dropping. This is the early warning stage", primary: "Inside Fixing Friction", ph: "#inside", sec: null },
  "6 worker, systems option": { head: "Burn Out is the stage you are in", primary: "Inside Fixing Friction", ph: "#inside", sec: "Share this with your leader", sh: "#training" }
};
const report = [];
for (const [sn, w, h] of sizes) {
  for (const [name, spec] of Object.entries(specs)) {
    await startFresh(w, h); const r = await run(...spec); const x = expect[name];
    r.head = r.head.replace(/\u00a0/g, " ");
    const good = r.visible && r.formHidden && r.head === x.head && r.primary === x.primary && r.primaryHref === x.ph && (x.sec === null ? r.secondary === null : r.secondary === x.sec && r.secondaryHref === x.sh) && (!!x.both === !!r.both) && r.btns === 1;
    ok(good, `[${sn}] path ${name}: "${r.head}" | primary "${r.primary}" ${r.primaryHref} | secondary ${r.secondary ? '"' + r.secondary + '" ' + r.secondaryHref : "none"}${r.both ? " | Both line shown" : ""}`);
    report.push(`[${sn}] ${name}: ${r.head} | ${r.primary} (${r.primaryHref}) | ${r.secondary ? r.secondary + " (" + r.secondaryHref + ")" : "no secondary"}${r.both ? " | leaders-burn-out-too line to Inside" : ""}`);
    const nums = r.labels.map((l) => (l.match(/Question (\d+)(?: of (\d+))?/) || []).slice(1).map(Number));
    const exp = name.startsWith("3") ? 10 : 9;
    ok(nums.every((n, i) => n[0] === i + 1) && nums.slice(1).every((n) => n[1] === exp) && nums.length === exp, `[${sn}] path ${name}: progress counts up 1..${exp} with a fixed total of ${exp}, never backwards`);
    if (name.startsWith("4")) { const rr = await rectOf("#scResult"); await cap("result-worker-" + sn, { x: 0, y: Math.max(0, rr.y - 20), width: w, height: Math.min(rr.h + 60, 3000) }); }
    if (name.startsWith("2")) { const rr = await rectOf("#scResult"); await cap("result-leader-" + sn, { x: 0, y: Math.max(0, rr.y - 20), width: w, height: Math.min(rr.h + 60, 2400) }); }
    { const vis = await ev(`(function(){var h=document.getElementById('scResHead').getBoundingClientRect();var hd=document.querySelector('header.site').getBoundingClientRect();return h.top>=hd.bottom-1&&h.top<innerHeight})()`); ok(vis, `[${sn}] path ${name}: the result headline lands fully below the sticky header, not hidden behind it`); }
    ok(!/Disability|Neurodivergence|Chronic Health|Broken Systems|lens/i.test(r.text), `[${sn}] path ${name}: result names the stage and starting point only, no lens label`);
    ok(/TLCCW/.test(r.method) && /Think, Learn, Communicate, Create, Work/.test(r.method) && r.methodLinks === 0, `[${sn}] path ${name}: TLCCW spelled out on first use, no link`);
    ok(r.close.length > 10 && /\.$/.test(r.close), `[${sn}] path ${name}: one plain closing line`);
    ok(!r.text.includes("—"), `[${sn}] path ${name}: no em dash on the result`);
    if ("456".includes(name[0])) ok(!/pilot session|assessment/i.test(r.primary) && /How to work on it/.test(r.text) && (r.text.match(/Think:|Learn:|Communicate:|Create:|Work:/g) || []).length === 5, `[${sn}] path ${name}: worker result has an employer-free primary and the five-line teaching paragraph`);
    if ("123".includes(name[0])) ok(r.method.startsWith("The method behind this result is TLCCW") && !/How to work on it/.test(r.text), `[${sn}] path ${name}: leader result carries one method line, not the teaching block`);
  }
}
fs.writeFileSync(path.join(OUT, "six-paths.txt"), report.join("\n") + "\n");

// ---------- result contrast (every text element on the dark result band, worker and leader)
const CONTRAST = `(function(){function parse(c){var m=c.match(/[\\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}}function lum(c){var f=function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)}function bg(el){while(el){var c=parse(getComputedStyle(el).backgroundColor);if(c.a>0.9)return c;el=el.parentElement}return {r:255,g:255,b:255,a:1}}var bad=[];[].forEach.call(document.querySelectorAll('#scResult h2,#scResult h3,#scResult p,#scResult li,#scResult strong,#scResult a,#scResult button'),function(e){if(!e.offsetParent||!e.textContent.trim())return;var f=parse(getComputedStyle(e).color);var b=bg(e);var l1=lum(f),l2=lum(b);var cr=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);if(cr<4.5)bad.push(e.tagName+' '+cr.toFixed(2)+' '+e.textContent.trim().slice(0,40))});return JSON.stringify(bad)})()`;
for (const nm of ["4 worker, two lens options", "2 leader, ADA hat, Burn Out answers", "3 Both, deadline selected, Burn Out answers"]) { await startFresh(1440, 900); await run(...specs[nm]); const cb = JSON.parse(await ev(CONTRAST)); ok(cb.length === 0, `result (${nm[0]}): every text element has at least 4.5:1 contrast ${cb.join(" ; ")}`); }

// ---------- Fix round 1, item 1: computed colour and contrast of every text element on the dark result band, per variant and width
const BANDJS = `(function(){function parse(c){var m=c.match(/[\\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}}function lum(c){var f=function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)}function cr(a,b){var l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)}function bgOf(el){while(el){var c=parse(getComputedStyle(el).backgroundColor);if(c.a>0.9)return c;el=el.parentElement}return {r:255,g:255,b:255,a:1}}
var band=document.querySelector('#scResult .sc-res-hero');var bandBg=parse(getComputedStyle(band).backgroundColor);var out={band:bandBg,bandRgb:getComputedStyle(band).backgroundColor,pillars:[],elements:[],bad:[]};
var sel='#scResult .eyebrow,#scResult h2,#scResult h3,#scResult p,#scResult li,#scResult strong,#scResult a,#scResult button';
[].forEach.call(band.querySelectorAll('.eyebrow,h2,h3,p,li,strong,a,button'),function(e){if(!e.offsetParent||!e.textContent.trim())return;var f=parse(getComputedStyle(e).color);var b=bgOf(e);var c=cr(f,b);var id=e.id||e.tagName.toLowerCase()+':'+e.textContent.trim().slice(0,24);out.elements.push({id:id,color:getComputedStyle(e).color,bg:'rgb('+b.r+','+b.g+','+b.b+')',ratio:Math.round(c*100)/100});if(c<4.5)out.bad.push(id+' '+getComputedStyle(e).color+' on rgb('+b.r+','+b.g+','+b.b+') = '+c.toFixed(2))});
[].forEach.call(band.querySelectorAll('.sc-method li'),function(li){var st=li.querySelector('strong');var mk=parse(getComputedStyle(li,'::marker').color);var lc=parse(getComputedStyle(li).color);var sc=st?parse(getComputedStyle(st).color):lc;var b=bgOf(li);out.pillars.push({text:li.textContent.trim().slice(0,28),liColor:getComputedStyle(li).color,labelColor:st?getComputedStyle(st).color:null,markerColor:getComputedStyle(li,'::marker').color,liRatio:Math.round(cr(lc,b)*100)/100,labelRatio:Math.round(cr(sc,b)*100)/100,markerRatio:Math.round(cr(mk,b)*100)/100,liLum:lum(lc),bandLum:lum(bandBg),opacity:getComputedStyle(li).opacity,visibility:getComputedStyle(li).visibility})});
return JSON.stringify(out)})()`;
const VARIANTS = [
  ["worker Burn Out", ["self", [], ["brain"], all7("burn")]], ["worker Turn Out", ["self", [], [], all7("turn")]], ["worker Churn Out", ["self", [], ["body", "brain"], all7("churn")]],
  ["leader Burn Out", ["lead", ["ada"], [], all7("burn")]], ["leader Turn Out", ["lead", ["people"], [], all7("turn")]], ["leader Churn Out", ["both", ["hr"], [], all7("churn")]],
  ["both Burn Out (with Inside line)", ["both", ["people"], [], all7("burn")]]
];
const bandLog = [];
for (const [sn, w, h] of sizes) {
  for (const [vn, spec] of VARIANTS) {
    await startFresh(w, h); await run(...spec); await sleep(120);
    const d = JSON.parse(await ev(BANDJS));
    ok(d.bad.length === 0, `[${sn}] ${vn}: every text element on the result band has at least 4.5:1 contrast ${d.bad.join(" ; ")}`);
    if (vn.startsWith("worker")) {
      ok(d.pillars.length === 5, `[${sn}] ${vn}: five TLCCW pillar lines render`);
      const bad = d.pillars.filter((p) => p.liRatio < 4.5 || p.labelRatio < 4.5 || p.markerRatio < 4.5 || p.liLum <= d.bandLum || p.opacity !== "1" || p.visibility !== "visible");
      ok(bad.length === 0, `[${sn}] ${vn}: each pillar line, its bold label and its bullet marker are light on the navy band (>= 4.5:1, lighter than the band) ${JSON.stringify(bad)}`);
      if (sn === "desktop-1440") bandLog.push(`${vn}: band ${d.bandRgb}; pillar text ${d.pillars[0].liColor} (${Math.min(...d.pillars.map((p) => p.liRatio))}:1 min), label ${d.pillars[0].labelColor} (${Math.min(...d.pillars.map((p) => p.labelRatio))}:1 min), marker ${d.pillars[0].markerColor} (${Math.min(...d.pillars.map((p) => p.markerRatio))}:1 min)`);
    } else {
      ok(d.pillars.length === 0, `[${sn}] ${vn}: leader result carries no pillar list`);
      if (sn === "desktop-1440") bandLog.push(`${vn}: lowest element ratio ${Math.min(...d.elements.map((e) => e.ratio))}:1 over ${d.elements.length} text elements`);
    }
    if (sn === "desktop-1440" && vn === "worker Churn Out") fs.writeFileSync(path.join(OUT, "band-colours-worker-churn.json"), JSON.stringify(d, null, 1));
  }
}
fs.writeFileSync(path.join(OUT, "band-contrast.txt"), bandLog.join("\n") + "\n");

// ---------- Phase 5 fix round 3: no time promise anywhere, AI Scorecards carry no contact form or tracking field and still work
{
  ok(!/under two minutes/i.test(html), "no 'under two minutes' claim for the Scorecard anywhere on the site");
  ok(!/guides and templates you can inspect/i.test(html), "the AI result no longer promises guides and templates");
  const aiSec = html.slice(html.indexOf('id="page-ai-scorecards"'), html.indexOf("</section>", html.indexOf('id="page-ai-scorecards"')));
  ok(!/<form|<input[^>]*type="(email|text|hidden)"|<textarea|aiScContact|AI_SC_CONTACT/.test(aiSec), "the AI Scorecards page contains no form element, no email, text or hidden field and no contact step");
  ok(!/\bghl|ghl_|ghlTag|data-ghl|GoHighLevel|AI_SC_CONTACT|aiScContact/i.test(html.replace(/highlight/gi, "")), "no GoHighLevel tag, field or flag anywhere in the page source");
}
await startFresh(1440, 900); await show("ai-scorecards");
await ev("window.__openAiScorecard('1.1'); 1"); await sleep(300);
for (let i = 0; i < 7; i++) { await ev("var r=document.querySelector('input[name=\"aiScQ\"]'); if(r){r.click();} document.getElementById('aiScNextBtn').click(); 1"); await sleep(120); }
ok(await ev(`!document.getElementById('aiScResultWrap').hidden && document.getElementById('aiScResultWrap').innerText.length>200 && document.querySelectorAll('#page-ai-scorecards form').length===0 && !document.querySelector('[name=ghl_tag],[data-ghl-tag]')`), "an AI scorecard still runs from question one to a result on screen, with no form and no tracking attribute");

// ---------- guide map extras (desktop)
await startFresh(1440, 900);
const x1 = await run("lead", ["hr"], [], all7("burn")); ok(x1.primary === "Start with a pilot session" && x1.secondary === "Workplace and Team Consulting" && x1.secondaryHref === "#support", "leader HR hat: pilot session primary, Workplace and Team Consulting secondary");
await startFresh(1440, 900); const x2 = await run("lead", [], [], all7("churn")); ok(x2.primary === "Start with a pilot session" && x2.head.startsWith("Churn Out") && x2.secondary === null, "leader with the hat question skipped, Churn Out: pilot session, no secondary");
await startFresh(1440, 900); const x3 = await run("lead", ["people", "deadline"], [], all7("turn")); ok(x3.primary === "Start with an assessment", "Deadlines override: leader with people hat plus deadline, Turn Out, gets the assessment");
await startFresh(1440, 900); const x4 = await run("both", ["people"], [], all7("burn")); ok(x4.primary === "Start with a pilot session" && x4.both && /Leaders burn out too/.test(x4.both) && x4.bothHref === "#inside", "Both, people hat, Burn Out: pilot primary plus one plain line saying leaders burn out too, linking to Inside");
await startFresh(1440, 900); const x5 = await run("both", ["people"], [], all7("turn")); ok(x5.both === null && x5.primary === "Start with a pilot session", "Both, Turn Out: leader primary, no Burn Out line");
await startFresh(1440, 900); const x6 = await run("self", [], ["brain"], all7("burn")); ok(x6.secondary === "Help at work" && x6.secondaryHref === "#home" && x6.secondaryJump === "lens-neurodivergence", "worker, brain works differently: Help at work linking to the Neurodivergence part of the Burn Out section");
await startFresh(1440, 900); const x7 = await run("self", [], ["condition"], all7("burn")); ok(x7.secondary === "Help at home and for families" && x7.secondaryHref === "#athome", "worker, ongoing condition: Help at home and for families");
await startFresh(1440, 900); const x8 = await run("self", [], ["toomuch"], all7("burn")); ok(x8.secondary === null, "worker, just too much: no lens and no secondary link");
await startFresh(1440, 900); const x9 = await run("self", [], ["systems", "condition"], all7("burn")); ok(x9.secondary === "Help at home and for families", "worker with two lenses gets exactly one secondary (list order wins)");
await startFresh(1440, 900); const x10 = await run("self", [], [], ["burn", "turn", "turn", "churn", "churn", "burn", "turn"]); ok(x10.head.startsWith("Turn Out"), "stage routing: highest count wins (3 turn, 2 burn, 2 churn gives Turn Out)");
await startFresh(1440, 900); const x11 = await run("self", [], [], ["burn", "turn", "churn", "burn", "turn", "churn", "churn"]); ok(x11.head.startsWith("Churn Out"), "stage routing: 3 churn beats 2 burn and 2 turn");
await startFresh(1440, 900); const x12 = await run("self", [], [], ["burn", "burn", "turn", "turn", "churn", "churn", "burn"]); ok(x12.head.startsWith("Burn Out"), "stage routing: a tie sorts to the earlier stage");

// ---------- flow behaviour
await startFresh(1440, 900);
ok(await ev(`document.querySelectorAll('input[name="scBucket"]').length===3 && !document.getElementById('scBack').offsetParent`), "first screen is the bucket question with three options and no Back");
await ev("document.getElementById('scContinue').click(); 1");
ok(await ev(`!document.getElementById('scError').hidden`), "bucket question requires an answer");
await ev(`document.querySelector('input[name="scBucket"][value="self"]').click(); document.getElementById('scContinue').click(); 1`);
ok(await ev(`document.querySelectorAll('input[name="scLens"]').length===5 && !!document.querySelector('.sc-privacy-note') && !!(document.querySelector('.sc-privacy-note').compareDocumentPosition(document.querySelector('fieldset')) & 4) && document.querySelectorAll('input[name="scHat"]').length===0`), "worker path: the lens question follows, with the privacy line directly above it, and no hat question");
ok(await ev(`[].every.call(document.querySelectorAll('input[name="scLens"]'),function(i){return i.type==='checkbox'})`), "lens question is multi select");
await ev("document.getElementById('scContinue').click(); 1");
ok(await ev(`document.getElementById('scError').hidden && document.querySelectorAll('input[name="scStage0"]').length===3`), "lens question can be skipped with no answer");
await ev("document.getElementById('scBack').click(); 1");
ok(await ev(`document.querySelectorAll('input[name="scLens"]').length===5`), "Back returns to the previous question");
await startFresh(1440, 900);
await ev(`document.querySelector('input[name="scBucket"][value="lead"]').click(); document.getElementById('scContinue').click(); 1`);
ok(await ev(`document.querySelectorAll('input[name="scHat"]').length===4 && !document.querySelector('.sc-privacy-note')`), "leader path: the hat question shows, multi select, no lens question");
await ev("document.getElementById('scContinue').click(); 1");
ok(await ev(`document.getElementById('scError').hidden && document.querySelectorAll('input[name="scStage0"]').length===3`), "hat question can be skipped");
ok(await ev(`sessionStorage.length===0 && localStorage.length===0 && document.cookie===''`), "nothing is written to sessionStorage, localStorage or cookies by the flow");
await send("Page.navigate", { url: base + "?dl#scorecard?role=leader" }); await sleep(1800);
ok(await ev(`!!document.querySelector('input[name="scBucket"][value="lead"]:checked')`), "deep link #scorecard?role=leader preselects the leader answer on the first question");

// ---------- widows and layout
for (const [sn, w, h] of sizes) {
  await load(w, h); await show("home");
  const homeBad = JSON.parse(await ev(`(${LINEFN})('#page-home .hero-h1, #page-home .doors h2')`));
  ok(homeBad.length === 0, `[${sn}] homepage headings (incl. both door cards): no widow, no stranded preposition ${homeBad.join(" ; ")}`);
  const hv = JSON.parse(await ev(`(function(){var l=document.querySelector('.hero-bleed-content .lede');var sp=l.querySelector('span');var br=l.querySelector('br');var r=document.createRange();var wk=document.createTreeWalker(l,NodeFilter.SHOW_TEXT),n,acc=0;while((n=wk.nextNode())){var i=n.data.indexOf('access');if(i>=0&&n.parentNode===l){r.setStart(n,i);r.setEnd(n,i+6);acc=r.getBoundingClientRect().top;}}var st=sp.getBoundingClientRect();return JSON.stringify({brShown:getComputedStyle(br).display!=='none',brk:st.top>acc+4});})()`));
  if (w >= 768) ok(hv.brShown && hv.brk, `[${sn}] hero subhead: the rights clause starts on its own line`); else ok(!hv.brShown, `[${sn}] hero subhead: forced break is off on phones, text reflows naturally`);
  const lw = JSON.parse(await ev(`(function(){var l=document.querySelector('.hero-bleed-content .lede');var r=document.createRange(),wk=document.createTreeWalker(l,NodeFilter.SHOW_TEXT),n,lines={};while((n=wk.nextNode())){for(var i=0;i<n.length;i++){r.setStart(n,i);r.setEnd(n,i+1);var b=r.getBoundingClientRect();if(!b.width)continue;var y=Math.round(b.top/4);(lines[y]=lines[y]||[]).push(n.data[i]);}}var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b});return JSON.stringify(ys.map(function(y){return lines[y].join('').trim()}))})()`));
  const lastLine = (lw[lw.length - 1] || "").replace(/\u00a0/g, " "); ok(lw.length < 2 || lastLine.includes(" "), `[${sn}] hero subhead: no single word alone on its last line (${JSON.stringify(lw)})`);
  const hr = await rectOf(".hero-bleed"); await cap("hero-" + sn, { x: 0, y: Math.max(0, hr.y), width: w, height: Math.min(hr.h, 1800) });
  const dr = await rectOf(".doors"); await cap("door-cards-" + sn, { x: 0, y: Math.max(0, dr.y - 20), width: w, height: Math.min(dr.h + 40, 2400) });
  await show("scorecard"); await ev("document.getElementById('scReset').click(); 1"); await sleep(150);
  const scBad = JSON.parse(await ev(`(${LINEFN})('#page-scorecard h1, #page-scorecard h2, #page-scorecard legend')`));
  ok(scBad.length === 0, `[${sn}] scorecard h1 and question legends: no widow, no stranded preposition ${scBad.join(" ; ")}`);
  const rScore = await rectOf("#page-scorecard .sc-intro"); if (sn === "desktop-1440") await cap("scorecard-entry-" + sn, { x: 0, y: Math.max(0, rScore.y - 20), width: w, height: 900 });
  await ev(`document.querySelector('input[name="scBucket"][value="lead"]').click(); document.getElementById('scContinue').click(); document.querySelector('input[name="scHat"][value="ada"]').click(); document.getElementById('scContinue').click(); 1`);
  const lg = JSON.parse(await ev(`(${LINEFN})('#page-scorecard legend')`)); ok(lg.length === 0, `[${sn}] a stage question legend: no widow ${lg.join(" ; ")}`);
  const small = JSON.parse(await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#page-scorecard .sc-opts label,#page-scorecard .sc-nav .btn'),function(e){return e.offsetParent&&e.getBoundingClientRect().height<44}).map(function(e){return e.textContent.trim()}))`));
  ok(small.length === 0, `[${sn}] question options and buttons are at least 44 px tall ${small.join(" ; ")}`);
  for (const nm of ["4 worker, two lens options", "2 leader, ADA hat, Burn Out answers"]) { await startFresh(w, h); await run(...specs[nm]); const rb = JSON.parse(await ev(`(function(){var out=[];var hd=document.getElementById('scResHead');var r=document.createRange(),wk=document.createTreeWalker(hd,NodeFilter.SHOW_TEXT),n,lines={};while((n=wk.nextNode())){for(var i=0;i<n.length;i++){r.setStart(n,i);r.setEnd(n,i+1);var b=r.getBoundingClientRect();if(!b.width)continue;var y=Math.round(b.top/4);(lines[y]=lines[y]||[]).push(n.data[i]);}}var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b});var t=ys.map(function(y){return lines[y].join('').trim()});if(t.length>1&&t[t.length-1].indexOf(' ')<0)out.push('WIDOW '+t.join(' | '));[].forEach.call(document.querySelectorAll('#scResult .btn,#scResult .sc-sec-link'),function(e){if(e.offsetParent&&e.getBoundingClientRect().height<44)out.push('SMALL '+e.textContent)});return JSON.stringify(out)})()`)); ok(rb.length === 0, `[${sn}] result (${nm[0]}): headline has no widow, buttons and link targets at least 44 px ${rb.join(" ; ")}`); }
}
await startFresh(1440, 900);
await ev(`document.querySelector('input[name="scBucket"]').focus(); 1`);
ok(await ev(`document.activeElement&&document.activeElement.name==='scBucket'`), "options can take keyboard focus");
await KEY("ArrowDown", "ArrowDown", 40); await sleep(100);
ok(await ev(`!!document.querySelector('input[name="scBucket"]:checked')`), "keyboard: arrow keys choose an answer");
console.log(fails.length ? "FAILED: " + fails.length : "ALL PHASE 5 CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
