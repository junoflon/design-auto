---
name: package-design
description: "This skill should be used when the user asks to '패키지 디자인 해줘', '제품 패키지 만들어줘', '박스 디자인', '포장 디자인', '패키지 초안', 'package design', 'product packaging layout', '제품 박스 디자인', '패키지 좀 만들어줘', '박스 디자인 잡아줘'. Make sure to use this skill whenever the user mentions creating product packaging, box design, or label design. This skill generates front/back/side panel HTML/CSS files and captures them as PNG/PDF images with brand consistency and print-ready specifications."
---

# Package Design Auto

> 제품 패키지 디자인 초안을 자동 생성하는 스킬. 브랜드 톤앤매너를 유지하며, 레이아웃 프리셋과 레퍼런스 이미지를 반영한 실제 파일(HTML + PNG/PDF)을 만들어준다. 앞면/뒷면/옆면 패널을 개별 파일로 생성.

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

### Step 2: Package Requirements
**Type**: prompt

Collect via AskUserQuestion:

**Layout preset selection:**
- "미니멀형 (추천)" — clean, whitespace-focused, typography-driven
- "일러스트형" — decorative patterns, hand-drawn feel, colorful accents
- "포토형" — product photography dominates, professional feel

**Additional inputs:**
- Product name
- Product category (식품/화장품/생활용품/기타)
- Package type: AskUserQuestion with options
  - "박스형 (직사각)" — standard rectangular box
  - "파우치형" — flat pouch/bag
  - "원통형" — cylinder (tube/can)
  - "기타" → custom dimensions
- Net weight/volume (e.g., 300ml, 200g)
- Key ingredients or features to display
- Barcode placeholder: yes/no (default: yes)
- Reference image path (optional)

### Step 3: Reference Analysis + Design Guide
**Type**: rag + prompt

Load design guides from `references/`:
- `references/layout-presets.md` — package layout specifications per preset
- `references/design-guide.md` — typography, color rules, package design principles

If reference image is provided:
- Read the image to analyze color palette, layout composition, and mood
- Merge with brand profile

Combine: brand profile + preset rules + reference analysis → design specification.

### Step 4: HTML/CSS Generation + File Output
**Type**: generate

**HTML generation rules:**

Every generated HTML file must include:
1. `<!DOCTYPE html>` with `lang="ko"`
2. Tailwind CSS CDN
3. Google Fonts (Noto Sans KR)
4. CSS variables for brand colors
5. Print-oriented dimensions (mm converted to px at 300dpi)

**Output structure:**
- Create `output/package/` directory
- Separate HTML files per panel: `front.html`, `back.html`, `side.html`
- Include trim line indicators (dashed border)
- Safe zone (5mm inner padding from trim line)
- Bleed area (3mm beyond trim line)

**Panel content guidelines:**

Front panel (앞면):
- Brand logo (top area)
- Product name (largest text element)
- Key visual or product image placeholder
- Variant info (flavor, scent, etc.)
- Net weight/volume

Back panel (뒷면):
- Ingredients/nutrition facts table
- Usage instructions
- Barcode placeholder area (if enabled)
- Legal text area (manufacturer, warnings)
- Certification marks placeholder

Side panel (옆면):
- Condensed brand story or tagline
- Key selling point
- Contact/website info

**Package design rules** (from `references/design-guide.md`):
- Front panel hierarchy: logo → product name → key visual → variant
- Print-safe colors: avoid pure RGB; use CMYK-friendly values
- Bleed area: 3mm beyond trim line
- Safe zone: 5mm inside trim line for critical text

**Capture to PNG/PDF:**
```bash
python3 "${SKILL_DIR}/scripts/capture.py" --input <html-path> --output <output-path> --format png --width 600 --height 800
```

Never block the workflow on capture failure.

### Step 5: Review + Revision Loop
**Type**: review

List created files (front/back/side). Use AskUserQuestion:
- "완벽해요!" → done
- "색상/폰트 바꿔줘" → re-run Step 4
- "텍스트 수정" → re-run Step 4
- "레이아웃 바꿔줘" → return to Step 2
- "패널 추가/수정" → edit specific panel

Brand tone & manner maintained across revisions.

**Completion:**
```
생성 완료!

📁 output/package/
  ├── front.html (+ front.png)
  ├── back.html (+ back.png)
  └── side.html (+ side.png)

브랜드 프로필이 brand-profile.json에 저장되어 있어요.
```

---

## References
- **`references/design-guide.md`** — Typography, color rules, package-specific design principles (print specs, bleed, safe zone)
- **`references/layout-presets.md`** — 3 package layout preset specifications (minimal, illustration, photo)

## Scripts
- **`scripts/capture.py`** — HTML to PNG/PDF capture via Playwright

## Settings
| Setting | Default | How to change |
|---------|---------|---------------|
| Brand profile | None (set on first use) | Step 1 |
| Layout preset | Minimal | AskUserQuestion in Step 2 |
| Package type | Box (rectangular) | AskUserQuestion in Step 2 |
| Barcode placeholder | Yes | AskUserQuestion in Step 2 |
| Reference image | None | File path in Step 2 |
| Output format | HTML + PNG | AskUserQuestion |
