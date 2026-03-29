# Card News Design Guide

> 카드뉴스 생성 시 적용할 타이포그래피, 색상, 여백 규칙.

---

## Typography Scale

Korean text uses Noto Sans KR via Google Fonts CDN.

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| H1 (대제목) | 36-48px | 700 (Bold) | 슬라이드 메인 타이틀 |
| H2 (소제목) | 24-32px | 600 (SemiBold) | 카드 서브 타이틀 |
| H3 (부제목) | 18-24px | 500 (Medium) | 포인트 텍스트 |
| Body (본문) | 14-16px | 400 (Regular) | 설명 텍스트 |
| Caption (캡션) | 12-13px | 400 (Regular) | 출처, 페이지 번호 |

**Line height:** 1.6 for body, 1.3 for headings.
**Letter spacing:** -0.02em for headings, 0 for body.

---

## Spacing System (8px Grid)

| Token | Value | Usage |
|-------|-------|-------|
| xs | 8px | Inline gaps |
| sm | 16px | Related elements |
| md | 24px | Internal padding |
| lg | 32px | Between sections |
| xl | 48px | Slide padding (all sides) |

**Card news padding:** 48px (xl) on all sides.

---

## Color Harmony Rules

1. **Monochromatic:** Tints/shades of the main color.
   - Light bg: main at 10% opacity
   - Accent: main at 100%
   - Dark text: main darkened 60%

2. **Complementary accent:** complementary color (180°) for CTA only.

3. **Neutral palette:**
   - White (#FFFFFF) / near-white (#FAFAFA) for backgrounds
   - Dark gray (#1A1A1A) for primary text
   - Medium gray (#6B7280) for secondary text

4. **Contrast:** WCAG AA (4.5:1 body, 3:1 large text).

---

## Card News Design Principles

- **One message per slide** — each slide conveys exactly one point
- **Visual hierarchy:** title → supporting visual → body text → CTA
- **Consistent template:** all slides share the same layout, only content changes
- **Swipe indicator:** dots or page numbers at bottom (slide X/N)
- **First slide:** hook/title slide with brand identity
- **Last slide:** CTA slide (follow, link, contact info)
- **Dimensions:** 1080x1080px (Instagram square) or 1080x1350px (4:5 portrait)
