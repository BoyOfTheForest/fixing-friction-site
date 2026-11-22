# Fixing Friction website

Static, one-page site. No build step. Live at https://fixingfriction.com (GitHub Pages from `main`, custom domain in `CNAME`, DNS at Squarespace Domains).

## How the site works
- `index.html` holds every page as a `<section class="page" id="page-NAME">`. The router shows one at a time and uses `#NAME` in the address. The list of pages is the `pages` array in the main script.
- `assets/` holds images (with `-800` and `-1280` wide copies used through `srcset`) and the self-hosted fonts.
- Links between pages use `data-go="page"` and optional `data-jump="element-id"`.
- `404.html` redirects typed addresses such as `/audits` to `/#audits`.
- `llms.txt`, `sitemap.xml`, `robots.txt` serve search and answer engines. **`robots.txt` currently blocks all crawlers on purpose** (launch gate) until the team approves the full build. The allow-all copy is `buildout/archive/robots.allow.txt`.

## Hidden developer pages (footer links, hidden from search)
| Address | Purpose |
|---|---|
| `/buildout/` | Design levers: undo and redo prompts, live copy of the old design, patches |
| `/launch/` | Launch checklist with prompts, including how to open the site to crawlers |
| `/changes/` | Change log and next steps: sized (small, medium, large), filterable, tick-to-bundle one combined prompt, agent and human SOPs. Data in `docs/changes-data.json` |

## Check everything with one command
Needs Node 22 or newer and Google Chrome.
```
node tools/check.mjs             # full check: links, assets, structured data, accessibility on every page at 3 widths, keyboard, text spacing, script errors
node tools/check.mjs --static    # fast, no browser
node tools/check.mjs --shots DIR # also save a screenshot of every page (for before and after comparisons)
python tools/copy_report.py      # copy consistency report, written to the internal folder (report only)
python tools/build_changes_page.py  # rebuilds /changes/ from changes-data.json in the internal folder and the git history
```
`tools/vendor/axe.min.js` is axe-core 4.10.2 (MPL 2.0). The check also runs on every push through `.github/workflows/check.yml`.

## Making changes safely
1. Work on a branch. Never edit `index.html` with a tool that rewrites the whole file; use small scripts that check line counts and tag balance (the file is about 1 MB and uses CRLF in the working tree).
2. Design changes are separate commits with a tag (see `/buildout/`), so each can be reverted with `git revert --no-edit TAG`.
3. Run `node tools/check.mjs` before merging. For visual refactors, compare `--shots` before and after.
4. Merge and push only with the owner's approval.
5. Git on Windows here needs `-c safe.directory='*'` and an explicit `-c user.name=... -c user.email=...` on each command.

## Tags
`before-levers` (old design), `lever-01` to `lever-05` (design changes), `lever-06`, `lever-07`, `aeo-08` (SEO and AEO), `launch-gate`, `buildout-page`, `launch-page`.

## Internal notes (not published)
Everything in this repository is served by GitHub Pages, so internal notes, review reports, build history, screenshots and the Changes data file live in a sibling folder outside the repository: `Fixing-Friction-site-v10-internal/docs/` (set `FF_INTERNAL` to use another location). The tools read and write there. Never add a `docs/` folder back to the repository.
- The private working checklist is outside the repo too (`LAUNCH-CHECKLIST.md` in the Antigravity brain folder).
