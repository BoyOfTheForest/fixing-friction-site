// Speaking clarity pass check: kept blocks byte for byte, what came off, the three talk families, widows, targets, every link clicked, screenshots.
// Usage: node tools/speaking_check.mjs OUTDIR
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase-speaking-shots"); fs.mkdirSync(OUT, { recursive: true });
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
const chrome = process.env.CHROME || ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find((p) => fs.existsSync(p));
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
const load = async (w, h) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await send("Page.navigate", { url: base + "?" + w }); await sleep(1800); };
const fails = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const sizes = [["desktop-1440", 1440, 900], ["desktop-1280", 1280, 800], ["tablet-landscape-1024", 1024, 768], ["tablet-portrait-768", 768, 1024], ["phone-390", 390, 844], ["phone-360", 360, 740]];
const waitPath = async (p, extra = 600) => { for (let i = 0; i < 100; i++) { await sleep(100); try { if ((await ev("location.pathname + String.fromCharCode(124) + document.readyState")) === p + "|complete") break; } catch (e) {} } await sleep(extra); };
// ---------- Speaking clarity pass: what stays byte for byte, what came off, the new grouping, widows, targets, every link clicked, screenshots
const src = fs.readFileSync(path.join(ROOT, "src", "site.html"), "utf8").replace(/\r\n/g, "\n");
const sA = src.indexOf('<section class="page" id="page-speaking"'); const sec = src.slice(sA, src.indexOf("</section>", sA) + 10);
const h12 = (s) => crypto.createHash("sha1").update(s, "utf8").digest("hex").slice(0, 12);
const blk = (s, start, ends) => { const i = s.indexOf(start); if (i < 0 || s.indexOf(start, i + 1) >= 0) return "missing"; const js = ends.map((e) => s.indexOf(e, i + start.length)).filter((j) => j >= 0); if (!js.length) return "missing"; let r = s.slice(i, Math.min(...js)).trimEnd(); if (r.endsWith("<div>")) r = r.slice(0, -5).trimEnd(); return r; };
const KEEP = [
 ["hero", '<div class="hero-bleed page-hero">', ['<div class="grid2">'], "53fab6b6a30c"],
 ["stats strip (1 in 4, 1,200+, First ERG, CareFirst wording)", '<div class="stattiles"', ['<p class="eyebrow">For broader audiences</p>'], "09da65328050"],
 ["broader audiences intro", '<p class="eyebrow">For broader audiences</p>', ['<div class="grid2" style="margin-top:22px;">', '<div class="talk-family">'], "10c1ee31ba18"],
 ["routing block (the one Scorecard decision)", '<div class="callout" style="margin-top:22px;">', ['<div class="zig">'], "1e2d212fcc76"],
 ["keynote logistics", '<div class="zig">', ['<p class="eyebrow">Formats</p>'], "3fc95987d406"],
 ["four formats", '<p class="eyebrow">Formats</p>', ['<p class="eyebrow">What the room leaves with</p>'], "1228bbe80ab2"],
 ["what the room leaves with", '<p class="eyebrow">What the room leaves with</p>', ['<p class="eyebrow">Who books a keynote</p>'], "08fe5d16523e"],
 ["who books a keynote", '<p class="eyebrow">Who books a keynote</p>', ['<p class="eyebrow">How booking works</p>', '<div class="callout"><h2 class="u18">'], "2351a5b1e3a7"],
 ["how booking works", '<p class="eyebrow">How booking works</p>', ['<div class="callout"><h2 class="u18">', '<div><p class="eyebrow">Common questions</p>'], "e180cca0733a"],
 ["fees section", '<div class="callout"><h2 class="u18">', ['<div><p class="eyebrow">Common questions</p>', '<p class="eyebrow">How booking works</p>'], "e2ab676433af"],
 ["FAQ, four questions", '<div><p class="eyebrow">Common questions</p>', ['<div class="cta-band">'], "5748affc64b7"],
 ["close heading, paragraph and button", '<div class="cta-band">', ['<div class="btnrow"><a href="#start" class="btn ghost" data-go="start">Start a conversation</a></div>'], "4d33e375743d"],
 ["standard closing line", '<p class="ff-begin">', ['</section>'], "52a746c5be0f"],
];
for (const [n, s, e, h] of KEEP) { const b = blk(sec, s, e); ok(b !== "missing" && h12(b) === h, "kept block is byte for byte what main had (no sentence rewritten): " + n); }
const txt = (x) => x.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const CARDS = { "Accessibility Friction": "1ecf0e5d8969", "People vote with their actions": "e1c04664126f", "Disability etiquette and the media": "2fe4a79fee0d", "What access actually feels like": "1bad928f9f7a", "Work Smarter with AI": "1efb38b82476", "Accessible AI": "7deacd0a2c05", "Find Your Seat on the AI Curve": "7b5efcb1af1a", "Grow With AI, Stay the Expert": "b5b20376a522", "Reduce Cognitive Load at Work": "fe926ae9e014", "Bullshit to Burnout": "e50926caddef", "Protect Your Energy, Without Guilt": "b48ad5cb3adf", "Thinking Out Loud": "72eb362b5b43", "Evolution of Wonder": "b95dc33d5732", "Creative Wellness": "28a14c24c721", "Room Doom: Family Life Without the Freeze": "f4b960def66a" };
const cardOf = (title) => { const m = sec.match(new RegExp("<h[34][^>]*>" + title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "</h[34]>")); if (!m) return ""; const i = sec.lastIndexOf('<div class="card"', m.index); return sec.slice(i, sec.indexOf("</div>", m.index) + 6); };
let cardsOk = 0; for (const [t, h] of Object.entries(CARDS)) { if (h12(txt(cardOf(t))) === h) cardsOk++; else ok(false, "talk text is word for word what main had: " + t); }
ok(cardsOk === 15, "all 15 talks (4 ADA keynotes, 11 broader audience) read word for word as on main, minus the cut lines: " + cardsOk);
ok(!/Litmus alignment/.test(src), "the four Litmus alignment lines are off the page and nowhere else on the site (held verbatim in the internal holding file)");
ok(!/Next step: /.test(sec), "the eleven per-talk Next step lines are off the page");
ok(!/class="sc-line"/.test(sec) && (sec.match(/class="ff-begin"/g) || []).length === 1 && /<p class="ff-begin">Not sure where to begin\? <a href="#scorecards" data-go="scorecards">Take the Scorecard<\/a> and get one honest starting point\.<\/p>/.test(sec), "the close carries the single standard closing line, the overlapping Scorecard line is gone");
const fam = [...sec.matchAll(/<div class="talk-family"><h3 class="fam-h">(.*?)<\/h3>[\s\S]*?<\/div><\/div>/g)];
ok(fam.length === 3, "three visible talk families: " + fam.map((m) => txt(m[1])).join(" | "));
const famCounts = fam.map((m) => (m[0].match(/<h4>/g) || []).length); ok(JSON.stringify(famCounts) === "[4,4,3]", "families hold 4, 4 and 3 talks, all 11 present, none cut: " + famCounts);
const pageWords = new Set(txt(sec.replace(/<h3 class="fam-h">.*?<\/h3>/g, "")).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/));
const famWords = fam.map((m) => txt(m[1]).replace(/&nbsp;/g, " ").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !["the", "and"].includes(w)));
ok(famWords.flat().every((w) => pageWords.has(w)), "family headings use only words already on the page: unmatched [" + famWords.flat().filter((w) => !pageWords.has(w)).join(",") + "]");
ok(/id="speaking-ai-empowerment"/.test(sec), "the inbound anchor speaking-ai-empowerment (data-jump from the AI Empowerment links) survives");
{ const T = "Fees are set by scope, audience, and format, and are agreed in a discovery call."; const iF = sec.indexOf(T), iB = sec.indexOf("How booking works"), iQ = sec.indexOf("Common questions"), iW = sec.indexOf("Who books a keynote");
  ok(iW < iF && iF < iB && iB < iQ && sec.split(T).length === 2, "order: who books, fees, How booking works, then the FAQ; fees sentence once, word for word"); }
ok((sec.match(/<summary>/g) || []).length === 4, "FAQ keeps all four questions");
ok(!sec.includes("—") && !sec.includes("–") && !/TLCCW/.test(sec) && !/\$\d/.test(sec), "no em or en dash, no TLCCW, no price on the Speaking page");
{ const miss = []; for (const m of src.matchAll(/data-jump="([^"]+)"/g)) { if (!new RegExp('id="' + m[1] + '"').test(src)) miss.push(m[1]); } ok(miss.length === 0, "inbound anchor sweep: every data-jump target on the site exists " + [...new Set(miss)].join(", ")); }
ok(sec.length < 38765 - 1500, "the Speaking section is lighter: " + sec.length + " characters of markup, " + (38765 - sec.length) + " fewer than on main");

// ---------- served: headings, targets, overflow, grouping, links clicked, screenshots
const SPK_HEADS = `(function(){var bad=[],NB=String.fromCharCode(160);[].forEach.call(document.querySelectorAll('#page-speaking h1, #page-speaking h2, #page-speaking h3, #page-speaking h4, #page-speaking .page-after .lede, #page-speaking .hero-line'),function(h){if(h.closest('[aria-hidden=true]')||h.closest('.vh'))return;var r=document.createRange(),w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT),n,lines={};while((n=w.nextNode())){if(n.parentElement.closest('.vh,[aria-hidden=true]'))continue;for(var i=0;i<n.length;i++){r.setStart(n,i);r.setEnd(n,i+1);var b=r.getBoundingClientRect();if(!b.width)continue;var y=Math.round(b.top/4);(lines[y]=lines[y]||[]).push(n.data[i]);}}var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b});if(ys.length<2)return;var last=lines[ys[ys.length-1]].join('').trim();if(last.indexOf(' ')<0&&last.indexOf(NB)<0)bad.push(h.textContent.trim().slice(0,50)+' => '+last)});return JSON.stringify(bad)})()`;
const goSpk = async (w, h) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await goReal(ORIGIN + "/speaking/", "/speaking/"); await sleep(900); };
for (const [name, w, h] of sizes) {
  await goSpk(w, h);
  const wd = await ev(SPK_HEADS);
  ok(wd === "[]", `${name}: no widow word or stranded preposition in any Speaking heading ${wd}`);
  ok(!(await ev(`document.documentElement.scrollWidth>innerWidth+1`)), `${name}: no sideways scroll on Speaking`);
  const tiny = JSON.parse(await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#page-speaking .callout a.quiet-link, #page-speaking .callout a.btn, #page-speaking .cta-band a.btn, #page-speaking .ff-begin a, #page-speaking .hero-bleed a.btn, #page-speaking .steps ~ .btnrow a'),function(a){return a.getBoundingClientRect().height<43.5}).map(function(a){return a.textContent.trim()+':'+Math.round(a.getBoundingClientRect().height)}))`));
  console.log("info " + name + " link heights in the touched modules below 44px (inline text links, reported not swept): " + (tiny.length ? tiny.join(" ; ") : "none"));
  const btns = JSON.parse(await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#page-speaking a.btn'),function(a){return a.getBoundingClientRect().height<43.5}).map(function(a){return a.textContent.trim()}))`));
  ok(btns.length === 0, `${name}: every button on Speaking is at least 44px tall ${btns.join(" ; ")}`);
  const lay = JSON.parse(await ev(`(function(){return JSON.stringify([].map.call(document.querySelectorAll('#page-speaking .talk-family'),function(f){var h=f.querySelector('.fam-h').getBoundingClientRect(),c=f.querySelectorAll('.grid2 > .card');var r=c[0].getBoundingClientRect(),r2=c[1].getBoundingClientRect();var cs=getComputedStyle(f.querySelector('.fam-h'));return {hTop:Math.round(h.top+scrollY),firstTop:Math.round(r.top+scrollY),sideBySide:Math.abs(r.top-r2.top)<4,vis:cs.display!=='none'&&cs.visibility!=='hidden',n:c.length}}))})()`));
  ok(lay.length === 3 && lay.every((f) => f.vis && f.firstTop > f.hTop), `${name}: three family headings visible, each above its own talks`);
  ok(w > 860 ? lay.every((f) => f.sideBySide) : lay.every((f) => !f.sideBySide), `${name}: talks sit ${w > 860 ? "two across" : "stacked"} inside each family`);
  const bg = await ev(`String([].filter.call(document.querySelectorAll('#page-speaking .talk-family, #page-speaking .talk-family .fam-h'),function(e){return getComputedStyle(e).backgroundColor!=='rgba(0, 0, 0, 0)'}).length)`);
  ok(bg === "0", `${name}: the grouping adds no panel or tint (talks sit on the page's normal background)`);
  if (name === "desktop-1440" || name === "tablet-portrait-768" || name === "phone-390") {
    await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<24000;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,50)})}window.scrollTo(0,0)})()`); await sleep(500);
    const full = await ev(`Math.min(30000,Math.ceil(document.documentElement.scrollHeight))`);
    const rr = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: full, scale: 1 } });
    fs.writeFileSync(path.join(OUT, "speaking-clarity-" + name + ".png"), Buffer.from(rr.data, "base64"));
    ok(full > 1000, `${name}: full Speaking screenshot saved (${full}px tall)`);
  }
}
{
  await goSpk(1440, 900);
  const links = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('#page-speaking a[href]'),function(a){return {href:a.getAttribute('href'),otp:a.getAttribute('data-otp')||''}}))`));
  const seen = new Set(); let driven = 0, samePage = 0, mailto = 0; const failed = [];
  for (const L of links) {
    if (seen.has(L.href)) continue; seen.add(L.href);
    if (/^mailto:/.test(L.href)) { mailto++; continue; }
    await goSpk(1440, 900);
    if (/^#/.test(L.href)) { if (!(await ev(`!!document.getElementById(${JSON.stringify(L.otp || L.href.slice(1))})`))) failed.push("in-page anchor missing " + L.href); else samePage++; continue; }
    if (!/^\//.test(L.href)) { failed.push("unexpected href " + L.href); continue; }
    const want = L.href.split("#")[0].split("?")[0];
    const clicked = await ev(`(function(){var a=[].filter.call(document.querySelectorAll('#page-speaking a[href]'),function(x){return x.getAttribute('href')===${JSON.stringify(L.href)}})[0];if(!a)return false;a.click();return true})()`);
    await waitPath(want, 500);
    const at = await ev("location.pathname + location.hash"); const target = L.href.split("#")[1];
    const anchorOk = target ? await ev(`!!document.getElementById(${JSON.stringify(target)})`) : true;
    if (!clicked || !at.startsWith(want) || !anchorOk) failed.push(`${L.href} -> ${at} (anchor ${anchorOk})`);
    driven++;
  }
  ok(failed.length === 0, `every remaining Speaking link clicked on a fresh load of the served page: ${driven} distinct internal links landed, ${samePage} in-page anchors present, ${mailto} mail links ${failed.join(" ; ")}`);
}
console.log(fails.length ? "\nFAILED: " + fails.length : "\nALL SPEAKING CLARITY CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
