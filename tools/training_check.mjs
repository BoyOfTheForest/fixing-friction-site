// Training clarity pass check: kept blocks byte for byte, what came off, the two-column themes grid, widows, targets, every link clicked, screenshots.
// Usage: node tools/training_check.mjs OUTDIR
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase-training-shots"); fs.mkdirSync(OUT, { recursive: true });
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
// ---------- Training clarity pass: what stays byte for byte, what came off, the themes grid, widows, targets, every link clicked, screenshots
const src = fs.readFileSync(path.join(ROOT, "src", "site.html"), "utf8").replace(/\r\n/g, "\n");
const sA = src.indexOf('<section class="page" id="page-training"'); const sec = src.slice(sA, src.indexOf("</section>", sA) + 10);
const h12 = (s) => crypto.createHash("sha1").update(s, "utf8").digest("hex").slice(0, 12);
const blk = (s, start, ends) => { const i = s.indexOf(start); if (i < 0 || s.indexOf(start, i + 1) >= 0) return "missing"; const js = ends.map((e) => s.indexOf(e, i + start.length)).filter((j) => j >= 0); if (!js.length) return "missing"; let r = s.slice(i, Math.min(...js)).trimEnd(); if (r.endsWith("<div>")) r = r.slice(0, -5).trimEnd(); return r; };
const KEEP = [
 ["hero, stats, painful picture, intro, themes header", '<div class="hero-bleed page-hero">', ['<div class="theme-grid">', '<div class="theme">'], "33fa125b2aa0"],
 ["scorecard block (copy unchanged, moved after Theme 8)", '<h2 class="u24">Not sure this is the right piece?</h2>', ['Start a conversation about your team</a></div>'], "664d9fdbaf95"],
 ["effective communication explainer", '<h2 class="u17">What effective communication requires', ['</p></div>'], "1af10c6cd2d7"],
 ["four formats", '<p class="eyebrow">Formats</p>', ['<div class="ff-neuro">', '<div class="carrier">'], "1392cdf1d6e2"],
 ["neuroinclusive block (locked copy)", '<div class="ff-neuro">', ['<div class="zig"><div class="zig-text"><h3 class="u14">Virtual'], "e6b203b6ec94"],
 ["virtual delivery", '<div class="zig"><div class="zig-text"><h3 class="u14">Virtual', ['<p class="eyebrow">Session structure</p>'], "f55df2d3d451"],
 ["session structure", '<p class="eyebrow">Session structure</p>', ['<div><figure class="diagram">'], "19f172e28d53"],
 ["booked in one conversation", '<div><figure class="diagram">', ['<div class="callout" role="note">\n          <h2 class="u18">Training gets two readings too'], "6f344e9170ef"],
 ["two readings, short form with its link", '<h2 class="u18">Training gets two readings too</h2>', ['<div><p class="eyebrow">Common questions</p>'], "82832cef1fc6"],
 ["pick a theme close", '<h2 class="u17">Pick a theme, or start with foundations</h2>', ['<div class="callout" role="note" aria-label="Booking window">'], "54af90dfe343"],
 ["booking window", '<p class="eyebrow">Booking window</p>', ['<div id="training-calendar">'], "1c8d8a61d51d"],
 ["year-planning calendar, untouched", '<div id="training-calendar">', ['<div id="training-calendar-more">'], "aa8110e73566"],
 ["more dates worth planning around, untouched", '<div id="training-calendar-more">', ['<div class="cta-band">', '<p class="small method-after">'], "b9bea7705e14"],
 ["method link", '<p class="small method-after">', ['<p class="ff-begin">'], "085436632236"],
 ["standard closing line", '<p class="ff-begin">', ['</section>'], "52a746c5be0f"],
];
for (const [n, s, e, h] of KEEP) { const b = blk(sec, s, e); ok(b !== "missing" && h12(b) === h, "kept block is byte for byte what main had (no sentence rewritten): " + n); }
const THEMES = ["0c7261a143c3", "41be74300604", "a99f7046e1d8", "7305494d9441", "d93f818be96d", "d22e30da2a13", "af25dd70d769", "52594d0e3ed3"];
const themeDivs = [...sec.matchAll(/<div class="theme">.*?<\/div>/gs)].map((m) => m[0]);
ok(themeDivs.length === 8 && themeDivs.every((t, i) => h12(t) === THEMES[i] && t.includes(">Theme " + (i + 1) + "<")), "all eight themes in order, byte for byte (image, heading, text, Fits line, source studies): " + themeDivs.map((t) => h12(t)).join(","));
const txt = (x) => x.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
{ const g = sec.match(/<div class="theme-grid">([\s\S]*?)\n<\/div>\n/); ok(!!g && (g[1].match(/<div class="theme">/g) || []).length === 8, "the eight themes sit in one two-column grid wrapper");
  const iG = sec.indexOf('<div class="theme-grid">'), iS = sec.indexOf("Not sure this is the right piece?"), iT8 = sec.indexOf(">Theme 8<"), iE = sec.indexOf("What effective communication requires");
  ok(iT8 > iG && iS > iT8 && iE > iS, "the Scorecard routing block now sits after Theme 8, before the effective communication explainer"); }
ok(!/class="cta-band"/.test(sec) && !/Training that changes Monday morning/.test(sec), "the second close is off the page; Pick a theme is the single close");
{ const iF = sec.indexOf('<p class="eyebrow">Formats</p>'), iC = sec.indexOf('<div class="carrier">'), iN = sec.indexOf('<div class="ff-neuro">'); ok(iF < iC && iC < iN, "the formats-and-pass-on section sits with the other formats material, between the four formats and the neuroinclusive block"); }
ok(!/Standing next step/.test(sec) && /Workshops, panels, breakouts, and team drop ins/.test(sec) && (sec.match(/class="crow"/g) || []).length === 3, "the carrier is condensed: heading, framing line and its three rows stay, the duplicate routing row is off");
{ const fq = sec.match(/<h2 class="u10">Asked about training<\/h2>[\s\S]*?<\/details><\/div><\/div>/); ok(!!fq && (fq[0].match(/<summary>/g) || []).length === 6, "one FAQ section carries all six questions, each once"); }
ok(!/Asked, in plain language/.test(sec) && (sec.match(/Common questions/g) || []).length === 1, "the second FAQ section is gone, its question moved verbatim");
ok(/How can I ask my workplace to host one of Matthew’s workshops or trainings\?/.test(sec) && !/data-faq="host"/.test(sec), "the sixth question is the host question, word for word");
{ const f = sec.slice(sec.indexOf('<p class="eyebrow">Scope and fees</p>'), sec.indexOf("International Day of Persons with Disabilities</h2>"));
  ok((f.match(/<li>/g) || []).length === 5 && /Full day, in person<\/strong> \(up to 25 participants\)/.test(f) && /Single virtual session<\/strong> \(60 to 90 minutes\)/.test(f), "the Training format list stays, five lines");
  ok(!/Keynote or featured talk|Breakout or panel session|<h3[^>]*>Speaking<\/h3>/.test(f), "the Speaking format list is off this page (held verbatim)");
  ok(sec.split("Fees are set by scope, audience, and format, and are agreed in a discovery call.").length === 2, "the fees line stands once, word for word"); }
{ const i = sec.indexOf('<h2 class="u17">Programming for the International Day'); const e = sec.indexOf("</div>\n", sec.indexOf("btnrow", i)) + 7; const idpd = sec.slice(i, e);
  ok((idpd.match(/<p[ >]/g) || []).length === 1 && /every December 3/.test(idpd) && /Start a conversation about IDPD week/.test(idpd) && !/Now booking|idpd-note|northern Colorado/.test(idpd), "IDPD condensed to its heading, one approved line and its booking push"); }
ok(/id="training-calendar"/.test(sec) && /A Year of Programming, Aligned/.test(sec) && /More dates worth planning around/.test(sec), "the year-planning calendar and the more dates block stay in place, untouched (relocation flagged, home not named)");
ok(!sec.includes("—") && !sec.includes("–") && !/TLCCW/.test(sec) && !/\$\d/.test(sec), "no em or en dash, no TLCCW, no price on the Training page");
{ const miss = []; for (const m of src.matchAll(/data-jump="([^"]+)"/g)) { if (!new RegExp('id="' + m[1] + '"').test(src)) miss.push(m[1]); } ok(miss.length === 0, "inbound anchor sweep: every data-jump target on the site exists " + [...new Set(miss)].join(", ")); }
ok(["training-calendar", "training-calendar-december", "training-calendar-more"].every((i) => src.includes('id="' + i + '"')), "the calendar anchors training-calendar, training-calendar-december and training-calendar-more survive");
ok(sec.length < 47094 - 1500, "the Training section is lighter: " + sec.length + " characters of markup, " + (47094 - sec.length) + " fewer than on main");

// ---------- served
const TR_HEADS = `(function(){var bad=[],NB=String.fromCharCode(160);[].forEach.call(document.querySelectorAll('#page-training h1, #page-training h2, #page-training h3, #page-training .hero-line'),function(h){if(h.closest('[aria-hidden=true]')||h.closest('.vh'))return;var r=document.createRange(),w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT),n,lines={};while((n=w.nextNode())){if(n.parentElement.closest('.vh,[aria-hidden=true]'))continue;for(var i=0;i<n.length;i++){r.setStart(n,i);r.setEnd(n,i+1);var b=r.getBoundingClientRect();if(!b.width)continue;var y=Math.round(b.top/4);(lines[y]=lines[y]||[]).push(n.data[i]);}}var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b});if(ys.length<2)return;var last=lines[ys[ys.length-1]].join('').trim();if(last.indexOf(' ')<0&&last.indexOf(NB)<0)bad.push(h.textContent.trim().slice(0,50)+' => '+last)});return JSON.stringify(bad)})()`;
const goTr = async (w, h) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await goReal(ORIGIN + "/training/", "/training/"); await sleep(900); };
for (const [name, w, h] of sizes) {
  await goTr(w, h);
  const wd = await ev(TR_HEADS);
  const PRE = ["Leaders leave with the record it happened. => happened.", "A Year of Programming, Aligned => Aligned"];
  const wl = JSON.parse(wd); const fresh = wl.filter((x) => !PRE.includes(x));
  ok(fresh.length === 0, `${name}: no new widow word or stranded preposition in any Training heading ${fresh.join(" ; ")}`);
  if (wl.length) console.log("info " + name + " pre-existing widows in frozen blocks (hero line, calendar heading), reported not swept: " + wl.join(" ; "));
  ok(!(await ev(`document.documentElement.scrollWidth>innerWidth+1`)), `${name}: no sideways scroll on Training`);
  const btns = JSON.parse(await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#page-training a.btn'),function(a){return a.getBoundingClientRect().height<43.5}).map(function(a){return a.textContent.trim()}))`));
  ok(btns.length === 0, `${name}: every button on Training is at least 44px tall ${btns.join(" ; ")}`);
  const g = JSON.parse(await ev(`(function(){var t=[].map.call(document.querySelectorAll('#page-training .theme-grid > .theme'),function(e){var r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top+scrollY),Math.round(r.width),Math.round(r.right)]});var cols=[...new Set(t.map(function(x){return x[0]}))].length;var img=[].every.call(document.querySelectorAll('#page-training .theme-grid > .theme'),function(e){var i=e.querySelector('img'),h=e.querySelector('h3'),p=e.querySelector('p');return i&&h&&p&&i.getBoundingClientRect().bottom<=h.getBoundingClientRect().top+2});return JSON.stringify({n:t.length,cols:cols,t:t,img:img,over:t.some(function(x){return x[3]>innerWidth+1})})})()`));
  const want = w >= 600 ? 2 : 1;
  ok(g.n === 8 && g.cols === want, `${name}: eight themes in ${want} column${want > 1 ? "s" : ""} (found ${g.cols})`);
  ok(g.img && !g.over, `${name}: each theme keeps image, heading and text together, nothing overflows`);
  if (want === 2) ok(g.t[0][1] === g.t[1][1] && g.t[0][0] < g.t[1][0] && g.t[2][1] === g.t[3][1] && g.t[4][1] === g.t[5][1] && g.t[6][1] === g.t[7][1], `${name}: themes pair up in order, 1 and 2 on the first row through 7 and 8 on the last`);
  const bg = await ev(`String([].filter.call(document.querySelectorAll('#page-training .theme-grid, #page-training .theme-grid .theme'),function(e){return getComputedStyle(e).backgroundColor!=='rgba(0, 0, 0, 0)'}).length)`);
  ok(bg === "0", `${name}: the grid adds no panel or tint`);
  if (name === "desktop-1440" || name === "tablet-portrait-768" || name === "phone-390") {
    await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<30000;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,50)})}window.scrollTo(0,0)})()`); await sleep(500);
    const full = await ev(`Math.min(30000,Math.ceil(document.documentElement.scrollHeight))`);
    const rr = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: full, scale: 1 } });
    fs.writeFileSync(path.join(OUT, "training-clarity-" + name + ".png"), Buffer.from(rr.data, "base64"));
    ok(full > 1000, `${name}: full Training screenshot saved (${full}px tall)`);
  }
}
{
  await goTr(1440, 900);
  const links = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('#page-training a[href]'),function(a){return {href:a.getAttribute('href'),otp:a.getAttribute('data-otp')||''}}))`));
  const seen = new Set(); let driven = 0, samePage = 0, mailto = 0; const failed = [];
  for (const L of links) {
    if (seen.has(L.href)) continue; seen.add(L.href);
    if (/^mailto:/.test(L.href)) { mailto++; continue; }
    await goTr(1440, 900);
    if (/^#/.test(L.href)) { if (!(await ev(`!!document.getElementById(${JSON.stringify(L.otp || L.href.slice(1))})`))) failed.push("in-page anchor missing " + L.href); else samePage++; continue; }
    if (!/^\//.test(L.href)) { failed.push("unexpected href " + L.href); continue; }
    const want = L.href.split("#")[0].split("?")[0];
    const clicked = await ev(`(function(){var a=[].filter.call(document.querySelectorAll('#page-training a[href]'),function(x){return x.getAttribute('href')===${JSON.stringify(L.href)}})[0];if(!a)return false;a.click();return true})()`);
    await waitPath(want, 500);
    const at = await ev("location.pathname + location.hash"); const target = L.href.split("#")[1];
    const anchorOk = target ? await ev(`!!document.getElementById(${JSON.stringify(target)})`) : true;
    if (!clicked || !at.startsWith(want) || !anchorOk) failed.push(`${L.href} -> ${at} (anchor ${anchorOk})`);
    driven++;
  }
  ok(failed.length === 0, `every remaining Training link clicked on a fresh load of the served page: ${driven} distinct internal links landed, ${samePage} in-page anchors present, ${mailto} mail links ${failed.join(" ; ")}`);
}
console.log(fails.length ? "\nFAILED: " + fails.length : "\nALL TRAINING CLARITY CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
