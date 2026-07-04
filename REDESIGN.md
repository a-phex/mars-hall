# marshallvisuals.com — Monochrome Redesign Brief

**Status:** research + direction (2026-06-11). Not yet implemented.
**Verdict on current site:** the "editorial tile / Vol. I · 2026" redesign reads as an agency template — magazine-issue numbering, italic-laden tagline, decorative editorial chrome. None of it sells what Ash actually sells. Replace the language entirely; keep the content and the single-page IA.

---

## 1. Purpose check (what this site is FOR)

**Positioning correction (Ash, 2026-06-11): NOT a television/production-person portfolio.** Ash is a **multimedia creative** — video, stills, behind-the-scenes and graphics work **in equal measure**. The site is a professional, low-friction place to show off mixed work, and every part of it must stay editable through Portfolio Publisher (port 5241) via the existing `data/*.json` files. No hand-maintained content in markup.
The buyer is still a marketing manager / producer / agency lead deciding quickly — but what they should take away is *range with one consistent eye*, not "director with a reel".

## 2. Design read

**Site title: "Marshall"** (not "Ash Marshall") — wordmark and hero h1.

**Abundance principle (Ash, 2026-06-12):** the page should feel ALIVE with content. Ash will fill it with current AND archived work — bright, vibrant stills/graphics, "loads of" BTS, plenty of video. The design must scale to abundance: dense rich galleries, not curated scarcity. This is exactly why the monochrome chassis works: any amount of vibrant mixed work stays coherent when the chrome is ink-on-paper and tiles rest in greyscale; colour blooms as you move through it. Density dial moves UP (3 → 5); galleries get "show more" expansion rather than hard caps, so the page stays fast while holding everything.

Monochrome editorial-technical portfolio for a multimedia creative. Paper-white ground, ink type, hairline structure, mono annotations — the Afterglow *light* voice (the style doc itself says the light theme is "suited to client-facing pages, the marshallvisuals.com website"), pushed to true black-and-white. **The only colour on the page is the work itself, plus one accent.**
Dials: VARIANCE 6 · MOTION 6 · DENSITY 5.

### The signature move
**Every tile — video, still, BTS, graphic — is greyscale at rest and returns to full colour on hover/in-view.** This matters double for mixed media: four content types with four different colour temperaments would fight each other in a shared grid; monochrome at rest unifies them into one calm surface with one consistent eye, and the colour reveal works identically across all of them. Cheap to build (`filter: grayscale(1)` → `0`, 300ms).

## 3. Tokens

```css
:root {
  --paper:   #f4f2ee;   /* warm paper, not clinical white */
  --ink:     #141312;   /* near-black, warm */
  --ink-60:  #5d5a55;   /* secondary text */
  --ink-30:  #b9b5ae;   /* captions, rules */
  --hairline:#e2dfd9;
  --accent:  #c44c16;   /* Cinder — the Afterglow light-theme amber-rust. Tungsten, filmic. */
  /* Accent appears ONLY on: link underlines/hover, active nav, play affordance, focus rings.
     Never on backgrounds, never on more than one element per viewport at rest. */
}
```
Dark is NOT offered. One theme. Radius: 0–2px (print-like, sharp) — this is the anti-Gym-Hub; the two products should not share a shape language.

## 4. Type

- **Display + body: Satoshi** (Fontshare, free, self-host woff2). Headlines tight-tracked, weight 700/500. NOT Inter, NOT a serif (taste-skill discipline: sans display is the default for a modern creative; serif here would be costume).
- **Annotations: IBM Plex Mono** — credits, durations, years, client names, nav. This is the Afterglow mono voice carried over: data annotated like a camera report (`02:14 · Microsoft · 2025`), small caps-ish, --ink-60.
- Scale: hero name ~clamp(40px, 7vw, 84px); section heads 22–28px; everything else 14–15px. Hierarchy by weight and ink-level, not size escalation.

## 5. Sections — purpose, front-end behaviour, back-end editing (Ash's spec, 2026-06-12)

Single index.html stays; all content from `data/*.json`. Sections get equal visual weight. **Sections are re-orderable from the publisher** (order array in `site.json`). Layout is nearly full-width (3vw side padding, no max-width cap).

1. **Hero** — title **"Marshall"**, one plain line, one link. Greyscale→colour wake-up.

2. **Work** — *a bank of highlighted selected videos.* One LARGE persistent player at the top, defaulting to the most recent video; the highlight bank sits below/beside it and clicking any thumbnail loads it into the large player (no page jump, swap-in-place). Mono annotation under the player (title · client · runtime).
   *Back end:* an appendable, re-arrangeable **list of URLs** — paste a YouTube link, the publisher auto-pulls title, info and thumbnail (oEmbed + img.youtube.com), shows a small thumb per row, drag to reorder. Nothing else to fill in unless overriding.

3. **Stills & Design** — *a cache of photographs and graphic design work.* A selection shows on the main page; a **"view more"** button expands the collapsed remainder in place (full set). Clicking any image opens the **lightbox with prev/next arrows**; lightbox shows the high-res plus **camera EXIF** (camera, lens, exposure — partially built already, verify in image_utils) and an optional note below.
   *Back end:* re-arrangeable image grid. **Upload high-res → publisher auto-generates low-res WebP** for the scrolling page (page speed), high-res served only in the lightbox. EXIF extracted at upload and stored in the JSON.

4. **Behind the Scenes** — same pattern as Stills (small set on main page + "see more" expansion, same lightbox), but the grid **also accepts video items** — YouTube links OR uploaded files — living among the images with the same tile treatment (corner play affordance).
   *Back end:* identical editor to Stills plus an "add video (URL or file)" path.

5. **The Archive** — the index list stays, with **more per-row info: date + video count** (`2019 · Exhibition World · 14 films`). Clicking a row **slides out a player frame + thumbnail grid of that group's videos beneath the row** (expand-in-place accordion) — content hidden until people choose to dive in. This section will hold a HUGE number of YouTube links organised into groups.
   *Back end:* **create groups; append videos into a group by URL** (auto-pull title/info/thumbnail as everywhere); re-arrange videos within a group by drag OR one-click sort-by-date; **re-arrange group order** as shown on the main page.

6. **Electra** — full-width band: poster, logline, expand-to-play, stills strip.

7. **About** — *LinkedIn-ified*: profile photo, name, title; **software-proficiency keyword chips** under the name (Premiere, After Effects, DaVinci, Photoshop, etc.); a short blurb to one side; one highlighted **contact link → LinkedIn DMs**.
   *Back end:* simple field editor (photo, name, title, chips list, blurb, contact URL). No layout controls needed if the layout is right.

**Publisher compatibility rule:** every section renders purely from its JSON; new fields optional with sensible defaults.

Nav: fixed, tiny, mono — one line, ≤64px.

## 6. Motion rules — DYNAMIC variant (Ash, 2026-06-12: "more interactive, sections moving in and out of the side as you scroll")

Researched verdict ([Lovable scroll-pattern guide](https://lovable.dev/guides/scrolling-designs-patterns-when-to-use), [Awwwards horizontal-layout showcase](https://www.awwwards.com/websites/horizontal-layout/)): **scroll-triggered reveals and side-entering sections = excellent for portfolios; full scroll-hijack = use at most ONCE, deliberately; multi-directional scrolling = avoid** (WCAG problems, mobile pain). The buyer must always be able to flick straight down the page — motion decorates the scroll, never owns it.

The kit (demonstrated live in `mockup-monochrome.html`):
1. **Side-entering sections** — APPROVED VALUES (mockup-tested with Ash 2026-06-12): sections sweep in from alternating sides at **translateX(±75vw) + scale(.92)** (Ash asked for bigger travel twice — this is the approved third iteration; sections are nearly full-width so the sweep reads as the whole page moving), easing `cubic-bezier(.16,1,.3,1)`, `animation-range: entry 0% → 80%`; section heads counter-sweep from the opposite side at ±26vw over entry 0% → 95%. `body { overflow-x: clip }` guards against lateral scrollbars. Implemented with **pure-CSS scroll-driven animations** (`animation-timeline: view()`, `animation-range: entry`): zero JS, GPU-only (transform/opacity), wrapped in `@supports` so unsupporting browsers just get the static layout. No GSAP dependency on a static GitHub Pages site.
2. **Scroll-bound colour return (mobile)** — phones have no hover, so tiles regain colour as they cross mid-viewport (`animation-range: cover 25% → 55%`). The signature move becomes *scrub-driven* on touch: the page literally colours in as you move through it.
3. **One permitted hijack moment, maximum** — if any section earns a horizontal pan tied to vertical scroll, it's **BTS** (a filmstrip lateral scrub fits the content's meaning). Optional, build last, and only with `start: top top` pinning done properly; everywhere else vertical scroll stays untouched.
4. **Expand-in-place mechanics everywhere content hides**: Work player swap-in-place, Stills/BTS "view more" expansion, Archive group accordion — all the `grid-template-rows 0fr→1fr` pattern.
5. **Hover motion layer (Ash, 2026-06-12)**: tiles lift `translateY(-6px)` with a soft ink shadow on expo-out easing; archive row names nudge `translateX(8px)`; play affordances fade in. Everything 200-300ms, transform/opacity only.
6. **THE DYNAMIC FIVE (approved 2026-06-12, all in scope):**
   1. **Colour torch** — the signature upgrade: colour follows the cursor inside tiles as a soft circular reveal (two stacked layers: grey base + colour layer with `mask-image: radial-gradient(circle 140px at var(--x) var(--y), #000 30%, transparent 70%)`; one pointermove handler per grid writing `--x/--y`). Whole-tile colour flush stays as keyboard-focus fallback; mobile keeps scroll-driven colour-in.
   2. **Living video thumbnails** — on hover, video thumbs cycle YouTube's auto frames `mq1.jpg → mq2.jpg → mq3.jpg` (~600ms interval, JS interval on mouseenter, clear + reset on leave). Zero video loading.
   3. **Grow-from-tile lightbox** — View Transitions API: clicked still expands from grid position into the lightbox and back (`view-transition-name` on the active tile + `document.startViewTransition`); fade fallback when unsupported.
   4. **Masonry drift** — Stills/BTS alternate columns translate ±30px at different rates over a viewport, scroll-driven (`animation-timeline: view()` on column wrappers). Subtle depth for dense galleries.
   5. **Hero letterbox exit** — cinema bars close in from top/bottom as the hero leaves the viewport (`animation-timeline: scroll()` on two pseudo-bars) while the hero recedes ~4%.
   Second tier (build if the five land well): single reversing marquee strip, archive accordion 40ms cascade, "Marshall" clip-path ink-wipe on first load.

7. **THE ALIVE KIT (researched 2026-06-12)** — lightweight gizmos, zero libraries, grouped by cost:

   *Free polish (one-liners, ship in foundation):*
   - `text-wrap: balance` on headings, `text-wrap: pretty` on the blurb.
   - Inverted `::selection` (ink background, paper text) — on-brand when anyone selects text.
   - Custom `:focus-visible` ring: 1px accent hairline, offset 3px.
   - **Dot-leader rows** in the Archive: mono dots filling name→count gap, like a camera-report table. Pure CSS, makes the index feel typeset.

   *Scroll-native (pure CSS, @supports-gated):*
   - **Scroll progress hairline** — 2px accent line across the very top, width driven by `animation-timeline: scroll()`. Reads as a timeline scrubber for the page. One rule.
   - **`@starting-style` reveals** — "view more" gallery items animate in from `display:none` natively, no JS measuring.
   - **`interpolate-size: allow-keywords`** — the Archive accordion animates `height: auto` natively (replaces the 0fr→1fr grid trick where supported).
   - **`sibling-index()` stagger** — tile cascade delays via `animation-delay: calc(sibling-index() * 40ms)`, no classes, no JS (emerging support; static fallback fine).
   - **Scroll-state nav** — `container-type: scroll-state` styles the nav when stuck instead of a JS scroll listener.

   *Signature gizmos (tiny JS, 10–20 lines each):*
   - **Count-up archive numbers** — group film-counts count up from 0 when scrolled into view (animatable `@property` integer + counter, or tiny IO handler). Makes the index feel live-tallied.
   - **Cursor-following row thumbnail** — in the Archive, a small preview image floats along beside the cursor while hovering a row (classic director-index move; pairs with the colour torch).
   - **Wordmark scramble** — "Marshall" letters scramble→resolve once on load (and on hover): the one-shot glitch vocabulary, ~15 lines.
   - **Variable-weight hover** — Satoshi variable font: nav/heading hover eases weight 500→700 via `font-variation-settings` transition. Type that responds like material.

   Rule: each gizmo must pass the "does it decorate the content or distract from it" check at review; reduced-motion collapses all of them.
- Stagger inside sections: tiles may arrive 40–60ms apart on first reveal, once. No looping anything.
- `prefers-reduced-motion`: ALL of the above collapses — static layout, thumbnails in colour.
- Still banned: marquees, scroll cues, custom cursors, snap-scroll on mixed-height content, parallax backgrounds (`background-attachment: fixed` breaks iOS).

## 7. Anti-tells (enforced, from the taste-skill pre-flight)

No issue/volume numbering · no em-dashes anywhere · max 1 eyebrow per 3 sections (target: zero) · no section-number labels · no locale/time strips · no "scroll" cues · no three-equal-card rows · no pills overlaid on images · no photo-credit-as-decoration · hero ≤ 4 text elements · one accent, locked.

## 8. References (why each matters)

- [Tempixel — cinematographer site teardown](https://www.tempixeldesign.com/blog/cinematographer-website-examples) — Tim Flower's hover-autoplay-without-sound + hairline grid is the closest mechanical match to this brief; Catherine Goldschmidt proves "one accent against white, little goes a long way".
- [Minimalio — director portfolios](https://minimalio.org/film-director-portfolio/) — Aaron Egbert Allsop: bold black-on-white text-centric restraint.
- [SiteBuilderReport filmmaker roundup](https://www.sitebuilderreport.com/inspiration/filmmaker-portfolios) — Alexandros Maragos: full-screen imagery on a refined B&W palette (the "chrome recedes, footage pops" proof case).
- [Format — film portfolio examples](https://www.format.com/magazine/film-based-portfolio-examples) — fixed minimal nav anchoring full-bleed video.
- Internal: `~/Desktop/videographer-toolkit/afterglow-examples.html` panel 08 — the expanding video player already built with this site's real footage; `VISUAL_STYLE.md` light-theme section — the sanctioned base palette this brief derives from.

## 9. Portfolio Publisher revamp (the back end)

Current state (audited 2026-06-12): Flask app at `~/Desktop/videographer-toolkit/tools/portfolio_publisher/` (841-line `app.py`, single 2,150-line template, ~35 endpoints, git commit/push built in, `image_utils.py` WebP pipeline exists).

**The core decision (Ash, 2026-06-12): STRIP BACK the generic CMS.** The pages→blocks model with add-sections and interchangeable everything made it too complex. The site has a fixed set of sections, each with a specific purpose — so the publisher becomes **one purpose-built editor per section** instead of a generic block machine. Trade flexibility for usability, deliberately. (Keep the data layer; retire the UI complexity.)

**Dashboard:** the site's sections as cards, in page order, with a **drag-to-reorder for the sections themselves** (writes the order to `site.json`). Click a card → that section's editor:

| Section | Editor |
|---|---|
| Work | URL list: paste link → auto-fetch title/info/thumb (YouTube oEmbed). Rows show small thumb + title. Drag to reorder. Top of list = the large player's default (most recent first). |
| Stills & Design | Re-arrangeable image grid. Drop high-res files → auto low-res WebP for the page, high-res kept for lightbox. EXIF extracted on upload (verify existing image_utils support), editable note per image. "Shown on main page" = first N by order. |
| BTS | Same editor as Stills + "add video" (YouTube URL or file upload) items mixed into the grid. |
| Archive | Group manager: create/rename groups, drag group order. Inside a group: paste URLs to append (auto title/thumb/date), drag to reorder or one-click sort-by-date. Row shows the count that the front-end displays. |
| Electra | Poster, logline, video link, stills strip. |
| About | Field editor: photo, name, title, software chips (tag input), blurb, LinkedIn contact URL. |
| Hero | Image/loop file + the one line of copy. |

**Cross-cutting:**
- Bulk drop-zone uploads with progress (essential for the BTS/stills abundance).
- WordPress media importer — pull the remote BTS/Electra images local, WebP them, rewrite JSON.
- Live preview of the NEW design with local data before pushing.
- One-click publish (existing commit+push) with a plain-language diff summary ("12 photos added to BTS, archive group 'ISE 2019' created with 14 videos").
- Old pages/blocks endpoints stay functional during migration, then get retired once the section editors cover everything.

## 10. Implementation roadmap — with delegation model (efficient-fable)

**Delegation rules v2 (tightened 2026-06-12 — Ash: "offload grunt work, you're burning my tokens"):**
- **QA is grunt work too.** Behavioural verification (DOM probes, interaction tests, grep sweeps, node --check, mobile checks) goes to a CHEAP VERIFIER PACKET (haiku/sonnet) with an explicit checklist and expected values; Fable only reads the verifier's report and rules on ambiguous findings. Fable does not personally drive 15-probe QA loops again.
- **Environment debugging gets ONE Fable look, then a packet.** If a tool misbehaves (blank screenshots, frozen transitions), Fable forms the hypothesis and hands the systematic testing to a cheap agent.
- **Tracker syncs (vault/session-log/memory) batched once per milestone**, not per sitting.

**Original rules (lesson from the Gym Hub run, 2026-06-11):** subagent packets must be LEAN — paste the exact spec extract INTO the prompt (never make a cheap agent read this whole file or the reference images; that burned ~100k tokens producing nothing). Each packet: exact file list, inline spec, hard no-touch rules (IDs, data shapes, publisher endpoints), grep-level self-verification only. Fable does all visual QA. Sequential agents when sharing files. If spend limits block subagents again, Fable executes the same packets itself via batched operations.

**Phase A — website**
| # | Sitting | Who |
|---|---|---|
| 1 | Foundation: tokens, Satoshi/Plex Mono self-host, nav, Marshall hero (+ letterbox exit #5, ink-wipe if time) , scroll-entrance system at v3 values | **Fable** (everything depends on it) |
| 2 | Work section: persistent player + highlight bank swap, greyscale mechanic, living thumbnails (#2) | **Sonnet packet** (player swap spec + thumb-cycle recipe inline) |
| 3 | Stills & Design + BTS galleries: view-more expansion, lightbox + EXIF, grow-from-tile (#3), masonry drift (#4) | **Sonnet packet** (View Transitions recipe inline) |
| 4 | Archive accordion + Electra band + About (LinkedIn-ified) | **Sonnet packet** |
| 5 | Colour torch (#1) + hover layer polish + mobile pass + taste-skill pre-flight + Lighthouse | **Fable** (signature interaction + judgment QA) |

**Phase B — publisher (strip-back)**
| # | Sitting | Who |
|---|---|---|
| 6 | Section-cards dashboard + section reorder + Work URL-list editor (oEmbed fetch) | **Fable specs dashboard UX → Sonnet builds editors** |
| 7 | Stills/BTS editors: bulk drop-zone, auto low-res WebP, EXIF extraction, mixed video items; WordPress importer | **Sonnet packets** (pipeline code is mechanical; image_utils exists) |
| 8 | Archive group manager + About/Electra/Hero field editors + live preview + publish-with-summary + retire old block endpoints | **Sonnet packets, Fable reviews endpoint retirement** |

**Phase C — content load-in:** Ash fills the site via the new publisher; Fable QA at real volume, tune "show more" thresholds.
