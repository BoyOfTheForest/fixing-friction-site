// Phase 5.5: Find Your Frictions (route frictions): anonymous on-screen self-assessment, questions, results, kit, links, standards. Usage: node tools/frictions_check.mjs OUTDIR
import fs from "node:fs"; import http from "node:http"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Fixing-Friction-site-v10-internal", "docs", "phase55-shots"); fs.mkdirSync(OUT, { recursive: true });
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
const RP = (id) => ORIGIN + (id === "home" ? "/" : "/" + id + "/");
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

const show = async (id) => { await goReal(RP(id), id === "home" ? "/" : "/" + id + "/"); await sleep(800); };
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
const pagesList = ((html.match(/var pages = \[([^\]]*)\]/) || [])[1] || "").match(/"([^"]+)"/g).map((s) => s.slice(1, -1));
ok(pagesList.includes("frictions"), "#frictions is in the page list");
const s0 = html.indexOf("var FR_FREQ"); const s1 = html.indexOf("</script>", s0);
const code = html.slice(s0, s1);
ok(s0 > 0, "the page script is present");
ok(!/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon|gtag|dataLayer|mailto:|WebSocket|navigator\.clipboard/.test(code), "script has no storage, cookie, network, analytics, email or clipboard call");
ok(/inp\.type = "radio"/.test(code) && !/type = "(text|email|tel|password)"|<textarea|createElement\("textarea"\)/.test(code) && !/<input[^>]*type="(text|email|tel|password)"|<textarea/.test(sec), "the only inputs are radio buttons: no text, email or account field");
const areasSrc = code.slice(code.indexOf("var FR_AREAS"), code.indexOf("var frForm"));
const qTexts = [...areasSrc.matchAll(/\{ t: "([^"]*)"/g)].map((m) => m[1]);
ok(qTexts.length === 13, "13 drafted questions in three areas (" + qTexts.length + ")");
const perArea = [...areasSrc.matchAll(/qs: \[([\s\S]*?)\n          \] \}/g)].map((m) => (m[1].match(/\{ t: /g) || []).length);
ok(perArea.length === 3 && perArea.every((n) => n >= 3 && n <= 5), "each of the three areas has three to five questions: " + perArea.join(", "));
ok(!/diagnos|disabilit|condition|medical|health|therap|medicat|disorder|ADHD|autis|depress|anxiet|illness|symptom|neurodiver|chronic|impair/i.test(qTexts.join(" ")), "no question asks for a diagnosis, a condition, a disability status or medical detail");
ok(/partner/.test(qTexts.join(" ")) && /parent or an older relative/.test(qTexts.join(" ")) && /children/.test(qTexts.join(" ")), "the relational area covers a partner, a parent or older relative, and kids");
ok(/label: "Personal"/.test(areasSrc) && /label: "Relational"/.test(areasSrc) && /label: "Professional"/.test(areasSrc) && !/PERP|PeRP|wheel|framework/i.test(sec + code), "three life areas, never named or presented as a framework");
ok(sec.includes("Your own growth counts as much as your job or your family."), "personal development stands equal to the other two in the framing");
ok(!/—|&mdash;/.test(sec + code) && !/\$\d/.test(sec + code), "no em dash and no price on the page");
const resources = [...areasSrc.matchAll(/\["([^"]+)", "([a-z-]+)"\]/g)].map((m) => m[2]);
ok(resources.length === 9 && resources.every((g) => pagesList.includes(g)), "every first resource points to an existing page: " + [...new Set(resources)].join(", "));
ok(strip(sec).replace(/ ,/g, ",").includes("Inside Fixing Friction leads to the Fixing Friction Community, a paid group coaching program for Divergent Doers."), "the Community is named as the program the route leads to, in the approved description");
ok(!/paid community|\$|per seat|cohort size|launch date/i.test(strip(sec)), "no price, launch date, cohort size or bare 'paid community' on the page");
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

// ---------- dynamic: stepped flow, one question per screen
const NA = "na";
async function open(w, h) { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); await send("Page.navigate", { url: "about:blank" }); await sleep(200); await send("Page.navigate", { url: RP("frictions") + "?f" + w + Math.random().toString(36).slice(2, 6) }); await sleep(1600); }
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
  const res = JSON.parse(await ev(`(function(){var r=document.getElementById('frResult');var areas=[].map.call(r.querySelectorAll('.fr-area'),function(li){var ps=li.querySelectorAll('p');return {h:li.querySelector('h3').textContent,level:li.querySelector('.fr-level').textContent.replace(/[\\u25CF\\u25CB]/g,'').trim(),line:ps.length>1&&!ps[1].classList.contains('fr-first')?ps[1].textContent:null,kit:!!li.querySelector('.fr-kit'),door:li.querySelector('.fr-door')?li.querySelector('.fr-door').textContent:null,links:[].map.call(li.querySelectorAll('.fr-links a'),function(a){return a.getAttribute('data-go')})}});return JSON.stringify({visible:!r.hidden,head:document.getElementById('frResHead').textContent.replace(/\\u00a0/g,' '),areas:areas,btns:r.querySelectorAll('.sc-res-hero .btn').length,primary:r.querySelector('.sc-res-hero .btn').getAttribute('href'),community:r.querySelector('.fr-community').textContent,note:(document.getElementById('frNote')||{}).textContent||null,kits:r.querySelectorAll('.fr-kit').length,text:r.innerText})})()`));
  res.labels = labels; return res;
}
const all = (n, v) => Array(n).fill(v);
await open(1440, 900);
ok(await ev(`document.querySelector('section.page.active').id==='page-frictions' && ${LABEL}==='Part 1 of 3: Personal' && document.querySelectorAll('.fr-q').length===0 && /Personal/.test(document.querySelector('.fr-area-h').textContent) && document.querySelector('#frStepHost p').textContent==='This part is about you: your time, your energy, your own growth.'`), "#frictions opens on the Personal intro screen: part name and its intro line, no questions yet");
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
ok(await ev(`${LABEL}==='Part 1 of 3: Personal' && document.querySelectorAll('.fr-q').length===0 && document.getElementById('frResult').hidden`), "Start over in the middle of a part returns to the first intro screen");
await click("#frNext"); await sleep(70);
ok(await ev(`!document.querySelector('input[name="fr_personal_0"]:checked')`), "Start over cleared the earlier answers");
// a resource link opens a real page
await open(1440, 900); await flow({ professional: all(4, "2") });
await ev(`document.querySelector('.fr-area:nth-child(3) .fr-links a').click(); 1`); await sleep(600);
ok(await ev(`document.querySelector('section.page.active').id==='page-modules'`), "a first resource link opens the page it names (the three checklists)");

// ---------- dynamic: layout per width, every question screen
const CONTRAST = `(function(){function parse(c){var m=c.match(/[\\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}}function lum(c){var f=function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)}function bgOf(el){while(el){var c=parse(getComputedStyle(el).backgroundColor);if(c.a>0.9)return c;el=el.parentElement}return {r:255,g:255,b:255,a:1}}var bad=[];[].forEach.call(document.querySelectorAll('#frResult h2,#frResult h3,#frResult h4,#frResult p,#frResult li,#frResult strong,#frResult a,#frResult button,#frResult .eyebrow,#frResult .fr-dots'),function(e){if(!e.offsetParent||!e.textContent.trim())return;var f=parse(getComputedStyle(e).color),b=bgOf(e),l1=lum(f),l2=lum(b),cr=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);if(cr<4.5)bad.push(e.tagName+' '+cr.toFixed(2)+' '+e.textContent.trim().slice(0,30))});return JSON.stringify(bad)})()`;
for (const [sn, w, h] of sizes) {
  await open(w, h);
  ok(await ev(`document.documentElement.scrollWidth<=innerWidth+1`), `[${sn}] intro: no sideways overflow`);
  const badI = JSON.parse(await ev(`(${LINEFN})('#page-frictions h1, #page-frictions .fr-area-h')`));
  ok(badI.length === 0, `[${sn}] intro: heading has no widow or stranded preposition ${badI.join(" ; ")}`);
  const smallI = JSON.parse(await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#frForm .btn'),function(e){return e.offsetParent&&e.getBoundingClientRect().height<43.5}).map(function(e){return e.textContent.trim()}))`));
  ok(smallI.length === 0, `[${sn}] intro: buttons at least 44 px tall ${smallI.join(" ; ")}`);
  if (sn === "desktop-1440") { const rr = await rectOf("#page-frictions"); await cap("frictions-intro-" + sn, { x: 0, y: Math.max(0, rr.y - 10), width: w, height: Math.min(rr.h, 1500) }); }
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
    if (sn !== "x" && (i === 1) && (sn === "desktop-1440" || sn === "phone-390")) { const rr = await rectOf("#page-frictions"); await cap("frictions-question-" + sn, { x: 0, y: Math.max(0, rr.y - 10), width: w, height: Math.min(rr.h, 1500) }); }
    await click("#frNext"); await sleep(60);
    if (i === 3 || i === 8) { await click("#frNext"); await sleep(60); }
  }
  ok(badAll.length === 0, `[${sn}] all 13 questions: no widow or stranded preposition ${badAll.join(" ; ")}`);
  ok(smallAll.length === 0, `[${sn}] all 13 questions: every option and button is at least 44 px tall ${smallAll.join(" ; ")}`);
  ok(ovAll === 0, `[${sn}] all 13 questions: no sideways overflow`);
  ok(keyOk, `[${sn}] keyboard: arrow keys choose an answer on a question screen`);
  ok(await ev(`!document.getElementById('frResult').hidden`), `[${sn}] the last Continue opens the result`);
  ok(await ev(`(function(){var h=document.getElementById('frResHead').getBoundingClientRect();var hd=document.querySelector('header.site').getBoundingClientRect();return h.top>=hd.bottom-1&&h.top<innerHeight})()`), `[${sn}] the result headline lands below the sticky header`);
  const cb = JSON.parse(await ev(CONTRAST)); ok(cb.length === 0, `[${sn}] result: every text element has at least 4.5:1 contrast ${cb.join(" ; ")}`);
  const bad1 = JSON.parse(await ev(`(${LINEFN})('#frResHead, #frResult h3')`)); ok(bad1.length === 0, `[${sn}] result headings: no widow ${bad1.join(" ; ")}`);
  const small1 = JSON.parse(await ev(`JSON.stringify([].filter.call(document.querySelectorAll('#frResult .btn, #frResult .fr-links a, #frResult .fr-select'),function(e){return e.offsetParent&&e.getBoundingClientRect().height<43.5}).map(function(e){return e.textContent.trim()}))`));
  ok(small1.length === 0, `[${sn}] result: buttons, resource links and the select button are at least 44 px tall ${small1.join(" ; ")}`);
  ok(await ev(`document.documentElement.scrollWidth<=innerWidth+1`), `[${sn}] result: no sideways overflow`);
  const rr = await rectOf("#frResult"); await cap("frictions-result-" + sn, { x: 0, y: Math.max(0, rr.y - 20), width: w, height: Math.min(rr.h + 60, 3600) });
}
console.log(fails.length ? "FAILED: " + fails.length : "ALL PHASE 5.5 CHECKS PASSED");
ws.close(); proc.kill(); srv.close(); process.exit(fails.length ? 1 : 0);
