# Detail Page Design Guide

> 상세페이지 생성 시 적용할 타이포그래피, 색상, 여백 규칙.

---

## Typography Scale

Korean text uses Noto Sans KR via Google Fonts CDN.

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| H1 (대제목) | 36-48px | 700 (Bold) | 히어로 섹션 타이틀 |
| H2 (소제목) | 24-32px | 600 (SemiBold) | 섹션 제목 |
| H3 (부제목) | 18-24px | 500 (Medium) | 하위 섹션 |
| Body (본문) | 14-16px | 400 (Regular) | 상세 설명 |
| Caption (캡션) | 12-13px | 400 (Regular) | 가격, 부가 정보 |
| Price (가격) | 28-36px | 700 (Bold) | 판매가, 할인가 |

**Line height:** 1.6 for body, 1.3 for headings.
**Letter spacing:** -0.02em for headings, 0 for body.

---

## Spacing System (8px Grid)

| Token | Value | Usage |
|-------|-------|-------|
| xs | 8px | Inline gaps |
| sm | 16px | Related elements |
| md | 24px | Left/right padding |
| lg | 32px | Top/bottom section padding |
| xl | 48px | Major section breaks |
| 2xl | 64px | Page-level margins |

**Detail page section padding:** 32px (lg) top/bottom, 24px (md) left/right.

---

## Color Harmony Rules

1. **Monochromatic:** Tints/shades of the main color.
   - Light bg: main at 10% opacity (alternating sections)
   - Accent: main at 100% (CTA buttons, highlights)
   - Dark text: main darkened 60%

2. **CTA button:** Brand main color background, white text. Hover: darkened 10%.

3. **Neutral palette:**
   - White (#FFFFFF) for main sections
   - Near-white (#FAFAFA) for alternating sections
   - Dark gray (#1A1A1A) for primary text
   - Medium gray (#6B7280) for secondary text
   - Light gray (#F3F4F6) for dividers

4. **Contrast:** WCAG AA (4.5:1 body, 3:1 large text).

---

## Detail Page Design Principles

- **F-pattern reading flow** — important info goes top-left
- **Section rhythm:** alternate image-heavy and text-heavy sections
- **Trust signals:** reviews, certifications, guarantees near buy button
- **Mobile-first width:** 860px max-width, centered
- **Visual rhythm:** alternate white and brand-light backgrounds between sections
- **CTA prominence:** purchase/action button should be visually dominant
- **Social proof:** position reviews and ratings to reinforce trust before CTA
