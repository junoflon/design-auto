---
name: detail-page
description: "This skill should be used when the user asks to '상세페이지 만들어줘', '상세페이지 초안', '스마트스토어 상세페이지', '쇼핑몰 상세페이지', '제품 상세 디자인', 'product detail page', 'detail page layout', '상세페이지 디자인', '상세페이지 좀 잡아줘', '제품 소개 페이지 만들어줘'. Make sure to use this skill whenever the user mentions creating product detail pages for online stores. This skill generates actual HTML/CSS files and captures them as PNG/PDF images with brand consistency."
---

# Detail Page Auto

> 상품/서비스 상세페이지 디자인 초안을 자동 생성하는 스킬. 브랜드 톤앤매너를 유지하며, 레이아웃 프리셋과 레퍼런스 이미지를 반영한 실제 파일(HTML + PNG/PDF)을 만들어준다.

---

## Workflow

### Step 1: Brand Profile Setup
**Type**: prompt

Check if `brand-profile.json` exists in the current working directory using Glob.

**First use (no profile):**
Use AskUserQuestion to collect brand information in two rounds:

Round 1 — core identity:
```json
{
  "questions": [
    {
      "question": "브랜드 이름이 뭐예요?",
      "header": "브랜드명",
      "options": [],
      "multiSelect": false
    }
  ]
}
```

Round 2 — visual style (AskUserQuestion with options):
- Main color: popular options ("코랄 핑크 #FF6B6B", "네이비 #1B2838", "민트 #4ECDC4", "골드 #D4A574") + Other for custom HEX
- Font style: "모던/깔끔 (추천)", "따뜻한/손글씨풍", "강렬한/볼드"
- Tone: "친근한 반말 (추천)", "격식체", "유쾌한", "프로페셔널"

Save to `brand-profile.json`:
```json
{
  "brand_name": "",
  "main_color": "#HEX",
  "sub_color": "#HEX",
  "font_style": "",
  "tone": "",
  "created_at": "YYYY-MM-DD"
}
```

**Returning use (profile exists):**
Read and confirm via AskUserQuestion:
- "네, 이 프로필로 (추천)" → proceed
- "새로 설정할래요" → re-run
- "일부만 변경" → ask which field

### Step 2: Detail Page Requirements
**Type**: prompt

Collect via AskUserQuestion:

**Layout preset selection** — offer with description:
- "히어로 이미지형 (추천)" — hero section at top with product image, features below, reviews, CTA
- "스텝 바이 스텝형" — numbered steps with visuals, great for how-to-use products
- "비교표형" — comparison table with competitors, key differentiators, social proof

**Additional inputs:**
- Product/service name
- Key selling points (핵심 셀링포인트, 2-4개)
- Price information (optional)
- Target audience description (optional)
- Reference image path (optional)

### Step 3: Reference Analysis + Design Guide
**Type**: rag + prompt

Load design guides from `references/`:
- `references/layout-presets.md` — detail page layout specifications per preset
- `references/design-guide.md` — typography, spacing, color harmony, detail page principles

If reference image is provided:
- Read the image to analyze color palette, layout composition, and mood
- Merge with brand profile (brand takes priority)

Combine: brand profile + preset rules + reference analysis → design specification.

### Step 4: HTML/CSS Generation + File Output
**Type**: generate

**HTML generation rules:**

Every generated HTML file must include:
1. `<!DOCTYPE html>` with `lang="ko"`
2. Tailwind CSS CDN: `<script src="https://cdn.tailwindcss.com"></script>`
3. Google Fonts: `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">`
4. CSS variables for brand colors
5. Fixed width: 860px, centered

**Output structure:**
- Create `output/detail-page/` directory
- Single HTML file: `detail-page.html`
- No max-height limit (scrollable long page)
- Section dividers between major content blocks
- Alternating section backgrounds (white / brand-light) for visual rhythm

**Detail page design rules** (from `references/design-guide.md`):
- F-pattern reading flow — important info top-left
- Section rhythm: alternate image-heavy and text-heavy sections
- Trust signals: reviews, certifications near buy button
- Mobile-first width: 860px max-width, centered

**Section structure per preset:**

히어로 이미지형:
1. Hero: full-width product image + overlay title + price
2. Key features: 3-column icon grid
3. Detailed description: image-left/text-right alternating
4. Reviews/testimonials
5. CTA: purchase button + trust badges

스텝 바이 스텝형:
1. Title + product overview
2-4. Step sections: numbered circle + image + description
5. Summary + CTA

비교표형:
1. Title: "왜 [제품명]인가요?"
2. Comparison table (our product vs competitors)
3. Key differentiators with checkmarks
4. Social proof
5. CTA

**Capture to PNG/PDF:**
```bash
python3 "${SKILL_DIR}/scripts/capture.py" --input <html-path> --output <output-path> --format png --width 860 --height 4000
```

Never block the workflow on capture failure.

### Step 5: Review + Revision Loop
**Type**: review

List created files. Use AskUserQuestion:
- "완벽해요!" → done
- "색상/폰트 바꿔줘" → re-run Step 4
- "텍스트 수정" → re-run Step 4
- "레이아웃 바꿔줘" → return to Step 2
- "섹션 추가/삭제" → edit HTML, re-capture

Brand tone & manner maintained across revisions.

**Completion:**
```
생성 완료!

📁 output/detail-page/
  ├── detail-page.html
  └── detail-page.png (or .pdf)

브랜드 프로필이 brand-profile.json에 저장되어 있어요.
```

---

## References
- **`references/design-guide.md`** — Typography, spacing, color harmony, detail page design principles
- **`references/layout-presets.md`** — 3 detail page layout preset specifications

## Scripts
- **`scripts/capture.py`** — HTML to PNG/PDF capture via Playwright

## Settings
| Setting | Default | How to change |
|---------|---------|---------------|
| Brand profile | None (set on first use) | Step 1 |
| Layout preset | Hero Image | AskUserQuestion in Step 2 |
| Page width | 860px | Text input |
| Reference image | None | File path in Step 2 |
| Output format | HTML + PNG | AskUserQuestion |
