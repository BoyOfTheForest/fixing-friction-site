---
name: no-input-polish-pass
description: Run a no-input "pass and polish" sweep on a website or app project. Finds and ships safe, reversible, tested improvements on a branch without asking the owner for decisions, then reports and waits for approval before anything goes live. Use when the user says pass and polish, polish sweep, "things you can do without my input", or asks for a reusable overnight clean-up pass.
---

# No-input pass and polish

A sweep of work that needs **no taste decisions, no new content and no outside accounts**. Everything is on a branch, tested, reversible, and **nothing is merged or pushed without the owner's explicit yes** (approval for one push never covers the next).

## 0. Ground rules
- Work on a new branch from the current main (or the unmerged branch the work depends on). Tag the starting point (`before-<name>`).
- Big single files (for example a 1 MB `index.html`): never use an editor tool that rewrites the whole file (it truncated one once). Use small scripted edits (Python on bytes), and check line count and tag balance (`div`, `section`, `details`, `ul`, `li`, `figure`, `p`) before and after. Preserve CRLF if the file has it.
- Git on Windows: `-c safe.directory='*'`, and pass `-c user.name=... -c user.email=...` on each command. Use a **noreply** email, never the owner's real address (a privacy hook blocks commands that contain it).
- Keep the owner's rules: keep answers short, no back-and-forth loops, be mindful of tokens.
- Read the project memory and checklist first (MEMORY.md, LAUNCH-CHECKLIST.md or equivalent) so decisions already made are not re-asked.

## 1. Decide the list
Propose 8 to 10 items, ranked by value, each marked: visible or invisible, how it is verified, how it is undone. Include only items from the **safe list**.

**Safe (do without asking):** automated checks and CI; removing internal notes from public source (move to docs, do not delete); typed-URL redirects and 404 handling; link attributes and referrer policy; accessibility testing beyond the automated scan, and fixing what is safe; performance (font preload, image variants, recompression kept only if visually identical); refactors that must be pixel-identical (inline styles to classes); consistency reports (report only); README and developer docs; hidden developer pages.

**Ask first (never do in a no-input pass):** wording or copy edits, new content, legal pages, design taste (images, layout choices, colours), prices and dates, accounts and integrations (CRM, SMS, analytics), anything that publishes, merges, pushes, deletes data or opens the site to crawlers.

## 2. Build a safety net first
Write or reuse the one-command check (`templates/check.mjs`: static checks plus headless Chrome over the Chrome DevTools Protocol with a vendored axe-core): links, assets exist, structured data valid and matching visible text, markup balance, accessibility (WCAG 2.0 to 2.2 AA plus best practice) on every page at 1280, 375 and 320 px, sideways scrolling, keyboard focus visible and not stuck, text-spacing override, script errors, dropdown/Escape behaviour, hidden developer pages. Prove it can fail (break something, see it fail, restore). Run it for a baseline **before** changing anything.

## 3. Do each item
- One item at a time; run the check after each; tag meaningful design commits (`lever-NN`) so each can be reverted with `git revert --no-edit TAG`. Keep the old design reachable (tag, snapshot, patch) and never delete it.
- Pixel-identical refactors: take full-page screenshots of every page before and after with reduced-motion emulation, scroll the page first so lazy images load, wait for images, then diff (per-pixel sum above ~40 on more than ~200 pixels counts as a difference). Flaky diffs usually mean lazy images, so fix the capture, not the page.
- Recompress images only if smaller by 20 percent or more **and** mean pixel difference is small; keep originals in git history.
- Reports, not edits, for anything touching wording (`templates/copy_report.py`).

## 4. Developer pages (hidden from search, linked discreetly in the footer, `noindex`)
- Levers or undo page: per-change undo and redo prompts, live copy of the old design, patches.
- Launch checklist page: phased steps with owners (Claude, Owner, Team), ticks saved locally, prompts for steps Claude can do, and the step that opens the site to crawlers.
- Changes and next steps page (`templates/build_changes_page.py`, data in `docs/changes-data.json`): every suggestion is sized Small, Medium or Large and owned by agent, human or both; filters; tick items to bundle them into one combined prompt (small first, plan-only for large); status tracking; a change log with what, why, how it was checked and how to undo; agent and human SOPs. **At the end of every pass add log entries and new suggestions to the JSON (the page has a Log what you just did prompt) and rebuild the page.**
- Each page must pass the same accessibility check.

## 5. Launch gate
Until the owner and team approve the full build, keep `robots.txt` blocking crawlers and keep the allow-all copy plus a prompt to restore it. Say plainly that blocking stops crawling but does not remove already-indexed pages.

## 6. Finish
- Update the checklist, README, memory, the changes page. Commit on the branch. Run the full check one last time.
- Do not merge or push. Ask once: "Merge and push live?" If a push is blocked by the permission system, stop and ask; do not work around it.
- Final message: what was done per item (one line each), what was checked and what was **not** checked, what needs the owner, and the single question.

## Pitfalls learned
- A hidden browser pane freezes requestAnimationFrame and smooth scrolling: test logic with timers or instant scroll, and dispatch `scroll` manually in that pane.
- Regex over a whole HTML file can match across sections; split by section first.
- Counters and reveal animations make screenshots flaky: emulate reduced motion.
- Inline-style-to-class conversion needs `!important` utility classes to keep the exact cascade.
- Workflow files (`.github/workflows`) can be rejected on push if the token lacks the workflow scope; flag it.
- Pushing a tag set and branches needs the same approval as pushing main.

## Templates
`templates/` holds the site check, the inline-style converter, the copy report and the changes-page builder from the Fixing Friction site. Adapt the page-detection lines (section ids, the `pages` array) for another project.
