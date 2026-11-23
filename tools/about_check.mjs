// Phase 4.8: copy hygiene strings, Directory unpublished, Canon card, About rebuild. Usage: node tools/about_check.mjs OUTDIR
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase48-shots"); fs.mkdirSync(OUT, { recursive: true });
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
const RP = (id) => ORIGIN + (id === "home" ? "/" : "/" + id.replace(/^frictions-/, "frictions/") + "/");
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

const show = async (id) => { await goReal(RP(id), id === "home" ? "/" : "/" + id.replace(/^frictions-/, "frictions/") + "/"); await sleep(800); };
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
const ll = fs.readFileSync(path.join(ROOT, "llms.txt"), "utf8");
// ---------- static: banned strings, Directory, Canon, comments, GoHighLevel
for (const s of ["Funnel role", "For the buyer", "Take it upward", "Concept picture", "Concept illustration"]) ok(!html.includes(s) && !ll.includes(s), `"${s}" no longer appears anywhere in the page or llms.txt`);
const htmlNoBO = html.replace(/<section class="page" id="page-buildout-page"[\s\S]*?<\/section>/, "");
ok(!/page-directory|data-go="directory"|#directory|Specialist Directory|directory model/i.test(htmlNoBO) && /Specialist(&nbsp;| )Directory/.test(html), "Directory page unpublished: no section, link, title or script string remains outside the Developer Build Out page, where it lives as a concept entry");
ok(!/paid promotion|thousands of downloads/.test(html) && html.includes("For Canon USA, I have spent more than a decade teaching photographers on stage and on the page, reaching thousands of people."), "Canon card replaced word for word, paid promotion and downloads wording gone");
ok(!/<!--/.test(html) && !/\/\*/.test(html), "no HTML, CSS or JS block comments remain in the published file");
ok(!/GoHighLevel|webhook|TODO/i.test(html), "the GoHighLevel webhook TODO comment is gone and nothing connects to it");
ok(!/—|&mdash;/.test(html), "no em dash anywhere in the page");
ok(!fs.existsSync(path.join(ROOT, "docs")) && !fs.existsSync(path.join(ROOT, "buildout")) && !fs.existsSync(path.join(ROOT, "launch")) && !fs.existsSync(path.join(ROOT, "changes")), "no internal folders in the published repository");
ok((html.match(/<figcaption>Illustration[:.]/g) || []).length === 88 && !/Concept (picture|illustration)/.test(html), "88 captions now start with Illustration (colon or full stop kept) and no Concept caption or alt text remains: 92 were converted, 2 went with the unpublished Directory page, and 6 went with the four unpublished product pages in Phase 5 fix round 2, and 3 came back on the Developer Build Out page (CareCircle, Brain Blame, Specialist Directory)");
const about = html.slice(html.indexOf('id="page-about"'), html.indexOf("</section>", html.indexOf('id="page-about"')));
const order = ["Seen. Heard. Understood.", 'class="ab-matthew"', 'class="ab-cultcat"', 'id="about-team"', 'class="ab-stories"', 'id="about-mission"', 'id="about-faq"', 'id="about-contact"', 'class="ff-begin"'].map((k) => about.indexOf(k));
ok(order.every((p, i) => p >= 0 && (i === 0 || p > order[i - 1])), "About order: brand opening, Matthew, CultCat, team, Brand stories, mission, FAQ, contact, starting point line");
const team = about.slice(about.indexOf('id="about-team"'), about.indexOf('class="ab-stories"'));
ok((team.match(/class="ab-person"/g) || []).length === 3 && (team.match(/<img /g) || []).length === 3, "team section has exactly three people and three photographs");
ok(["Ioana Balcan", "Mircea Balcan", "Alina Ghervase"].every((n, i) => team.indexOf('alt="' + n + '"') >= 0 && (i === 0 || team.indexOf('alt="' + n + '"') > team.indexOf('alt="' + ["Ioana Balcan", "Mircea Balcan", "Alina Ghervase"][i - 1] + '"'))), "team order Ioana, Mircea, Alina, alt text is the person name");
ok(/Chief Brand Officer[\s\S]*Chief Information Officer[\s\S]*Chief Operations Officer/.test(team), "titles in order: Chief Brand Officer, Chief Information Officer, Chief Operations Officer");
ok(!/brandcatalyst|Headshots1/.test(html), "no brandcatalyst or Headshots1 image used");
ok(!/cultcat\.cc\/wp-content/.test(html), "no hotlinked CultCat images: all photographs and the logo are site assets");
for (const f of ["team-ioana-balcan.webp", "team-mircea-balcan.webp", "team-alina-ghervase.webp", "cultcat-cc-logo.svg", "matthew-cicanese.webp"]) ok(fs.existsSync(path.join(ROOT, "assets", f)), "asset exists: " + f);
const cc = about.slice(about.indexOf('class="ab-cultcat"'), about.indexOf('id="about-team"'));
ok(cc.includes("<h2 class=\"u12\">Built with CultCat</h2>") && cc.includes("The Fixing Friction brand and this site are built with CultCat, a branding agency founded in 2011 and rooted in a traditional Fine Arts education in Eastern Europe.") && cc.includes("Three of their people hold roles on the Fixing Friction team."), "CultCat block heading and body present word for word");

// ---------- Phase 4.9: one team presentation on the About page
ok((about.match(/src="assets\/team-[^"]+\.webp"/g) || []).length === 3, "About has exactly three team portraits (the zigzag headshots)");
ok(!/class="avatar"|team-card|team-grid|aria-hidden="true">[IMA]<\/div>/.test(html), "no initial-letter avatar cards, card grid or card styles remain anywhere in the page");
ok(!/<h3>(Ioana|Mircea|Alina)<\/h3>|leads the brand: how Fixing Friction looks|leads information and technology: the systems|leads operations: the day-to-day/.test(html), "no first-name-only team cards or older alternate bios remain");
ok((about.match(/<p class="eyebrow">Our team<\/p>/g) || []).length === 1 && (about.match(/The people behind the practice/g) || []).length === 1 && (about.match(/A small team, built peer to peer/g) || []).length === 1, "exactly one team heading (Our team / The people behind the practice) and one introduction line");
ok(about.indexOf('id="about-team"') < about.indexOf('class="ab-team"') && about.indexOf('class="ab-team"') - about.indexOf('id="about-team"') < 900, "the single team heading and introduction sit directly above the zigzag section");
ok(!/5f10a6bafa87/.test(about) && !/colleagues around a studio table/.test(html), "the four-person team-at-work illustration is gone from the About page");

// ---------- per width
for (const [name, w, h] of sizes) {
  await load(w, h);
  await show("about");
  await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<30000;y+=600){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,25)})}window.scrollTo(0,0)})()`); await sleep(500);
  const g = JSON.parse(await ev(`(function(){
    var q=function(s){return document.querySelector(s)};
    var rect=function(e){var r=e.getBoundingClientRect();return {l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),r:Math.round(r.right)}};
    var mt=q('#page-about .ab-matthew'), mp=q('#page-about .ab-matthew-photo img'), mx=q('#page-about .ab-matthew-text');
    var persons=[].map.call(document.querySelectorAll('#page-about .ab-person'),function(p){return {img:rect(p.querySelector('img')),txt:rect(p.querySelector('.ab-person-text')),row:rect(p),ok:p.querySelector('img').complete&&p.querySelector('img').naturalWidth>0}});
    var small=[].filter.call(document.querySelectorAll('#page-about .ab-mail'),function(a){return a.getBoundingClientRect().height<43.5}).length;
    var stories=q('#page-about .ab-stories'), team=q('#about-team'), cult=q('#page-about .ab-cultcat'), logo=q('#page-about .ab-cc-logo');
    return JSON.stringify({m:rect(mt),mp:rect(mp),mx:rect(mx),persons:persons,small:small,ov:document.documentElement.scrollWidth>innerWidth,storiesTop:rect(stories).t+scrollY,teamTop:rect(team).t+scrollY,logoW:rect(logo).w,mok:mp.complete&&mp.naturalWidth>0,lok:logo.complete&&logo.naturalWidth>0})})()`));
  ok(!g.ov, `${name}: About page has no sideways scroll`);
  ok(g.mok && g.lok && g.persons.every((p) => p.ok), `${name}: Matthew portrait, CultCat logo and the three portraits all load (m ${g.mok}, logo ${g.lok}, persons ${g.persons.map((p) => p.ok).join(",")})`);
  ok(g.small === 0, `${name}: the email link is at least 44px tall`);
  ok(g.logoW <= 80, `${name}: CultCat logo at modest size (${g.logoW}px)`);
  if (w > 900) {
    ok(Math.abs(g.mp.w / g.m.w - 0.4) < 0.03, `${name}: Matthew portrait is ${(100 * g.mp.w / g.m.w).toFixed(1)} percent of the section width`);
    ok(g.persons.every((p) => Math.abs(p.img.w / p.row.w - 0.4) < 0.03), `${name}: each team portrait is about 40 percent of its row (${g.persons.map((p) => (100 * p.img.w / p.row.w).toFixed(0)).join(", ")})`);
    ok(g.persons[0].img.l < g.persons[0].txt.l && g.persons[1].img.l > g.persons[1].txt.l && g.persons[2].img.l < g.persons[2].txt.l, `${name}: zigzag: portrait left, right, left`);
  } else {
    ok(g.mp.t < g.mx.t && g.persons.every((p) => p.img.t < p.txt.t && Math.abs(p.img.l - p.txt.l) < 4), `${name}: stacked, each portrait above its text in a single column`);
  }
  ok(g.storiesTop > g.teamTop, `${name}: Brand stories come after the team section`);
  const lw = await ev(`(${LINEFN})('#page-about .ab-matthew h2, #page-about .ab-matthew h3, #page-about .ab-cultcat h2, #page-about #about-team h2, #page-about .ab-person h3, #page-about .ab-stories h2, #page-about .ab-stories h3, #page-about h1')`);
  ok(lw === "[]", `${name}: About headings have no widow, lone first word or stranded preposition ${lw}`);
  // screenshots
  const shots = [
    ["about-1-brand-opening", `(function(){var e=document.querySelector('#page-about h1');var f=document.querySelector('#page-about .about-bleed');return [e.getBoundingClientRect().top+scrollY-120, f.getBoundingClientRect().bottom+scrollY+20]})()`],
    ["about-2-matthew", `(function(){var e=document.querySelector('#page-about .ab-matthew').getBoundingClientRect();return [e.top+scrollY-30, e.bottom+scrollY+30]})()`],
    ["about-3-cultcat", `(function(){var e=document.querySelector('#page-about .ab-cultcat').getBoundingClientRect();return [e.top+scrollY-30, e.bottom+scrollY+30]})()`],
    ["about-4-team-row-1-ioana", `(function(){var e=document.querySelectorAll('#page-about .ab-person')[0].getBoundingClientRect();return [e.top+scrollY-150, e.bottom+scrollY+30]})()`],
    ["about-4-team-row-2-mircea", `(function(){var e=document.querySelectorAll('#page-about .ab-person')[1].getBoundingClientRect();return [e.top+scrollY-30, e.bottom+scrollY+30]})()`],
    ["about-4-team-row-3-alina", `(function(){var e=document.querySelectorAll('#page-about .ab-person')[2].getBoundingClientRect();return [e.top+scrollY-30, e.bottom+scrollY+30]})()`],
    ["about-5-brand-stories", `(function(){var e=document.querySelector('#page-about .ab-stories').getBoundingClientRect();return [e.top+scrollY-30, Math.min(e.bottom+scrollY+30, e.top+scrollY+2600)]})()`],
  ];
  for (const [nm, fn] of shots) {
    const [y0, y1] = JSON.parse(await ev(`JSON.stringify(${fn})`));
    const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: Math.max(0, y0), width: w, height: Math.min(y1 - Math.max(0, y0), 3000), scale: 1 } });
    fs.writeFileSync(path.join(OUT, `${nm}-${name}.png`), Buffer.from(r.data, "base64"));
  }
  // Canon card on the homepage
  await show("home");
  await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<30000;y+=600){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,25)})}window.scrollTo(0,0)})()`); await sleep(400);
  const cr = JSON.parse(await ev(`(function(){var tags=[].filter.call(document.querySelectorAll('#page-home .card .tag'),function(e){return e.textContent.trim()==='Canon USA'});var c=tags[0].closest('.card').getBoundingClientRect();var t=tags[0].closest('.card').querySelector('p').textContent;return JSON.stringify({top:c.top+scrollY,h:c.height,txt:t})})()`));
  ok(cr.txt === "For Canon USA, I have spent more than a decade teaching photographers on stage and on the page, reaching thousands of people.", `${name}: Canon card text exact`);
  const r2 = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: Math.max(0, cr.top - 140), width: w, height: Math.min(cr.h + 240, 2600), scale: 1 } });
  fs.writeFileSync(path.join(OUT, `canon-card-${name}.png`), Buffer.from(r2.data, "base64"));
}
const H1LINES = `(function(){
  var h=document.querySelector('#page-about h1'), NB=String.fromCharCode(160);
  var r=document.createRange(), w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT), n, lines={};
  while((n=w.nextNode())){ for(var i=0;i<n.length;i++){ r.setStart(n,i); r.setEnd(n,i+1); var b=r.getBoundingClientRect(); if(!b.width) continue; var y=Math.round(b.top/6); (lines[y]=lines[y]||[]).push(n.data[i]); } }
  var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b;});
  return JSON.stringify({lines:ys.map(function(y){return lines[y].join('').replace(new RegExp(NB,'g'),' ').trim()}), fs:getComputedStyle(h).fontSize, text:h.textContent.replace(new RegExp(NB,'g'),' ').replace(/\\s+/g,' ').trim(), ov:document.documentElement.scrollWidth>innerWidth});
})()`;
for (const w of [390, 360]) {
  await load(w, 800); await show("about");
  const r = JSON.parse(await ev(H1LINES));
  ok(r.text === "Seen. Heard. Understood. Connected to the access they have a right to.", `phone ${w}: About h1 wording unchanged`);
  ok(JSON.stringify(r.lines) === JSON.stringify(["Seen. Heard. Understood.", "Connected to the access", "they have a right to."]), `phone ${w}: About h1 breaks into three lines with no widow or stranded preposition (${r.lines.join(" | ")}, ${r.fs})`);
  ok(!r.ov, `phone ${w}: no sideways scroll`);
  const hy = JSON.parse(await ev(`(function(){var e=document.querySelector('#page-about h1').getBoundingClientRect();return JSON.stringify([e.top+scrollY-60,e.bottom+scrollY+160])})()`));
  const sr = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: Math.max(0, hy[0]), width: w, height: hy[1] - Math.max(0, hy[0]), scale: 1 } });
  fs.writeFileSync(path.join(OUT, `about-h1-phone-${w}.png`), Buffer.from(sr.data, "base64"));
}
await load(1440, 900); await show("about");
{
  const r = JSON.parse(await ev(H1LINES));
  ok(JSON.stringify(r.lines) === JSON.stringify(["Seen. Heard. Understood.", "Connected to the access", "they have a right to."]) && r.fs === "46.4px", `desktop 1440: About h1 renders exactly as before the fix, three lines at 46.4px (${r.lines.join(" | ")}, ${r.fs})`);
}
await load(1440, 900);
await send("Page.navigate", { url: "about:blank" }); await sleep(200); await send("Page.navigate", { url: base + "?d#directory" }); await sleep(1500);
ok(await ev(`(function(){var a=document.querySelector('section.page.active');return !!a&&a.id==='page-home'&&!document.getElementById('page-directory')})()`), "the old #directory address no longer opens a Directory page (the page does not exist; the site falls back to the homepage)");
console.log(fails.length ? "FAILED: " + fails.length : "ALL PHASE 4.8 CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
