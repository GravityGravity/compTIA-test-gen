# compTIA UI style

A clean, card-based style for career and learning sites: white page, white cards that lift with a soft shadow, one strong red for action, and a plum accent for headlines and big numbers.

## Content fundamentals

- **Voice:** encouraging and direct. Speak to the reader as "you". Example: "Take the first step toward your future in tech."
- **Headlines:** sentence case, short, verb-led where possible.
- **Buttons:** verb first, sentence case, 2–4 words: "Explore careers", "Take quiz", "Read the report".
- **Numbers carry the story.** Show a big stat, then a short label, then one sentence of proof: "6M · Tech workforce size · The U.S. tech workforce includes over 6 million professionals."
- **Eyebrows** name the content type in uppercase: RESEARCH, CASE STUDY, BLOG.

## Visual foundations

- **Color:** `brand` is for action and emphasis only (buttons, links, eyebrows). `plum` and `wine` are for display text and stats. Body text is always `ink`. Keep large areas `surface`.
- **Page title:** centered `display-page`, with a left-to-right gradient from `brand` to `plum` (`background: linear-gradient(90deg, var(--brand), var(--plum)); -webkit-background-clip: text; color: transparent`). Use it once per page.
- **Hero headline:** `display-hero`, first line in `brand`, rest in `plum`. Key words in body copy may be bold `ink`.
- **Layout:** centered content column, max 960px wide. Sections stack with `space-12` between them.
- **Cards:** `surface` fill, `radius-sm`, `shadow-card`, padding `space-8` (`space-6` under 640px). No borders, no colored left edges.
- **Grey panel:** to group cards (for example testimonials), put white cards on a `surface-muted` panel with `radius-sm`.
- **Grids:** 3 columns for stats and features, 2 columns for resource cards, `space-4` gutters. Collapse to 1 column under 640px.
- **Buttons:** pills (`radius-pill`). Primary is filled `brand`; secondary is outline `brand` on white. Put primary first.
- **Footer:** `surface-muted` band with `small` links in `ink`, then a thin `ink` bar with white copyright text.

## Iconography

Thin line icons (about 1.5px stroke, 32px box) in `brand`, with no fill. One icon at the top-left of each feature block. No emoji.

## Components

- **Button** — primary and outline pills.
- **Card** — the white lifted card, with optional eyebrow, title, text and button.
- **StatTile** — big `wine` number, `h4` label, one line of `body`.
- **Eyebrow** — uppercase category label.

## Not from the source

The font is an assumption: the reference looks like a neo-grotesque sans, so the system uses **Inter** (Google Fonts) with Helvetica and Arial fallbacks. Colors are sampled from a screenshot, so check them against your own needs. The name only says which page this style is based on. Logos and photos from the reference are not part of this system; use your own.
