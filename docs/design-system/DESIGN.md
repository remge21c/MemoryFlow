---
name: MemoryFlow
colors:
  surface: '#f9f9f7'
  surface-dim: '#dadad8'
  surface-bright: '#f9f9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f2'
  surface-container: '#eeeeec'
  surface-container-high: '#e8e8e6'
  surface-container-highest: '#e2e3e1'
  on-surface: '#1a1c1b'
  on-surface-variant: '#55433b'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#88736a'
  outline-variant: '#dbc1b7'
  surface-tint: '#97471f'
  primary: '#94451d'
  on-primary: '#ffffff'
  primary-container: '#b35d33'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb595'
  secondary: '#615e58'
  on-secondary: '#ffffff'
  secondary-container: '#e7e2da'
  on-secondary-container: '#67645e'
  tertiary: '#00666e'
  on-tertiary: '#ffffff'
  tertiary-container: '#00818a'
  on-tertiary-container: '#f5feff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcd'
  primary-fixed-dim: '#ffb595'
  on-primary-fixed: '#360f00'
  on-primary-fixed-variant: '#793108'
  secondary-fixed: '#e7e2da'
  secondary-fixed-dim: '#cbc6bf'
  on-secondary-fixed: '#1d1b17'
  on-secondary-fixed-variant: '#494641'
  tertiary-fixed: '#8bf2fd'
  tertiary-fixed-dim: '#6dd6e0'
  on-tertiary-fixed: '#002022'
  on-tertiary-fixed-variant: '#004f55'
  background: '#f9f9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e1'
typography:
  display-lg:
    fontFamily: beVietnamPro
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: beVietnamPro
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: beVietnamPro
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: beVietnamPro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: beVietnamPro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-sm:
    fontFamily: beVietnamPro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  margin-mobile: 20px
  gutter-mobile: 16px
  touch-target-min: 44px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The brand personality is nostalgic, warm, and communal. It acts as a quiet curator for shared experiences, ensuring that the technology never overshadows the sentiment of the photography. The target audience includes friends, families, and colleagues who value organized yet emotionally resonant digital scrapbooking.

The design style is **Warm Minimalism**. It prioritizes high-quality whitespace and a limited, organic color palette to evoke the feeling of a physical linen photo album. By utilizing soft shadows and rounded geometry, the interface feels approachable and tactile, encouraging users to linger on their memories rather than rush through the task of uploading.

## Colors

The palette is anchored by the "Warm Linen" background (#FAFAF8), providing a softer, more organic foundation than pure white. 

- **Primary (Terracotta):** Reserved for the most important actions (Primary Buttons, Active Links, CTA). It provides a sun-drenched, earthy focal point.
- **Secondary (Muted Gray):** Used for secondary text, metadata, and iconography that should recede.
- **Neutral (Ink):** High-contrast text color for maximum legibility of Korean characters.
- **Functional:** Success, error, and warning states should use muted versions of their respective hues to maintain the calm aesthetic.

## Typography

This design system uses **Be Vietnam Pro** as the primary typeface, as it closely mirrors the clean, modern proportions of "Pretendard" while maintaining excellent legibility for both Latin and Korean glyphs.

- **Headlines:** Use a slightly tighter letter-spacing for a sophisticated, editorial look.
- **Body:** Generous line-heights are essential to ensure the dense Korean characters remain readable and airy.
- **Labels:** Used for metadata (dates, locations, "모임" status) in a medium weight to contrast against body text.

## Layout & Spacing

The layout follows a **Mobile-First, Single-Column** philosophy. Content is stacked vertically to prioritize the photography, allowing users to scroll through a continuous "flow" of memories.

- **Margins:** A generous 20px side margin ensures the UI feels "framed" and uncluttered.
- **Stacking:** Use a 4px-based grid. Components are typically separated by 16px (stack-md) to maintain a sense of breathing room.
- **Touch Targets:** Every interactive element (buttons, chips, icons) must adhere to a minimum 44px height/width to ensure accessibility during one-handed mobile use.

## Elevation & Depth

To maintain the "warm linen" aesthetic, the design system avoids heavy shadows or complex gradients. 

- **Level 0 (Background):** The #FAFAF8 linen surface.
- **Level 1 (Cards):** A soft, single-layer shadow (Hex: #1F1D1B at 4% opacity, 8px blur, 4px Y-offset) is used to lift image cards and containers off the background.
- **Interaction:** On-tap states should use a subtle 2% darkening of the background color rather than an increased shadow, keeping the interface feeling grounded and calm.

## Shapes

The shape language is defined by "Soft Curves." 

- **Cards & Images:** Use a consistent 12px corner radius (rounded-lg) to soften the visual impact of photography.
- **Buttons:** Use fully rounded pill-shapes (rounded-xl) for primary actions to distinguish them from the structural rectangular cards.
- **Pills (둥근 알약):** Status indicators (e.g., "업로드 완료", "진행 중") must always be pill-shaped with a background that is only 5-10% opacity of the status color to remain subtle.

## Components

### Buttons (버튼)
- **Primary:** Terracotta (#94451d) background with white text. Pill-shaped. Height: 48px for prominence.
  <!-- 통일: 렌더된 목업·tailwind-theme.css 와 일치하도록 #94451d 사용. 밝은 테라코타 원하면 #c2683d 로 교체 -->.
- **Secondary:** Transparent background with an Ink (#1F1D1B) 1px border.
- **Ghost:** Ink text without border or background, used for "취소" (Cancel) or tertiary actions.

### Cards (카드)
- Containers for photos and trip details. 12px rounded corners. Pure white (#FFFFFF) background to make them "pop" slightly against the off-white linen page background.

### Input Fields (입력창)
- Minimalist style: 1px border (#6B6862 at 20% opacity). Focus state changes the border to Terracotta. Top-aligned labels in Label-sm typography.

### Status Pills (상태 표시)
- Small, pill-shaped tags used for categories or states. Text is 12px Bold. Example: "추억" (Memory) or "장소" (Location).

### Lists (리스트)
- Single-column lists with 1px horizontal dividers in a very light gray. Each list item should have a minimum height of 56px to accommodate comfortable tapping.

### Photo Grid
- A vertical "Flow" of images. Large images occupy the full width (minus margins). Metadata (who uploaded, time) is placed immediately below the image in Muted Gray.