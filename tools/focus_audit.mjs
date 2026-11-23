// Focus behaviour audit for the three scorecard flows (main Scorecard, Find Your Frictions, AI Scorecards). Usage: node tools/focus_audit.mjs [OUTDIR]
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase-frictions-package-shots"); fs.mkdirSync(OUT, { recursive: true });
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
const chrome = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => p && fs.existsSync(p));
const port = 9950 + Math.floor(Math.random() * 40);
const proc = spawn(chrome, ["--headless=new", "--remote-debugging-port=" + port, "--user-data-dir=" + fs.mkdtempSync(path.join(os.tmpdir(), "ffl-")), "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "about:blank"], { stdio: "ignore" });
const getJSON = (u, m = "GET") => new Promise((res, rej) => { const rq = http.request(u, { method: m }, (r) => { let b = ""; r.on("data", (d) => (b += d)); r.on("end", () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }); rq.on("error", rej); rq.end(); });
let tgt; for (let i = 0; i < 50; i++) { try { tgt = await getJSON("http://127.0.0.1:" + port + "/json/new?about:blank", "PUT"); break; } catch (e) { await sleep(200); } }
const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const cb = new Map(); const netAll = [], netBad = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && cb.has(d.id)) { const { res, rej } = cb.get(d.id); cb.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } else if (d.method === "Network.requestWillBeSent") { const rq = d.params.request, ty = d.params.type; netAll.push(rq.url); if (["Fetch", "XHR", "Ping", "WebSocket", "EventSource", "Preflight", "CSPViolationReport"].includes(ty) || rq.method !== "GET") netBad.push(ty + " " + rq.method + " " + rq.url.slice(0, 80)); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; cb.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result.value; };
await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
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

// ---------- focus behaviour audit (its own named step): main Scorecard, Find Your Frictions, AI Scorecards
// Rules audited (Scorecard Build-Out SOP, section 5, with Matthew's 2026-11-22 ruling): on a step change focus lands on the new question's heading and the change is announced;
// the visible outline on that focus target is the approved focus assist and STAYS; interactive controls keep a clear focus-visible ring;
// the only defect is an outline with no focus intent behind it (painting on a non-target element, or persisting after a mouse click or touch tap where no step change moved focus).
const OUTLINES = `(function(){var out=[];var act=document.activeElement;[].forEach.call(document.querySelectorAll('body *'),function(e){var r=e.getBoundingClientRect();if(r.width<1||r.height<1)return;var cs=getComputedStyle(e);if(cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>0&&cs.outlineColor!=='rgba(0, 0, 0, 0)'){out.push({tag:e.tagName,id:e.id||'',cls:String(e.className&&e.className.baseVal===undefined?e.className:'').slice(0,40),isActive:e===act,containsActive:e!==act&&e.contains(act)})}});return JSON.stringify({active:act?act.tagName+'#'+(act.id||'')+'.'+String(act.className||'').slice(0,30):'none',list:out})})()`;
const centre = (sel) => ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()`).then((v) => (v ? JSON.parse(v) : null));
async function mouseClick(sel) { const c = await centre(sel); if (!c) return false; await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x, y: c.y }); await send("Input.dispatchMouseEvent", { type: "mousePressed", x: c.x, y: c.y, button: "left", clickCount: 1 }); await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c.x, y: c.y, button: "left", clickCount: 1 }); await sleep(120); return true; }
const centreExpr = (expr) => ev(`(function(){var e=${expr};if(!e)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()`).then((v) => (v ? JSON.parse(v) : null));
async function mouseAt(c) { if (!c) return false; await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x, y: c.y }); await send("Input.dispatchMouseEvent", { type: "mousePressed", x: c.x, y: c.y, button: "left", clickCount: 1 }); await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c.x, y: c.y, button: "left", clickCount: 1 }); await sleep(140); return true; }
async function tapAt(c) { if (!c) return false; await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c.x, y: c.y }] }); await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(160); return true; }
async function tap(sel) { const c = await centre(sel); if (!c) return false; await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c.x, y: c.y }] }); await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(160); return true; }
const TAB = () => KEY("Tab", "Tab", 9);
const waitPath = async (p, extra = 600) => { for (let i = 0; i < 100; i++) { await sleep(100); try { if ((await ev("location.pathname + String.fromCharCode(124) + document.readyState")) === p + "|complete") break; } catch (e) {} } await sleep(extra); };
const gotoReal = async (url, p) => { await send("Page.navigate", { url: "about:blank" }); await sleep(120); await send("Page.navigate", { url: ORIGIN + url }); await waitPath(p); };
const scan = async () => JSON.parse(await ev(OUTLINES));
const label = (o) => o.tag + (o.id ? "#" + o.id : "") + (o.cls ? "." + o.cls.split(" ")[0] : "");

const FLOWS = [
  { name: "main Scorecard", url: "/scorecard/", path: "/scorecard/", box: "#scForm", opt: "#scStepHost input", next: "#scContinue", head: "#scStepHost legend, #scStepHost h2, #scStepHost h3", live: "#scProgressLabel", done: `!document.getElementById('scResult').hidden`, resHead: "scResHead", steps: 9 },
  { name: "Find Your Frictions", url: "/frictions/quiz/", path: "/frictions/quiz/", box: "#frForm", opt: "#frStepHost input", next: "#frNext", head: "#frStepHost legend, #frStepHost h2", live: "#frProgressLabel", done: `location.pathname==='/frictions/results/'`, resHead: "frResHead", steps: 16 },
  { name: "AI Scorecards 1.1", url: "/ai-scorecards/?sc=1.1", path: "/ai-scorecards/", box: "#aiScStepWrap", opt: "#aiScQBox input", next: "#aiScNextBtn", head: "#aiScQLegend", live: "#aiScProgText", done: `!document.getElementById('aiScResultWrap').hidden`, resHead: "aiScResHeading", steps: 7, knownNoLiveRegion: true },
];
const report = []; const findings = [];
for (const F of FLOWS) {
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await gotoReal(F.url, F.path);
  const R = { flow: F.name, steps: 0, headingFocus: 0, headingExpected: 0, announce: 0, announceExpected: 0, liveRegion: false, stray: [], noRing: [], ringChecked: 0, tapChecked: 0, clickChecked: 0, resultFocus: null, notes: [] };
  R.liveRegion = await ev(`(function(){var e=document.querySelector(${JSON.stringify(F.live)});return !!e&&(e.getAttribute('role')==='status'||/polite|assertive/.test(e.getAttribute('aria-live')||'')||!!e.closest('[aria-live]'))})()`);
  let prevLive = await ev(`document.querySelector(${JSON.stringify(F.live)}).textContent`);
  for (let i = 0; i < F.steps + 2; i++) {
    const hasOpt = await ev(`!!document.querySelector(${JSON.stringify(F.opt)})`);
    R.steps++;
    if (i > 0) {
      R.headingExpected++;
      if (await ev(`(function(){var a=document.activeElement;return !!a&&a.matches(${JSON.stringify(F.head)})})()`)) R.headingFocus++;
      R.announceExpected++;
      const cur = await ev(`document.querySelector(${JSON.stringify(F.live)}).textContent`);
      if (R.liveRegion && cur !== prevLive) R.announce++;
      prevLive = cur;
    }
    if (hasOpt) {
      // keyboard: Tab from the heading reaches a control and it shows a clear ring
      await TAB(); await sleep(60);
      const kb = await scan();
      R.ringChecked++;
      if (!kb.list.some((o) => o.isActive || o.containsActive)) R.noRing.push(`step ${i}: ${kb.active}`);
      // mouse click on an option: no outline may remain on a control the visitor only clicked
      if (i <= 2) {
        await ev("document.activeElement && document.activeElement.blur(); 1"); /* the keyboard check above left focus on the control; a visitor who then clicks starts from no focus */
        await mouseClick(F.opt); R.clickChecked++;
        const m = await scan();
        const bad = m.list.filter((o) => !(o.isActive && /^(LEGEND|H1|H2|H3)$/.test(o.tag)));
        if (bad.length) R.stray.push(`mouse click on an answer, step ${i}: outline on ${bad.map(label).join(", ")} (focus is on ${m.active})`);
        // touch tap on an option
        await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
        await ev("document.activeElement && document.activeElement.blur(); 1");
        await tap(F.opt); R.tapChecked++;
        const t = await scan();
        const badT = t.list.filter((o) => !(o.isActive && /^(LEGEND|H1|H2|H3)$/.test(o.tag)));
        if (badT.length) R.stray.push(`touch tap on an answer, step ${i}: outline on ${badT.map(label).join(", ")} (focus is on ${t.active})`);
        await send("Emulation.setTouchEmulationEnabled", { enabled: false });
        // the visible answer label (what a visitor really presses), by mouse and by touch
        const lab = `(function(){var i=document.querySelector(${JSON.stringify(F.opt)});return i?(i.closest('label')||i):null})()`;
        for (const how of ["mouse", "touch"]) {
          await ev("document.activeElement && document.activeElement.blur(); 1");
          if (how === "touch") await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
          const c = await centreExpr(lab);
          if (how === "mouse") await mouseAt(c); else await tapAt(c);
          if (how === "touch") await send("Emulation.setTouchEmulationEnabled", { enabled: false });
          const s = await scan();
          const bad = s.list.filter((o) => !(o.isActive && /^(LEGEND|H1|H2|H3)$/.test(o.tag)));
          R.labelPresses = (R.labelPresses || 0) + 1;
          if (bad.length) R.stray.push(`${how} press on the answer label, step ${i}: outline on ${bad.map(label).join(", ")} (focus is on ${s.active})`);
        }
      }
    } else {
      const k = await scan(); // an intro screen: the heading itself holds focus
      if (i > 0) { /* heading focus recorded above */ }
      void k;
    }
    // a click or tap on the question text itself (no step change): no stray outline either
    if (i === 1 && hasOpt) {
      await mouseClick(F.head.split(",")[0].trim());
      const q = await scan();
      const badQ = q.list.filter((o) => !(o.isActive && /^(LEGEND|H1|H2|H3)$/.test(o.tag)));
      if (badQ.length) R.stray.push(`click on the question text, step ${i}: outline on ${badQ.map(label).join(", ")}`);
      R.clickChecked++;
    }
    // make sure the step can move on (answer if required), then press the next control
    await ev(`(function(){var o=document.querySelector(${JSON.stringify(F.opt)});if(o&&!document.querySelector(${JSON.stringify(F.opt)}.replace(/ input$/,' input:checked'))){o.click()}return 1})()`);
    await ev(`document.querySelector(${JSON.stringify(F.next)}).click(); 1`); await sleep(160);
    if (await ev(F.done)) { await waitPath(F.name === "Find Your Frictions" ? "/frictions/results/" : F.path, 300); break; }
  }
  R.resultFocus = await ev(`document.activeElement && document.activeElement.id`);
  report.push(R);
  ok(R.headingFocus === R.headingExpected, `${F.name}: focus lands on the new question heading at every step change (${R.headingFocus} of ${R.headingExpected})`);
  ok(R.resultFocus === F.resHead, `${F.name}: on the result, focus lands on the result heading (${R.resultFocus})`);
  ok(R.noRing.length === 0, `${F.name}: keyboard focus shows a clear ring on a control at every step checked (${R.ringChecked} steps) ${R.noRing.join(" ; ")}`);
  ok(R.stray.length === 0, `${F.name}: no outline appears after a mouse click, a touch tap, or a click on the question text, where no step change moved focus (${R.clickChecked} clicks, ${R.tapChecked} taps) ${R.stray.join(" ; ")}`);
  if (F.knownNoLiveRegion && !R.liveRegion) {
    console.log(`FINDING (reported, not fixed in this package) ${F.name}: the progress text is not a live region, so a step change is carried only by focus moving to the new question legend (${R.announce} of ${R.announceExpected} announced through a live region)`);
    findings.push(F.name + ": no live region on the step progress text");
  } else ok(R.liveRegion && R.announce === R.announceExpected, `${F.name}: each step change is announced through a polite live region (${R.announce} of ${R.announceExpected}; live region present: ${R.liveRegion})`);
}
console.log("\nFOCUS AUDIT, flow by flow:");
for (const R of report) console.log(` - ${R.flow}: ${R.steps} screens driven; heading focus ${R.headingFocus}/${R.headingExpected}; announced ${R.announce}/${R.announceExpected} (live region ${R.liveRegion ? "yes" : "NO"}); keyboard rings checked ${R.ringChecked}, missing ${R.noRing.length}; mouse clicks ${R.clickChecked}, touch taps ${R.tapChecked}, label presses ${R.labelPresses || 0}, stray outlines ${R.stray.length}; result focus ${R.resultFocus}`);
console.log("FINDINGS reported, not fixed: " + (findings.length ? findings.join(" | ") : "none"));
console.log(fails.length ? "FAILED: " + fails.length : "ALL FOCUS AUDIT CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
