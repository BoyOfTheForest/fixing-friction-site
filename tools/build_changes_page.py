#!/usr/bin/env python3
"""Builds /changes/index.html: suggested next changes (copy-paste prompts) first, then the recent changes.
Edit NEXT and RECENT below after each pass, then run:  python tools/build_changes_page.py
The full commit list at the bottom is read from git automatically."""
import html, os, re, subprocess
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REPO = "G:\\CLAUDE\\Fixing-Friction-site-v10"
TAIL = " Work on a new branch, run node tools/check.mjs and compare before and after screenshots, tag the work, and wait for my OK before merging and pushing."

# (title, why it helps, needs, prompt)
NEXT = [
 ("Give every page its own web address", "Today all 38 pages share one address, so search and answer engines can only cite the home page. Separate addresses (for example /audits/) are the biggest search and answer-engine gain left.", "Your go-ahead; it is a larger job.",
  "Plan and build separate, crawlable web addresses for every page of fixingfriction.com (for example /audits/), each with its own title, description, canonical link and structured data, keeping the site fast and the current # links and the 404 redirects working. Repo: " + REPO + ". Show me the plan first, keep the single-page version reachable through a tag, and make the build repeatable." + TAIL),
 ("Answer-first summaries on the main service pages", "Answer engines quote short, direct answers. A 40 to 60 word summary under each headline, plus matching structured data, makes each page quotable.", "A quick read of the wording afterwards.",
  "On the top eight service pages of fixingfriction.com (audits, training, speaking, voting, self-evaluation, advising, plans, services) add a 40 to 60 word answer-first summary under the headline, written only from facts already on the site, and add a matching Service entry with price where one is published to the structured data. Repo: " + REPO + ". List every sentence you wrote so I can review the wording." + TAIL),
 ("Draft the privacy policy, SMS terms and accessibility statement", "Needed before collecting emails or texting, and expected on an ADA consultancy site.", "Your approval of the wording before anything is published.",
  "Draft three pages for fixingfriction.com as plain-language drafts for my review: privacy policy, SMS terms (message frequency, Msg and data rates may apply, reply STOP to cancel, HELP for help), and an accessibility statement. Do not publish or link them until I approve the text. Repo: " + REPO + "." + TAIL),
 ("Real favicon and share image", "The tab icon is blank and the share image is a temporary crop of the home hero.", "The logo or mark files.",
  "Add this favicon and 1200 by 630 share image to fixingfriction.com: [file paths]. Replace assets/og-share.jpg, add the favicon link tags and an apple touch icon, and check the share preview. Repo: " + REPO + "." + TAIL),
 ("Pick one service as the usual starting point", "Showing a recommended first step reduces choice overload (Pareto, Von Restorff).", "Which service books or earns the most.",
  "On fixingfriction.com mark [service] as the usual starting point on the Services page and the home doors, with one short line saying why. Keep everything else equal. Repo: " + REPO + "." + TAIL),
 ("Section-separator images on the homepage", "Two or three full-bleed bands break up the long page without adding text.", "Your pick of images already on the site, or new ones.",
  "Add full-bleed image bands as section separators at the top of two or three long sections of the fixingfriction.com homepage, using these existing images: [list]. Keep each band under 320 pixels tall and decorative (empty alt text). Repo: " + REPO + "." + TAIL),
 ("Wire the scorecard contact block to GoHighLevel", "Turns scorecard results into leads and follow-up.", "The webhook URL (never an API key) and the approved consent text.",
  "Wire the AI scorecard contact block on fixingfriction.com to the GoHighLevel inbound webhook at [URL], set AI_SC_CONTACT_ENABLED to true, add consent wording and spam protection, and test one submission. Never put API keys in the repo. Repo: " + REPO + "." + TAIL),
 ("Privacy-friendly analytics", "Shows which pages and scorecard steps people use.", "Your choice of tool and account.",
  "Add [tool] analytics to fixingfriction.com tracking scorecard started, completed and result shown, and the main buttons, without cookies if possible. Add a sentence to the privacy policy. Repo: " + REPO + "." + TAIL),
 ("Booking calendar on Start a conversation", "Lets people book instead of emailing.", "The GoHighLevel calendar link.",
  "Embed the GoHighLevel booking calendar at [URL] on the Start page of fixingfriction.com, loaded only when the visitor asks for it so the page stays fast, with an accessible fallback link. Repo: " + REPO + "." + TAIL),
 ("Latest posts from the Substack", "Fresh content signals and a reason to come back.", "Nothing, but check how it looks.",
  "Add a Latest from the Substack strip (three most recent post titles and links) to the fixingfriction.com homepage, built at publish time from the Substack feed so the page stays static and fast, with a fallback link if the feed is empty. Repo: " + REPO + "." + TAIL),
 ("Case studies from the proof section", "The JB Duke, Fort Collins City Hall and CareFirst results are the strongest trust signal.", "Facts and permission for anything beyond what is already public.",
  "Turn the existing proof on fixingfriction.com (JB Duke Hotel, Fort Collins City Hall, CareFirst, Duke, Canon) into short case-study sections on the Proof page, using only facts already on the site. List anything that needs my confirmation. Repo: " + REPO + "." + TAIL),
 ("Performance budget in the automatic check", "Stops pages quietly getting heavier.", "Nothing.",
  "Add a performance budget to tools/check.mjs for fixingfriction.com: page weight on a phone connection for the home page and the five heaviest pages, largest image, and font bytes, failing the check when a limit is passed. Repo: " + REPO + "." + TAIL),
]

# (date, title, what changed, tag or commit)
RECENT = [
 ("2026-11-22", "No-input pass and polish sweep (branch sweep-1)", "Added the one-command site check (tools/check.mjs, also run by GitHub on every push): 38 pages at 3 widths for accessibility including WCAG 2.2 target size, sideways scrolling, keyboard focus, text-spacing, script errors, links, assets and structured data. Moved internal build notes out of the public page source. Typed addresses like /audits now land on the right section. Safe external link attributes and a referrer policy. Preloaded fonts, recompressed 20 large images (5 MB saved). Turned 1,076 repeated inline styles into 24 shared classes with all 38 pages checked visually identical. Added a copy consistency report, a developer README, this page, and a reusable skill (no-input-polish-pass) so the same sweep can be run again on any project.", "sweep-1"),
 ("2026-11-22", "Launch checklist page", "Hidden /launch/ page with 27 launch steps in six phases, owners, ticks saved in the browser, and prompts for the steps Claude can do.", "launch-page"),
 ("2026-11-22", "Launch gate", "robots.txt now blocks all crawlers until the team approves the full build. The allow-all copy and the prompt to open the site are on /buildout/ and /launch/.", "launch-gate"),
 ("2026-11-22", "Buildout page and design levers", "Hidden /buildout/ page with undo and redo prompts for levers 1 to 5, a live copy of the old design, and patch files. Old design is never deleted.", "buildout-page"),
 ("2026-11-22", "SEO and AEO", "Structured data with founder, credential, address, Substack link and the published prices; FAQ answers written into the page source with a matching FAQPage schema; llms.txt; share image tags; larger search previews allowed.", "aeo-08"),
 ("2026-11-22", "Responsive images", "800 and 1280 wide copies of every large image, chosen through srcset. Looks the same, loads faster on phones.", "lever-07"),
 ("2026-11-22", "Design levers 1 to 6", "Homepage charts and trailing rows folded; sticky On this page bar with scrollspy; hero buttons on 12 pages; intro text beside its photo on 9 pages and duplicate hero photos removed; no box inside a box; one label per destination.", "lever-01 to lever-06"),
 ("2026-11-22", "Homepage trims, On this page links, Back scroll restore", "Four kinds of friction as a 2 by 2 grid, scorecard strip moved after the two doors, On this page links, scroll position restored on Back, stray reduced-motion CSS fixed.", "937338d"),
 ("2026-11-22", "Header polish", "Shorter, punchier headlines on 15 pages and at most three visible sentences under each headline; the rest sits in a More detail fold-out.", "d684ff4"),
 ("2026-11-22", "Overnight UX pass", "Hero style chosen per page (full-bleed photo or two-column illustration), working Back button, photo beside callout on 12 pages, SEO basics, 404 page, footer email.", "509dbeb"),
 ("2026-11-22", "Accessibility fixes and dead links", "0 axe violations on all 38 pages; dead links fixed; sticky Return to my results bar; hello@fixingfriction.com used everywhere.", "22503d7"),
 ("2026-11-21", "Scorecards and navigation", "Five-menu navigation, unified branching scorecard, revamped results page, three AI scorecards.", "scorecard work"),
 ("2026-11-21", "Site launched on fixingfriction.com", "Single-file site ingested into a clean static repo, deployed on GitHub Pages, domain pointed from Squarespace with HTTPS.", "initial commit"),
]

def esc(s): return html.escape(s, quote=True)
log = subprocess.run(["git", "-c", "safe.directory=*", "-C", root, "log", "--format=%h|%ad|%s", "--date=short", "-n", "80"], capture_output=True, text=True, encoding="utf-8").stdout.strip().splitlines()
nxt = []
for i, (title, why, needs, prompt) in enumerate(NEXT, 1):
    nxt.append('<li class="card"><h3>%d. %s</h3><p>%s</p><p class="needs"><strong>Needs:</strong> %s</p><details><summary>Prompt for Claude Code</summary><pre id="n%d">%s</pre><button type="button" data-copy="n%d">Copy prompt</button></details></li>' % (i, esc(title), esc(why), esc(needs), i, esc(prompt), i))
rec = "".join('<li><p class="when">%s &middot; <span class="tag">%s</span></p><h3>%s</h3><p>%s</p></li>' % (esc(d), esc(tg), esc(ti), esc(tx)) for d, ti, tx, tg in [(a, b, c, d2) for a, b, c, d2 in RECENT])
commits = "".join("<li><code>%s</code> %s %s</li>" % (esc(l.split("|")[0]), esc(l.split("|")[1]), esc(l.split("|", 2)[2])) for l in log if l.count("|") >= 2)

page = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Changes and next steps</title>
<style>
:root{--ink:#102A43;--muted:#334E68;--line:#BCCCDC;--bg:#FFFFFF;--soft:#EFF6FF;--accent:#1E3A8A;}
*{box-sizing:border-box;}
body{margin:0;font:17px/1.6 "Libre Franklin",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:var(--bg);}
main{max-width:860px;margin:0 auto;padding:28px 16px 80px;}
a{color:var(--accent);}
a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid #2563EB;outline-offset:3px;}
h1{font-size:2rem;line-height:1.2;margin:.2em 0 .4em;}
h2{font-size:1.4rem;margin:1.6em 0 .4em;border-top:1px solid var(--line);padding-top:18px;}
h3{font-size:1.05rem;margin:0 0 .3em;}
.note{background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:14px 16px;}
ul.list{list-style:none;margin:0;padding:0;}
.card{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:12px 0;}
.card p{margin:.2em 0;}
.needs{color:var(--muted);font-size:.95rem;}
.when{color:var(--muted);font-size:.9rem;margin:0;}
.tag{background:#F1F5F9;border-radius:6px;padding:1px 7px;font-size:.85rem;}
.recent li{padding:12px 0;border-bottom:1px solid #E5ECF3;}
.recent p{margin:.2em 0;}
summary{cursor:pointer;font-weight:700;color:var(--accent);min-height:44px;display:flex;align-items:center;}
pre{white-space:pre-wrap;word-break:break-word;background:#F8FAFC;border:1px solid var(--line);border-radius:10px;padding:12px 14px;font:.86rem/1.5 ui-monospace,Consolas,monospace;margin:0 0 8px;}
button{min-height:44px;padding:0 18px;border-radius:999px;border:2px solid var(--accent);background:var(--accent);color:#fff;font:inherit;font-weight:700;cursor:pointer;}
button.done{background:#166534;border-color:#166534;}
.commits{font-size:.9rem;color:var(--muted);padding-left:1.1em;}
code{background:#F1F5F9;padding:1px 5px;border-radius:5px;font-size:.9em;}
#status{position:absolute;left:-9999px;}
</style>
</head>
<body>
<main id="main">
  <p><a href="/">Back to the site</a> &middot; <a href="/buildout/">Buildout</a> &middot; <a href="/launch/">Launch checklist</a></p>
  <h1>Changes and next steps</h1>
  <p class="note">Internal page, hidden from search engines. The suggestions come first, each with a prompt to paste into Claude Code in the site folder. Every prompt works on a branch, runs the site check, and waits for your OK before anything goes live. Remember <code>robots.txt</code> still blocks crawlers until launch.</p>
  <h2>Suggested next changes</h2>
  <ul class="list">%s</ul>
  <h2>Recent changes</h2>
  <ul class="list recent">%s</ul>
  <details><summary>Full commit history (latest 80)</summary><ul class="commits">%s</ul></details>
  <p id="status" role="status" aria-live="polite"></p>
</main>
<script>
document.addEventListener("click", function (ev) {
  var b = ev.target.closest("button[data-copy]"); if (!b) return;
  var pre = document.getElementById(b.getAttribute("data-copy"));
  function ok() { var o = b.textContent; b.textContent = "Copied"; b.classList.add("done"); document.getElementById("status").textContent = "Prompt copied"; setTimeout(function () { b.textContent = o; b.classList.remove("done"); }, 1800); }
  function fb() { var r = document.createRange(); r.selectNodeContents(pre); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); try { document.execCommand("copy"); ok(); } catch (e) {} }
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(pre.textContent).then(ok, fb); } else { fb(); }
});
</script>
</body>
</html>
''' % ("".join(nxt), rec, commits)
os.makedirs(os.path.join(root, "changes"), exist_ok=True)
open(os.path.join(root, "changes", "index.html"), "wb").write(page.encode("utf-8"))

# footer link
p = os.path.join(root, "index.html")
t = open(p, "rb").read().decode("utf-8")
old = '<a href="launch/" rel="nofollow" class="quiet-link">Launch checklist</a></p>'
new = '<a href="launch/" rel="nofollow" class="quiet-link">Launch checklist</a> &middot; <a href="changes/" rel="nofollow" class="quiet-link">Changes</a></p>'
if "changes/" not in t and old in t:
    open(p, "wb").write(t.replace(old, new).encode("utf-8")); print("footer updated")
print("built changes page:", len(NEXT), "suggestions,", len(RECENT), "recent entries,", len(log), "commits")
