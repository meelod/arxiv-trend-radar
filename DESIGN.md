---
version: 0.1
name: arxiv-trend-radar
position: "Editorial Intelligence"
description: >
  A research-aggregation tool designed with the typographic weight of a magazine
  and the data-density of a terminal. The page reads like an artifact someone
  serious would publish — not a SaaS dashboard, not a minimalist landing page,
  not a generic data tool. Type does most of the work. Color is rationed.
  Borders are hairlines, never shadows. Every surface either carries content or
  earns its emptiness.
references:
  - linear.app   # for hairline borders + accent restraint + technical density
  - notion       # for warm minimalism + serif-led hierarchy
  - wired        # for editorial confidence on dense content + mono eyebrows
synthesis: >
  This is not a clone of any reference. The position arxiv-trend-radar wants to
  hold is the intersection: warm minimalism (Notion) + accent restraint and
  hairlines (Linear) + editorial confidence (Wired). The product is a magazine
  that runs on data — and the design language is built to support that double
  identity, not pick a side.
---

## 1. Position

**Editorial Intelligence.** Pick the one phrase the design has to defend.

The product synthesizes ~1500 arXiv papers/day into a briefing and a weekly
trend report; it surfaces research clusters and citation signals. The content
is dense, technical, and time-anchored. The right design metaphor is *edited
publication*, not *SaaS dashboard*. Bloomberg Terminal × NYT Magazine × Linear's
restraint.

Three commitments that follow from that position:

1. **Type does the heavy lifting.** Hierarchy is built from font choice + weight
   + size — never from boxes, shadows, or filled backgrounds.
2. **Hairlines, not shadows.** Borders are 1px stone. Cards are panels held by
   typographic rhythm and whitespace, not visual weight.
3. **One accent, used sparingly.** A single warm signal color marks
   interactivity and active state. Data states (NEW / GROWING / SHRINKING) get
   their own desaturated palette — the accent is *not* the data palette.

What this design is **not**:
- Not a card-and-shadow SaaS dashboard. Cards exist but they're flat panels.
- Not a typography-only minimalist site. The content is dense; the layout
  rewards scanning.
- Not a "research tool" stereotype (gray, cramped, scientific-paper aesthetic).
  The page should look approachable to a designer, not just a scientist.

---

## 2. Color

The palette has three jobs: **canvas** (everything that's neither text nor
data), **ink** (everything that reads), and **signal** (one accent + a small
data palette for trend states).

### 2.1 Canvas & Ink (the everyday surface)

**Light theme**

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#fafaf6` | Page background. Slightly warm — newsprint, not pure white. |
| `surface-1` | `#f5f4ee` | Card background. One step warmer than canvas. |
| `surface-2` | `#efedea` | Hover / quoted blocks. |
| `hairline` | `#e7e3dc` | Borders, dividers. Never use a shadow when a hairline will do. |
| `hairline-strong` | `#c8c1b6` | Heavier dividers between major sections. |
| `ink` | `#1c1a17` | Primary text. Slightly warm near-black. |
| `ink-muted` | `#5a564f` | Body copy, secondary text. |
| `ink-subtle` | `#8c8779` | Captions, metadata, eyebrows in caption use. |
| `ink-faint` | `#b3ad9f` | Disabled, placeholder. |

**Dark theme** (the page itself, not just an inverted footer)

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#15140f` | Page background. Warm-black, not gray-black. |
| `surface-1` | `#1d1c16` | Card background. |
| `surface-2` | `#252319` | Hover / quoted blocks. |
| `hairline` | `#2c2a23` | Borders. |
| `hairline-strong` | `#3a372d` | Heavier dividers. |
| `ink` | `#f3efe5` | Primary text. |
| `ink-muted` | `#aca695` | Body copy. |
| `ink-subtle` | `#736d5d` | Captions. |
| `ink-faint` | `#4a463c` | Disabled. |

**Why warm neutrals.** Pure-gray neutrals read as "tech tool" or "default
Tailwind." Warm neutrals (the stone family, slightly desaturated) read as
"editorial" — they suggest paper, ink, and craft. The product covers serious
research; the surface should feel like a serious publication.

### 2.2 Signal (the one accent)

**Amber.** A deep, slightly red-leaning amber. Not orange, not yellow. Reads
as *lit signal* — appropriate for a tool that surfaces what's surging.

| Token | Light | Dark | Role |
|---|---|---|---|
| `accent` | `#b8521e` | `#e87a3f` | Links, focus rings, active CTAs |
| `accent-hover` | `#9d4318` | `#f08c52` | Hover state |
| `accent-tint` | `#fff1e6` | `#3a1e0d` | Quiet background for accented surfaces |
| `accent-ink` | `#fff1e6` | `#15140f` | Foreground when set on solid `accent` |

**Discipline rules:**
- Never use accent on a body-text link en masse. Reserve for *navigation
  state*, *focus rings*, *primary CTAs*, and *one or two hand-picked
  emphasis moments per page*.
- Never use accent as a decorative background. It marks meaning, not vibe.
- The accent never appears on text + accent-tint background simultaneously.
  One job at a time.

### 2.3 Data palette (trend states, citations, status)

These exist *alongside* the accent — they communicate semantics, not vibe.
Desaturated so they coexist with amber without competing.

| State | Light fill | Light ink | Dark fill | Dark ink | Used for |
|---|---|---|---|---|---|
| `new` | `#dde7f3` | `#1f4576` | `#1c2a3d` | `#9bb5d8` | NEW cluster pill, blue sparkline |
| `growing` | `#f3e3c4` | `#6b4a0a` | `#2f2a18` | `#d4ae5f` | GROWING cluster pill, amber sparkline (NOT same as accent) |
| `stable` | `#e7e3dc` | `#5a564f` | `#252319` | `#aca695` | STABLE cluster pill |
| `shrinking` | `#ebd5d1` | `#7a3528` | `#2f1d1a` | `#cf8a7c` | SHRINKING cluster pill |
| `seminal` | `#f3e9d9` | `#7a5a1a` | `#2a2316` | `#d4b87d` | Seminal-paper highlight, citation badge |
| `confidence-high` | `#dce8d8` | `#3a5a30` | `#1d2a1a` | `#a3c69a` | High-confidence tag |
| `confidence-medium` | `#f3e3c4` | `#6b4a0a` | `#2f2a18` | `#d4ae5f` | Medium-confidence tag |
| `confidence-low` | `#ebd5d1` | `#7a3528` | `#2f1d1a` | `#cf8a7c` | Low-confidence tag |

**Note:** The data palette never uses the same exact value as `accent`. A
GROWING cluster's amber pill is *separate* from the link/focus accent — same
family, different specific tones — to avoid confusing "this is interactive"
with "this is data."

---

## 3. Typography

The single most-defining commitment in the system. Three faces, each with one
job. No more.

| Family | Role | Why |
|---|---|---|
| **Fraunces** (variable serif) | Display + section headings + pull-quotes | Editorial weight; the magazine voice. Variable axes let us tune optical size without loading multiple weights. |
| **GT America** (or **Inter** as web fallback) | Body, UI, navigation | Neutral grotesque. Disappears, lets content lead. |
| **JetBrains Mono** | Numerical data, paper IDs, monospace eyebrows | Tabular figures and ID strings need monospace. The slightly humanist tone matches Fraunces better than IBM Plex or SF Mono. |

### 3.1 Type Scale

```
display-xl    Fraunces 600    72px / 1.05 / -2.0px tracking
display-lg    Fraunces 600    56px / 1.08 / -1.4px
display-md    Fraunces 600    40px / 1.15 / -1.0px   ← page H1 (date, headline)
headline      Fraunces 600    28px / 1.20 / -0.4px   ← section H2
card-title    Fraunces 600    22px / 1.25 / -0.3px   ← cluster card titles
subhead       Fraunces 500    18px / 1.35 / -0.2px

body-lg       GT America 400  17px / 1.55 / -0.05px  ← long-form prose
body          GT America 400  15px / 1.55 / 0        ← default
body-sm       GT America 400  13px / 1.50 / 0
caption       GT America 400  12px / 1.40 / 0

eyebrow       JetBrains Mono 500  11px / 1.30 / 1.4px tracking, UPPERCASE
mono-data     JetBrains Mono 400  12px / 1.50 / 0     ← paper IDs, citation counts
```

### 3.2 Heading Discipline

- **One `display-md` per page.** It's the page's anchor (the briefing date,
  the trend report date, the cluster permalink title). Anything else competing
  for that role is a layout failure.
- **Eyebrows always above the headline they introduce.** Mono, uppercase,
  letter-spaced — Wired's signature move. Same rule on every section so the
  reader's eye learns the pattern.
- **No mid-paragraph bold.** Emphasis lives in the structure, not the type.

### 3.3 Numerals

Always tabular for any numerical data — citation counts, paper counts, growth
ratios, scores. JetBrains Mono is naturally tabular; for body GT America, use
`font-feature-settings: 'tnum' 1`.

---

## 4. Spacing

The scale is intentionally limited — eight values total. Constraint forces
consistency.

```
0.5x   2px    hairline alignment
1x     4px    tight clusters (between a tag and its number)
2x     8px    related items in a flex row
3x     12px   ditto, slightly looser
4x     16px   item-to-item within a card
6x     24px   section-internal break (heading → first item)
8x     32px   section-to-section
12x    48px   page-major break
```

**Rule:** if a spacing value isn't on this list, you don't use it. No `mt-7`,
no `gap-5`. Constraint produces rhythm.

**Page rhythm.** Every page has the same vertical music: `display-md` →
`12x` → first section eyebrow → `2x` → section content → `8x` → next eyebrow.
The reader's eye learns the cadence within one page and is rewarded by it on
every other page.

---

## 5. Components

### 5.1 Card

```
border: 1px solid var(--hairline)
background: var(--surface-1)
border-radius: 4px       ← yes, four. Not eight, not twelve. Editorial = small radius.
padding: 24px
shadow: none             ← never, ever
```

**Variants:**
- **Default card.** Hairline border on `surface-1`. Used everywhere.
- **Editorial card** (top picks, seminal paper). Adds a 3px left border in a
  trend-state color. The left border carries semantics — category, status — so
  the rest of the card's chrome stays clean.
- **Quoted card** (executive overview, intersection theses). Adds a 3px left
  border in `accent`, italic Fraunces serif body. Reads like a magazine
  pull-quote.

### 5.2 Pill

```
font: mono-data, all-caps for status pills
padding: 2px 8px
border-radius: 9999px (pills are the one place we use full radius)
border: 1px solid (matching ink at 30% opacity)
background: matching tint
```

Use pills for: status (NEW, GROWING), categories (cs.LG), citation counts.
Don't use pills for arbitrary tags — use type weight + color instead.

### 5.3 Eyebrow

```
font: JetBrains Mono 500, 11px, +1.4px tracking, uppercase
color: var(--ink-subtle)
margin-bottom: 8px (always)
```

Every section starts with one. No exceptions. `WEEKLY TRENDS & GAPS`,
`DAILY BRIEFING · 2026-05-01`, `CROSS-CLUSTER`. The eyebrow does the same job
the kicker does in a magazine.

### 5.4 Help icon

```
14×14 hairline-bordered circle, '?' inside
opacity 0.6 by default, 1.0 on hover
tooltip: portaled, fixed-positioned, max-width 320px
```

Appears next to *every section heading* and *every section-label inside a
card*. The product is methodologically dense; surfacing the methodology is
how we signal seriousness. Linear hides it; we surface it — that's a
deliberate divergence from the references.

### 5.5 Sparkline / data-density elements

Sparklines, citation badges, and the constellation map all share one rule:
**color comes from semantics, never from decoration.** A sparkline's color is
its cluster's status; a citation badge's tone says "this paper has weight."
No purely-decorative color anywhere.

---

## 6. Layout

### 6.1 Grid

12 columns desktop, 4 columns mobile. Page max-width: 1080px (slightly
narrower than typical SaaS — editorial sites read at 65–75 ch and the design
should encourage long reads).

### 6.2 Two layout languages

The product has two layout modes:

1. **Editorial mode** — single-column, generous whitespace, type-led. Used
   for: page headers, executive overviews, individual cluster cards. This is
   where the magazine voice lives.
2. **Data-grid mode** — two- or three-column, tighter spacing, scannable.
   Used for: macro-pattern grids, top-pick grids, "What changed" tri-pane,
   active-researcher list.

The two should be visually distinct so the reader knows which mode they're in.
Editorial mode uses Fraunces and `body-lg`; data-grid mode uses GT America and
`body-sm`.

### 6.3 Asymmetry

Editorial mode embraces asymmetric balance — a wide-left, narrow-right header
where the eyebrow sits in the right column and the date dominates the left.
Data-grid mode is symmetric. The contrast is the point.

---

## 7. Motion

Almost none. Two principles:

1. **Hover and focus get instant, deterministic feedback** — color or border
   change in <100ms, no transition curve drama.
2. **Layout never animates.** No accordion expand, no card-to-modal flip, no
   skeleton-to-content morph. Layout is print-stable.

Tooltip fade is the one exception (180ms in, 80ms out — Linear-like). That's
the *only* timed animation in the system.

---

## 8. Voice (microcopy)

The design language extends to text. Three rules:

1. **Eyebrows are nominal, not promotional.** `WEEKLY TRENDS & GAPS`, not
   `EXPLORE TRENDS`. The kicker labels what it is, never sells.
2. **Section headings are noun phrases.** `Macro patterns`, `Active
   researchers`, `Worth noting`. No "Discover the..." or "What's happening
   in...". The user is here for content; don't ask them to be excited about
   getting it.
3. **Help-icon tooltips state methodology, not benefit.** "LLM ranks 5–10
   most relevant per cosine pre-filter" beats "Personalized for your interests."
   This is an editorial product; the methodology is the trust signal.

---

## 9. Hero moments

Three surfaces should be honed to fellowship-grade. The rest follow the
system but don't need to be photogenic.

1. **Trends report header.** Big editorial date, the macro-patterns grid
   directly under it, the constellation map third. Reads like the front
   cover of a research magazine.
2. **A single cluster card, fully populated.** Macro pattern → cluster card
   with seminal paper highlighted, citation density pill, hairline-bordered
   "Active researchers" sidebar. Demonstrates the data-density-with-elegance
   thesis on one screen.
3. **Daily top-pick card.** Plain-English contribution + Why-for-you split,
   citation badge + affiliation chip + relevance score, all in 3px-left-bordered
   editorial card. Demonstrates the editorial-mode component.

These are the screenshots that go into the fellowship application.

---

## 10. What this system rejects

To make the position legible, an explicit list of moves we don't make:

- ❌ Drop shadows of any kind. (Shadows = SaaS, not editorial.)
- ❌ Gradient fills. (Gradients suggest CRT-tube vibes; editorial is matte.)
- ❌ Multiple-color illustration. (Illustrations are mono-line or absent.)
- ❌ Rounded corners larger than 4px on cards/panels. (Pills are the only
  full-radius element.)
- ❌ Decorative icons in section headings. (Icons go on data, not on labels.)
- ❌ Tailwind defaults like `slate-500`. (Custom warm-neutral tokens only.)
- ❌ Multi-step skeleton-to-content morphs. (Print stability over motion.)
- ❌ Centered hero text on landing pages. (Asymmetric editorial layouts only.)

---

## 11. Implementation notes

This system is implemented in:
- `tailwind.config.js` — color tokens, type scale, spacing scale
- `src/styles.css` — `@layer base` for type defaults, `@layer components` for
  card / pill / eyebrow / section-label patterns
- Per-component files for the editorial-mode vs. data-grid-mode distinctions

The migration from the current implementation to this DESIGN.md happens in
discrete passes — colors first, then type, then component refinement — so
each step's diff can be reviewed independently.

---

## Status

- [x] Document drafted
- [ ] Color tokens migrated (Pass 1)
- [ ] Type scale + Fraunces axes tuned (Pass 2)
- [ ] Component refinement: cards, pills, eyebrows (Pass 3)
- [ ] Hero surface polish: Trends header, cluster card, top-pick card (Pass 4)
- [ ] Case-study writeup with before/after screenshots
