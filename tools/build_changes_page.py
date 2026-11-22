#!/usr/bin/env python3
"""Builds /changes/index.html from docs/changes-data.json (the source of truth).
Edit the JSON (or ask Claude to, with the "Log what you just did" prompt on the page), then run:
    python tools/build_changes_page.py
The page has: size guide, filterable next steps with tick-to-bundle and one combined prompt, status tracking,
a change log, agent and human SOPs, and the commit list (read from git)."""
import html, json, os, re, subprocess
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
# Internal notes and data live OUTSIDE the published repo (anything in the repo is served by GitHub Pages).
INTERNAL = os.environ.get("FF_INTERNAL") or os.path.abspath(os.path.join(root, "..", "Fixing-Friction-site-v10-internal"))
REPO = "G:\\CLAUDE\\Fixing-Friction-site-v10"
TAIL = " Work on a new branch, run node tools/check.mjs and compare before and after screenshots, tag the work, add an entry to docs/changes-data.json and rebuild /changes/, and wait for my OK before merging and pushing."
data = json.load(open(os.path.join(INTERNAL, "docs", "changes-data.json"), encoding="utf-8"))
SIZE = {s["key"]: s for s in data["sops"]["sizes"]}
OWN = {"agent": "Agent", "human": "Human", "both": "Agent and human"}
def esc(s): return html.escape(s, quote=True)
def sub(s): return s.replace("{R}", REPO)

def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:28]
items = []
for it in data["next"]:
    it = dict(it); it["prompt"] = sub(it["prompt"]); it["tag"] = it["id"] + "-" + slug(it["title"]); items.append(it)

def badges(size, owner):
    return '<span class="b s%s">%s</span><span class="b o">%s</span>' % (size, SIZE[size]["name"], OWN[owner])

nxt = []
for it in items:
    nxt.append('''<li class="item" data-id="{id}" data-size="{size}" data-owner="{owner}">
<div class="head"><input type="checkbox" id="pick_{id}" data-pick="{id}"><label for="pick_{id}"><span class="t">{title}</span></label>{badges}</div>
<p class="why">{why}</p>
<p class="meta"><strong>Needs:</strong> {needs} <strong>Effort:</strong> {effort}</p>
<div class="row"><label class="st">Status <select data-status="{id}"><option value="suggested">Suggested</option><option value="in-progress">In progress</option><option value="done">Done</option><option value="skipped">Skipped</option></select></label></div>
<details><summary>Prompt for Claude Code</summary><pre id="p_{id}">{prompt}</pre><button type="button" data-copy="p_{id}">Copy prompt</button></details></li>'''.format(
        id=it["id"], size=it["size"], owner=it["owner"], title=esc(it["title"]), badges=badges(it["size"], it["owner"]), why=esc(it["why"]),
        needs=esc(it["needs"]), effort=esc(it["effort"]), prompt=esc(it["prompt"] + TAIL)))

rec = []
for r in data["recent"]:
    rec.append('''<li class="entry" data-size="{size}" data-owner="{owner}"><p class="when">{date} &middot; <code>{tag}</code></p>
<h3>{title} {badges}</h3><p>{what}</p>
<dl><dt>Why</dt><dd>{why}</dd><dt>Checked</dt><dd>{verified}</dd><dt>To undo</dt><dd>{undo}</dd></dl></li>'''.format(
        size=r["size"], owner=r["owner"], date=esc(r["date"]), tag=esc(r["tag"]), title=esc(r["title"]), badges=badges(r["size"], r["owner"]),
        what=esc(r["what"]), why=esc(r["why"]), verified=esc(r["verified"]), undo=esc(r["undo"])))

sizes = "".join('<li><span class="b s%s">%s</span> %s</li>' % (s["key"], s["name"], esc(s["rule"])) for s in data["sops"]["sizes"])
agent = "".join('<li class="card"><h3>%s</h3><p class="meta"><strong>When:</strong> %s</p><details><summary>Prompt</summary><pre id="a%d">%s</pre><button type="button" data-copy="a%d">Copy prompt</button></details></li>' % (esc(a["title"]), esc(a["when"]), i, esc(sub(a["prompt"])), i) for i, a in enumerate(data["sops"]["agent"]))
human = ""
for h in data["sops"]["human"]:
    link = (' <a href="%s">Open it</a>' % esc(h["link"])) if h.get("link") else ""
    human += '<li class="card"><h3>%s%s</h3><ol>%s</ol></li>' % (esc(h["title"]), link, "".join("<li>%s</li>" % esc(s) for s in h["steps"]))

log = subprocess.run(["git", "-c", "safe.directory=*", "-C", root, "log", "--format=%h|%ad|%s", "--date=short", "-n", "80"], capture_output=True, text=True, encoding="utf-8").stdout.strip().splitlines()
commits = "".join("<li><code>%s</code> %s %s</li>" % (esc(l.split("|")[0]), esc(l.split("|")[1]), esc(l.split("|", 2)[2])) for l in log if l.count("|") >= 2)
payload = json.dumps({"repo": REPO, "tail": TAIL, "items": [{k: it[k] for k in ("id", "title", "size", "owner", "needs", "prompt", "tag", "status")} for it in items], "sizes": {k: v["name"] for k, v in SIZE.items()}}, ensure_ascii=False).replace("<", "\\u003c")

CSS = """
:root{--ink:#102A43;--muted:#334E68;--line:#BCCCDC;--bg:#FFFFFF;--soft:#EFF6FF;--accent:#1E3A8A;}
*{box-sizing:border-box;}
body{margin:0;font:17px/1.6 "Libre Franklin",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:var(--bg);}
main{max-width:900px;margin:0 auto;padding:28px 16px 150px;}
a{color:var(--accent);}
a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #2563EB;outline-offset:3px;}
h1{font-size:2rem;line-height:1.2;margin:.2em 0 .4em;}
h2{font-size:1.4rem;margin:1.8em 0 .4em;border-top:1px solid var(--line);padding-top:18px;}
h3{font-size:1.05rem;margin:0 0 .3em;}
.note{background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:14px 16px;}
ul.list{list-style:none;margin:0;padding:0;}
.card,.item{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:12px 0;}
.item[hidden],.entry[hidden]{display:none;}
.head{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;}
.head input{width:26px;height:26px;accent-color:var(--accent);flex:0 0 auto;}
.head label{flex:1 1 220px;cursor:pointer;}
.t{font-weight:700;font-size:1.05rem;}
.b{display:inline-block;border-radius:999px;padding:2px 10px;font-size:.78rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border:1px solid transparent;white-space:nowrap;}
.bS{background:#DCFCE7;color:#14532D;border-color:#86EFAC;}
.bM{background:#FEF3C7;color:#78350F;border-color:#FCD34D;}
.bL{background:#FEE2E2;color:#7F1D1D;border-color:#FCA5A5;}
.b.o{background:#fff;color:var(--muted);border-color:var(--line);}
.why{margin:.4em 0;}
.meta{color:var(--muted);font-size:.95rem;margin:.3em 0;}
.when{color:var(--muted);font-size:.9rem;margin:0;}
.entry{padding:14px 0;border-bottom:1px solid #E5ECF3;}
.entry p{margin:.25em 0;}
dl{margin:.4em 0 0;display:grid;grid-template-columns:90px 1fr;gap:2px 12px;font-size:.95rem;}
dt{font-weight:700;color:var(--muted);}
dd{margin:0;}
.filters{display:flex;flex-wrap:wrap;gap:10px 22px;align-items:center;margin:10px 0 4px;}
.fg{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.fg span.l{font-weight:700;font-size:.9rem;color:var(--muted);margin-right:4px;}
.fb{min-height:44px;padding:0 14px;border-radius:999px;border:2px solid var(--line);background:#fff;color:var(--ink);font:inherit;font-weight:600;cursor:pointer;}
.fb[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#fff;}
summary{cursor:pointer;font-weight:700;color:var(--accent);min-height:44px;display:flex;align-items:center;}
pre{white-space:pre-wrap;word-break:break-word;background:#F8FAFC;border:1px solid var(--line);border-radius:10px;padding:12px 14px;font:.86rem/1.5 ui-monospace,Consolas,monospace;margin:0 0 8px;}
button{min-height:44px;padding:0 18px;border-radius:999px;border:2px solid var(--accent);background:var(--accent);color:#fff;font:inherit;font-weight:700;cursor:pointer;}
button.ghost{background:#fff;color:var(--accent);}
button.done{background:#166534;border-color:#166534;color:#fff;}
select{min-height:44px;font:inherit;border:2px solid var(--line);border-radius:10px;padding:0 10px;background:#fff;color:var(--ink);}
.st{font-weight:600;font-size:.95rem;color:var(--muted);}
.item[data-status="done"] .t{text-decoration:line-through;color:#52667A;}
.item[data-status="skipped"]{opacity:.7;}
.bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:2px solid var(--accent);padding:10px 16px;z-index:50;box-shadow:0 -4px 16px rgba(16,42,67,.12);}
.bar .in{max-width:900px;margin:0 auto;display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;}
.bar .sum{font-weight:700;flex:1 1 200px;}
.sizes{list-style:none;padding:0;margin:0;display:grid;gap:8px;}
.commits{font-size:.9rem;color:var(--muted);padding-left:1.1em;}
code{background:#F1F5F9;padding:1px 5px;border-radius:5px;font-size:.9em;}
ol{margin:.3em 0 0;padding-left:1.3em;}
#status{position:absolute;left:-9999px;}
@media (max-width:560px){dl{grid-template-columns:1fr;}.bar button{flex:1 1 45%;}}
"""

JS = r"""
(function () {
  var D = JSON.parse(document.getElementById("data").textContent);
  var KEY = "ff-changes-v2", st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { st = {}; }
  st.status = st.status || {}; st.picked = st.picked || {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var live = document.getElementById("status");
  var f = { size: "all", owner: "all", status: "all" };
  var items = Array.prototype.slice.call(document.querySelectorAll(".item"));
  var entries = Array.prototype.slice.call(document.querySelectorAll(".entry"));
  var byId = {}; D.items.forEach(function (i) { byId[i.id] = i; });
  function statusOf(id) { return st.status[id] || byId[id].status; }
  items.forEach(function (li) {
    var id = li.getAttribute("data-id");
    var sel = li.querySelector("select"); sel.value = statusOf(id); li.setAttribute("data-status", sel.value);
    sel.addEventListener("change", function () { st.status[id] = sel.value; li.setAttribute("data-status", sel.value); save(); apply(); });
    var cb = li.querySelector("input[data-pick]"); cb.checked = !!st.picked[id];
    cb.addEventListener("change", function () { st.picked[id] = cb.checked; save(); summary(); });
  });
  function apply() {
    var shown = 0;
    items.forEach(function (li) {
      var ok = (f.size === "all" || li.getAttribute("data-size") === f.size) && (f.owner === "all" || li.getAttribute("data-owner") === f.owner || (f.owner !== "all" && li.getAttribute("data-owner") === "both")) && (f.status === "all" || li.getAttribute("data-status") === f.status);
      li.hidden = !ok; if (ok) shown++;
    });
    entries.forEach(function (li) {
      var ok = (f.size === "all" || li.getAttribute("data-size") === f.size) && (f.owner === "all" || li.getAttribute("data-owner") === f.owner || li.getAttribute("data-owner") === "both");
      li.hidden = !ok;
    });
    live.textContent = "Showing " + shown + " of " + items.length + " suggested changes";
    summary();
  }
  document.querySelectorAll(".fb").forEach(function (b) {
    b.addEventListener("click", function () {
      var g = b.getAttribute("data-g"); f[g] = b.getAttribute("data-v");
      document.querySelectorAll('.fb[data-g="' + g + '"]').forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      apply();
    });
  });
  function picked() { return D.items.filter(function (i) { return st.picked[i.id]; }); }
  function summary() {
    var p = picked(), c = { S: 0, M: 0, L: 0 };
    p.forEach(function (i) { c[i.size]++; });
    document.getElementById("sum").textContent = p.length ? p.length + " selected: " + c.S + " small, " + c.M + " medium, " + c.L + " large" : "Nothing selected. Tick items to bundle them.";
    document.getElementById("copyAll").disabled = !p.length;
  }
  function selectSize(sz) {
    items.forEach(function (li) { if (!li.hidden && li.getAttribute("data-size") === sz && li.getAttribute("data-status") !== "done" && li.getAttribute("data-status") !== "skipped") { var id = li.getAttribute("data-id"); st.picked[id] = true; li.querySelector("input[data-pick]").checked = true; } });
    save(); summary();
  }
  document.getElementById("selS").onclick = function () { selectSize("S"); };
  document.getElementById("selM").onclick = function () { selectSize("M"); };
  document.getElementById("selL").onclick = function () { selectSize("L"); };
  document.getElementById("clr").onclick = function () { st.picked = {}; items.forEach(function (li) { li.querySelector("input[data-pick]").checked = false; }); save(); summary(); };
  function combined() {
    var p = picked().sort(function (a, b) { return "SML".indexOf(a.size) - "SML".indexOf(b.size); });
    var t = "Do these " + p.length + " changes on fixingfriction.com in one session. Repo: " + D.repo + ".\n\nRules for the whole job:\n" +
      "- Work on a new branch from main (or from the current unmerged branch if it already holds earlier work).\n" +
      "- Order: small first, then medium, then large. One commit and one tag per item, using the tag name given.\n" +
      "- Run node tools/check.mjs after each item and stop and report if it fails. For anything visual, compare before and after screenshots.\n" +
      "- Where an item's Needs line is not met or a [bracket] is unfilled, skip that item and list it at the end instead of guessing.\n" +
      "- Large items: make a plan only and wait for my approval before building.\n" +
      "- Never merge or push. At the end add an entry for each finished item to docs/changes-data.json, mark it done, rebuild /changes/ with python tools/build_changes_page.py, and give me a short report: done, skipped and why, checked, not checked.\n\n";
    p.forEach(function (i, n) { t += "ITEM " + (n + 1) + " of " + p.length + " [" + D.sizes[i.size] + ", tag " + i.tag + "]: " + i.title + "\nNeeds: " + i.needs + "\n" + i.prompt + "\n\n"; });
    return t.trim();
  }
  function copy(text, btn) {
    function ok() { var o = btn.textContent; btn.textContent = "Copied"; btn.classList.add("done"); live.textContent = "Copied"; setTimeout(function () { btn.textContent = o; btn.classList.remove("done"); }, 1800); }
    function fb() { var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); ok(); } catch (e) {} ta.remove(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fb); else fb();
  }
  document.getElementById("copyAll").onclick = function () { copy(combined(), this); };
  document.getElementById("copySt").onclick = function () {
    var lines = []; D.items.forEach(function (i) { if (statusOf(i.id) !== i.status) lines.push(i.id + " (" + i.title + "): " + statusOf(i.id)); });
    copy(lines.length ? lines.join("\n") : "No status changes.", this);
  };
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-copy]"); if (!b) return;
    copy(document.getElementById(b.getAttribute("data-copy")).textContent, b);
  });
  apply();
})();
"""

def fg(group, label, opts):
    out = '<div class="fg" role="group" aria-label="%s"><span class="l">%s</span>' % (label, label)
    for i, (v, t) in enumerate(opts):
        out += '<button type="button" class="fb" data-g="%s" data-v="%s" aria-pressed="%s">%s</button>' % (group, v, "true" if i == 0 else "false", t)
    return out + "</div>"

page = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Changes and next steps</title>
<style>@@CSS@@</style>
</head>
<body>
<main id="main">
  <p><a href="/">Back to the site</a> &middot; <a href="/buildout/">Buildout</a> &middot; <a href="/launch/">Launch checklist</a></p>
  <h1>Changes and next steps</h1>
  <p class="note">Internal page, hidden from search engines. It is both a change log and the planning area for next steps, for people and for Claude. Pick changes by size, tick the ones you want, copy one combined prompt, paste it into Claude Code in the site folder. Every prompt works on a branch, runs the site check, logs itself here, and waits for your OK before anything goes live. <code>robots.txt</code> still blocks crawlers until launch.</p>
  <p><a href="#next">Next steps</a> &middot; <a href="#log">Change log</a> &middot; <a href="#sops">SOPs for Claude and for people</a> &middot; Data file: <code>docs/changes-data.json</code> (last updated @@UPDATED@@)</p>
  <h2 id="sizes">How big is it?</h2>
  <ul class="sizes">@@SIZES@@</ul>
  <h2 id="next">Next steps: suggested changes</h2>
  <div class="filters">@@F1@@ @@F2@@ @@F3@@</div>
  <ul class="list">@@NEXT@@</ul>
  <h2 id="log">Change log</h2>
  <p class="meta">Newest first. Filters above apply here too.</p>
  <ul class="list">@@REC@@</ul>
  <details><summary>Full commit history (latest 80)</summary><ul class="commits">@@COMMITS@@</ul></details>
  <h2 id="sops">SOPs</h2>
  <h3>For Claude (agent SOPs: paste into Claude Code)</h3>
  <ul class="list">@@AGENT@@</ul>
  <h3>For people (human SOPs)</h3>
  <ul class="list">@@HUMAN@@</ul>
  <p id="status" role="status" aria-live="polite"></p>
</main>
<div class="bar" role="region" aria-label="Bundle selected changes">
  <div class="in">
    <span class="sum" id="sum">Nothing selected.</span>
    <button type="button" class="ghost" id="selS">All small</button>
    <button type="button" class="ghost" id="selM">All medium</button>
    <button type="button" class="ghost" id="selL">All large</button>
    <button type="button" class="ghost" id="clr">Clear</button>
    <button type="button" class="ghost" id="copySt">Copy my status updates</button>
    <button type="button" id="copyAll" disabled>Copy combined prompt</button>
  </div>
</div>
<script type="application/json" id="data">@@PAYLOAD@@</script>
<script>@@JS@@</script>
</body>
</html>
"""
page = (page.replace("@@CSS@@", CSS).replace("@@UPDATED@@", esc(data["updated"])).replace("@@SIZES@@", sizes)
        .replace("@@F1@@", fg("size", "Size", [("all", "All"), ("S", "Small"), ("M", "Medium"), ("L", "Large")]))
        .replace("@@F2@@", fg("owner", "Owner", [("all", "All"), ("agent", "Agent"), ("human", "Human")]))
        .replace("@@F3@@", fg("status", "Status", [("all", "All"), ("suggested", "Suggested"), ("in-progress", "In progress"), ("done", "Done"), ("skipped", "Skipped")]))
        .replace("@@NEXT@@", "".join(nxt)).replace("@@REC@@", "".join(rec)).replace("@@COMMITS@@", commits)
        .replace("@@AGENT@@", agent).replace("@@HUMAN@@", human).replace("@@PAYLOAD@@", payload).replace("@@JS@@", JS))
os.makedirs(os.path.join(root, "changes"), exist_ok=True)
open(os.path.join(root, "changes", "index.html"), "wb").write(page.encode("utf-8"))
print("built changes page:", len(items), "suggestions,", len(data["recent"]), "log entries,", len(log), "commits")
