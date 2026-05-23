---
name: MemoryFlow
colors:
  surface: '#f8f9ff'
  surface-dim: '#d5dae5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff3ff'
  surface-container: '#e9eef9'
  surface-container-high: '#e4e8f4'
  surface-container-highest: '#dee2ee'
  on-surface: '#171c24'
  on-surface-variant: '#3f4942'
  inverse-surface: '#2b3139'
  inverse-on-surface: '#ecf1fc'
  outline: '#6f7a72'
  outline-variant: '#bfc9c0'
  surface-tint: '#1d6b48'
  primary: '#196946'
  on-primary: '#ffffff'
  primary-container: '#37825d'
  on-primary-container: '#f6fff6'
  inverse-primary: '#8bd6ab'
  secondary: '#5b5e66'
  on-secondary: '#ffffff'
  secondary-container: '#dddfe9'
  on-secondary-container: '#5f636a'
  tertiary: '#8f454c'
  on-tertiary: '#ffffff'
  tertiary-container: '#ad5d63'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a6f3c6'
  primary-fixed-dim: '#8bd6ab'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#005233'
  secondary-fixed: '#dfe2eb'
  secondary-fixed-dim: '#c3c6cf'
  on-secondary-fixed: '#181c22'
  on-secondary-fixed-variant: '#43474e'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b6'
  on-tertiary-fixed: '#3d050f'
  on-tertiary-fixed-variant: '#753137'
  background: '#f8f9ff'
  on-background: '#171c24'
  surface-variant: '#dee2ee'
typography:
  major-title:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  screen-title:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  section-title:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  secondary:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  metadata:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  tap-target: 44px
---

## Brand & Style
The design system is anchored in "Tech Utility with Soft Warmth." It is designed for travelers who value documentation over decoration. The aesthetic is calm, practical, and strictly content-first, ensuring that user memories—photos, notes, and locations—remain the focal point. 

The style leans into **Minimalism** with a focus on precision. It rejects the "loud" trends of heavy shadows and vibrant gradients in favor of thin 1px borders, quiet surfaces, and generous negative space. The emotional response should be one of organized serenity, feeling like a high-quality, physical travel ledger translated into a digital tool.

## Colors
The palette is built using precise OKLCH values to ensure perceptual uniformity and a soft, natural tech feel.

- **Primary (Accent):** `oklch(58% 0.16 145)` — A muted, organic green used sparingly for active states, primary CTAs, and key progress indicators.
- **Background:** `oklch(98% 0.005 250)` — A very light, cool-tinted grey that reduces screen glare.
- **Surface:** `oklch(100% 0 0)` — Pure white, used for cards and floating elements to create subtle separation.
- **Foreground:** `oklch(22% 0.02 240)` — A deep, desaturated charcoal for high-legibility text.
- **Muted:** `oklch(50% 0.018 240)` — Used for secondary information and iconography.
- **Border:** `oklch(90% 0.008 240)` — A thin, quiet stroke used for all structural definition.

## Typography
This design system utilizes **Inter** to maintain a neutral, systematic, and utilitarian feel. The hierarchy is strictly enforced to guide the user's eye through dense travel logs.

For internationalization, specifically Korean text, the system implements `word-break: keep-all` and `overflow-wrap: anywhere`. This ensures that long project names or localized strings do not break awkwardly, maintaining the "Tech Utility" precision. 

Large titles use slight negative letter spacing to feel more "editorial" and compact, while smaller metadata scales up the weight to medium (500) to ensure legibility against the light background.

## Layout & Spacing
The layout follows a **fluid grid** model with a hard-coded 8px spacing rhythm. 

- **Margins:** 24px on mobile, scaling to 32px+ on larger screens.
- **Gutters:** Fixed 16px gutters for card grids.
- **Tap Targets:** A minimum 44px height/width is mandatory for all interactive elements (buttons, icons, chips) to ensure accessibility during on-the-go travel use.
- **Logic:** Content is grouped using generous white space (`xl` units) rather than heavy dividers, creating an airy, breathable interface.

## Elevation & Depth
In line with the "Quiet Surfaces" philosophy, depth is communicated through **Tonal Layers** and **Low-Contrast Outlines** rather than shadows.

- **Level 0 (Background):** The base app canvas.
- **Level 1 (Surface):** White containers with a 1px `oklch(90% 0.008 240)` border. No shadow.
- **Active States:** Subtle 1px inset or 2px solid border using the primary accent color.

Avoid backdrop blurs or glassmorphism. Objects do not "float" in this design system; they sit organized within a structured, flat architecture.

## Shapes
Shapes are used to soften the "Utility" aspect of the design. 

- **Interactive Elements:** Buttons, input fields, and tags use an 8px (0.5rem) radius.
- **Containers:** Content cards and image blocks use a slightly larger 12px (0.75rem) radius to create a nesting hierarchy that feels intentional and "contained."
- **Iconography:** Use 2px stroke-width icons with rounded terminals to match the border language of the UI.

## Components

### Buttons
- **Primary:** Filled with the Accent color, white text. 8px radius. 44px height.
- **Secondary:** Transparent fill with a 1px border. 44px height.
- **Label:** 14px Medium.

### Input Fields
- **Default:** White surface, 1px border. 8px radius. 44px height.
- **Focus:** 1px border shifts to Accent color. No outer glow.

### Cards
- **Structure:** White surface, 1px border, 12px radius.
- **Padding:** 16px internal padding for content. 
- **Images:** Should be flush to the top of the card or fully inset with 12px spacing to maintain the grid.

### Chips & Tabs
- **Chips:** 8px radius, metadata typography.
- **Active Tab:** Indicated by a 2px bottom stroke in the Accent color or a high-contrast foreground color change.

### Lists
- Separated by 1px horizontal lines that stop 16px short of the edge, or defined by simple vertical spacing. Each list item must maintain a 44px minimum height for touch areas.