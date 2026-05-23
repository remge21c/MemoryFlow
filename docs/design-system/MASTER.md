# MemoryFlow — Design System (MASTER)

> **Global Source of Truth.** Page-specific deviations live in `docs/design-system/pages/<page>.md` and **override** rules in this file. If a page file does not exist, this file is authoritative.
>
> **Origin:** Derived from `docs/design-system/reference/memoryflow/DESIGN.md` and `tailwind.config.ts`. Keep all three in sync when changing tokens.

---

## 1. Product & Style Direction

**Identity:** "Tech Utility with Soft Warmth."

MemoryFlow is a project-based travel memory app (photos, videos, notes → curated storybook → PDF/video share). The UI is designed for travelers who value documentation over decoration: calm, practical, strictly content-first, so user memories remain the focal point.

- **Style family:** Minimalism with editorial precision.
- **Tone:** Organized serenity. A digital translation of a high-quality physical travel ledger.
- **Reject:** Heavy shadows, vibrant gradients, glassmorphism, backdrop-blur "floating" surfaces, emoji icons, hover transforms that shift layout.
- **Embrace:** Thin 1px borders, quiet surfaces, generous negative space, tonal layering.

---

## 2. Color Tokens

All colors are wired in `tailwind.config.ts`. Use the Tailwind utility, **never raw hex**, in components.

### Brand & Accent
| Token | Hex | Role |
|---|---|---|
| `primary` | `#196946` | Muted organic green. Primary CTAs, active states, progress indicators. Use sparingly. |
| `on-primary` | `#ffffff` | Text/icons on primary fill. |
| `primary-container` | `#37825d` | Filled containers wanting brand emphasis without full CTA weight. |
| `on-primary-container` | `#f6fff6` | Text on `primary-container`. |
| `inverse-primary` | `#8bd6ab` | Primary on dark/inverse surfaces. |
| `surface-tint` | `#1d6b48` | Tint overlay for elevated brand surfaces. |

### Secondary & Tertiary
| Token | Hex | Role |
|---|---|---|
| `secondary` | `#5b5e66` | Neutral chip fills, secondary buttons. |
| `secondary-container` | `#dddfe9` | Soft neutral fill for grouped metadata. |
| `tertiary` | `#8f454c` | Reserved muted clay-red. Accent for share/publish moments. |
| `tertiary-container` | `#ad5d63` | Tertiary fill. |

### Surfaces & Backgrounds
| Token | Hex | Role |
|---|---|---|
| `background` / `surface` | `#f8f9ff` | App canvas. Cool-tinted near-white reduces glare. |
| `surface-container-lowest` | `#ffffff` | Cards, modals, floating elements. |
| `surface-container-low` | `#eff3ff` | Subtle grouping wells. |
| `surface-container` | `#e9eef9` | Standard container fill. |
| `surface-container-high` | `#e4e8f4` | Hover/active grouping. |
| `surface-container-highest` | `#dee2ee` | Selected/pressed. |
| `surface-variant` | `#dee2ee` | Alt surface for striping. |
| `inverse-surface` | `#2b3139` | Dark snackbar/tooltip surfaces. |
| `inverse-on-surface` | `#ecf1fc` | Text on inverse. |

### Text
| Token | Hex | Role |
|---|---|---|
| `on-surface` / `on-background` | `#171c24` | Body text. ~13:1 contrast on `#f8f9ff`. |
| `on-surface-variant` | `#3f4942` | Secondary text, metadata labels. |
| `outline` | `#6f7a72` | Primary 1px stroke. |
| `outline-variant` | `#bfc9c0` | Quiet 1px stroke (matches `.quiet-card`). |

### Status
| Token | Hex | Role |
|---|---|---|
| `error` | `#ba1a1a` | Destructive actions, error text. |
| `on-error` | `#ffffff` | Text on error fill. |
| `error-container` / `on-error-container` | `#ffdad6` / `#93000a` | Error banners. |

### Hard rules
- Body text must use `on-surface` or `on-surface-variant`. Do not use raw greys for content.
- CTA = `primary` fill + `on-primary` text. Reserve `tertiary` for publish/share confirmations only.
- Borders never use `primary` except for the focus-visible ring and the 2px active-tab stroke.

---

## 3. Typography

**Family:** `Inter` (Tailwind `font-sans`). Korean text uses the `.korean-text` utility (`word-break: keep-all; overflow-wrap: anywhere;`).

| Tailwind class | Size / LH / Weight | Use |
|---|---|---|
| `text-major-title` | 32 / 1.2 / 600 | Page hero titles. |
| `text-screen-title` | 24 / 1.3 / 600 | Screen titles. |
| `text-section-title` | 20 / 1.4 / 500 | Section headers within a screen. |
| `text-body` | 16 / 1.6 / 400 | Default reading copy. |
| `text-secondary` | 14 / 1.5 / 400 | Secondary copy, helper text. |
| `text-metadata` | 12 / 1.4 / 500 | Timestamps, badge labels, captions. |

Rules:
- Body copy ≥ 16px on mobile (already the default). Never drop below `text-secondary` (14px) for primary readable content.
- Line length 65–75ch for prose blocks (`max-w-prose` is acceptable).
- Use medium weight (500) for metadata to preserve legibility against light surfaces.
- Slight negative letter-spacing on large titles is permitted (matches DESIGN.md guidance) but keep it ≤ −0.02em.

---

## 4. Spacing & Layout

**Rhythm:** 4px base, scaled in 8px steps.

| Tailwind class | Value | Use |
|---|---|---|
| `p-base` / `m-base` | 4px | Hairline gaps. |
| `xs` | 8px | Icon-to-label, inline gap. |
| `sm` | 12px | Tight stacks. |
| `md` | 16px | Card padding, grid gutter. |
| `lg` | 24px | Section padding, mobile margin. |
| `xl` | 32px | Major section break, desktop margin. |
| `tap-target` | 44px | **Minimum** height/width for any interactive element. |

Layout rules:
- Mobile page margin: 24px. ≥ md breakpoint: 32px+.
- Card grid gutter: fixed 16px.
- Group content via white space (`xl`), not heavy dividers.
- All interactive elements (button, icon button, chip, list item, link tap area) **must** clear 44×44px.
- Reserve space for async content to avoid jumps (skeletons, fixed heights).

---

## 5. Elevation, Depth, Shape

**Depth philosophy:** Tonal layering + 1px outlines. **No box shadows.** Tailwind is configured with `boxShadow: { none: 'none' }` to prevent drift — do not reintroduce `shadow-*` utilities.

| Level | Treatment |
|---|---|
| L0 — Background | `bg-background` canvas. |
| L1 — Surface | `bg-surface-container-lowest` + `border border-outline-variant` (matches `.quiet-card`). |
| L1 hover | Step surface up to `bg-surface-container-low`. No transform. |
| L2 — Active | 2px solid `primary` border **or** 1px inset of `primary`. |
| Inverse — Snackbar/Tooltip | `bg-inverse-surface text-inverse-on-surface`. |

**Radius** (`borderRadius` tokens):
| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 0.25rem (4px) | Tags, small chips. |
| `rounded` (DEFAULT) | 0.5rem (8px) | Buttons, inputs, chips. |
| `rounded-md` | 0.75rem (12px) | Cards, image blocks. |
| `rounded-lg` | 1rem | Large containers, sheets. |
| `rounded-xl` | 1.5rem | Hero/feature cards. |
| `rounded-full` | 9999px | Avatars, pill toggles. |

Banned: backdrop blur, glassmorphism, neumorphism, gradient buttons, drop shadows.

---

## 6. Iconography

- **Library:** `lucide-react` (already a dependency). Do not introduce additional icon sets.
- **Size:** 20px default, 24px for primary actions. Always paired with a 44×44px tap area for icon-only buttons.
- **Stroke:** 2px, rounded terminals (Lucide default).
- **No emoji icons.** Emoji is acceptable in user-generated content only.
- Icon-only buttons require `aria-label`.

---

## 7. Components

### 7.1 Button (`src/components/ui/button.tsx`)
- **Primary:** `bg-primary text-on-primary rounded h-tap-target px-lg text-secondary font-medium`. Hover: shift to `primary-container`.
- **Secondary:** `bg-transparent border border-outline-variant text-on-surface rounded h-tap-target px-lg`. Hover: `bg-surface-container-low`.
- **Tertiary/Ghost:** Text-only, `text-on-surface-variant`, hover underline or surface step.
- **Destructive:** `bg-error text-on-error`. Only for irreversible actions.
- Disable + show spinner during async; never let users double-submit.

### 7.2 Input
- `bg-surface-container-lowest border border-outline-variant rounded h-tap-target px-md`.
- Focus: border swaps to `primary` (no outer glow). Pair with `.focus-ring` for keyboard focus.
- Errors: border `error`, message in `text-error text-metadata` directly below the field.
- Every input has a visible `<label>` linked via `htmlFor`.

### 7.3 Card (`src/components/ui/card.tsx`)
- `bg-surface-container-lowest border border-outline-variant rounded-md p-md`.
- Use the `.quiet-card` utility when a card sits outside the component for parity.
- Images: flush to the top edge **or** inset 12px on all sides. Never floating with shadow.

### 7.4 Badge / Chip (`src/components/ui/badge.tsx`)
- 8px radius, `text-metadata`, 28–32px height (chips never count as primary tap targets).
- Neutral chip: `bg-secondary-container text-on-secondary-container`.
- Status chip: pair `*-container` + `on-*-container` tokens (e.g. `error-container` / `on-error-container`).

### 7.5 Tabs
- Inactive: `text-on-surface-variant`.
- Active: `text-on-surface` + 2px bottom border `primary`. No fill swap.

### 7.6 Lists
- 44px min row height. Separate by 1px lines (`border-outline-variant`) that **inset 16px from the row edges**, or by vertical spacing (`gap-sm`/`gap-md`).

### 7.7 App Shell (`src/components/app/app-shell.tsx`)
- Top app bar uses `bg-surface-container-lowest border-b border-outline-variant`. No shadow.
- Bottom/side nav active item: `text-primary` + 2px indicator. Inactive: `text-on-surface-variant`.

---

## 8. Interaction & Motion

- Transitions: 150–300ms, `transition-colors` preferred over `transition-all`.
- Animate `transform` / `opacity` only. **Never** animate `width`/`height` for layout.
- Hover changes color/surface, never size or position (no layout shift).
- `cursor-pointer` on every clickable element, including cards and list rows that route on click.
- Respect `prefers-reduced-motion` — disable non-essential motion when set.

---

## 9. Accessibility (CRITICAL)

- **Contrast:** Body text ≥ 4.5:1, UI components/large text ≥ 3:1. The default `on-surface` / `background` pair already exceeds 13:1; do not introduce paler greys for body content.
- **Focus:** All interactives get a visible focus ring (`.focus-ring` with `primary` outline color). Never `outline: none` without a replacement.
- **Keyboard:** Tab order matches visual order. Modals trap focus; `Esc` closes.
- **ARIA:** Icon-only buttons require `aria-label`. Status regions use `aria-live="polite"`.
- **Forms:** Every field has a label, error text is announced and tied via `aria-describedby`.
- **Images:** Meaningful images carry alt text; decorative use `alt=""`.

---

## 10. Performance

- Use Next.js `<Image>` for all user media. Provide width/height to prevent CLS.
- Lazy-load below-the-fold media; prioritize hero photos.
- Reserve skeletons for any async region taller than 80px.
- Avoid client components for static content; keep route segments server-first.

---

## 11. Internationalization

- Use `.korean-text` for any container that may render long Korean strings or project names so they don't break mid-word.
- Number/date formats via `Intl.*`. Never hand-format.

---

## 12. Anti-Patterns (Do Not Ship)

- ❌ Emojis as UI icons (lucide-react only).
- ❌ Shadow utilities (`shadow-md` etc.) — Tailwind config disables them; do not override.
- ❌ Glassmorphism, backdrop-blur on app surfaces.
- ❌ Hover transforms that move/scale layout.
- ❌ `bg-white/10` style transparent surfaces in light mode (invisible borders).
- ❌ Inline hex colors in JSX. Use tokens.
- ❌ Body text below 14px.
- ❌ Tap targets below 44×44px.
- ❌ Reintroducing `gray-*` Tailwind defaults for text — use `on-surface*` tokens.

---

## 13. Pre-Delivery Checklist

Before merging any UI change:

- [ ] All colors via tokens; no raw hex in components.
- [ ] All icons via `lucide-react`; no emoji icons.
- [ ] Tap targets ≥ 44×44px.
- [ ] Focus-visible ring present on every interactive element.
- [ ] Contrast verified (4.5:1 body, 3:1 large text & UI).
- [ ] `cursor-pointer` on clickable cards/rows.
- [ ] No `shadow-*`, no `backdrop-blur*`, no hover transforms.
- [ ] Responsive at 375 / 768 / 1024 / 1440.
- [ ] `prefers-reduced-motion` respected.
- [ ] Korean copy: `.korean-text` applied where needed.
- [ ] Async regions reserve space / show skeletons.

---

## 14. Page Overrides

Page-specific deviations live in `docs/design-system/pages/<page>.md`. Process when implementing a page:

1. Check for `docs/design-system/pages/<page>.md`. If present, its rules override this MASTER.
2. If absent, use MASTER exclusively.
3. To create an override, copy the relevant section from MASTER, then describe **only what changes** for that page and the reason.

Suggested override candidates for MemoryFlow:
- `pages/timeline.md` — dense memory feed (image density, infinite scroll).
- `pages/storybook.md` — editorial layout (longer line length, larger imagery, full-bleed allowed).
- `pages/upload.md` — drag-and-drop affordances, progress states.
- `pages/share.md` — public read-only view, tertiary accent moments.
- `pages/admin.md` — table-heavy density, allow tighter spacing on desktop only.
