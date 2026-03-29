# Package Design Guide

> 패키지 디자인 생성 시 적용할 타이포그래피, 색상, 여백, 인쇄 규격 규칙.

---

## Typography Scale

Korean text uses Noto Sans KR via Google Fonts CDN.

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Product Name | 24-36px | 700 (Bold) | 앞면 제품명 |
| Brand Name | 14-18px | 600 (SemiBold) | 로고 옆 브랜드명 |
| Variant | 16-20px | 500 (Medium) | 맛, 향, 용량 |
| Body (본문) | 10-12px | 400 (Regular) | 성분표, 사용법 |
| Legal (법적) | 8-10px | 400 (Regular) | 제조사, 경고문구 |
| Net Weight | 12-14px | 500 (Medium) | 용량/중량 표시 |

**Line height:** 1.4 for body, 1.2 for headings.
**Letter spacing:** -0.01em for product name, 0.02em for legal text.

---

## Spacing System

Package spacing uses mm-based grid (converted to px at 300dpi):

| Zone | Value | Usage |
|------|-------|-------|
| Bleed | 3mm | Beyond trim line — color/image extends here |
| Trim line | 0mm | Actual cut line |
| Safe zone | 5mm inside | Critical text must be within this |
| Inner margin | 8-10mm | General content padding |
| Element gap | 3-5mm | Between text blocks |

---

## Color Rules for Print

1. **CMYK-friendly colors:** Avoid pure RGB values.
   - Pure red (#FF0000) → use (#E8342E) instead
   - Pure blue (#0000FF) → use (#1B4F9B) instead
   - Neon/fluorescent colors will shift in print

2. **Rich black for text:** Use (#1A1A1A) not pure (#000000) for large text areas.

3. **Background coverage:** If using brand color as background, ensure sufficient ink coverage without bleeding through thin paper stock.

4. **White text on dark bg:** Minimum 14px for readability in print.

---

## Package Design Principles

- **Front panel hierarchy:** brand logo → product name → key visual → variant info
- **Back panel:** ingredients/nutrition, usage instructions, barcode area, legal text
- **Side panels:** condensed brand story or key selling point
- **Barcode placement:** back panel, bottom area, minimum 25mm x 15mm clear zone
- **Legal requirements:** manufacturer info, country of origin, expiry date area, warnings
- **Bleed area:** 3mm beyond trim line for all edges
- **Safe zone:** keep critical text 5mm inside trim line
- **Panel separation:** clear visual break between front/back/side using fold lines
