# Card News Layout Presets (1080x1080px)

> 카드뉴스 4가지 레이아웃 프리셋 상세 구조.

---

## 1. Title-Centered (타이틀 중심형)

Structure:
```
┌─────────────────────┐
│                     │
│     [Brand Logo]    │
│                     │
│   ━━━━━━━━━━━━━━   │
│    MAIN TITLE H1    │
│   ━━━━━━━━━━━━━━   │
│                     │
│    subtitle text    │
│                     │
│     · · · ·  1/5   │
└─────────────────────┘
```

CSS structure:
- Flexbox column, center-aligned
- Background: solid brand color or light tint
- Title: H1, centered, brand dark color
- Subtitle: Body size, muted color
- Decorative line above/below title using brand accent

---

## 2. Image Full-Bleed (이미지 풀블리드형)

Structure:
```
┌─────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓ BACKGROUND ▓▓▓▓▓│
│▓▓▓  IMAGE    ▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│┌───────────────────┐│
││  Title Text       ││
││  over dark overlay││
│└───────────────────┘│
│     · · · ·  2/5   │
└─────────────────────┘
```

CSS structure:
- Background: full-bleed image with dark overlay (rgba(0,0,0,0.4))
- Text: white, positioned bottom-left or center
- Use text-shadow for readability
- No image provided: gradient background with brand colors

---

## 3. Text + Icon (텍스트+아이콘형)

Structure:
```
┌─────────────────────┐
│    Section Title    │
│                     │
│  🎯  Point 1 text  │
│                     │
│  💡  Point 2 text  │
│                     │
│  ✅  Point 3 text  │
│                     │
│     · · · ·  3/5   │
└─────────────────────┘
```

CSS structure:
- Grid layout: icon (48px) + text
- Each row: icon left, text right
- Background: white or light tint
- Icons: emoji or SVG circle icons in brand color
- Max 3-4 points per slide

---

## 4. Before/After (비포/애프터형)

Structure:
```
┌──────────┬──────────┐
│  BEFORE  │  AFTER   │
│          │          │
│  ❌ Old  │  ✅ New  │
│  state   │  state   │
│  desc    │  desc    │
│          │          │
│     · · · ·  4/5   │
└──────────┴──────────┘
```

CSS structure:
- Grid: 2 columns, 50/50 split
- Left: muted/gray tones (before state)
- Right: brand color tones (after state)
- Vertical divider line in center
- Contrasting backgrounds to emphasize change
