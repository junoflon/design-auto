# Detail Page Layout Presets (860px width)

> 상세페이지 3가지 레이아웃 프리셋 상세 구조.

---

## 1. Hero Image (히어로 이미지형)

Section order:
1. **Hero section:** full-width product image + overlay title + price
2. **Key features:** 3-column icon grid with short descriptions
3. **Detailed description:** image-left/text-right alternating rows
4. **Reviews/testimonials:** star ratings + user quotes
5. **CTA:** purchase button + trust badges (shipping, guarantee, etc.)

CSS notes:
- Hero: relative positioning, image as background, gradient overlay for text readability
- Feature grid: 3-column flexbox, icon (48px circle in brand color) + title + description
- Alternating rows: odd rows image-left, even rows image-right
- CTA button: full-width on mobile, fixed-width centered on desktop

---

## 2. Step by Step (스텝 바이 스텝형)

Section order:
1. **Title + product overview** — product image + name + tagline
2. **Step 1:** numbered circle + image + description
3. **Step 2:** numbered circle + image + description
4. **Step 3:** numbered circle + image + description
5. **Summary + CTA** — key benefits recap + purchase button

CSS notes:
- Numbered circles: 48px, brand color background, white text, centered
- Vertical connecting line between steps: 2px solid brand-light
- Each step: flexbox row, number-left, image-center, text-right
- Summary: highlighted box with brand-light background

---

## 3. Comparison Table (비교표형)

Section order:
1. **Title:** "왜 [제품명]인가요?" — bold question format
2. **Comparison table:** our product vs competitors (2-3 columns)
3. **Key differentiators:** checkmark list with brand accent
4. **Social proof:** customer testimonials or review summary
5. **CTA:** purchase button + urgency element (limited offer, stock)

CSS notes:
- Table: brand-colored header row, alternating row backgrounds (#FAFAFA / white)
- Our column highlighted with brand-light background
- Checkmark icons: brand color for ours, gray X for competitors
- Differentiators: card layout with icon + title + description
