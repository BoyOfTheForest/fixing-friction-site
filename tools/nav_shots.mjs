// Phase 1 nav and footer verification: screenshots at desktop, tablet both orientations, phone,
// plus behaviour tests (click, keyboard, Escape, target size, widows, overflow). Usage: node tools/nav_shots.mjs OUTDIR
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase1-shots"); fs.mkdirSync(OUT, { recursive: true });
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
const port = 9800 + Math.floor(Math.random() * 100);
const proc = spawn(chrome, ["--headless=new", "--remote-debugging-port=" + port, "--user-data-dir=" + fs.mkdtempSync(path.join(os.tmpdir(), "ffn-")), "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "about:blank"], { stdio: "ignore" });
const getJSON = (u, m = "GET") => new Promise((res, rej) => { const rq = http.request(u, { method: m }, (r) => { let b = ""; r.on("data", (d) => (b += d)); r.on("end", () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }); rq.on("error", rej); rq.end(); });
let tgt; for (let i = 0; i < 50; i++) { try { tgt = await getJSON("http://127.0.0.1:" + port + "/json/new?about:blank", "PUT"); break; } catch (e) { await sleep(200); } }
const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const cb = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && cb.has(d.id)) { const { res, rej } = cb.get(d.id); cb.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; cb.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result.value; };
await send("Page.enable"); await send("Runtime.enable");
const key = async (k, code, vk) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, ...(k === "Enter" ? { text: String.fromCharCode(13) } : {}) }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }); };
const load = async (w, h, hash = "home") => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await send("Page.navigate", { url: RP(hash) }); await sleep(1500); };
const shot = async (name, clip, plain) => { const r = await send("Page.captureScreenshot", plain ? { format: "png" } : { format: "png", captureBeyondViewport: true, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }); fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(r.data, "base64")); };
const fails = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };

const WIDOW = `(function(){
  var bad=[];
  document.querySelectorAll('.sitemap h3').forEach(function(h){
    var r=document.createRange(), w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT), n, lines={};
    while((n=w.nextNode())){ for(var i=0;i<n.length;i++){ r.setStart(n,i); r.setEnd(n,i+1); var b=r.getBoundingClientRect(); if(!b.width) continue; var y=Math.round(b.top); (lines[y]=lines[y]||[]).push(n.data[i]); } }
    var ys=Object.keys(lines).map(Number).sort(function(a,b){return a-b;});
    if(ys.length<2) return;
    var last=lines[ys[ys.length-1]].join('').trim();
    if(last.indexOf(' ')<0 && last.indexOf(String.fromCharCode(160))<0) bad.push(h.textContent+' => last line: '+last);
    var first=lines[ys[0]].join('').trim();
    if(first.indexOf(' ')<0 && first.indexOf(String.fromCharCode(160))<0) bad.push(h.textContent+' => first line: '+first);
  });
  return JSON.stringify(bad);
})()`;

const sizes = [["desktop-1280", 1280, 800], ["desktop-1440", 1440, 900], ["tablet-portrait-768", 768, 1024], ["phone-390", 390, 844]];
for (const [name, w, h] of sizes) {
  await load(w, h);
  const desk = w >= 1280;
  const s = JSON.parse(await ev(`(function(){var n=document.querySelector('nav.pages');return JSON.stringify({navShown:getComputedStyle(n).display!=='none',menubtn:getComputedStyle(document.getElementById('menubtn')).display!=='none',overflow:document.documentElement.scrollWidth>innerWidth})})()`));
  ok(s.navShown === desk && s.menubtn === !desk, `${name}: ${desk ? "desktop row" : "mobile menu"} shown`);
  ok(!s.overflow, `${name}: no sideways scroll`);
  if (desk) {
    await ev(`document.querySelector('[data-nav-group=ada]').click()`); await sleep(200);
    await shot(name + "-nav-ada-open", { x: 0, y: 0, width: w, height: 520 });
    await key("Escape", "Escape", 27); await sleep(500);
    ok(await ev(`!document.querySelector('.nav-drop.open')`), `${name}: Escape closes dropdown`);
    await ev(`document.querySelector('[data-nav-group=outs]').click()`); await sleep(200);
    await shot(name + "-nav-outs-open", { x: 0, y: 0, width: w, height: 420 });
    await key("Escape", "Escape", 27);
  } else {
    await ev(`document.getElementById('menubtn').click()`); await sleep(300);
    await shot(name + "-menu-open-top", null, true);
    await ev(`document.getElementById('menupanel').scrollTop=99999`); await sleep(200);
    await shot(name + "-menu-open-bottom", null, true);
    const mt = await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#menupanel a'),function(a){return a.getBoundingClientRect().height<43.5}).map(function(a){return a.textContent.trim()}))`);
    ok(mt === "[]", `${name}: every mobile menu link >= 44px tall ${mt}`);
    ok(await ev(`document.querySelectorAll('#menupanel .menu-group, #menupanel .menu-label, #menupanel .menu-sublabel').length===0`), `${name}: no group labels in the mobile menu`);
    const gp = JSON.parse(await ev(`(function(){var L=[].slice.call(document.querySelectorAll('#menupanel a.sub'));var out=[];for(var i=1;i<L.length;i++){var a=L[i-1].getBoundingClientRect(),b=L[i].getBoundingClientRect();var sa=L[i-1].closest('.menu-set'),sb=L[i].closest('.menu-set');out.push([Math.round(b.top-a.bottom), sa===sb?'in':'between']);}return JSON.stringify(out)})()`));
    const inMax = Math.max(...gp.filter((g) => g[1] === 'in').map((g) => g[0])), btwMin = Math.min(...gp.filter((g) => g[1] === 'between').map((g) => g[0]));
    ok(btwMin > inMax, `${name}: mobile menu gaps between groups (min ${btwMin}px) wider than inside a group (max ${inMax}px)`);
    const sets = await ev(`JSON.stringify([].map.call(document.querySelectorAll('#menupanel .menu-set'),function(s){return Math.round(s.getBoundingClientRect().top)}))`);
    console.log('mobile set tops:', sets);
    await ev(`document.getElementById('menubtn').click()`);
  }
  await ev(`document.querySelector('footer.site').scrollIntoView()`); await sleep(300);
  const fb = JSON.parse(await ev(`(function(){var f=document.querySelector('footer.site').getBoundingClientRect();return JSON.stringify({top:f.top+scrollY,h:f.height,bg:getComputedStyle(document.querySelector('footer.site')).backgroundColor,cols:getComputedStyle(document.querySelector('.sitemap')).gridTemplateColumns.split(' ').length})})()`));
  await shot(name + "-footer", { x: 0, y: fb.top, width: w, height: fb.h });
  ok(fb.bg === "rgb(255, 255, 255)", `${name}: footer background pure white (${fb.bg})`);
  const wantCols = w >= 1280 ? 6 : w >= 600 ? 2 : 1;
  ok(fb.cols === wantCols, `${name}: footer has ${fb.cols} columns per row (want ${wantCols})`);
  const small = await ev(`JSON.stringify([].filter.call(document.querySelectorAll('.sitemap a'),function(a){return a.getBoundingClientRect().height<43.5}).map(function(a){return a.textContent.trim()}))`);
  ok(small === "[]", `${name}: every footer link >= 44px tall ${small}`);
  ok(await ev(`!document.querySelector('.foot-cta') && !document.querySelector('footer.site a[href*=buildout]:not([href="/buildout-page/"])') && document.querySelectorAll('footer.site a[href="/buildout-page/"]').length===1 && !document.querySelector('footer.site nav.sitemap a[href="/buildout-page/"]') && document.querySelector('footer.site a[href="/buildout-page/"]').getBoundingClientRect().height>=43.5 && !document.querySelector('footer.site a[href*=launch]') && !document.querySelector('footer.site a[href*=changes]')`), `${name}: no dev links and no Not-sure line in the footer (the one Developer Build Out link sits in the bottom bar, not in the columns, and is 44 px tall)`);
  ok(await ev(`document.querySelectorAll('.sitemap > div').length===6 && document.querySelector('footer.site .foot-bar').previousElementSibling.classList.contains('sitemap')`), `${name}: footer is the six columns then the bottom bar`);
  const wid = await ev(WIDOW);
  ok(wid === "[]", `${name}: no widow word in footer headings ${wid}`);
}

// 1024 probe: force the desktop row at tablet landscape and measure whether it fits cleanly
await load(1024, 768);
await ev(`(function(){var s=document.createElement('style');s.id='probe';s.textContent='nav.pages{display:flex!important}.menubtn{display:none!important}';document.head.appendChild(s)})()`); await sleep(300);
const pr = JSON.parse(await ev(`(function(){var h=document.querySelector('.head-in');var n=document.querySelector('nav.pages');var hs=[].map.call(n.querySelectorAll('.drop-btn,a.cta'),function(e){return Math.round(e.getBoundingClientRect().height)});var tw=[].map.call(n.querySelectorAll('.drop-btn,a.cta'),function(e){return Math.round(e.getBoundingClientRect().width)});return JSON.stringify({scroll:h.scrollWidth,client:h.clientWidth,navR:Math.round(n.getBoundingClientRect().right),vw:innerWidth,heights:hs,widths:tw})})()`));
console.log('PROBE 1024 forced desktop row:', JSON.stringify(pr));
await shot('tablet-landscape-1024-forced-desktop-row-probe', null, true);
await ev(`document.getElementById('probe').remove()`); await sleep(200);
console.log('1024 real build shows:', await ev(`getComputedStyle(document.querySelector('nav.pages')).display==='none'?'mobile menu':'desktop row'`));
await shot('tablet-landscape-1024-actual', null, true);
await load(1440, 900);
const btns = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('nav.pages .drop-btn'),function(b){return {t:b.textContent.trim(),h:b.getBoundingClientRect().height}}))`));
ok(btns.length === 6 && btns.every((b) => b.h >= 44), "desktop: six top items, each >= 44px tall");
ok(JSON.stringify(btns.map((b) => b.t.replace(/\s*\u25be$/, ""))) === JSON.stringify(["The Three Outs", "For Leaders", "For Everyday Workers", "Speaking and Training", "ADA Compliance and Consulting", "About"]), "desktop: item labels and order exact");
const g = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('nav.pages > *'),function(e){var r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.right)]}))`));
const gaps = g.slice(1).map((r, i) => r[0] - g[i][1]);
console.log("gaps between items (1|2 3|4 5|6|CTA):", gaps.join(", "));
ok(gaps[0] > gaps[1] && gaps[2] > gaps[1] && gaps[2] > gaps[3] && gaps[4] > gaps[3] && gaps[4] > gaps[3], "desktop: wider gaps between groups than inside groups");
await ev(`document.querySelector('[data-nav-group=ada]').click()`); await sleep(200);
const dm = JSON.parse(await ev(`(function(){var m=document.getElementById('dm-ada');var mr=m.getBoundingClientRect();var it=[].map.call(m.querySelectorAll('a'),function(a){var r=a.getBoundingClientRect();return {h:r.height,w:r.width}});return JSON.stringify({open:getComputedStyle(m).display!=='none',exp:document.querySelector('[data-nav-group=ada]').getAttribute('aria-expanded'),it:it,mw:mr.width})})()`));
ok(dm.open && dm.exp === "true", "click opens dropdown and sets aria-expanded=true");
ok(dm.it.every((i) => i.h >= 44 && i.w > dm.mw * 0.85), "dropdown items are >= 44px and full-width rows");
await ev(`document.querySelector('[data-nav-group=ada]').click()`); await sleep(200);
ok(await ev(`!document.querySelector('.nav-drop.open')`), "second click closes dropdown");
await ev(`document.querySelector('[data-nav-group=leaders]').focus()`);
await key("Enter", "Enter", 13); await sleep(200);
ok(await ev(`!!document.querySelector('.nav-drop.open')`), "keyboard Enter opens dropdown");
await key("Tab", "Tab", 9); await sleep(100);
ok(await ev(`!!document.activeElement.closest('.drop-menu')`), "Tab moves focus into the open dropdown items");
ok(await ev(`(function(){var cs=getComputedStyle(document.activeElement);return cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>=2})()`), "focused dropdown item shows a visible outline");
await key("Escape", "Escape", 27); await sleep(300);
ok(await ev(`!document.querySelector('.nav-drop.open') && document.activeElement.getAttribute('data-nav-group')==='leaders'`), "Escape closes and returns focus to the trigger");
await ev(`document.querySelector('[data-nav-group=about]').closest('.nav-drop').dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}))`); await sleep(200);
ok(await ev(`!document.querySelector('.nav-drop.open')`), "hover alone does not open a dropdown");
await goReal(RP("audits"), "/audits/"); await sleep(500);
ok(await ev(`document.querySelector('[data-nav-group=ada]').getAttribute('aria-current')==='page'`), "current section marked (aria-current) on ADA group at #audits");
await goReal(RP("speaking"), "/speaking/"); await sleep(500);
ok(await ev(`document.querySelectorAll('nav.pages [aria-current]').length===1 && document.querySelector('[data-nav-group=speaking]').getAttribute('aria-current')==='page'`), 'moving to another section clears the previous current mark (exactly one marked)');
await goReal(RP("audits"), "/audits/"); await sleep(500);
await shot("desktop-1440-current-marker", { x: 0, y: 0, width: 1440, height: 140 });
const cta = JSON.parse(await ev(`(function(){var a=document.querySelector('nav.pages a.cta');return JSON.stringify({h:a.getBoundingClientRect().height,others:[].map.call(document.querySelectorAll('nav.pages .drop-btn'),function(b){return getComputedStyle(b).backgroundColor+'|'+getComputedStyle(b).fontWeight})})})()`));
ok(cta.h >= 44 && cta.others.every((o) => o === "rgb(255, 255, 255)|600"), "only the CTA is filled; nav text items are white and not bolded (" + cta.others[0] + ")");
const html = fs.readFileSync(path.join(ROOT, "src", "site.html"), "utf8");
const navFoot = ((html.match(/<header class="site">[\s\S]*?<\/header>/) || [""])[0]) + ((html.match(/<footer class="site">[\s\S]*?<\/footer>/) || [""])[0]);
for (const w of ["For Individuals", "ADA Consulting and Compliance", "Creative Consulting", "\u2014"]) ok(!navFoot.includes(w), `nav and footer do not contain "${w === "\u2014" ? "em dash" : w}"`);
ok(!/>\s*Consulting\s*</.test(navFoot), "no standalone Consulting item in nav or footer");
console.log(fails.length ? "\nFAILED: " + fails.length : "\nALL PHASE 1 CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
