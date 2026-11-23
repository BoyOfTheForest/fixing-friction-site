// Find Your Frictions: phase 5.5 flow checks plus the scorecard package (landing, quiz area, results page, Return Path, privacy boundary, keyboard run). Usage: node tools/frictions_check.mjs OUTDIR
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
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find((p) => fs.existsSync(p));
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
const html = fs.readFileSync(path.join(ROOT, "src", "site.html"), "utf8").replace(/\r\n/g, "\n");
const NBS = / |&nbsp;/g;
const cap = async (name, clip) => { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...clip, scale: 1 } }); fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(r.data, "base64")); };
const rectOf = (sel) => ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;var r=e.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height}})()`);
const strip = (x) => x.replace(/<[^>]+>/g, " ").replace(NBS, " ").replace(/\s+/g, " ").trim();

// ---------- static
const a0 = html.indexOf('<section class="page" id="page-frictions"');
ok(a0 > 0, "the Find Your Frictions page exists (route #frictions)");
const sec = html.slice(a0, html.indexOf("</section>", a0));
const a1 = html.indexOf('<section class="page" id="page-frictions-results"'); const secAll = html.slice(a0, html.indexOf("</section>", a1) + 10);
const pagesList = ((html.match(/var pages = \[([^\]]*)\]/) || [])[1] || "").match(/"([^"]+)"/g).map((s) => s.slice(1, -1));
ok(pagesList.includes("frictions"), "#frictions is in the page list");
const s0 = html.indexOf("var FR_FREQ"); const s1 = html.indexOf("</script>", s0);
const code = html.slice(s0, s1);
ok(s0 > 0, "the page script is present");
ok(!/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon|gtag|dataLayer|mailto:|WebSocket|navigator\.clipboard/.test(code), "script has no storage, cookie, network, analytics, email or clipboard call");
ok(/inp\.type = "radio"/.test(code) && !/type = "(text|email|tel|password)"|<textarea|createElement\("textarea"\)/.test(code) && !/<input[^>]*type="(text|email|tel|password)"|<textarea/.test(secAll), "the only inputs are radio buttons: no text, email or account field");
const areasSrc = code.slice(code.indexOf("var FR_AREAS"), code.indexOf("var frForm"));
const qTexts = [...areasSrc.matchAll(/\{ t: "([^"]*)"/g)].map((m) => m[1]);
ok(qTexts.length === 13, "13 drafted questions in three areas (" + qTexts.length + ")");
const perArea = [...areasSrc.matchAll(/qs: \[([\s\S]*?)\n          \] \}/g)].map((m) => (m[1].match(/\{ t: /g) || []).length);
ok(perArea.length === 3 && perArea.every((n) => n >= 3 && n <= 5), "each of the three areas has three to five questions: " + perArea.join(", "));
ok(!/diagnos|disabilit|condition|medical|health|therap|medicat|disorder|ADHD|autis|depress|anxiet|illness|symptom|neurodiver|chronic|impair/i.test(qTexts.join(" ")), "no question asks for a diagnosis, a condition, a disability status or medical detail");
ok(/partner/.test(qTexts.join(" ")) && /parent, parent figure, or older relative/.test(qTexts.join(" ")) && /children/.test(qTexts.join(" ")), "the relational area covers a partner, a parent or older relative, and kids");
ok(/label: "Personal"/.test(areasSrc) && /label: "Relational"/.test(areasSrc) && /label: "Professional"/.test(areasSrc) && !/PERP|PeRP|wheel|framework/i.test(secAll + code), "three life areas, never named or presented as a framework");
ok(sec.includes("Your own growth counts as much as your job or your family."), "personal development stands equal to the other two in the framing");
ok(!/—|&mdash;/.test(secAll + code) && !/\$\d/.test(sec + code), "no em dash and no price on the page");
const resources = [...areasSrc.matchAll(/\["([^"]+)", "([a-z-]+)"\]/g)].map((m) => m[2]);
ok(resources.length === 9 && resources.every((g) => pagesList.includes(g)), "every first resource points to an existing page: " + [...new Set(resources)].join(", "));
ok(strip(secAll).replace(/ ,/g, ",").includes("Inside Fixing Friction leads to the Fixing Friction Community, a paid group coaching program for Divergent Doers."), "the Community is named as the program the route leads to, in the approved description");
ok(!/paid community|\$|per seat|cohort size|launch date/i.test(strip(secAll)), "no price, launch date, cohort size or bare 'paid community' on the page");
const hf = html.slice(html.indexOf("<header"), html.indexOf("</header>")) + html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
ok(!/#frictions|data-go="frictions"/.test(hf), "not in navigation or footer");
const homeSec = html.slice(html.indexOf('id="page-home"'), html.indexOf('id="page-home"') + 60000);
const insideSec = html.slice(html.indexOf('id="page-inside"'), html.indexOf("</section>", html.indexOf('id="page-inside"')));
const toolsSec = html.slice(html.indexOf('id="page-tools"'), html.indexOf("</section>", html.indexOf('id="page-tools"')));
ok((homeSec.match(/data-go="frictions"/g) || []).length === 1 && /class="btn primary u02" data-go="frictions">Find Your Frictions/.test(homeSec) && homeSec.indexOf('data-go="frictions"') > homeSec.indexOf("For Everyday Workers &amp; Families"), "the homepage For Everyday Workers door carries it as the primary button");
ok((insideSec.match(/data-go="frictions"/g) || []).length === 1, "the Inside page links to it once");
ok((toolsSec.match(/data-go="frictions"/g) || []).length === 1, "the Tools page links to it once");
ok((html.match(/data-go="frictions"/g) || []).length === 3, "exactly three links to the page in the source (home door, Inside, Tools)");

// ---------- F3: built area sentences equal the approved lines, with no level word repeated at the start
{
  const APPROVED = {
    personal: { heavy: "Your own time, energy and growth are carrying a lot of friction.", some: "A few things about your own days could be easier.", light: "Less friction is showing up here at the moment." },
    relational: { heavy: "Looking after the people you care for is carrying a lot of friction.", some: "A few things about caring for others could be easier.", light: "Less friction is showing up here at the moment." },
    professional: { heavy: "Your job is carrying a lot of friction.", some: "A few things about your job could be easier.", light: "Less friction is showing up here at the moment." }
  };
  const built = {};
  for (const m of areasSrc.matchAll(/id: "(\w+)"[\s\S]*?lines: \{ heavy: "([^"]*)", some: "([^"]*)", light: "([^"]*)" \}/g)) built[m[1]] = { heavy: m[2], some: m[3], light: m[4] };
  ok(JSON.stringify(built) === JSON.stringify(APPROVED), "every built area sentence equals the approved line exactly");
  ok(!/^(Heavier right now|Some friction|Lighter right now)/.test(Object.values(built).flatMap((o) => Object.values(o)).join("\n")) && Object.values(built).flatMap((o) => Object.values(o)).every((l) => !/^(Heavier right now|Some friction|Lighter right now)/.test(l)), "no area sentence opens with a level word that duplicates its level label");
}


// ---------- package: three routes, copy rules, unlisted
{
  const quizSec = html.slice(html.indexOf('<section class="page" id="page-frictions-quiz"'), html.indexOf("</section>", html.indexOf('<section class="page" id="page-frictions-quiz"')));
  const resSec = html.slice(html.indexOf('<section class="page" id="page-frictions-results"'), html.indexOf("</section>", html.indexOf('<section class="page" id="page-frictions-results"')));
  ok(quizSec.length > 500 && resSec.length > 500 && pagesList.includes("frictions-quiz") && pagesList.includes("frictions-results"), "the quiz area and the results page are their own routes: /frictions/quiz/ and /frictions/results/");
  const all3 = sec + quizSec + resSec;
  ok(!/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen)\s+(short\s+|plain\s+)?(questions|minutes|min)\b|under \w+ minutes|takes about|in just/i.test(strip(sec + quizSec + resSec).replace(/Part \d of \d/g, "").replace(/three parts/g, "")), "no question counts and no time promises in the landing, quiz or results copy");
  ok(!/—|–|&mdash;|&ndash;/.test(all3), "no em or en dash in the three package pages");
  ok(!/\$\d|per seat|price/i.test(strip(all3)), "no price on the package pages");
  ok(!/diagnos|disorder|ADHD|autis|symptom/i.test(strip(sec).replace(/cannot diagnose anything/g, "").replace(/not a diagnosis/g, "")), "landing: the only mentions of diagnosis are the statements of what it is not");
  ok(strip(sec).includes("Your answers stay in this browser tab only. They are never sent anywhere, and they are gone when you close the tab."), "the landing page states the data posture in the approved plain words");
  ok(strip(resSec).includes("Your answers stay in this browser tab only. They are never sent anywhere, and they are gone when the tab closes.") && !/Nothing is saved/.test(strip(sec + quizSec + resSec)), "the results page states the same posture and none of the three pages says only that nothing is saved");
  ok((sec.match(/data-go="frictions-quiz"/g) || []).length === 2 && !/<input|<form|<fieldset/.test(sec), "the landing has exactly two Start links and no quiz markup");
  ok(/class="fr-testimonials" data-slot="testimonials" hidden><\/div>/.test(sec), "the testimonials slot is in the template and empty");
  ok(/<noscript>/.test(quizSec) && !/<noscript>[^]*Nothing is saved/.test(quizSec), "the quiz page tells a visitor without JavaScript what is needed, without a false promise");
  ok(!/#frictions-quiz|#frictions-results|data-go="frictions-(quiz|results)"/.test(hf), "the quiz and results routes are not in navigation or the footer");
  ok((html.match(/data-go="frictions-results"/g) || []).length === 0, "nothing links to the results route: it is reached by finishing the quiz or by the Return Path only");
  const SM = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8") + fs.readFileSync(path.join(ROOT, "llms.txt"), "utf8");
  ok(!/frictions/.test(SM), "/frictions/, the quiz and the results are in neither sitemap.xml nor llms.txt");
  ok(/class="sc-form|id="frForm"/.test(quizSec) && /id="frStepHost"><h2 class="fr-area-h" tabindex="-1">Personal: yourself<\/h2>/.test(quizSec), "the first screen of the quiz is pre-rendered in the page, not conjured from a placeholder");
  ok(/<legend|legend/.test(html.slice(html.indexOf("var FR_FREQ"), html.indexOf("</script>", html.indexOf("var FR_FREQ")))) && /<fieldset|createElement\("fieldset"\)/.test(html), "each question is a labelled fieldset with a legend");
}

// ---------- dynamic: stepped flow, one question per screen
const waitPath = async (p, extra = 600) => { for (let i = 0; i < 100; i++) { await sleep(100); try { if ((await ev("location.pathname + String.fromCharCode(124) + document.readyState")) === p + "|complete") break; } catch (e) {} } await sleep(extra); };
const NA = "na";
async function open(w, h) { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); await send("Page.navigate", { url: "about:blank" }); await sleep(200); await send("Page.navigate", { url: RP("frictions-quiz") + "?f" + w + Math.random().toString(36).slice(2, 6) }); await sleep(1600); }
const PARTS = ["personal", "relational", "professional"], QN = { personal: 4, relational: 5, professional: 4 };
const LABEL = "document.getElementById('frProgressLabel').textContent";
const click = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).click(); 1`);
async function flow(ans, trace) {
  const labels = [];
  for (const area of PARTS) {
    labels.push(await ev(LABEL)); trace && trace.push({ intro: true, fieldsets: await ev("document.querySelectorAll('.fr-q').length") });
    await click("#frNext"); await sleep(70);
    for (let qi = 0; qi < QN[area]; qi++) {
      labels.push(await ev(LABEL));
      const info = JSON.parse(await ev(`JSON.stringify({n:document.querySelectorAll('.fr-q').length,opts:document.querySelectorAll('.fr-q input').length,fillw:document.getElementById('frProgressFill').style.width,now:document.getElementById('frProgressBar').getAttribute('aria-valuenow'),max:document.getElementById('frProgressBar').getAttribute('aria-valuemax')})`));
      trace && trace.push({ area, qi, ...info });
      const v = (ans[area] || [])[qi];
      if (v !== undefined) await ev(`(function(){var r=document.querySelector('input[name="fr_${area}_${qi}"][value="${v}"]');if(r)r.click()})(); 1`);
      await click("#frNext"); await sleep(70);
    }
  }
  await waitPath("/frictions/results/", 500);
  const res = JSON.parse(await ev(`(function(){var r=document.getElementById('frResult');var areas=[].map.call(r.querySelectorAll('.fr-area'),function(li){var ps=li.querySelectorAll('p');return {h:li.querySelector('h3').textContent,level:li.querySelector('.fr-level').textContent.replace(/[\\u25CF\\u25CB]/g,'').trim(),line:ps.length>1&&!ps[1].classList.contains('fr-first')?ps[1].textContent:null,kit:!!li.querySelector('.fr-kit'),door:li.querySelector('.fr-door')?li.querySelector('.fr-door').textContent:null,links:[].map.call(li.querySelectorAll('.fr-links a'),function(a){return a.getAttribute('data-go')})}});return JSON.stringify({visible:!r.hidden,head:document.getElementById('frResHead').textContent.replace(/\\u00a0/g,' '),areas:areas,btns:r.querySelectorAll('.sc-res-hero .btn').length,primary:r.querySelector('.sc-res-hero .btn').getAttribute('href'),community:r.querySelector('.fr-community').textContent,note:(document.getElementById('frNote')||{}).textContent||null,kits:r.querySelectorAll('.fr-kit').length,text:r.innerText})})()`));
  res.labels = labels; return res;
}
const all = (n, v) => Array(n).fill(v);
await open(1440, 900);
ok(await ev(`document.querySelector('section.page.active').id==='page-frictions-quiz' && ${LABEL}==='Part 1 of 3: Personal' && document.querySelectorAll('.fr-q').length===0 && /Personal/.test(document.querySelector('.fr-area-h').textContent) && document.querySelector('#frStepHost p').textContent==='This part is about you: your time, your energy, your own growth.'`), "#frictions opens on the Personal intro screen: part name and its intro line, no questions yet");
const trace = [];
let r1 = await flow({ personal: all(4, "0"), relational: [NA, NA, NA, "0", "0"], professional: all(4, "2") }, trace);
const expectLabels = []; PARTS.forEach((a, ai) => { const L = ["Personal", "Relational", "Professional"][ai]; expectLabels.push(`Part ${ai + 1} of 3: ${L}`); for (let q = 0; q < QN[a]; q++) expectLabels.push(`Part ${ai + 1} of 3: ${L}, question ${q + 1} of ${QN[a]}`); });
ok(JSON.stringify(r1.labels) === JSON.stringify(expectLabels), "progress names the part and the question position on every screen: " + r1.labels.slice(0, 3).join(" | ") + " ...");
const qs = trace.filter((x) => x.qi !== undefined);
ok(qs.length === 13 && qs.every((x) => x.n === 1), "exactly one question per screen across all 13 questions");
ok(trace.filter((x) => x.intro).every((x) => x.fieldsets === 0), "the three intro screens carry no question");
ok(qs.every((x, i) => Number(x.now) === i && x.max === "13") && qs.every((x, i) => parseFloat(x.fillw) >= (i ? parseFloat(qs[i - 1].fillw) : 0) - 0.01), "the progress bar tracks overall progress through the 13 questions and never goes backwards");
const naIdx = qs.map((x, i) => (x.opts === 4 ? i : -1)).filter((i) => i >= 0);
ok(JSON.stringify(naIdx) === JSON.stringify([4, 5, 6]), "Not part of my life appears on questions 5, 6 and 7 only: positions " + naIdx.map((i) => i + 1).join(","));
ok(qs.filter((x) => x.opts === 3).length === 10, "the other ten questions offer exactly Hardly ever, Sometimes, Most weeks");
ok(r1.visible && r1.head === "Most of the friction you described sits in professional life" && r1.areas[2].level.startsWith("Heavier right now, the most of the three") && r1.areas[0].level === "Lighter right now", "professional heavy: headline and levels are right");
ok(r1.areas[0].line === "Less friction is showing up here at the moment." && r1.areas[2].line === "Your job is carrying a lot of friction." && r1.areas[1].line === "Less friction is showing up here at the moment.", "the built result sentences are the approved lines, with no repeated level word");
ok(r1.btns === 1 && r1.primary === "/inside/" && r1.community === "Inside Fixing Friction leads to the Fixing Friction Community, a paid group coaching program for Divergent Doers.", "one primary route, Inside Fixing Friction, with the Community named as the program it leads to");
ok(r1.kits === 1 && r1.areas[2].kit && !r1.areas[0].kit && !r1.areas[1].kit, "the champion kit appears only in the Professional result");
ok(/I have named what is costing me the most at work, and I would like to talk about one small fix\./.test(r1.text) && /^Hi \[name\], I have been thinking about what is costing me the most at work: \[the one thing\]\./.test(r1.note || ""), "the kit holds one forwardable line and one short template note, with square-bracket blanks and no names");
ok(r1.areas[2].door === "If the honest answer is that you need to leave and you need a plan, that work lives inside the Community too.", "the quiet door is present on the Professional result, plain wording, no track name");
ok(JSON.stringify(r1.areas.map((a) => a.links)) === JSON.stringify([["inside", "burnout", "method"], ["athome", "inside", "burnout"], ["modules", "titles", "tools"]]), "first resources per area come only from existing pages: " + JSON.stringify(r1.areas.map((a) => a.links)));
ok(await ev(`sessionStorage.length===0 && localStorage.length===0 && document.cookie===''`), "nothing is written to sessionStorage, localStorage or cookies by the flow");
await ev("document.querySelector('.fr-select').click(); 1");
ok(await ev(`window.getSelection().toString().replace(/\\s+/g,' ').trim()===document.getElementById('frNote').textContent.trim()`), "the Select the note button selects the note for copying, with no clipboard or network call");
await open(1440, 900); let r2 = await flow({ personal: all(4, "2"), relational: [NA, NA, NA, "0", "0"], professional: all(4, "0") });
ok(r2.head === "Most of the friction you described sits in personal life" && r2.areas[0].level.startsWith("Heavier right now, the most") && r2.areas[0].line === "Your own time, energy and growth are carrying a lot of friction.", "personal heavy: headline, level and approved sentence");
await open(1440, 900); let r3 = await flow({ personal: all(4, "0"), relational: [NA, NA, NA, "2", "2"], professional: all(4, "1") });
ok(r3.head === "Most of the friction you described sits in relational life" && r3.areas[1].level.startsWith("Heavier right now, the most") && r3.areas[1].line === "Looking after the people you care for is carrying a lot of friction." && r3.areas[2].level === "Some friction" && r3.areas[2].line === "A few things about your job could be easier.", "relational: Not part of my life answers are left out, two Most weeks make it heavy; the 'some' sentence is the approved one");
await open(1440, 900); let r4 = await flow({ personal: all(4, "2"), relational: [NA, NA, NA, "0", "0"], professional: all(4, "2") });
ok(r4.head === "Your friction is spread across more than one area", "a tie reads as spread across more than one area");
await open(1440, 900); let r5 = await flow({});
ok(r5.head === "You skipped every question, so there is nothing to place yet" && r5.areas.every((a) => a.level === "Skipped"), "skipping every question by pressing Continue is allowed and says so plainly");
await open(1440, 900); let r6 = await flow({ personal: all(4, "0"), relational: [NA, NA, NA, "0", "0"], professional: all(4, "0") });
ok(r6.head === "Nothing stands out as heavy right now", "all Hardly ever reads as nothing heavy");
await open(1440, 900); let r7 = await flow({ personal: ["2", undefined, "2", undefined], relational: [undefined, NA, undefined, "1", undefined], professional: [undefined, undefined, "2", undefined] });
ok(r7.visible && r7.areas[0].level.startsWith("Heavier") && r7.areas[2].level.startsWith("Heavier"), "skipping some questions works: the average uses only the answers given");
// Back keeps an answer; Start over mid-part clears everything
await open(1440, 900);
await click("#frNext"); await sleep(70); await ev(`document.querySelector('input[name="fr_personal_0"][value="2"]').click(); 1`); await click("#frNext"); await sleep(70);
ok(await ev(`${LABEL}==='Part 1 of 3: Personal, question 2 of 4'`), "Continue moves to question 2 of 4");
await click("#frBack"); await sleep(80);
ok(await ev(`!!document.querySelector('input[name="fr_personal_0"][value="2"]:checked')`), "Back returns to the previous question with its answer kept");
await click("#frNext"); await sleep(60); await click("#frNext"); await sleep(60); await click("#frNext"); await sleep(60); await click("#frNext"); await sleep(70);
ok(await ev(`${LABEL}==='Part 2 of 3: Relational'`), "the next part opens on its own intro screen");
await click("#frNext"); await sleep(60); await click("#frReset"); await sleep(120);
ok(await ev(`${LABEL}==='Part 1 of 3: Personal' && document.querySelectorAll('.fr-q').length===0 && window.name===''`), "Start over in the middle of a part returns to the first intro screen");
await click("#frNext"); await sleep(70);
ok(await ev(`!document.querySelector('input[name="fr_personal_0"]:checked')`), "Start over cleared the earlier answers");
// a resource link opens a real page
await open(1440, 900); await flow({ professional: all(4, "2") });
await ev(`document.querySelector('.fr-area:nth-child(3) .fr-links a').click(); 1`); await waitPath("/modules/", 600);
ok(await ev(`document.querySelector('section.page.active').id==='page-modules'`), "a first resource link opens the page it names (the three checklists)");


// ================= PACKAGE: landing, quiz area, results page, Return Path, privacy boundary =================
const TOKEN_RE = /^([012n-]{13})\|(\d{10,14})\|(\d{1,7})\|([01]{3})$/;
const decodeName = (n) => (typeof n === "string" && n.startsWith("ffr2:") ? Buffer.from(n.slice(5), "base64").toString("latin1") : null);
const mkToken = (vals, ageMs = 0) => "ffr2:" + Buffer.from(vals + "|" + (Date.now() - ageMs) + "|0|000", "latin1").toString("base64");
const gotoReal = async (url, p) => { await send("Page.navigate", { url: "about:blank" }); await sleep(120); await send("Page.navigate", { url: ORIGIN + url }); await waitPath(p); };
const media = (reduce) => send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduce ? "reduce" : "no-preference" }] });
const rects = (sels) => ev(`JSON.stringify(${JSON.stringify(sels)}.map(function(s){var e=document.querySelector(s);if(!e)return null;var r=e.getBoundingClientRect();return Math.round(r.top+scrollY)}))`).then(JSON.parse);
await send("Browser.setDownloadBehavior", { behavior: "deny" }).catch(() => {});
await media(false);

// ---- 1. the landing home page, as served
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await gotoReal("/frictions/", "/frictions/");
ok((await ev("document.querySelector('section.page.active').id")) === "page-frictions" && (await ev("document.title")) === "Find Your Frictions | Fixing Friction", "landing: /frictions/ is the landing home page with its own title");
{
  const [hero, welcome, fit, get, how, start2, begin] = await rects([".page-intro .btn.primary", ".fr-welcome", ".fr-fit", ".fr-get", ".fr-how", ".fr-how .btn.primary", ".ff-begin"]);
  ok([hero, welcome, fit, get, how, start2, begin].every((x) => x !== null) && hero < welcome && welcome < fit && fit < get && get < how && how < start2 && start2 < begin, "landing: order is hook with Start, welcome note, who it is for and not for, what you get, how it works with Start repeated, then the wider shelf");
  const starts = await ev(`JSON.stringify([].map.call(document.querySelectorAll('#page-frictions a.btn.primary'),function(a){return a.getAttribute('href')+'|'+a.textContent.trim()}))`);
  ok(JSON.stringify(JSON.parse(starts)) === JSON.stringify(["/frictions/quiz/|Start Find Your Frictions", "/frictions/quiz/|Start Find Your Frictions"]), "landing: Start is the single primary action, once after the hook and once after how it works: " + starts);
  ok(await ev(`(function(){var t=document.querySelector('.fr-testimonials');return !!t&&t.hidden&&t.textContent.trim()===''&&t.children.length===0})()`), "landing: the testimonials slot exists and stays empty and hidden");
  ok(await ev(`document.querySelectorAll('#page-frictions form, #page-frictions input, #page-frictions fieldset').length===0`), "landing: no quiz on the landing page (no form, input or fieldset)");
  const txt = await ev("document.querySelector('#page-frictions').innerText.replace(/\\s+/g,' ')");
  ok(txt.includes("It is a starting point, not a grade.") && txt.includes("cannot diagnose anything"), "landing: says the result is a starting point, not a grade, and what the scorecard cannot do");
  ok(txt.includes("Your answers stay in this browser tab only. They are never sent anywhere, and they are gone when you close the tab."), "landing: the data posture is stated in plain words on the page");
}
// Start is a state change: it clears prior results, opens the quiz, and puts focus on the first heading
await ev(`window.name = ${JSON.stringify(mkToken("2222222222222"))}; 1`);
await click('.page-intro a[data-go="frictions-quiz"]'); await waitPath("/frictions/quiz/");
ok((await ev("document.querySelector('section.page.active').id")) === "page-frictions-quiz" && (await ev(LABEL)) === "Part 1 of 3: Personal", "Start opens the quiz area on its own route, /frictions/quiz/, at the first screen");
ok((await ev("window.name")) === "", "Start cleared any earlier result from the tab");
ok(await ev(`document.activeElement&&document.activeElement.tagName==='H2'&&document.activeElement.classList.contains('fr-area-h')`), "Start moves focus to the first heading of the quiz");

// ---- 2. the quiz area: layout, furniture, question 6
{
  const rows = [];
  await click("#frNext"); await sleep(80);
  let q6 = "", fontOk = true, orderOk = true, furnitureOk = true, prevDisabledOnlyFirst = true;
  for (let i = 1; i < 16; i++) {
    const info = JSON.parse(await ev(`(function(){var q=document.querySelector('#frStepHost legend, #frStepHost h2');var p=document.getElementById('frProgressLabel');var b=document.getElementById('frBack');var n=document.getElementById('frNext');var tp=function(e){return Math.round(e.getBoundingClientRect().top+scrollY)};var fs=parseFloat(getComputedStyle(q).fontSize);var bs=parseFloat(getComputedStyle(document.body).fontSize);return JSON.stringify({qTop:tp(q),pTop:tp(p),nTop:tp(n),font:fs,body:bs,isLegend:q.tagName==='LEGEND',bv:!!b.offsetParent&&b.getBoundingClientRect().height>=43.5,nv:!!n.offsetParent&&n.getBoundingClientRect().height>=43.5,bd:b.disabled,txt:q.textContent})})()`));
    rows.push(info);
    if (info.qTop >= info.pTop || info.pTop >= info.nTop) orderOk = false;
    if (info.isLegend && info.font < info.body * 1.25) fontOk = false;
    if (!info.bv || !info.nv) furnitureOk = false;
    if (info.bd) prevDisabledOnlyFirst = false;
    if (info.isLegend && /parent figure/.test(info.txt)) q6 = info.txt.replace(/ /g, " ");
    await click("#frNext"); await sleep(60);
    if ((await ev("location.pathname")) !== "/frictions/quiz/") break;
  }
  ok(orderOk, "quiz area: on every screen the question is at the top, the progress bar and its text sit below it, and the navigation row is last");
  ok(fontOk, "quiz area: the question is set a little larger than body text (at least 1.25 times)");
  ok(furnitureOk && prevDisabledOnlyFirst, "quiz area: Previous and Continue are present and at least 44 px tall on every screen after the first (Previous is only disabled on the first screen)");
  ok(q6 === "Helping a parent, parent figure, or older relative look after themselves takes more out of you than you can really give.", "question 6 now reads: " + q6);
  await waitPath("/frictions/results/", 200);
  ok((await ev("window.name")) !== "" && TOKEN_RE.test(decodeName(await ev("window.name")) || ""), "finishing the quiz moves to /frictions/results/ and leaves the opaque values-only token");
}
ok(await ev(`document.querySelector('#page-frictions-quiz')===null`), "the quiz is a separate page: the results route does not contain it");

// ---- 3. the results page and the privacy boundary
await gotoReal("/frictions/quiz/?p1", "/frictions/quiz/");
const r1p = await flow({ personal: all(4, "0"), relational: [NA, NA, NA, "0", "0"], professional: all(4, "2") });
{
  const nm = await ev("window.name"); const dec = decodeName(nm);
  ok(location_ok(await ev("location.pathname")) && TOKEN_RE.test(dec || ""), "results page: reached by the quiz, token present");
  ok(dec && dec.split("|")[0] === "0000nnn002222" && dec.split("|")[3] === "000", "token holds the answer values only, one character per question: " + (dec || "").split("|")[0]);
  ok(!/personal|relational|professional|hardly|sometimes|weeks|name|your|friction/i.test(nm.slice(5)) && !/[a-z]{6,}/.test(nm.slice(5).replace(/[A-Za-z0-9+/=]{20,}/, "")), "token is opaque: no question text, labels or names a person could read directly");
  ok(await ev(`localStorage.length===0&&sessionStorage.length===0&&document.cookie===''`) && (await ev(`indexedDB.databases ? indexedDB.databases().then(function(d){return d.length===0}) : true`)), "boundary: no localStorage, no sessionStorage, no cookie, no IndexedDB database");
  const [barTop, h1Top, headTop] = await rects(["#frReturnBar", "#page-frictions-results h1", "#frResHead"]);
  ok(barTop !== null && barTop < h1Top && h1Top < headTop && (await ev("document.getElementById('frReturnBar').textContent.trim()")).endsWith("Return to my results"), "results page: the return to results banner bar is at the top, above the heading and the result");
  ok((await ev("getComputedStyle(document.getElementById('frReturnBar')).position")) === "sticky", "results page: the bar is sticky");
  ok((await ev("document.querySelector('#page-frictions-results h1').textContent")) === "Your lay of the land" && (await ev("document.title")).startsWith("Your Lay of the Land"), "results page: its own full page with its own title and h1");
  await ev(`window.scrollTo(0, 900); 1`); await sleep(400);
  await click("#frReturnLink"); await sleep(500);
  ok(await ev(`document.activeElement.id==='frResHead' && location.pathname==='/frictions/results/'`), "the top bar returns focus and view to the result without leaving the page");
}
function location_ok(p) { return p === "/frictions/results/"; }

// download: a self-contained page made in the browser from the session's real results, sent nowhere
{
  await ev(`window.__blobs=[];var o=URL.createObjectURL;URL.createObjectURL=function(b){window.__blobs.push(b);return o.call(URL,b)}; 1`);
  const netBefore = netBad.length, reqBefore = netAll.length;
  await click("#frDownload"); await sleep(700);
  const dl = await ev(`window.__blobs.length ? window.__blobs[0].text() : ''`);
  ok(dl.length > 800 && dl.startsWith("<!doctype html>") && /<h1>Your lay of the land<\/h1>/.test(dl) && dl.replace(/ /g, " ").includes("Most of the friction you described sits in professional life"), "download: one click makes a results page from this session's real results");
  ok(!/<script|<link |src=|@import|url\(/.test(dl) && /<style>/.test(dl) && /color-scheme" content="only light"/.test(dl), "download: self-contained (inline style only, no script, no external file, forced light)");
  ok(dl.includes("https://fixingfriction.com/modules/") && dl.includes("A small kit for work") && dl.includes("Inside Fixing Friction leads to the Fixing Friction Community, a paid group coaching program for Divergent Doers."), "download: carries the first resources as real addresses, the kit and the approved Community line");
  ok(!/—|–/.test(dl), "download: no em or en dash");
  ok(netBad.length === netBefore && netAll.length === reqBefore, "download: generated locally, no network request was made");
  ok(/downloaded/.test(await ev("document.getElementById('frDlStatus').textContent")), "download: the page confirms in a status line");
  ok(decodeName(await ev("window.name")).split("|")[3][2] === "1", "download: recorded in the token so the prompt never shows");
}

// Return Path on a forward destination
await gotoReal("/frictions/quiz/?p2", "/frictions/quiz/");
await flow({ personal: all(4, "2"), relational: [NA, NA, NA, "0", "0"], professional: all(4, "0") });
await ev(`window.scrollTo(0, 700); 1`); await sleep(500);
const y0 = await ev("Math.round(window.pageYOffset)");
const headBefore = await ev("document.getElementById('frResHead').textContent");
await click(".fr-area:nth-child(1) .fr-links a"); await waitPath("/inside/");
{
  ok(await ev(`!!document.getElementById('ffReturn') && document.getElementById('ffReturn').textContent.indexOf('Return to my results')>=0`), "forward page: the Return to my results banner is shown while the result exists");
  const b = JSON.parse(await ev(`(function(){var e=document.getElementById('ffReturn');var h=document.querySelector('header.site').getBoundingClientRect();var r=e.getBoundingClientRect();var chip=e.querySelector('.ff-return-chip');var x=e.querySelector('.ff-return-x');var a=e.querySelector('.ff-return-link');var cs=getComputedStyle(e);return JSON.stringify({pos:cs.position,h:Math.round(r.height),top:Math.round(r.top),hb:Math.round(h.bottom),chipW:Math.round(chip.getBoundingClientRect().width),chipH:Math.round(chip.getBoundingClientRect().height),arrowFirst:a.firstElementChild===chip,xH:Math.round(x.getBoundingClientRect().height),pulse:getComputedStyle(chip,'::after').animationName,pulseOnBar:cs.animationName,pulseOnLink:getComputedStyle(a).animationName,pulseOnChip:getComputedStyle(chip).animationName,bg:cs.backgroundColor,fg:getComputedStyle(a).color})})()`));
  ok(b.pos === "sticky" && b.h >= 56 && b.top >= b.hb - 2, "banner is thick (" + b.h + " px) and sticky under the site header");
  ok(b.arrowFirst && b.chipW >= 44 && b.chipH >= 44, "banner: a prominent back arrow sits at the left end as a 44 px chip");
  ok(b.pulse === "ffRing" && b.pulseOnBar === "none" && b.pulseOnLink === "none" && b.pulseOnChip === "none", "banner: the gentle pulse rides on the arrow chip only (" + b.pulse + ")");
  ok(b.xH >= 44, "banner: the dismiss control is at least 44 px tall");
  await ev(`window.scrollTo(0, 1500); 1`); await sleep(400);
  const stuck = JSON.parse(await ev(`(function(){var e=document.getElementById('ffReturn').getBoundingClientRect();var h=document.querySelector('header.site').getBoundingClientRect();return JSON.stringify({top:Math.round(e.top),hb:Math.round(h.bottom)})})()`));
  ok(Math.abs(stuck.top - stuck.hb) <= 2, "banner stays stuck under the header while the page scrolls (top " + stuck.top + ", header bottom " + stuck.hb + ")");
  const cr = JSON.parse(await ev(`(function(){var n=document.querySelector('nav.ff-crumbs');if(!n)return JSON.stringify(null);var a=n.querySelector('a');var last=n.querySelector('[aria-current=page]');return JSON.stringify({label:n.getAttribute('aria-label'),first:a.textContent,href:a.getAttribute('href'),here:last.textContent,h:Math.round(a.getBoundingClientRect().height)})})()`));
  ok(cr && cr.label === "Breadcrumb" && cr.first === "My results" && cr.href === "/frictions/results/" && cr.here === "Inside Fixing Friction" && cr.h >= 44, "breadcrumb trail: My results (live link, 44 px) then the current page: " + JSON.stringify(cr));
  ok(await ev(`!document.querySelector('section.page.active .ff-return, .ff-return[hidden]')`) && (await ev("window.name")).startsWith("ffr2:"), "the banner and breadcrumb read the tab memory only; nothing else is stored");
  await media(true);
  await ev("setTimeout(function(){location.reload()},50); 1"); await sleep(500); await waitPath("/inside/");
  const red = await ev(`getComputedStyle(document.querySelector('.ff-return-chip'),'::after').animationName+'|'+getComputedStyle(document.querySelector('.ff-return-chip'),'::after').opacity`);
  ok(red === "none|0", "reduced motion: the pulse is static (" + red + ")");
  await media(false);
  // moving on to a second page keeps the banner
  await click('nav.pages a.cta'); await waitPath("/scorecards/");
  ok(await ev(`!!document.getElementById('ffReturn') && document.querySelector('nav.ff-crumbs [aria-current=page]').textContent.length>0`), "the banner and breadcrumb follow the visitor to a second forward page");
  await click("#ffReturn .ff-return-link"); await waitPath("/frictions/results/", 900);
  const back = JSON.parse(await ev(`JSON.stringify({head:document.getElementById('frResHead').textContent,areas:document.querySelectorAll('.fr-area').length,y:Math.round(window.pageYOffset),visible:!document.getElementById('frResult').hidden})`));
  ok(back.visible && back.head === headBefore && back.areas === 3 && Math.abs(back.y - y0) <= 6, "one tap on the banner restores the results view with answers, results and scroll intact (scroll " + y0 + " to " + back.y + ")");
}
// dismiss without deleting
await click(".fr-area:nth-child(2) .fr-links a"); await sleep(900);
await click("#ffReturn .ff-return-x"); await sleep(200);
ok(await ev(`!document.getElementById('ffReturn') && !!document.querySelector('nav.ff-crumbs a') && decodeURIComponent(escape(atob(window.name.slice(5)))).split('|')[3][0]==='1'`), "dismissing the banner hides only the bar: the breadcrumb stays and the results are kept");
await click('nav.pages a.cta'); await sleep(900);
ok(await ev(`!document.getElementById('ffReturn') && !!document.querySelector('nav.ff-crumbs a')`), "a dismissed banner stays dismissed on the next page; the breadcrumb is still live");
await click("nav.ff-crumbs a"); await waitPath("/frictions/results/", 700);
ok(await ev(`!document.getElementById('frResult').hidden`), "the live My results crumb restores the same view");

// clears: retake, start over, a click that leaves for another website anywhere on the site
await click("#frRetake"); await waitPath("/frictions/quiz/");
ok((await ev("window.name")) === "", "Find Your Frictions again clears the result and opens a fresh quiz");
await click("#frNext"); await sleep(60);
await ev(`window.name = ${JSON.stringify(mkToken("2222222222222"))}; 1`);
await click("#frReset"); await sleep(100);
ok((await ev("window.name")) === "" && (await ev(LABEL)) === "Part 1 of 3: Personal", "Start over clears the tab memory and returns to the first screen");
await gotoReal("/inside/", "/inside/");
await ev(`window.name = ${JSON.stringify(mkToken("0120120120120"))}; document.addEventListener('click', function (e) { e.preventDefault(); }); var a=document.createElement('a'); a.href='https://example.org/elsewhere'; a.textContent='x'; document.body.appendChild(a); a.click(); 1`);
ok((await ev("window.name")) === "", "any click that leaves for another website clears the tab memory, on any page of the site (tested on /inside/)");
await ev(`window.name = ${JSON.stringify(mkToken("0120120120120"))}; var b=document.createElement('a'); b.href='/tools/'; b.textContent='y'; document.body.appendChild(b); b.click(); 1`);
await sleep(700);
ok((await ev("window.name")).startsWith("ffr2:"), "a click to another page of this site leaves it in place");
await ev(`window.name=''; 1`);

// empty, expired and tampered tab memory
await gotoReal("/frictions/results/", "/frictions/results/");
ok(await ev(`document.getElementById('frResult').hidden && !document.getElementById('frEmpty').hidden && !!document.querySelector('#frEmpty a[href="/frictions/quiz/"]') && document.getElementById('frReturnBar').hidden`) && (await ev("document.getElementById('frEmpty').innerText")).includes("gone when the tab closes"), "results with nothing in the tab: a plain empty state, a Start link, no bar, the posture in plain words");
await ev(`window.name = ${JSON.stringify(mkToken("2222222222222", 4 * 3600 * 1000))}; 1`);
await gotoReal("/frictions/results/?x", "/frictions/results/");
ok(await ev(`document.getElementById('frResult').hidden && window.name===''`), "a result older than three hours is treated as gone and cleared");
await ev(`window.name = 'ffr2:not-a-token'; 1`);
await gotoReal("/frictions/results/?y", "/frictions/results/");
ok(await ev(`document.getElementById('frResult').hidden && !document.getElementById('frEmpty').hidden`), "a malformed token is ignored without error");

// ---- 4. the one-time download prompt (about fifteen seconds), under reduced motion
await media(true);
await gotoReal("/frictions/quiz/?t1", "/frictions/quiz/");
await flow({ personal: all(4, "1"), relational: [NA, NA, NA, "1", "1"], professional: all(4, "1") });
const tStart = Date.now();
await sleep(13500);
ok(await ev(`!document.getElementById('frToast') || document.getElementById('frToast').hidden`), "prompt: not shown before about fifteen seconds");
await sleep(Math.max(0, 15800 - (Date.now() - tStart)));
{
  const t = JSON.parse(await ev(`(function(){var e=document.getElementById('frToast');if(!e||e.hidden)return JSON.stringify(null);var r=e.getBoundingClientRect();var cs=getComputedStyle(e);return JSON.stringify({text:e.querySelector('p').textContent,btn:e.querySelector('#frToastDl').textContent,btnH:Math.round(e.querySelector('#frToastDl').getBoundingClientRect().height),x:e.querySelector('#frToastX').textContent,pos:cs.position,tr:cs.transform,right:Math.round(innerWidth-r.right),bottom:Math.round(innerHeight-r.bottom)})})()`));
  ok(t && t.text === "Download your results so you don't have to take the quiz again." && t.btn === "Download my results" && t.btnH >= 44, "prompt: appears once at about fifteen seconds with the download line and the Download action: " + JSON.stringify(t));
  ok(t && t.pos === "fixed" && t.right <= 20 && t.bottom <= 20, "prompt: a gentle toast in the corner, not over the page content");
  ok(t && (t.tr === "none" || t.tr === "matrix(1, 0, 0, 1, 0, 0)"), "prompt: under reduced motion it fades with no slide");
  await click("#frToastX"); await sleep(200);
  ok(await ev(`document.getElementById('frToast').hidden`), "prompt: dismissible");
  ok(decodeName(await ev("window.name")).split("|")[3][1] === "1", "prompt: recorded as shown for the session");
}
await ev("setTimeout(function(){location.reload()},50); 1"); await sleep(500); await waitPath("/frictions/results/");
await sleep(16500);
ok(await ev(`!document.getElementById('frToast')`), "prompt: never again in the session once shown");
await media(true);
await gotoReal("/frictions/quiz/?t2", "/frictions/quiz/");
await flow({ personal: all(4, "1"), relational: [NA, NA, NA, "1", "1"], professional: all(4, "1") });
await click("#frDownload"); await sleep(300);
await sleep(16000);
ok(await ev(`!document.getElementById('frToast') || document.getElementById('frToast').hidden`), "prompt: never if the results were already downloaded");
await media(false);

// ---- 5. boundary over the whole run: no fetch, beacon or other background request; window.name is the only carrier
ok(netBad.length === 0, "boundary: no fetch, XHR, beacon, socket or non-GET request was made during the whole run " + JSON.stringify(netBad.slice(0, 3)));
ok(netAll.every((u) => u.startsWith(ORIGIN) || u.startsWith("data:") || u.startsWith("blob:")), "boundary: every request stayed on the site's own origin " + JSON.stringify(netAll.filter((u) => !(u.startsWith(ORIGIN) || u.startsWith("data:") || u.startsWith("blob:"))).slice(0, 3)));
{
  const SESS = html.slice(html.lastIndexOf("<script>", html.indexOf('var PREFIX = "ffr2:"')), html.indexOf("</script>", html.indexOf('var PREFIX = "ffr2:"')));
  const FLOW = html.slice(html.lastIndexOf("<script>", html.indexOf("var FR_FREQ")), html.indexOf("</script>", html.indexOf("var FR_FREQ")));
  const BAD = /localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|gtag|dataLayer|navigator\.clipboard|mailto:|caches\.|serviceWorker|history\.state|pushState|replaceState/;
  ok(!BAD.test(SESS) && !BAD.test(FLOW), "boundary (source): neither package script uses storage, cookies, fetch, beacon, sockets, clipboard, mailto, caches, service workers or history state");
  ok((SESS.match(/window\.name/g) || []).length >= 4 && !/window\.name/.test(FLOW), "boundary (source): window.name appears only in the session module; the quiz and results script reaches it through that module");
  ok(/TOKEN_RE = \/\^\(\[012n-\]\{13\}\)\\\|\(\\d\{10,14\}\)\\\|\(\\d\{1,7\}\)\\\|\(\[01\]\)\(\[01\]\)\(\[01\]\)\$\//.test(SESS) && /PREFIX = "ffr2:"/.test(SESS) && /TTL = 3 \* 60 \* 60 \* 1000/.test(SESS), "boundary (source): the token shape is values only (13 answer characters, a time, a scroll position, three flags) and the expiry is three hours");
  ok(/closest\("a\[href\]"\)[\s\S]{0,200}a\.host !== location\.host[\s\S]{0,60}S\.clear\(\)/.test(SESS), "boundary (source): the leave-for-another-website clear is in the module that runs on every page");
  ok(!/—|–|&mdash;|&ndash;/.test(SESS + FLOW), "package scripts: no em or en dash");
}
ok(await ev(`localStorage.length===0&&sessionStorage.length===0&&document.cookie===''`), "boundary: at the end of the run no storage and no cookie exist");

// ---- 6. keyboard-only run of the whole flow
await media(false);
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await gotoReal("/frictions/", "/frictions/");
const TAB = () => KEY("Tab", "Tab", 9);
const PRESS = async (k, code, vk, text) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }); };
async function tabTo(testExpr, max = 60) { for (let i = 0; i < max; i++) { await TAB(); await sleep(25); if (await ev(`(function(){var e=document.activeElement;return !!(e&&(${testExpr}))})()`)) return true; } return false; }
{
  await ev("document.activeElement && document.activeElement.blur(); window.scrollTo(0,0); 1");
  const gotStart = await tabTo(`e.getAttribute('href')==='/frictions/quiz/'`);
  ok(gotStart, "keyboard only: Tab reaches the Start link on the landing page");
  await PRESS("Enter", "Enter", 13, "\r"); await waitPath("/frictions/quiz/");
  ok(await ev(`document.activeElement.classList.contains('fr-area-h')`), "keyboard only: Enter on Start opens the quiz with focus on the first heading");
  let steps = 0, focusAssist = true, announced = true, ringOk = true;
  for (let i = 0; i < 16; i++) {
    const info = JSON.parse(await ev(`(function(){var e=document.activeElement;var cs=getComputedStyle(e);return JSON.stringify({tag:e.tagName,out:cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>=2,lab:document.getElementById('frProgressLabel').textContent,live:document.getElementById('frProgressLabel').getAttribute('aria-live')})})()`));
    if (!(info.tag === "LEGEND" || info.tag === "H2")) focusAssist = false;
    if (info.tag === "LEGEND" && !info.out) ringOk = false;
    if (info.live !== "polite") announced = false;
    if (info.tag === "LEGEND") { await TAB(); await sleep(25); await PRESS(" ", "Space", 32, " "); await sleep(40); }
    if (!(await tabTo(`e.id==='frNext'`, 8))) { ok(false, "keyboard only: could not reach Continue on step " + i); break; }
    await PRESS("Enter", "Enter", 13, "\r"); await sleep(120); steps++;
    if ((await ev("location.pathname")) !== "/frictions/quiz/") break;
  }
  await waitPath("/frictions/results/", 300);
  ok(steps === 16 && (await ev("location.pathname")) === "/frictions/results/", "keyboard only: every screen answered and moved on with Tab, Space and Enter, ending on the results page (" + steps + " screens)");
  ok(focusAssist && ringOk, "keyboard only: focus lands on the new heading or question at every step change and shows the approved focus outline there");
  ok(announced, "keyboard only: the progress text is a polite live region, so each step change is announced");
  ok(await ev(`document.activeElement.id==='frResHead'`), "keyboard only: on the results page focus lands on the result headline");
  const gotRes = await tabTo(`e.closest && e.closest('.fr-links') && e.getAttribute('href')`, 25);
  ok(gotRes, "keyboard only: Tab reaches a first resource link");
  const hrefK = await ev("document.activeElement.getAttribute('href')");
  await PRESS("Enter", "Enter", 13, "\r"); await waitPath(hrefK);
  ok(await ev(`!!document.getElementById('ffReturn')`), "keyboard only: the forward page shows the Return to my results banner");
  await ev("document.activeElement && document.activeElement.blur(); 1");
  const gotBanner = await tabTo(`e.classList.contains('ff-return-link')`, 80);
  ok(gotBanner && (await ev(`(function(){var cs=getComputedStyle(document.activeElement);return cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>=2})()`)), "keyboard only: Tab reaches the banner link and it shows a clear focus ring");
  await PRESS("Enter", "Enter", 13, "\r"); await waitPath("/frictions/results/", 700);
  ok(await ev(`!document.getElementById('frResult').hidden`), "keyboard only: Enter on the banner returns to the results view");
}

const CONTRAST = `(function(){function parse(c){var m=c.match(/[\\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}}function lum(c){var f=function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)}function bgOf(el){while(el){var c=parse(getComputedStyle(el).backgroundColor);if(c.a>0.9)return c;el=el.parentElement}return {r:255,g:255,b:255,a:1}}var bad=[];[].forEach.call(document.querySelectorAll('#frResult h2,#frResult h3,#frResult h4,#frResult p,#frResult li,#frResult strong,#frResult a,#frResult button,#frResult .eyebrow,#frResult .fr-dots'),function(e){if(!e.offsetParent||!e.textContent.trim())return;var f=parse(getComputedStyle(e).color),b=bgOf(e),l1=lum(f),l2=lum(b),cr=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);if(cr<4.5)bad.push(e.tagName+' '+cr.toFixed(2)+' '+e.textContent.trim().slice(0,30))});return JSON.stringify(bad)})()`;
// ---------- dynamic: layout per width, landing, every question screen, results page, forward page with the banner
const CONTRAST_BANNER = `(function(){function parse(c){var m=c.match(/[\\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}}function lum(c){var f=function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)}var bad=[];[].forEach.call(document.querySelectorAll('#ffReturn *, #frReturnBar *'),function(e){if(!e.offsetParent)return;var own=[].some.call(e.childNodes,function(n){return n.nodeType===3&&n.textContent.trim()});if(!own)return;var f=parse(getComputedStyle(e).color);var el=e,b=null;while(el){var c=parse(getComputedStyle(el).backgroundColor);if(c.a>0.9){b=c;break}el=el.parentElement}if(!b)b={r:255,g:255,b:255,a:1};var l1=lum(f),l2=lum(b),cr=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);if(cr<4.5)bad.push(e.className+' '+cr.toFixed(2))});return JSON.stringify(bad)})()`;
async function runThrough() { // answers every screen (Most weeks, Not part of my life where offered is skipped), ends on the results page
  for (let i = 0; i < 16; i++) {
    await ev(`(function(){var r=document.querySelector('.fr-opts label input[value="2"]');if(r)r.click();document.getElementById('frNext').click();return 1})()`); await sleep(60);
    if ((await ev("location.pathname")) !== "/frictions/quiz/") break;
  }
  await waitPath("/frictions/results/", 400);
}
for (const [sn, w, h] of sizes) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  // landing
  await gotoReal("/frictions/?" + sn, "/frictions/");
  ok(await ev(`document.documentElement.scrollWidth<=innerWidth+1`), `[${sn}] landing: no sideways overflow`);
  const badL = JSON.parse(await ev(`(${LINEFN})('#page-frictions h1, #page-frictions h2, #page-frictions .lede, #page-frictions .fr-fit h2')`));
  ok(badL.length === 0, `[${sn}] landing: headings and lede have no widow or stranded preposition ${badL.join(" ; ")}`);
  const smallL = JSON.parse(await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#page-frictions .btn, #page-frictions .fr-fit a'),function(e){return e.offsetParent&&e.getBoundingClientRect().height<43.5&&getComputedStyle(e).display!=='inline'}).map(function(e){return e.textContent.trim()}))`));
  ok(smallL.length === 0, `[${sn}] landing: buttons are at least 44 px tall ${smallL.join(" ; ")}`);
  if (["desktop-1440", "tablet-portrait-768", "phone-390"].includes(sn)) { const rr = await rectOf("#page-frictions"); await cap("landing-" + sn, { x: 0, y: Math.max(0, rr.y - 10), width: w, height: Math.min(rr.h + 20, 4200) }); }
  // quiz
  await gotoReal("/frictions/quiz/?" + sn, "/frictions/quiz/");
  ok(await ev(`document.documentElement.scrollWidth<=innerWidth+1`), `[${sn}] intro: no sideways overflow`);
  const badI = JSON.parse(await ev(`(${LINEFN})('#page-frictions-quiz .fr-area-h')`));
  ok(badI.length === 0, `[${sn}] intro: heading has no widow or stranded preposition ${badI.join(" ; ")}`);
  const smallI = JSON.parse(await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#frForm .btn'),function(e){return e.offsetParent&&e.getBoundingClientRect().height<43.5}).map(function(e){return e.textContent.trim()}))`));
  ok(smallI.length === 0, `[${sn}] intro: buttons at least 44 px tall ${smallI.join(" ; ")}`);
  if (sn === "desktop-1440") { const rr = await rectOf("#page-frictions-quiz"); await cap("quiz-intro-" + sn, { x: 0, y: Math.max(0, rr.y - 10), width: w, height: Math.min(rr.h, 1500) }); }
  await click("#frNext"); await sleep(70);
  let badAll = [], smallAll = [], ovAll = 0, keyOk = true;
  for (let i = 0; i < 13; i++) {
    const L = JSON.parse(await ev(`(${LINEFN})('#frForm legend')`)); if (L.length) badAll.push(...L);
    const S = JSON.parse(await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#frForm .fr-opts label, #frForm .btn'),function(e){return e.offsetParent&&e.getBoundingClientRect().height<43.5}).map(function(e){return e.textContent.trim()}))`)); if (S.length) smallAll.push(...S);
    if (!(await ev(`document.documentElement.scrollWidth<=innerWidth+1`))) ovAll++;
    if (i === 0 || i === 4) {
      await ev(`document.querySelector('#frForm input').focus(); 1`); await KEY("ArrowRight", "ArrowRight", 39); await sleep(60);
      if (!(await ev(`document.querySelector('#frForm input:checked')!==null`))) keyOk = false;
    }
    if (i === 1 && (sn === "desktop-1440" || sn === "phone-390" || sn === "tablet-portrait-768")) { const rr = await rectOf("#page-frictions-quiz"); await cap("quiz-question-" + sn, { x: 0, y: Math.max(0, rr.y - 10), width: w, height: Math.min(rr.h, 1500) }); }
    await click("#frNext"); await sleep(60);
    if (i === 3 || i === 8) { await click("#frNext"); await sleep(60); }
  }
  ok(badAll.length === 0, `[${sn}] all 13 questions: no widow or stranded preposition ${badAll.join(" ; ")}`);
  ok(smallAll.length === 0, `[${sn}] all 13 questions: every option and button is at least 44 px tall ${smallAll.join(" ; ")}`);
  ok(ovAll === 0, `[${sn}] all 13 questions: no sideways overflow`);
  ok(keyOk, `[${sn}] keyboard: arrow keys choose an answer on a question screen`);
  await waitPath("/frictions/results/", 700);
  ok(await ev(`!document.getElementById('frResult').hidden`), `[${sn}] the last Continue opens the results page`);
  ok(await ev(`(function(){var h=document.getElementById('frResHead').getBoundingClientRect();var hd=document.querySelector('header.site').getBoundingClientRect();return h.top>=hd.bottom-1&&h.top<innerHeight*1.4})()`), `[${sn}] the result headline is below the sticky header`);
  const cb = JSON.parse(await ev(CONTRAST)); ok(cb.length === 0, `[${sn}] result: every text element has at least 4.5:1 contrast ${cb.join(" ; ")}`);
  const cb2 = JSON.parse(await ev(CONTRAST_BANNER)); ok(cb2.length === 0, `[${sn}] result: the return bar has at least 4.5:1 contrast ${cb2.join(" ; ")}`);
  const bad1 = JSON.parse(await ev(`(${LINEFN})('#frResHead, #frResult h3, #page-frictions-results h1')`)); ok(bad1.length === 0, `[${sn}] result headings: no widow ${bad1.join(" ; ")}`);
  const small1 = JSON.parse(await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#frResult .btn, #frResult .fr-links a, #frResult .fr-select, #frReturnLink, #frDownload'),function(e){return e.offsetParent&&e.getBoundingClientRect().height<43.5}).map(function(e){return e.textContent.trim()}))`));
  ok(small1.length === 0, `[${sn}] result: buttons, resource links, the select button and the return bar are at least 44 px tall ${small1.join(" ; ")}`);
  ok(await ev(`document.documentElement.scrollWidth<=innerWidth+1`), `[${sn}] result: no sideways overflow`);
  const rr = await rectOf("#page-frictions-results"); await cap("results-" + sn, { x: 0, y: Math.max(0, rr.y - 20), width: w, height: Math.min(rr.h + 60, 3800) });
  // forward page with the banner
  await click(".fr-area:nth-child(1) .fr-links a"); await waitPath("/inside/", 900);
  ok(await ev(`document.documentElement.scrollWidth<=innerWidth+1`), `[${sn}] forward page with the banner: no sideways overflow`);
  const cb3 = JSON.parse(await ev(CONTRAST_BANNER)); ok(cb3.length === 0, `[${sn}] forward page: the banner has at least 4.5:1 contrast ${cb3.join(" ; ")}`);
  const bt = JSON.parse(await ev(`(function(){var e=document.getElementById('ffReturn');var h=document.querySelector('header.site').getBoundingClientRect();var r=e.getBoundingClientRect();return JSON.stringify({h:Math.round(r.height),gap:Math.round(r.top-h.bottom),hits:[].filter.call(e.querySelectorAll('a,button'),function(x){return x.getBoundingClientRect().height<43.5}).length})})()`));
  ok(bt.h >= 56 && bt.gap >= -2 && bt.gap <= 2 && bt.hits === 0, `[${sn}] forward page: the banner is thick, sits right under the header, and its controls are at least 44 px (${JSON.stringify(bt)})`);
  if (["desktop-1440", "tablet-portrait-768", "phone-390"].includes(sn)) await cap("forward-banner-" + sn, { x: 0, y: 0, width: w, height: Math.min(h, 640) });
}
ok(netBad.length === 0, "boundary: still no fetch, beacon or non-GET request after the layout runs");
console.log(fails.length ? "FAILED: " + fails.length : "ALL FIND YOUR FRICTIONS PACKAGE CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
