// Phase 4.5 check: no leader service fee in public copy; labels; no new prices. Static, no browser.
// Usage: node tools/pricing_check.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(ROOT, "src", "site.html"), "utf8").replace(/\r\n/g, "\n");
const llms = fs.readFileSync(path.join(ROOT, "llms.txt"), "utf8");
const fails = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };

// 1. every dollar figure left in the page and llms.txt must sit in an allowed context (statistics, the Diagnostic Ladder and audit figures, the held flagship seat)
const ALLOWED = [
  /DOJ penalty|violation|subsequent one|\$118,225|\$236,451/,                          // statistics: federal penalties
  /\$1\.5M/,                                                                          // statistic: JB Duke
  /Fixed at \$950|Cost: \$950|lvl-price-tag|\$950 for one place|Surface Audit, \$950/, // Diagnostic Ladder Level 1
  /From \$1,500|Level 3/,                                                             // ladder Level 3
  /Full Audit pricing, exactly as scoped|single site facility audit|WCAG audit|Program and policy audit|Multi-site work from|Facility audit, single site|Website and WCAG|facility audit at/, // audit figures kept (undecided)
  /\$1,500 per seat/,                                                                 // flagship seat on the Inside page (held, undecided)
  /Level 1, between|keep the labels they already/,                                    // ladder label note
  /program and policy audit|multi-site work from/i,                                   // llms.txt audit figures (undecided)
];
const hits = [];
for (const [name, txt] of [["index.html", html], ["llms.txt", llms]]) {
  const re = /\$\s?\d[\d,.]*[kKM]?\+?/g; let m;
  while ((m = re.exec(txt))) {
    const ctx = txt.slice(Math.max(0, m.index - 90), m.index + 90);
    if (/^\s*(\.|\{|--)/.test(txt.slice(m.index - 3, m.index))) continue;
    if (!ALLOWED.some((a) => a.test(ctx))) hits.push(name + ": " + m[0] + " | " + ctx.replace(/\s+/g, " ").replace(/<[^>]+>/g, " ").trim());
  }
}
ok(hits.length === 0, "every remaining dollar figure is a statistic, a Diagnostic Ladder or audit figure, or the held Inside seat " + JSON.stringify(hits, null, 1));
// 2. no leader service fee wording
const BAD = [/per hour/i, /per month/i, /hourly/i, /prepaid advising/i, /\$\s?175\b/, /\$\s?800\b/, /\$2,950|\$2,250|\$1,250|\$750\b|\$4,500|\$7,500/, /in person and \$1,500|\$2,500 in person|\$1,500 virtual/, /affordable|budget friendly|low cost/i, /Paid Coaching Community|paid community/i];
const htmlNoLegal = html.replace(/small, affordable corrections/g, "small corrections"); // pre-existing readily achievable wording, not replacement copy
for (const re of BAD) ok(!re.test(htmlNoLegal) && !re.test(llms), "absent: " + re);
// 3. structured data: no price on keynote or Second Reading offers
const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const offers = []; (function walk(o) { if (o && typeof o === "object") { if (o["@type"] === "Offer") offers.push(o); Object.values(o).forEach(walk); } })(ld);
const priced = offers.filter((o) => o.priceSpecification).map((o) => o.itemOffered.name);
ok(!priced.some((n) => /Keynote|Second Reading/.test(n)), "structured data: no price on keynote speaking or Second Reading offers (priced offers left: " + priced.join("; ") + ")");
// 4. group coaching label
ok(/The Fixing Friction Community is a paid group coaching program for Divergent Doers who are affected by one or more of these: neurodivergence, a disability, or a chronic health condition, with AI empowerment woven through the work\./.test(html), "full Community description present word for word");
ok((html.match(/Fixing Friction Community/g) || []).length >= 8, "the name Fixing Friction Community is used at the labelled places");
ok(!/\bpaid community\b/i.test(html), "paid community never used on its own");
ok(!/Community[^.<]{0,40}(price|\$|cohort size|launch date|enroll)/i.test(html.slice(html.indexOf('id="community-membership"'), html.indexOf('id="community-membership"') + 3000)), "no price, launch date, cohort size or enrollment claim added to the Community block");
// 5. the core sentence is used where fees were removed
const core = "Fees are set by scope, audience, and format, and are agreed in a discovery call.";
ok((html.split(core).length - 1) >= 10, "core sentence appears at the replaced listings (" + (html.split(core).length - 1) + " places)");
ok(!/—/.test(core), "no em dash in the core sentence");
// 6. closing rulings: seat price on the Inside page only, minimum term present, no docs folder published
{
  const seats = [...html.matchAll(/per seat/g)].length;
  const insideStart = html.indexOf('id="page-inside"'); const insideEnd = html.indexOf("</section>", insideStart);
  const seatPos = html.indexOf("$1,500 per seat");
  ok(seats === 1 && seatPos > insideStart && seatPos < insideEnd, "the $1,500 per seat price appears once, on the Inside page only");
  ok([...html.matchAll(/three month minimum|3-month minimum|3 month minimum|Three month minimum/g)].length === 9, "all nine three month minimum terms are present");
  ok(!fs.existsSync(path.join(ROOT, "docs")), "no docs folder in the published repository");
  ok(!/\/docs\//.test(html) && !/docs\//.test(llms), "no page or llms.txt links to a docs address");
}
console.log(fails.length ? "\nFAILED: " + fails.length : "\nALL PHASE 4.5 CHECKS PASSED");
process.exit(fails.length ? 1 : 0);
