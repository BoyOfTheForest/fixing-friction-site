// Navigation link integrity check: every header, dropdown, mobile and footer link clicked from three starting pages; landed URL and anchor asserted; workers pairing and hub shelf asserted.
// Usage: node tools/nav_links_check.mjs [OUTDIR]   (INVENTORY=file.json writes the click inventory)
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase-nav-shots"); fs.mkdirSync(OUT, { recursive: true });
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
const waitPath = async (p, extra = 600) => { for (let i = 0; i < 60; i++) { await sleep(100); try { if ((await ev("location.pathname + String.fromCharCode(124) + document.readyState")) === p + "|complete") break; } catch (e) {} } await sleep(extra); };
const WRITE = process.env.INVENTORY || "";
// ---------- Navigation link integrity: every header, dropdown, mobile menu and footer link, clicked from several starting pages
const mouse = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
const rectOf = (expr) => ev(`(function(){var e=${expr};if(!e)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height})})()`);
const fresh = async (start, w, h) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }); await send("Page.navigate", { url: ORIGIN + start }); await waitPath(start, 500); };
const routeOf = (go) => (go === "home" ? "/" : "/" + go.replace(/^frictions-/, "frictions/") + "/");
const surfaces = {
  desktop: { sel: "nav.pages a[data-go]", w: 1440, h: 900 },
  mobile: { sel: "#menupanel a[data-go], #menupanel a[href^=mailto]", w: 390, h: 844 },
  footer: { sel: "footer.site nav.sitemap a", w: 1440, h: 900 },
};
const starts = [["/", "homepage", ["desktop", "mobile", "footer"]], ["/audits/", "services-layer page", ["desktop", "footer"]], ["/about/", "interior page", ["desktop", "footer"]]];
const inventory = []; let n = 0;
for (const [start, startName, surfs] of starts) {
  for (const sname of surfs) {
    const S = surfaces[sname];
    await fresh(start, S.w, S.h);
    const links = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll(${JSON.stringify(S.sel)}),function(a,i){var g=a.closest('.nav-drop,.menu-set,footer nav div');var gh=g&&((g.querySelector('.drop-btn,h3')||{}).textContent||g.getAttribute('aria-label'));return {i:i,label:(a.querySelector('.di-t')||a).textContent.replace(/\\s+/g,' ').replace(/^\\s+|\\s+$/g,'').replace(/:\\s*$/,''),href:a.getAttribute('href'),go:a.getAttribute('data-go'),jump:a.getAttribute('data-jump'),cta:/cta/.test(a.className),group:(gh||'').replace(/[^\\w ]/g,' ').replace(/\\s+/g,' ').trim()}}))`));
    ok(links.length >= 24, `${startName} ${sname}: ${links.length} links found`);
    for (const L of links) {
      n++;
      if (/^mailto:/.test(L.href || "")) { inventory.push({ start, sname, ...L, landed: L.href, verdict: "correct", note: "mail link, not clicked" }); continue; }
      await fresh(start, S.w, S.h);
      if (sname === "mobile") { const m = JSON.parse(await rectOf("document.getElementById('menubtn')")); await mouse(m.x, m.y); await sleep(350); }
      if (sname === "desktop" && L.group) { const b = await rectOf(`[].filter.call(document.querySelectorAll('nav.pages .drop-btn'),function(b){return b.textContent.replace(/[^\\w ]/g,' ').replace(/\\s+/g,' ').trim()===${JSON.stringify(L.group)}})[0]`); if (b) { const m = JSON.parse(b); await mouse(m.x, m.y); await sleep(350); } }
      const r = await rectOf(`document.querySelectorAll(${JSON.stringify(S.sel)})[${L.i}]`);
      const m = JSON.parse(r); await mouse(m.x, m.y);
      const wantPath = routeOf(L.go);
      await waitPath(wantPath, 1500);
      const at = await ev("location.pathname + location.hash");
      const target = L.jump || "";
      const probe = JSON.parse(await ev(`(function(){var id=${JSON.stringify(target)};var e=id&&document.getElementById(id);var r=e&&e.getBoundingClientRect();return JSON.stringify({exists:!!e,top:r?Math.round(r.top):null,h:r?Math.round(r.height):null,vh:innerHeight,y:Math.round(scrollY)})})()`));
      const pathOk = at.split("#")[0] === wantPath;
      let verdict = "correct", note = "";
      if (!pathOk) { verdict = "wrong destination"; note = "landed " + at; }
      else if (target) {
        if (!probe.exists) { verdict = "dead jump"; note = "anchor #" + target + " does not exist on the page"; }
        else if (!(probe.top >= -4 && probe.top < probe.vh * 0.7)) { verdict = "dead jump"; note = `anchor #${target} exists but top=${probe.top} of ${probe.vh} (not reached)`; }
        else note = `anchor #${target} reached (top ${probe.top}px)`;
      } else if (probe.y > 40) { verdict = "dead jump"; note = "page opened scrolled " + probe.y + "px"; }
      inventory.push({ start, sname, ...L, landed: at, verdict, note });
    }
  }
}
const bad = inventory.filter((x) => x.verdict !== "correct");
for (const b of bad) ok(false, `${b.start} ${b.sname} "${b.label}" (${b.href}) ${b.verdict}: ${b.note}`);
ok(bad.length === 0, `every navigation, dropdown, mobile and footer link clicked from 3 starting pages: ${inventory.length} clicks, ${inventory.length - bad.length} landed where the label says, anchors reached`);
ok(inventory.filter((x) => /^stage-/.test(x.jump || "")).every((x) => /top (\d+)px/.test(x.note) && +x.note.match(/top (\d+)px/)[1] >= 50), "Three Outs stages land below the sticky header, not under it");
if (WRITE) fs.writeFileSync(WRITE, JSON.stringify(inventory, null, 1));
// ---------- Pairing and hub assertions (source of the served pages)
const byKey = (sn, grp) => inventory.filter((x) => x.start === "/" && x.sname === sn && x.group.replace(/\s+/g, " ") === grp);
for (const sn of ["desktop", "mobile", "footer"]) {
  const g = byKey(sn, sn === "footer" ? "For Everyday Workers" : "For Everyday Workers").map((x) => x.label + "|" + x.go);
  ok(g.length === 5 && g[0] === "Inside Fixing Friction|inside" && g[3] === "Find Your Frictions|frictions" && g[4] === "Take the Scorecard|scorecards", `${sn}: For Everyday Workers carries Find Your Frictions first, then Take the Scorecard (${g.join(" / ")})`);
}
for (const sn of ["desktop", "mobile", "footer"]) {
  const g = byKey(sn, "The Three Outs").map((x) => x.label + "|" + x.go + "|" + x.jump);
  ok(g.slice(0, 3).join(",") === "Burn Out|home|stage-burn-out,Turn Out|home|stage-turn-out,Churn Out|home|stage-churn-out", `${sn}: Burn Out, Turn Out and Churn Out jump to their own stage on the homepage`);
}
{
  const cta = inventory.filter((x) => x.start === "/" && x.sname === "desktop" && x.cta);
  ok(cta.length === 1 && cta[0].label === "Take the Scorecard" && cta[0].go === "scorecards", "header CTA unchanged: the single filled Take the Scorecard button to the Scorecards page");
  const L = (sn) => byKey(sn, "For Leaders").map((x) => x.label + "|" + x.go).join(" / ");
  ok(L("desktop") === "Speaking and training for teams|training / Start with a pilot session|start / Client stories|evidence / Book Matthew to speak|speaking", "For Leaders dropdown unchanged");
}
{
  await goReal(ORIGIN + "/scorecards/", "/scorecards/"); await sleep(1000);
  const hub = JSON.parse(await ev(`JSON.stringify({fyf:[].filter.call(document.querySelectorAll('#page-scorecards a[data-go=frictions]'),function(a){return /Find Your Frictions/.test(a.textContent)}).length,main:[].filter.call(document.querySelectorAll('#page-scorecards a[data-go=scorecard]'),function(a){return /Take the Scorecard/.test(a.textContent)}).length,ai:document.querySelectorAll('#page-scorecards a[data-go=ai-scorecards]').length,h:[].map.call(document.querySelectorAll('#page-scorecards h1,#page-scorecards h2,#page-scorecards h3'),function(h){return h.textContent.trim()})})`));
  ok(hub.main >= 1 && hub.fyf >= 1 && hub.ai >= 1, `Scorecards hub shelves the main Scorecard (${hub.main}), Find Your Frictions (${hub.fyf}) and the AI Scorecards (${hub.ai})`);
  const r2 = await rectOf(`[].filter.call(document.querySelectorAll('#page-scorecards a[data-go=frictions]'),function(a){return /Find Your Frictions/.test(a.textContent)})[0]`);
  if (r2) { const m = JSON.parse(r2); await mouse(m.x, m.y); await waitPath("/frictions/", 800); ok((await ev("location.pathname")) === "/frictions/", "the hub's Find Your Frictions card opens Find Your Frictions"); }
}
console.log(fails.length ? "\nFAILED: " + fails.length : "\nALL NAV LINK CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
