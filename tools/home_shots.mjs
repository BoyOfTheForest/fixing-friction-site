// Phase 2 homepage verification, plus the homepage clarity pass (what stays byte for byte, what came off, links clicked): widows, target sizes, white surfaces, overflow, equal cards, stacking, screenshots.
// Usage: node tools/home_shots.mjs OUTDIR
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase2-shots"); fs.mkdirSync(OUT, { recursive: true });
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
const html = fs.readFileSync(path.join(ROOT, "src", "site.html"), "utf8");
const home = html.slice(html.indexOf('id="page-home"'), html.indexOf('id="page-services"'));
const mine = home.slice(home.indexOf('<div class="hero-bleed">'), home.indexOf('<div class="logo-banner"'));
ok(!mine.includes("\u2014"), "no em dash in the hero, self select or Three Outs copy");
ok((html.match(/corporate bullshit/g) || []).length === 1, "the phrase corporate bullshit appears exactly once on the site");
ok((home.match(/systems mismatch, never a character flaw/g) || []).length === 1 && (html.match(/systems mismatch, never a character flaw/g) || []).length === 2, "the principle line appears once on the homepage and once on About, nowhere else (Phase 4.6 placement)");
ok(!/Creative Consulting|Accelerate/i.test(mine), "no Creative Consulting or Accelerate in the new copy");
ok((mine.match(/class="card ff-ss-card"/g) || []).length === 2, "exactly two self select cards");
ok((mine.match(/class="btn /g) || []).length === 2, "hero still has exactly two calls to action");

const waitPath = async (p, extra = 600) => { for (let i = 0; i < 100; i++) { await sleep(100); try { if ((await ev("location.pathname + String.fromCharCode(124) + document.readyState")) === p + "|complete") break; } catch (e) {} } await sleep(extra); };

// ---------- homepage clarity pass: what stays byte for byte, what came off, what the page now is
const FP = [["hero", "<div class=\"hero-bleed\">", "<div class=\"ff-ss\" id=\"start-where\">", "4f4144938de5"], ["self-select cards", "<div class=\"ff-ss\" id=\"start-where\">", "<div class=\"ff-outs\" id=\"three-outs\">", "0414af3cdf08"], ["three outs heading", "<p class=\"eyebrow\">WHAT HAPPENS WHEN FRICTION BUILDS</p>", "</h2>", "e1649e1fe5c1"], ["three stage cards and the two exit links", "<div class=\"ff-stages\">", "<div class=\"ff-lenses\">", "6afc1dd699c2"], ["lens heading", "<h3 class=\"ff-h3\">", "on everyone</h3>", "49ea3b16607f"], ["lenses, Broken Systems and the principle line", "<h4 class=\"ff-group\">Lenses you live with</h4>", "<p class=\"ff-close\">None of this starts with leaving.", "d8d37c50a41d"], ["three outs closing line (typography only: non-breaking spaces added, no wording changed)", "<p class=\"ff-close\">None of this starts with leaving.", "<div class=\"logo-banner\"", "7c67d6973045"], ["clients logo strip", "<div class=\"logo-banner\"", "alt=\"CareFirst\" width=\"480\" height=\"99\" loading=\"lazy\" decoding=\"async\" /></li>", "2fbaa2f05616"], ["scorecard routing block", "<div class=\"sc-strip\" role=\"note\">", "<div>\n          <p class=\"eyebrow\">Why this work, in his words</p>", "4e154f064a69"], ["founder story, stats and pilot offer", "<div>\n          <p class=\"eyebrow\">Why this work, in his words</p>", "<div>\n          <p class=\"eyebrow\">Client stories</p>", "1df57b752904"], ["client stories", "<div>\n          <p class=\"eyebrow\">Client stories</p>", "<div>\n          <div class=\"grid2\">\n            <div class=\"card\"><h3>What ADAC means</h3>", "95000fa379c0"], ["ADAC, ADA, legal line and IDPD line", "<div>\n          <div class=\"grid2\">\n            <div class=\"card\"><h3>What ADAC means</h3>", "<div style=\"margin-top:30px;\">\n            <p class=\"eyebrow\">Common questions</p>", "7211d9c2ba5f"], ["statistics: the 1 in 4 figure with its source", "<div class=\"statband\"", "<div class=\"tiles\">", "3823cafb137b"], ["statistics: the two Title II deadlines", "<div class=\"tiles\">", "Title II web deadline for smaller public entities.</p></div>", "6a2b47012e83"], ["four kinds: heading, framing paragraph and chart", "<p class=\"eyebrow\">Where it builds, and what it becomes</p>", "<ul class=\"friction-index friction-grid\">", "4d78553c0a37"], ["four kinds: the four kinds with their lines and links", "<ul class=\"friction-index friction-grid\">", "</ul><details class=\"more-text\"><summary>See how it compounds", "09b69145a907"], ["services, practice and timing rows (typography only: non-breaking spaces added, no wording changed)", "<p class=\"eyebrow\">Services, the practice, and timing</p>", "<div class=\"ff-ladder-wrap\" id=\"how-it-works\">", "e44a803722af"], ["how it works: the five steps", "<div class=\"ff-ladder-wrap\" id=\"how-it-works\">", "<div class=\"proof\">", "ece9119e1ec8"], ["proof from the field", "<div class=\"proof\">", "<div class=\"two-up\">", "3d55ad300371"], ["closing conversation band", "<div class=\"two-up\">", "</section>", "3a3911225487"]];
const homeOnly = (() => { const t = html.replace(/\r\n/g, "\n"); return t.slice(t.indexOf('<section class="page active" id="page-home"'), t.indexOf('<section class="page" id="page-buildout-page"')); })();
const allSrc = html.replace(/\r\n/g, "\n");
const txtOf = (x) => x.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;| /g, " ").replace(/&amp;/g, "&").replace(/&rsquo;|&#8217;/g, "’").replace(/\s+/g, " ").trim();
for (const [name, s, e, h] of FP) {
  const i = homeOnly.indexOf(s); const j = i >= 0 ? homeOnly.indexOf(e, i + s.length) : -1;
  const got = i >= 0 && j >= 0 ? crypto.createHash("sha1").update(homeOnly.slice(i, j), "utf8").digest("hex").slice(0, 12) : "missing";
  ok(got === h, "kept block is byte for byte what main had (no sentence rewritten): " + name);
}
const homeTxt = txtOf(homeOnly);
ok(!/class="walk-card"|How every engagement starts|One walk through your building, website, or polling place/.test(homeOnly) && !/One walk through your building, website, or polling place/.test(allSrc.replace(/<script[\s\S]*?<\/script>/g, "")), "the How every engagement starts fragment is off the homepage (its sentence now exists nowhere on the site; held in the removed blocks file)");
ok(!/class="cost"|cost-grid|118,225|236,451|8,667|3,117|Seyfarth|UsableNet|28 CFR/.test(homeOnly), "statistics: the penalty, filing and repeat defendant figures are off the homepage");
ok(/1 in 4/.test(homeTxt) && /28\.7 percent of U\.S\. adults have some type of disability\. Source: CDC\./.test(homeTxt) && /April 26, 2027/.test(homeTxt) && /April 26, 2028/.test(homeTxt), "statistics: the 1 in 4 figure with its CDC source and the two Title II deadline dates stay");
ok(/118,225/.test(allSrc) && /8,667/.test(allSrc) && (allSrc.match(/118,225/g) || []).length >= 2, "the removed penalty and filing figures still live on other pages (Friction reference and Audits)");
{
  const fq = homeOnly.slice(homeOnly.indexOf('<div class="faq" data-faq="top"'));
  const faqBox = fq.slice(0, fq.indexOf("</div>") + 6);
  const sums = [...faqBox.matchAll(/<summary>(.*?)<\/summary>/g)].map((m) => m[1]);
  ok(sums.length === 1 && /How can I ask my workplace to host one of Matthew.s workshops or trainings\?/.test(sums[0]), "FAQ: the homepage holds the one practical question only: " + sums.length);
  ok(/See every common question on the About page/.test(homeOnly) && /data-jump="about-faq"/.test(homeOnly), "FAQ: the link to every common question on About stays");
  const aboutSec = allSrc.slice(allSrc.indexOf('<section class="page" id="page-about"'), allSrc.indexOf("</section>", allSrc.indexOf('<section class="page" id="page-about"')));
  ok(/data-faq="full"/.test(aboutSec) && /var FAQ = \[[\s\S]*What happens in a pilot session\?[\s\S]*Is this legal advice\?/.test(allSrc) && /key disability awareness days/.test(allSrc), "FAQ: the full set still lives on About (rendered from the page script into the full FAQ box)");
}
{
  const tags = [...homeOnly.matchAll(/<span class="tag(?: warm)?">(Friction \d|The prevention)<\/span>/g)].map((m) => m[1]);
  ok(JSON.stringify(tags) === JSON.stringify(["Friction 1", "Friction 2", "Friction 3", "Friction 4", "The prevention"]), "four kinds: the four kinds and the prevention line stay, the three compounding cards are off: " + tags.join(", "));
  ok(/It compounds into three more: Legal Friction, Time Friction, and Bottom-line Friction\./.test(homeTxt) && /Read the full Friction cards in Reference/.test(homeTxt), "four kinds: the compounding sentence and the link to the full cards stay");
  ok(["friction-legal", "friction-time", "friction-bottomline", "friction-prevention"].every((i) => allSrc.includes('id="' + i + '"')), "the full Legal, Time, Bottom-line and prevention cards still live on the Friction reference page");
}
{
  const lad = homeOnly.slice(homeOnly.indexOf('<p class="eyebrow">The diagnostic ladder</p>'), homeOnly.indexOf('<p class="eyebrow">Services, the practice, and timing</p>'));
  ok(/Diagnose first\.<br \/>Prescribe second\./.test(lad) && /Each level is set out in full on the Audits page: what it covers, what you receive, and where it(?:&nbsp;| )leads\./.test(lad) && /data-go="audits" data-jump="levels">See the Diagnostic Ladder</.test(lad), "Diagnostic Ladder: heading, the approved line, one approved sentence and the link to the ladder on the Audits page");
  ok(!/ladder-summary|Level [0-3]:|\$\d|No charge|Full audit pricing|more-text/.test(lad), "Diagnostic Ladder: the level cards, the prices and the pricing details are off the homepage");
  const auditsSec = allSrc.slice(allSrc.indexOf('<section class="page" id="page-audits"'), allSrc.indexOf("</section>", allSrc.indexOf('<section class="page" id="page-audits"')));
  ok(/\$950/.test(auditsSec) && /\$2,500/.test(auditsSec) && /id="levels"/.test(auditsSec), "prices stay public on the Audits page, where the ladder link lands");
  ok(!/\$(950|1,500|2,500|3,500|12,500)/.test(homeOnly), "no ladder or audit price anywhere in the homepage markup");
}
{
  const doors = homeOnly.slice(homeOnly.indexOf('<div class="grid2 doors">'), homeOnly.indexOf('<div class="sc-strip"'));
  const cards = doors.split('<div class="card">').slice(1);
  ok(cards.length === 2 && cards.every((c) => (c.match(/<p class="small">/g) || []).length === 1 || /<p class="small u05">/.test(c)), "the two bands carry their heading, one approved line and their links");
  const lead = txtOf(cards[0]), work = txtOf(cards[1]);
  ok(/Written for the person who carries the risk\./.test(lead) && !/hospital system/.test(lead) && /data-go="audits"/.test(cards[0]) && (cards[0].match(/<a /g) || []).length === 1, "For Organizations band: heading, one approved sentence, the assessment link only");
  ok(/search for help with their own working lives, not for a vendor\./.test(work) && !/goes home to a household/.test(work) && /data-go="frictions"/.test(cards[1]) && /data-go="inside"/.test(cards[1]) && /data-go="method"/.test(cards[1]) && (cards[1].match(/<a /g) || []).length === 3, "For Everyday Workers band: heading, one approved sentence, Find Your Frictions, Inside Fixing Friction and the method link");
}
ok((homeOnly.match(/systems mismatch, never a character flaw/g) || []).length === 1 && (allSrc.match(/systems mismatch, never a character flaw/g) || []).length === 2, "the principle line is still exactly twice on the whole site (homepage and About)");
ok(!/—|&mdash;/.test(homeOnly), "no em dash on the homepage");
ok(/id="three-outs"/.test(homeOnly) && /id="how-it-works"/.test(homeOnly) && /id="lens-neurodivergence"/.test(homeOnly) && /id="start-where"/.test(homeOnly), "the four homepage anchors other links use are all still on the page");
ok(!/data-jump="(?!(three-outs|stage-burn-out|stage-turn-out|stage-churn-out|lens-neurodivergence|how-it-works|start-where)\b)[a-z-]+"[^>]*data-go="home"|data-go="home"[^>]*data-jump="(?!(three-outs|stage-burn-out|stage-turn-out|stage-churn-out|lens-neurodivergence|how-it-works|start-where)\b)[a-z-]+"/.test(allSrc.replace(/<script[\s\S]*?<\/script>/g, "")), "every link that jumps into the homepage lands on a section that survives");
{
  const jumps = [...new Set([...allSrc.matchAll(/data-jump="([^"]+)"/g)].map((m) => m[1]))];
  const miss = jumps.filter((j) => !allSrc.includes('id="' + j + '"'));
  ok(miss.length === 0, "inbound anchor sweep: every data-jump target on the site exists " + miss.join(", "));
}
const bytesCut = (43906 - homeOnly.length);
ok(bytesCut > 8000, "the homepage section is lighter: " + homeOnly.length + " characters of markup, " + bytesCut + " fewer than on main");

// ---------- served: remaining headings, targets, surfaces, every remaining link clicked, screenshots
const CLAR_HEADS = `(function(){var bad=[],NB=String.fromCharCode(160);[].forEach.call(document.querySelectorAll('#page-home h1, #page-home h2, #page-home h3, #page-home h4, #page-home h5, #page-home .hero-h1 .h1-line'),function(h){if(!h.offsetParent)return;var r=document.createRange(),w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT),n,lines={};while((n=w.nextNode())){if(n.parentElement.closest('.vh,[aria-hidden=true]'))continue;for(var i=0;i<n.length;i++){r.setStart(n,i);r.setEnd(n,i+1);var b=r.getBoundingClientRect();if(!b.width)continue;var y=Math.round(b.top/4);(lines[y]=lines[y]||[]).push(n.data[i]);}}var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b;});if(ys.length<2)return;var last=lines[ys[ys.length-1]].join('').trim();if(last.indexOf(' ')<0&&last.indexOf(NB)<0)bad.push(h.textContent.trim().slice(0,50)+' => last line: '+last)});return JSON.stringify(bad)})()`;
for (const [name, w, h] of sizes) {
  await load(w, h);
  const wid = JSON.parse(await ev(CLAR_HEADS));
  ok(wid.length === 0, `${name}: no widow word in any remaining homepage heading or lede ${wid.join(" ; ")}`);
  const tiny = JSON.parse(await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#page-home a.btn, #page-home .doors a, #page-home .ff-ss a, #page-home .sc-strip a, #page-home .ff-ctas a, #page-home .faq summary'),function(a){var r=a.getBoundingClientRect();return a.offsetParent&&r.height<43.5&&getComputedStyle(a).display!=='inline'}).map(function(a){return a.textContent.trim().slice(0,30)}))`));
  ok(tiny.length === 0, `${name}: buttons and block links are at least 44 px tall ${tiny.join(" ; ")}`);
  ok(!(await ev(`document.documentElement.scrollWidth>innerWidth+1`)), `${name}: no sideways scroll on the lighter homepage`);
  const dark = JSON.parse(await ev(`(function(){function lum(c){var m=c.match(/[\\d.]+/g).map(Number);var f=function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2])}var bad=[];[].forEach.call(document.querySelectorAll('#page-home .doors .card, #page-home .doors, #page-home .faq, #page-home .faq details, #page-home .friction-index li, #page-home .ff-lenses, #page-home .ff-system'),function(e){var c=getComputedStyle(e).backgroundColor;if(c!=='rgba(0, 0, 0, 0)'&&lum(c)<0.5)bad.push(e.className+':'+c)});return JSON.stringify(bad)})()`));
  ok(dark.length === 0, `${name}: the condensed modules sit on the page's normal light backgrounds, no new dark panel ${dark.join(" ; ")}`);
  const mods = JSON.parse(await ev(`(function(){var h=document.getElementById('page-home');var g=[];[].forEach.call(h.children,function(e){if(e.classList.contains('on-this-page'))return;var r=e.getBoundingClientRect();if(r.height>0)g.push(Math.round(r.top+scrollY))});var gaps=[];for(var i=1;i<g.length;i++)gaps.push(g[i]-g[i-1]);return JSON.stringify({n:g.length,total:Math.round(document.getElementById('page-home').getBoundingClientRect().height)})})()`));
  if (name === "desktop-1440" || name === "tablet-portrait-768" || name === "phone-390") {
    await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<20000;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,50)})}window.scrollTo(0,0)})()`); await sleep(500);
    const full = await ev(`Math.min(30000,Math.ceil(document.documentElement.scrollHeight))`);
    const rr = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: full, scale: 1 } });
    fs.writeFileSync(path.join(OUT, "homepage-clarity-" + name + ".png"), Buffer.from(rr.data, "base64"));
    ok(mods.total > 0, `${name}: full homepage screenshot saved (page height ${full}px, home section ${mods.total}px)`);
  }
}
// every remaining internal link on the homepage, clicked in the served page
{
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await load(1440, 900);
  const links = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('#page-home a[href], header.site a[data-go]:not(.brandblock)'),function(a,i){return {i:i,href:a.getAttribute('href'),go:a.getAttribute('data-go')||'',jump:a.getAttribute('data-jump')||'',otp:a.getAttribute('data-otp')||'',t:a.textContent.trim().slice(0,40),inHome:!!a.closest('#page-home')}}).filter(function(x){return x.inHome}))`));
  const seen = new Set(); let driven = 0, mailto = 0, samePage = 0; const failed = [];
  for (const L of links) {
    const key = L.href; if (seen.has(key)) continue; seen.add(key);
    if (/^mailto:/.test(L.href)) { mailto++; if (!/^mailto:hello@fixingfriction\.com/.test(L.href)) failed.push(L.href); continue; }
    if (/^#/.test(L.href)) { await load(1440, 900); if (!(await ev(`!!document.getElementById(${JSON.stringify(L.otp || L.href.slice(1))})`))) failed.push("in-page anchor missing " + L.href); else samePage++; continue; }
    if (!/^\//.test(L.href)) { failed.push("unexpected href " + L.href); continue; }
    const want = L.href.split("#")[0].split("?")[0];
    await load(1440, 900);
    const clicked = await ev(`(function(){var a=[].filter.call(document.querySelectorAll('#page-home a[href]'),function(x){return x.getAttribute('href')===${JSON.stringify(L.href)}})[0];if(!a)return false;a.click();return true})()`);
    await waitPath(want, 500);
    const at = await ev("location.pathname + location.hash");
    const target = L.href.split("#")[1];
    const anchorOk = target ? await ev(`!!document.getElementById(${JSON.stringify(target)})`) : true;
    if (!clicked || !at.startsWith(want) || !anchorOk) failed.push(`${L.href} -> ${at} (anchor ${anchorOk})`);
    driven++;
  }
  ok(failed.length === 0, `every remaining homepage link clicked in the served page: ${driven} distinct internal links landed on their pages and anchors, ${samePage} in-page anchors present, ${mailto} mail links checked ${failed.join(" ; ")}`);
}

console.log(fails.length ? "\nFAILED: " + fails.length : "\nALL PHASE 2 AND HOMEPAGE CLARITY CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
