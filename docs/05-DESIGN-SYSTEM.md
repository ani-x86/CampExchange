# 05 – Design System (white, minimal, squarish)

## Principles
Clean · clear · calm. Content first, chrome second. Hairline borders instead of shadows. Everything aligns to an 8px grid.

## Tokens (`tailwind.config.ts`)
```ts
export default {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:'#FFFFFF', surface:'#FAFAFA', line:'#E5E5E5', lineStrong:'#CFCFCF',
        ink:'#111111', mute:'#6B6B6B', faint:'#9A9A9A',
        accent:{ DEFAULT:'#2F5BFF', hover:'#1F46D6', soft:'#EEF2FF' },
        ok:'#13795B', warn:'#B45309', danger:'#C62828'
      },
      borderRadius:{ none:'0', sm:'2px', DEFAULT:'4px' },
      fontFamily:{ sans:['Inter','system-ui','sans-serif'], mono:['JetBrains Mono','ui-monospace','monospace'] },
      transitionTimingFunction:{ out:'cubic-bezier(.22,.61,.36,1)' },
      screens:{ xs:'400px', '3xl':'1920px', '4xl':'2560px' }
    }
  }
}
```
Type scale: 12 / 13 / 14 (body) / 16 / 20 / 28 px. Weights 400, 500, 600 only. Prices in `font-mono`.
Spacing: 4, 8, 12, 16, 24, 32, 48.

## Components
| Component | Spec |
|---|---|
| Button | 36px high (40 on touch). Primary: accent bg, white text. Secondary: white bg, 1px `line` border. Ghost: text only. `rounded-sm`. Press: `translate-y-px`. |
| Input | 40px, 1px `line` border, focus: 1px `accent` border + 2px `accent-soft` ring. Label above, 12px `mute`. |
| Card (listing) | 1px border, no shadow, image 4:3 `object-cover`, title 14/500 (1 line truncate), price mono 16/600, meta 12 `mute`. Hover: border→`lineStrong`, image scale 1.02 (200ms). |
| Badge | 11px uppercase tracking-wide, 1px border, `rounded-sm`. Status colours use text colour + soft bg. |
| Tabs | underline style, 2px accent underline slides between tabs (layoutId). |
| Modal | centered, 1px border, backdrop `black/30`, enters with fade + 8px translate. |
| Toast | bottom-right (top on mobile), square, 1px border, auto-dismiss 4s. |
| Kbd | 11px mono, 1px border, `rounded-sm`, bg surface. Show shortcut hints in tooltips. |
| Skeleton | `surface` block with subtle shimmer (disabled under reduced motion). |

## Motion ("minimal switch + back animation")
Library: Framer Motion. Global config: `transition={{ duration: .18, ease: [.22,.61,.36,1] }}`.
- **Page switch**: `AnimatePresence mode="wait"`; enter `opacity 0→1, x 8→0`; exit `opacity 1→0`.
- **Back navigation** (history pop or `Backspace`/`Alt+←`): direction-aware — enter from `x -8`, so "back" feels reverse of "forward". Track direction in `ui` store via `navigationType`.
- **Tab / filter switch**: shared underline `layoutId`; content cross-fade 120ms.
- **List items**: stagger 20ms, max 12 items (skip rest).
- **Buttons**: 1px press; **Toggles/Switch**: square thumb slides 150ms.
- **Chat**: new bubble fades + 6px rise.
- **Reduced motion**: `useReducedMotion()` → durations 0, no translate.
Never animate layout-heavy properties (width/height/top); use transform and opacity.

## Layout tokens
- App shell: left sidebar 232px (collapsible to 56px) ≥ 1024px; top bar 56px; bottom nav 56px < 1024px.
- Content: fluid with `px-4 sm:px-6 xl:px-8`; listing grid `grid-template-columns: repeat(auto-fill, minmax(clamp(160px, 18vw, 260px), 1fr))`; gap 16px (24px ≥ 1920).
- Reading/forms max-width 640–720px; dashboards use full width up to 2200px, then centre.
- Use `dvh` not `vh` for full-height screens on mobile.

## Iconography
lucide-react, 16px stroke 1.5, never filled.

## Voice
Plain, short, direct. "Item listed." not "Congratulations! Your amazing item is live!"
