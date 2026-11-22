// Full homepage screenshots at four widths. Usage: node tools/home_full_shots.mjs OUTDIR
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

const OUTD = OUT;
const sizes = [["desktop-1440", 1440, 900, 0.35], ["tablet-landscape-1024", 1024, 768, 0.4], ["tablet-portrait-768", 768, 1024, 0.45], ["phone-390", 390, 844, 0.5]];
for (const [name, w, h, sc] of sizes) {
  await load(w, h);
  await ev(`(async function(){for(var y=0;y<document.documentElement.scrollHeight&&y<20000;y+=500){window.scrollTo(0,y);await new Promise(function(r){setTimeout(r,40)})}window.scrollTo(0,0)})()`); await sleep(600);
  const total = await ev(`document.documentElement.scrollHeight`);
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: Math.min(total, 16000), scale: sc } });
  fs.writeFileSync(path.join(OUTD, name + "-homepage-full.png"), Buffer.from(r.data, "base64"));
  console.log(name, total);
}
ws.close(); proc.kill(); srv.close(); process.exit(0);
