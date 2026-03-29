---
name: card-news
description: "This skill should be used when the user asks to '카드뉴스 만들어줘', '인스타 카드뉴스', '카드뉴스 자동화', '슬라이드 이미지 만들어줘', '홍보 카드 만들어줘', 'create card news', 'Instagram card slides', '카드뉴스 디자인', '카드뉴스 좀 뽑아줘', '인스타용 이미지 만들어줘'. Make sure to use this skill whenever the user mentions creating card-style slide images for social media or blog posts. This skill generates actual HTML/CSS slide files and captures them as PNG/PDF images with brand consistency."
---

# Card News Auto

> 카드뉴스(슬라이드형 이미지) 디자인 초안을 자동 생성하는 스킬. 브랜드 톤앤매너를 유지하며, 레이아웃 프리셋과 레퍼런스 이미지를 반영한 실제 파일(HTML + PNG/PDF)을 만들어준다.

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

If the user provides a color name (e.g., "파란색"), convert to the closest standard HEX value.

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
Read `brand-profile.json` and confirm via AskUserQuestion:
- "네, 이 프로필로 (추천)" → proceed
- "새로 설정할래요" → re-run first-use flow
- "일부만 변경" → ask which field to update

### Step 2: Card News Requirements
**Type**: prompt

Collect via AskUserQuestion:

**Layout preset selection** — offer with ASCII preview:
- "타이틀 중심형" — large title centered, subtitle below, minimal imagery
- "이미지 풀블리드형" — full-bleed background image with overlay text
- "텍스트+아이콘형" — icon grid with short text per point
- "비포/애프터형" — split layout comparing before and after

**Additional inputs:**
- Product/service name
- Key message or copy text (핵심 문구)
- Number of slides (default: 5)
- Slide dimensions: 1080x1080 (정사각형, 추천) or 1080x1350 (세로형)
- Reference image path (optional) — analyze color palette and layout patterns if provided

### Step 3: Reference Analysis + Design Guide
**Type**: rag + prompt

Load design guides from `references/`:
- `references/layout-presets.md` — card news layout specifications per preset
- `references/design-guide.md` — typography, spacing, color harmony rules

If reference image is provided:
- Read the image to analyze color palette, layout composition, and mood
- Extract dominant colors and spatial patterns
- Merge with brand profile (brand profile takes priority for colors unless user says otherwise)

Combine: brand profile + preset rules + reference analysis → design specification.

### Step 4: HTML/CSS Generation + File Output
**Type**: generate

**HTML generation rules:**

Every generated HTML file must include:
1. `<!DOCTYPE html>` with `lang="ko"`
2. Tailwind CSS CDN: `<script src="https://cdn.tailwindcss.com"></script>`
3. Google Fonts: `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">`
4. CSS variables for brand colors:
   ```css
   :root {
     --brand-main: {main_color};
     --brand-sub: {sub_color};
     --brand-dark: {darkened main};
     --brand-light: {lightened main at 10%};
   }
   ```
5. Fixed viewport: width and height matching chosen dimensions

**Output structure:**
- Create `output/card-news/` directory
- Generate one HTML file per slide: `slide-01.html`, `slide-02.html`, ...
- First slide = title/hook slide with brand identity
- Last slide = CTA slide with contact/follow info
- Include slide indicator (e.g., "1/5") at bottom of each slide

**Card news design rules** (from `references/design-guide.md`):
- One message per slide — each slide conveys exactly one point
- Visual hierarchy: title → supporting visual → body text → CTA
- Consistent template: all slides share the same layout, only content changes
- Swipe indicator at bottom

**Capture to PNG/PDF:**
```bash
python3 "${SKILL_DIR}/scripts/capture.py" --input <html-path> --output <output-path> --format png --width 1080 --height 1080
```

If Playwright is not installed:
```
HTML 파일은 생성 완료! PNG/PDF 캡처를 위해 Playwright가 필요해요.
설치: pip install playwright && playwright install chromium
```

Never block the workflow on capture failure — HTML files open in any browser.

### Step 5: Review + Revision Loop
**Type**: review

List all created files with paths. Then use AskUserQuestion:
- "완벽해요!" → done
- "색상/폰트 바꿔줘" → re-run Step 4
- "텍스트 수정" → re-run Step 4
- "레이아웃 바꿔줘" → return to Step 2 preset selection

Brand tone & manner is automatically maintained across revisions.

**Completion:**
```
생성 완료!

📁 output/card-news/
  ├── slide-01.html (+ slide-01.png)
  ├── slide-02.html (+ slide-02.png)
  └── ...

브랜드 프로필이 brand-profile.json에 저장되어 있어요.
다음에 다시 사용하면 자동으로 적용됩니다.
```

---

## References
- **`references/design-guide.md`** — Typography, spacing, color harmony rules for card news
- **`references/layout-presets.md`** — 4 card news layout preset specifications with CSS structure

## Scripts
- **`scripts/capture.py`** — HTML to PNG/PDF capture via Playwright

## Settings
| Setting | Default | How to change |
|---------|---------|---------------|
| Brand profile | None (set on first use) | Step 1, saved to brand-profile.json |
| Layout preset | Title-centered | AskUserQuestion with preview in Step 2 |
| Slide count | 5 | Number input in Step 2 |
| Dimensions | 1080x1080px | AskUserQuestion in Step 2 |
| Reference image | None | File path in Step 2 |
| Output format | HTML + PNG | AskUserQuestion |
