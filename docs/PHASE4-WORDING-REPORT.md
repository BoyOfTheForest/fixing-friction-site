# Phase 4 wording sweep: before and after

Branch phase4-wording. Page names are page ids (the part after # in the address). head means the page title, description and share tags in the page head. ai-scorecards in this list means text held in the page script (the title and description tables and the scorecard result text), not the AI Scorecards page.

## Change 1. Services order (and Speaking before Training pairs)
- [about, ai-scorecards, head, services] (7) BEFORE: Speaking, Training, Consulting, and Compliance
  AFTER: Speaking, Training, Compliance, and Consulting
- [about] (1) BEFORE: For press, speaking, training, consulting, and compliance inquiries alike
  AFTER: For press, speaking, training, compliance, and consulting inquiries alike
- [audits] (1) BEFORE: Training, speaking, consulting, and advising stand level with audits
  AFTER: Speaking, training, consulting, and advising stand level with audits
- [services] (1) BEFORE: ADA Training &amp; Speaking
  AFTER: ADA Speaking &amp; Training
- [services] (1) BEFORE: ADA Training and Speaking
  AFTER: ADA Speaking and Training
- [training] (1) BEFORE: Training and speaking figures
  AFTER: Speaking and training figures
- [start, training] (2) BEFORE: Training and speaking calendars book a quarter ahead
  AFTER: Speaking and training calendars book a quarter ahead
- [about] (1) BEFORE: Training and speaking book a quarter ahead
  AFTER: Speaking and training book a quarter ahead
- [ai-scorecards, training] (6) BEFORE: Training and Speaking
  AFTER: Speaking and Training
- [about, home] (2) BEFORE: my consulting, speaking, training, and accessibility audits
  AFTER: my speaking, training, accessibility audits, and consulting
- [about] (1) BEFORE: the audits, the speaking, the training, and the standard every deliverable
  AFTER: the speaking, the training, the audits, and the standard every deliverable
- [services] (1) BEFORE: Speaking, training, consulting, and ADA diagnosis are booked all year
  AFTER: Speaking, training, ADA diagnosis, and consulting are booked all year
- [about] (1) BEFORE: Four ways the work happens: cards in the order Consulting, Speaking, Training, Accessibility audits
  AFTER: cards in the order Speaking, Training, Accessibility audits, Consulting
- [llms.txt] (1) BEFORE: It offers accessibility audits and assessments, advising, training, keynote speaking, remediation and transition planning for organizations
  AFTER: It offers keynote speaking, training, accessibility audits and assessments, remediation and transition planning, and advising for organizations

## Change 2. ADA pillar label
No instance of ADA Consulting and Compliance exists on the site (navigation and footer already read ADA Compliance and Consulting from Phase 1). No standalone Consulting label for the pillar was changed; see the undecided list.

## Change 3. For Individuals label to For Everyday Workers
- [home] (1) BEFORE: For Individuals &amp; Families
  AFTER: For Everyday Workers &amp; Families
- [app, athome, brainblame, burnout, carecircle, community, inside, prototypes, tools] (14) BEFORE: For Individuals and Families
  AFTER: For Everyday Workers and Families

## Change 4. Accessibility short form in a section kicker
- [services] (1) BEFORE: Services · Accessibility Solutions
  AFTER: Services · Accessibility

## Change 5. Generic link, button and expander labels
- [brainblame] (1) BEFORE: Get started
  AFTER: Start a conversation (link destination unchanged, #start)
- [reporting] (1) BEFORE: Get started
  AFTER: Start a conversation (link destination unchanged, #start)
- [community] (1) BEFORE: Start inside
  AFTER: Inside Fixing Friction (link destination unchanged, #inside)
- [app] (1) BEFORE: More detail
  AFTER: More about The App
- [brainblame] (1) BEFORE: More detail
  AFTER: More about Brain Blame
- [carecircle] (1) BEFORE: More detail
  AFTER: More about CareCircle
- [verticals] (1) BEFORE: More detail
  AFTER: More about client verticals
- [pathways] (1) BEFORE: More detail
  AFTER: More about ADA pathways
- [materials] (1) BEFORE: More detail
  AFTER: More about The Second Reading
- [audits] (1) BEFORE: More detail
  AFTER: More about audits and assessments
- [findings] (1) BEFORE: More detail
  AFTER: More about findings reports
- [communications] (1) BEFORE: More detail
  AFTER: More about accessible communications and media
- [cohesion] (1) BEFORE: More detail
  AFTER: More about the Team Cohesion Snapshot
- [support] (1) BEFORE: More detail
  AFTER: More about ongoing support
- [training] (1) BEFORE: More detail
  AFTER: More about ADA training
- [evidence] (1) BEFORE: More detail
  AFTER: More about evidence and case studies
- [modules] (1) BEFORE: More detail
  AFTER: More about the modules
- [titles] (1) BEFORE: More detail
  AFTER: More about the ADA Titles
- [plans] (1) BEFORE: More detail
  AFTER: More about remediation and transition planning
- [directory] (1) BEFORE: More detail
  AFTER: More about the directory
- [start] (1) BEFORE: More detail
  AFTER: More about getting started
- [athome] (1) BEFORE: More detail
  AFTER: More about At Home
- [burnout] (1) BEFORE: More detail
  AFTER: More about Burnout Bingo

## Change 1 exception list: sequence and process copy left unchanged
- services: "Audits find the barriers. Planning puts the fixes in order. Training prepares the team. Consulting carries the decisions through." and "ADA Audits, Remediation and Transition Planning, ADA Training, and ADA Consulting" (order of an engagement)
- verticals: "Pathway: Training, Consulting and Advising on live decisions, Accessible Communications and Media..." and "...remediation planning, Ongoing Support" (pathways by sector, in order)
- pathways: "Training leads to Consulting and Advising, which leads to Audits", the flow diagram and its alt text, the step headings and "carried by ongoing work, training, advising, and consulting, month to month"
- speaking: "A speaking agreement can name a follow-on training date" (how work unfolds)
- start: "July and December 3 for speaking, April, May, and October for training and diagnosis" (calendar mapping)
- scorecard and cohesion pages: "the training and consulting that answer them" (already in Training then Consulting order)
- structured data: the Snapshot, Assessment, Audit, Advising, Training, Remediation offer order in the page's JSON-LD, and its description sentence "Accessibility Assessments, accessibility audits, advising, training, remediation and transition planning" (not a services scanning list; mapping to the four services needs your decision)
- services meta description "Keynote Speaking, Training and Workshops, Fractional Consulting and Advising, and Accessibility and Usability Testing" (names offers, not the four services; left)

## Change 4 undecided list: fits neither list, left unchanged
1. Homepage runtime title. After the page loads, the script sets the title to "ADA Accessibility Consulting in Fort Collins, CO | Fixing Friction", which replaces the static title "Fixing Friction | Accessibility Solutions: Speaking, Training, Compliance, and Consulting". The long form is in the static title only.
2. Homepage body copy has no sentence with "Accessibility Solutions". Phase 2 replaced the old hero eyebrow that carried it, so the "first mention in homepage body copy" rule has nothing to keep. Adding a sentence is a copy change outside this sweep.
3. Page titles for the service pages (for example "ADA Consulting Services: Audits, Advising, Training and Plans | Fort Collins, CO") do not use "Accessibility Solutions" and were not changed, per "do not shorten any title".
4. Logo lockup byline: the header uses the tagline "Seen, heard, understood, and connected" (hidden below 1600 px), not "Accessibility". No byline was changed.
5. Body-copy mentions of "Accessibility" in the sense of Accessibility Friction, Accessibility Assessment and Accessibility Audit are product and term names, not the umbrella wording, and were not changed.

## Other items left for your decision (not changed)
- About page card headed "Consulting" (Four ways the work happens, advice and plans for barriers) and the services page card "Consulting" (AI in live consulting): standalone label that is one of four ways or a method, not the pillar label. Not renamed to ADA Compliance and Consulting.
- Lines in Matthew's voice reordered by mapping: "accessibility audits" and "ADA diagnosis" were treated as the Compliance item (About and home quote line, About "the audits", services "ADA diagnosis", llms.txt "accessibility audits and assessments"). Please confirm that mapping.
- "For Everyday Workers and Families" now reads as a label on 15 kickers and audience tags. The literal replacement kept "and Families".
- Generic labels left: "Learn more about our prototype programs" (names its object, 4 places), "Start with 2.1" scorecard buttons (names a scorecard number), "More ways in" and "More on the field work" expanders, and the scorecard controls Continue, Back, Next question, Start over (form controls, not site links).
