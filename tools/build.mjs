#!/usr/bin/env node
/* Build: turns the one-file source (src/site.html) into real pages.
     node tools/build.mjs            write index.html, /<route>/index.html and sitemap.xml
     node tools/build.mjs --check    write nothing; exit 1 if any generated file differs from what the source builds
   RULE: index.html, every /<route>/index.html and sitemap.xml are BUILD OUTPUT. Never edit them by hand.
   Edit src/site.html (or this script, llms.txt, 404.html, robots.txt) and run this build, then commit the output.
   Each generated page holds that page's full content in its first HTML plus its own title, meta description,
   canonical address, share tags and JSON-LD. The app script still enhances every page.
   Home is "/", every other route is "/<route>/". Nothing in the source text of a page changes. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://fixingfriction.com";
const LASTMOD = "2026-11-22";
const CHECK = process.argv.includes("--check");

/* Pages that stay out of sitemap.xml and the llms.txt resource lists (standing exclusions). Reachable by direct address. */
export const UNLISTED = ["method", "frictions", "frictions-quiz", "frictions-results", "buildout-page"];
/* Route ids that start with "frictions-" live under /frictions/ (the quiz and the results page of Find Your Frictions). */
export const pathFor = (id) => (id === "home" ? "/" : "/" + id.replace(/^frictions-/, "frictions/") + "/");
/* Old addresses that land on a real page. Used by the homepage hash shim and by 404.html. */
export const ALIASES = { assessments: "audits", consulting: "advising", carecircle: "buildout-page", brainblame: "buildout-page", app: "buildout-page", prototypes: "buildout-page", apps: "buildout-page" };

const EOL = "\n"; /* output is written with LF; git converts line endings per machine, so comparisons ignore CRLF */
const read = (f) => fs.readFileSync(f, "utf8").split("\r\n").join("\n");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildAll(srcText) {
  const src = srcText;
  const mainOpen = src.indexOf('<main id="main">');
  const mainClose = src.indexOf("</main>", mainOpen);
  if (mainOpen < 0 || mainClose < 0) throw new Error("main element not found");
  const re = /<section class="page(?: active)?" id="page-([a-z-]+)"/g;
  re.lastIndex = mainOpen;
  const starts = [];
  let m;
  while ((m = re.exec(src)) && m.index < mainClose) starts.push({ id: m[1], at: m.index });
  const chunks = {};
  starts.forEach((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].at : mainClose;
    const c = src.slice(s.at, end);
    if (!c.trimEnd().endsWith("</section>")) throw new Error("section " + s.id + " does not end at </section>");
    chunks[s.id] = c;
  });
  const before = src.slice(0, starts[0].at);
  const after = src.slice(mainClose);

  const pagesArr = (src.match(/var pages = \[([^\]]*)\]/) || [])[1];
  const routes = [...pagesArr.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  for (const r of routes) if (!chunks[r]) throw new Error("route " + r + " has no section");
  if (Object.keys(chunks).length !== routes.length) throw new Error("section count differs from the pages array");
  for (const r of routes) if (["buildout", "launch", "changes", "docs", "assets", "src", "index"].includes(r)) throw new Error("route name " + r + " is reserved");

  const titlesMap = new Function("return " + src.match(/var titlesMap = (\{[^\n]*\});\n/)[1])();
  const descMap = new Function("return " + src.match(/var descMap = (\{[^\n]*\});\n/)[1])();

  const realHref = (go, jump, role, sc) => {
    let id = ALIASES[go] || go;
    if (!routes.includes(id)) id = "home";
    let q = "";
    if (id === "scorecard" && role) q = "?role=" + role;
    if (id === "ai-scorecards" && sc) q = "?sc=" + sc;
    return pathFor(id) + q + (jump ? "#" + jump : "");
  };

  function rewriteLinks(text) {
    return text.replace(/<a\s[^>]*\sdata-go="[^"]*"[^>]*>/g, (tag) => {
      const attr = (n) => (tag.match(new RegExp("\\s" + n + '="([^"]*)"')) || [])[1];
      const href = attr("href");
      if (!href || !href.startsWith("#")) return tag;
      const go = attr("data-go");
      const hq = href.includes("?") ? new URLSearchParams(href.split("?")[1]) : null;
      const role = attr("data-role") || (hq && hq.get("role"));
      const sc = attr("data-ai-sc") || (hq && hq.get("sc"));
      return tag.replace(/(\shref=")[^"]*(")/, "$1" + realHref(go, attr("data-jump"), role, sc) + "$2");
    });
  }
  const absAssets = (text) => text.replace(/(?<![A-Za-z0-9_\/.\-])assets\/(?=[A-Za-z0-9_.\-]+\.[a-z0-9]+)/g, "/assets/");

  const setOnce = (text, from, to, label) => {
    const parts = text.split(from);
    if (parts.length !== 2) throw new Error(label + ": expected one match, found " + (parts.length - 1));
    return parts.join(to);
  };
  const ldBlocks = [...before.matchAll(/    <script type="application\/ld\+json">[\s\S]*?<\/script>\n/g)].map((x) => x[0]);
  if (ldBlocks.length !== 2) throw new Error("expected two JSON-LD blocks, found " + ldBlocks.length);
  const [ldOrg, ldFaq] = ldBlocks;

  const shim =
    "    <script>\n" +
    "      (function () {\n" +
    '        var h = (location.hash || "").replace(/^#/, "");\n' +
    "        if (!h) return;\n" +
    '        var q = h.indexOf("?");\n' +
    "        var id = (q < 0 ? h : h.slice(0, q)).toLowerCase();\n" +
    '        var query = q < 0 ? "" : h.slice(q);\n' +
    "        var alias = " + JSON.stringify(ALIASES) + ";\n" +
    "        var routes = " + JSON.stringify(routes.filter((r) => r !== "home")) + ";\n" +
    "        id = alias[id] || id;\n" +
    "        if (routes.indexOf(id) === -1) return;\n" +
    '        location.replace("/" + id.replace(/^frictions-/, "frictions/") + "/" + query);\n' +
    "      })();\n" +
    "    </script>\n";

  const pages = {};
  for (const id of routes) {
    let head = before;
    const isHome = id === "home";
    const url = SITE + pathFor(id);
    if (!isHome) {
      const title = titlesMap[id], desc = descMap[id];
      if (!title || !desc) throw new Error("no title or description for " + id);
      head = setOnce(head, /<title>[^<]*<\/title>/.exec(head)[0], "<title>" + esc(title).replace(/&quot;/g, '"') + "</title>", "title " + id);
      head = head.replace(/(<meta name="description" id="metaDesc" content=")[^"]*(")/, (_, a, b) => a + esc(desc) + b);
      head = head.replace(/(<meta property="og:title" id="ogTitle" content=")[^"]*(")/, (_, a, b) => a + esc(title) + b);
      head = head.replace(/(<meta property="og:description" id="ogDesc" content=")[^"]*(")/, (_, a, b) => a + esc(desc) + b);
    }
    head = setOnce(head, '<link rel="canonical" href="https://fixingfriction.com/" />', '<link rel="canonical" href="' + url + '" />', "canonical " + id);
    head = setOnce(head, '<meta property="og:url" content="https://fixingfriction.com/" />', '<meta property="og:url" content="' + url + '" />', "og:url " + id);
    head = setOnce(head, '<meta name="robots" content="noindex, nofollow" />', '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />', "robots meta " + id);
    if (isHome) {
      head = setOnce(head, '    <meta charset="utf-8" />\n', '    <meta charset="utf-8" />\n' + shim, "shim");
    } else {
      const web = { "@context": "https://schema.org", "@type": "WebPage", name: titlesMap[id], description: descMap[id], url, isPartOf: { "@type": "WebSite", name: "Fixing Friction", url: SITE + "/" } };
      const webBlock = '    <script type="application/ld+json">\n' + JSON.stringify(web, null, 2) + "\n    </script>\n";
      /* Home keeps the business block and the FAQ block as written. About holds the full FAQ, so it keeps the FAQ block. Every other page carries a WebPage block that restates its own title, description and address. */
      head = setOnce(head, ldOrg, "", "business JSON-LD " + id);
      if (id !== "about") head = setOnce(head, ldFaq, "", "FAQ JSON-LD " + id);
      head = head.replace("    <style>", webBlock + "    <style>");
    }
    let sec = chunks[id].replace(/^<section class="page(?: active)?"/, '<section class="page active"');
    let html = head + sec + "\n" + after;
    html = rewriteLinks(html);
    html = absAssets(html);
    pages[id] = html;
  }
  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    routes.filter((r) => !UNLISTED.includes(r)).map((r) => "  <url>\n    <loc>" + SITE + pathFor(r) + "</loc>\n    <lastmod>" + LASTMOD + "</lastmod>\n  </url>\n").join("") +
    "</urlset>\n";
  return { pages, sitemap, routes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = buildAll(read(path.join(ROOT, "src", "site.html")));
  const files = [];
  for (const id of out.routes) files.push([id === "home" ? "index.html" : pathFor(id).slice(1) + "index.html", out.pages[id]]);
  files.push(["sitemap.xml", out.sitemap]);
  let changed = 0;
  for (const [rel, text] of files) {
    const full = path.join(ROOT, rel);
    const want = text.split("\n").join(EOL);
    const have = fs.existsSync(full) ? fs.readFileSync(full, "utf8").split("\r\n").join("\n") : null;
    if (have !== want) {
      changed++;
      if (!CHECK) { fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, want); }
      else console.log("OUT OF DATE: " + rel);
    }
  }
  if (CHECK) { if (changed) { console.log(changed + " generated file(s) differ from the source build. Run: node tools/build.mjs"); process.exit(1); } console.log("generated pages are up to date (" + files.length + " files)"); }
  else console.log("built " + files.length + " files (" + changed + " changed)");
}
