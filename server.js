const express = require('express');
const Anthropic = require('@anthropic-ai/sdk').default;
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const store = require('./lib/db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 8080;

// Claude API client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Ensure output directories exist
const outputDir = path.join(__dirname, 'output');
['card-news', 'detail-page', 'package', 'thumbnail'].forEach(dir => {
  fs.mkdirSync(path.join(outputDir, dir), { recursive: true });
});

// ═══════════════════════════════════════════════
// Design System Prompt (Supanova-style premium rules)
// ═══════════════════════════════════════════════
const DESIGN_SYSTEM_PROMPT = `당신은 연봉 1.5억의 시니어 디자이너다. AI가 만든 티 안 나는, 실제 에이전시 수준의 한국어 랜딩/마케팅 디자인을 코드로 출력한다.

# 절대 규칙 (위반 금지)
1. 절대 금지 패턴 (AI 티 나는 디자인):
   - 의미 없는 그라디언트 배경 (purple-to-pink, blue-to-cyan 등 자주 쓰는 조합)
   - "✨", "🚀" 같은 클리셰 이모지를 hero에 박는 것
   - 모든 카드를 동일한 white bg + shadow-md + rounded-lg로 통일
   - bg-gray-50 / bg-gray-100 같은 무성의한 배경
   - "Lorem ipsum" 느낌의 균일한 본문
   - 가운데 정렬 + 큰 제목 + 부제목 + CTA 버튼의 뻔한 hero
   - 모든 섹션 패딩이 py-16 / py-20으로 동일
   - "왜 우리 제품인가요?" 같은 진부한 헤드라인

2. 한국어 타이포그래피 (필수):
   - 본문 폰트: Pretendard 우선 (CDN: https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.min.css), 없으면 Noto Sans KR
   - font-feature-settings: "ss06" on (한글 자간 보정)
   - letter-spacing: 한글 본문 -0.01em ~ -0.02em, 큰 헤드라인은 -0.04em ~ -0.06em
   - line-height: 본문 1.6~1.7, 헤드라인 1.15~1.25
   - 한글 줄바꿈에 word-break: keep-all 필수
   - 영문/숫자는 굵기 비대칭 (한글은 700, 영문/숫자는 800~900으로 강조)

3. 간격 시스템 (8pt grid):
   - 마이크로 간격: 4, 8, 12px / 컴포넌트 간격: 16, 24, 32px / 섹션 간격: 80, 120, 160px
   - 섹션마다 다른 패딩값 사용 (py-20만 반복하지 마)
   - 정보 밀도: 위로 갈수록 luxe(여백 많이), 아래로 갈수록 dense

4. 색상:
   - 브랜드 컬러 1개를 받으면 그 색에서 7단계 파생 (50/100/300/500/700/900 + accent)
   - 회색은 절대 #999 같은 중립 회색 쓰지 마. 브랜드 컬러에서 채도 5~10% 섞은 warm/cool gray 사용
   - 배경은 순백(#fff) 대신 #FAFAF9, #F8F7F4 같은 off-white
   - 텍스트는 순흑(#000) 대신 #1A1A1A, #18181B

5. 그림자 (절대 shadow-md/lg 같은 Tailwind 기본값 쓰지 마):
   - 카드: box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.08);
   - 떠 있는 느낌: 0 4px 6px -2px rgba(0,0,0,0.05), 0 25px 50px -12px rgba(0,0,0,0.15);
   - hover: shadow가 아니라 transform: translateY(-2px) + 그림자 강화

6. 카드 / 컨테이너:
   - 모든 카드를 같은 모양으로 만들지 마. 정보 위계에 따라 크기, 배경, 보더 차별화
   - border: 1px solid rgba(0,0,0,0.06) 같은 subtle border 활용
   - border-radius도 일관성: 12, 16, 20, 24px 중 프로젝트당 2~3개만 선택해서 일관 적용

7. 인터랙션:
   - hover transition: cubic-bezier(0.16, 1, 0.3, 1) 0.3s
   - 스크롤 진입 애니메이션은 IntersectionObserver + opacity/translateY 활용 (간단한 CSS만)
   - 버튼 hover는 색 변화보다 미세한 lift + 그림자

8. 레이아웃:
   - 단조로운 12-column 그리드 반복 금지. 비대칭 레이아웃 (60/40, 70/30) 적극 활용
   - 섹션마다 비주얼 변화 (배경색, 카드 형태, 정렬)
   - 한 페이지에 같은 패턴 반복 시 최소 2번까지

9. 콘텐츠:
   - 헤드라인은 짧고 구체적으로. "최고의 서비스" → "두피 자극 0% 테스트 통과"
   - 숫자 활용 ("3단계", "87%", "4주") — 디지트는 큰 사이즈 + 다른 폰트 weight
   - 본문은 짧은 문장으로 끊기. 긴 한 문장보다 2~3개 짧은 문장

10. 모바일 우선이 아니라 "퀄리티 우선":
    - 주어진 너비(예: 860px)에 최적화된 디자인. 반응형은 안 해도 됨
    - 단, 텍스트 가독성은 최우선

# 출력 형식
- 완성된 단일 HTML 파일만 출력 (설명 텍스트 없이)
- <!DOCTYPE html>로 시작, </html>로 끝
- 외부 이미지 URL 금지 (그라디언트 / SVG / 이모지로 대체하되, 클리셰 이모지는 피할 것)
- Tailwind CDN + Pretendard CDN + 인라인 <style> 자유 활용
- HTML 길이 제한 없음. 디테일이 부족한 것보다 길어도 됨.`;

// ═══════════════════════════════════════════════
// API: Generate Design
// ═══════════════════════════════════════════════
app.post('/api/generate', async (req, res) => {
  try {
    const { type, content, brand, preset, options, projectId, title } = req.body;

    if (!type || !content) {
      return res.status(400).json({ error: 'type과 content는 필수입니다.' });
    }

    const project = projectId
      ? { id: projectId }
      : store.getOrCreateDefaultProject();
    const assetId = store.uuid();
    const versionId = store.uuid();

    const prompt = buildPrompt(type, content, brand, preset, options);
    console.log(`[generate] type=${type}, preset=${preset}, assetId=${assetId}`);

    const { html: htmlCode, usage } = await generateHtmlWithRetry(prompt);
    if (!htmlCode) {
      return res.status(500).json({ error: 'HTML 코드 생성 실패 (재시도 포함)' });
    }

    const dimensions = getDimensions(type, options);
    const assetOutDir = path.join(outputDir, type, `${assetId}_${versionId}`);
    fs.mkdirSync(assetOutDir, { recursive: true });
    const images = await captureHTML(htmlCode, dimensions, type, options, assetOutDir);

    const imagePaths = images.map(img => `/output/${type}/${assetId}_${versionId}/${img.filename}`);

    store.createAssetWithVersion({
      assetId,
      versionId,
      projectId: project.id,
      type,
      title: title || null,
      content,
      options: { ...options, preset, brand },
      html: htmlCode,
      imagePaths,
      prompt,
      tokensIn: usage?.input_tokens || 0,
      tokensOut: usage?.output_tokens || 0
    });

    res.json({
      success: true,
      type,
      assetId,
      versionId,
      html: htmlCode,
      images: imagePaths.map(url => ({
        filename: path.basename(url),
        url,
        width: dimensions.width,
        height: dimensions.height
      }))
    });

  } catch (error) {
    console.error('[generate] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

async function generateHtmlWithRetry(prompt, maxAttempts = 2) {
  let lastErr = null;
  let lastUsage = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 16000,
        system: DESIGN_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      });
      lastUsage = message.usage;
      const html = extractHTML(message.content[0].text);
      if (html) return { html, usage: message.usage };
      console.warn(`[generate] attempt ${attempt}: HTML parse failed, retrying...`);
    } catch (e) {
      lastErr = e;
      console.warn(`[generate] attempt ${attempt} error: ${e.message}`);
    }
  }
  if (lastErr) throw lastErr;
  return { html: null, usage: lastUsage };
}

// ═══════════════════════════════════════════════
// API: Analyze Reference
// ═══════════════════════════════════════════════
app.post('/api/analyze-reference', async (req, res) => {
  try {
    const { urls, type } = req.body;

    if (!urls || !urls.length) {
      return res.status(400).json({ error: 'URL이 필요합니다.' });
    }

    // Capture screenshots of reference URLs
    const screenshots = await captureReferenceScreenshots(urls);

    // Send to Claude Vision for analysis
    const analysisPrompt = `다음 웹페이지 스크린샷들을 분석해줘.
${type === 'detail-page' ? '상세페이지' : type === 'thumbnail' ? '썸네일' : '디자인'} 레퍼런스로 활용할 거야.

분석해야 할 항목:
1. 레이아웃 패턴 (섹션 구성, 그리드 구조)
2. 색상 팔레트 (메인 컬러, 서브 컬러, 배경)
3. 타이포그래피 (제목/본문 크기, 폰트 스타일)
4. 비주얼 요소 (이미지 배치, 아이콘 사용, 여백)
5. 공통 패턴 (여러 레퍼런스에서 반복되는 요소)

JSON 형태로 응답해줘:
{
  "patterns": ["패턴1", "패턴2", ...],
  "colors": { "primary": "#hex", "secondary": "#hex", "background": "#hex" },
  "layout": "레이아웃 설명",
  "typography": "타이포그래피 설명",
  "suggestions": ["제안1", "제안2", ...]
}`;

    const visionContent = [];
    for (const ss of screenshots) {
      if (ss.base64) {
        visionContent.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: ss.base64 }
        });
      }
    }
    visionContent.push({ type: 'text', text: analysisPrompt });

    const analysis = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: visionContent }]
    });

    let result;
    try {
      const jsonMatch = analysis.content[0].text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: analysis.content[0].text };
    } catch {
      result = { raw: analysis.content[0].text };
    }

    res.json({ success: true, analysis: result });

  } catch (error) {
    console.error('[analyze] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════
// Prompt Builder
// ═══════════════════════════════════════════════
function buildPrompt(type, content, brand, preset, options) {
  const brandInfo = brand ? `
브랜드 정보:
- 브랜드명: ${brand.name}
- 메인 컬러: ${brand.color}
- 서브 컬러: ${brand.subColor || '자동'}
- 폰트 스타일: ${brand.font || '모던/깔끔'}
- 톤앤매너: ${brand.tone || '친근한 반말'}` : '';

  const baseRules = `
# 기술 스택
- Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script>
- Pretendard CDN: <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
- 추가 CSS는 <style> 태그에 작성
- body 기본 폰트: 'Pretendard Variable', Pretendard, -apple-system, sans-serif
- 한국어 본문에는 word-break: keep-all; 적용
- 외부 이미지 URL 절대 금지 (SVG/그라디언트로 대체)
- 시스템 프롬프트의 디자인 규칙 모두 준수`;

  if (type === 'card-news') {
    const slideCount = options?.slideCount || 5;
    const width = options?.width || 1080;
    const height = options?.height || 1080;
    const textPosition = options?.textPosition || 'center';

    return `유튜브/인스타그램 카드뉴스를 HTML로 만들어줘.

콘텐츠:
- 제목: ${content.title || ''}
- 본문: ${content.body || ''}
- 부가 정보: ${content.extra || ''}
${content.extras?.length ? '- 추가 내용: ' + content.extras.join(' / ') : ''}
${brandInfo}

프리셋: ${preset || '타이틀 중심형'}
슬라이드 수: ${slideCount}장
크기: ${width}x${height}px
텍스트 위치: ${textPosition}

${slideCount > 1 ? `모든 슬라이드를 하나의 HTML 파일에 포함하되, 각 슬라이드를 id="slide-1", id="slide-2" 등으로 구분해줘.
각 슬라이드는 width:${width}px, height:${height}px 고정.
1번 슬라이드: 타이틀/훅 슬라이드
마지막 슬라이드: CTA 슬라이드
중간 슬라이드: 본문 내용을 적절히 분배` : `단일 이미지로 모든 내용을 하나에 담아줘. width:${width}px, height:${height}px`}

${baseRules}`;

  } else if (type === 'detail-page') {
    const presetGuide = preset === 'hero'
      ? `구성 (히어로 이미지형):
1) 히어로: 풀폭 비주얼(그라디언트+큰 타이포 오버레이) + 한 줄 가치 제안 + 미세한 CTA hint
2) Trust strip: 작은 뱃지 4~5개 (인증/수상/언론/누적판매)
3) Problem section: 타겟 고객의 페인포인트를 짧은 카피 3개로 (이모지 X, 작은 아이콘 SVG)
4) Solution section: 2~3개 핵심 기능을 비대칭 그리드 (큰 카드 1 + 작은 카드 2)
5) How-it-works 또는 Ingredient breakdown: 정보 dense 섹션
6) Social proof: 후기 카드 2~3개 (별점 X, 인용부호 + 이름 + 짧은 텍스트)
7) FAQ 또는 비교표
8) Final CTA: 가격 강조 + 행동 유도`
      : preset === 'steps'
      ? `구성 (스텝 바이 스텝형):
1) 히어로: 제품명 + "X단계 케어" 같은 구체적 약속 + 큰 시각 임팩트
2) Why 섹션: 왜 이 단계가 필요한지 (1~2 문단, dense)
3) Step 1/2/3: 각 스텝마다 별도 섹션 (번호는 큰 디지트 + 제품 이미지 자리 + 설명 + 디테일 리스트)
   - Step마다 배경색/카드 디자인 미세하게 다르게
   - 단계 사이에 진행도 표시 (가로 라인 + 점)
4) Result section: 사용 결과를 큰 숫자로 (예: "4주 후 87% 개선")
5) Ingredient/Spec table
6) 사용자 후기 (2~3개)
7) Final CTA`
      : `구성 (비교표형):
1) 히어로: "[기존 방식] vs [우리 방식]" 대조 강조
2) Comparison hero: 좌우 분할 비교 (Before/After 또는 Us/Them)
3) Detailed comparison table: 5~7개 항목, 우리 컬럼은 브랜드 컬러 강조
4) 차별점 3가지: 각각 별도 섹션 + 시각화
5) Social proof
6) FAQ
7) Final CTA`;

    return `쇼핑몰 상품 상세페이지를 HTML로 만들어줘.

# 제품 정보
- 상품명: ${content.title || ''}
- 핵심 셀링포인트: ${content.body || ''}
- 가격: ${content.price || ''}
- 타겟 고객: ${content.audience || ''}
${brandInfo}

# 디자인 사양
- 너비: 860px 고정 (이 너비에 최적화)
- 세로: 자유 (콘텐츠가 풍부할수록 좋음)
- 프리셋: ${preset || '히어로 이미지형'}

${presetGuide}

# 추가 디테일 요구사항
- 히어로의 메인 비주얼은 외부 이미지 대신 다음 중 선택:
  a) 두꺼운 SVG 일러스트 (제품 카테고리에 맞는 추상 형태)
  b) 의미 있는 그라디언트 + 큰 타이포 오버레이
  c) 기하학적 패턴 (도트, 라인, 그리드)
- 섹션마다 배경 변화 (off-white → 브랜드 라이트 톤 → 다시 off-white 같은 리듬)
- 가격은 큰 디지트(72px+) + 통화 단위는 작게 + 미세한 색 차이로 위계
- 한국어 헤드라인 word-break: keep-all 필수
- 최소 6개 섹션 이상, HTML 길이는 충분히 길게 (15KB+ 권장)

${baseRules}`;

  } else if (type === 'package') {
    return `제품 패키지 디자인을 HTML로 만들어줘.

콘텐츠:
- 제품명: ${content.title || ''}
- 카테고리: ${content.category || ''}
- 중량/용량: ${content.weight || ''}
- 주요 성분: ${content.ingredients || ''}
${brandInfo}

프리셋: ${preset || '미니멀형'}

앞면(Front), 뒷면(Back), 옆면(Side) 3개 패널을 하나의 HTML에 포함.
각 패널을 id="front", id="back", id="side"로 구분.
재단선(dashed border)과 안전 영역(5mm 패딩) 표시.

${baseRules}`;

  } else if (type === 'thumbnail') {
    return `유튜브 썸네일을 HTML로 만들어줘.

콘텐츠:
- 채널명: ${content.channel || ''}
- 영상 주제: ${content.topic || ''}
- 강조 키워드: ${content.keyword || ''}
${brandInfo}

프리셋: ${preset || '임팩트형'}
크기: 1280x720px

${preset === '임팩트형' ? '스타일: 어두운 배경, 큰 볼드 텍스트, 강렬한 컬러 포인트, 이모지 활용' :
  preset === '미니멀형' ? '스타일: 깔끔한 배경, 심플한 타이포그래피, 여백 활용, 세련된 느낌' :
  preset === '브이로그형' ? '스타일: 밝고 따뜻한 톤, 소프트한 그라디언트, 캐주얼한 폰트' :
  '스타일: 정보 카드 형식, 체크리스트/넘버링, 깔끔한 구조화'}

채널명은 좌상단에 작은 뱃지로 표시.
키워드가 있으면 우상단에 강조 뱃지로 표시.
메인 제목은 중앙에 크고 임팩트 있게.

${baseRules}`;
  }

  return `디자인을 HTML로 만들어줘.\n${JSON.stringify(content)}\n${brandInfo}\n${baseRules}`;
}

// ═══════════════════════════════════════════════
// HTML Extractor
// ═══════════════════════════════════════════════
function extractHTML(text) {
  // Try to find HTML code block
  const codeBlockMatch = text.match(/```html\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find raw HTML
  const htmlMatch = text.match(/(<!DOCTYPE html[\s\S]*<\/html>)/i);
  if (htmlMatch) return htmlMatch[1].trim();

  // If the whole response looks like HTML
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    return text.trim();
  }

  return null;
}

// ═══════════════════════════════════════════════
// Dimensions
// ═══════════════════════════════════════════════
function getDimensions(type, options) {
  if (type === 'card-news') {
    return { width: options?.width || 1080, height: options?.height || 1080 };
  } else if (type === 'detail-page') {
    return { width: 860, height: options?.minHeight || 3000 };
  } else if (type === 'package') {
    return { width: 600, height: 800 };
  } else if (type === 'thumbnail') {
    return { width: 1280, height: 720 };
  }
  return { width: 1080, height: 1080 };
}

// ═══════════════════════════════════════════════
// HTML → Image Capture
// ═══════════════════════════════════════════════
async function captureHTML(html, dimensions, type, options, targetDir) {
  const outDir = targetDir || path.join(outputDir, type);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const images = [];

  try {
    if (type === 'card-news' && (options?.slideCount || 5) > 1) {
      const slideCount = options?.slideCount || 5;
      for (let i = 1; i <= slideCount; i++) {
        const page = await browser.newPage({
          viewport: { width: dimensions.width, height: dimensions.height }
        });
        await page.setContent(html, { waitUntil: 'networkidle' });
        await page.evaluate((slideId) => {
          const slide = document.getElementById(slideId);
          if (slide) {
            document.body.innerHTML = '';
            document.body.appendChild(slide);
            slide.style.width = '100%';
            slide.style.height = '100vh';
          }
        }, `slide-${i}`);
        await page.waitForTimeout(500);

        const filename = `slide-${String(i).padStart(2, '0')}.png`;
        await page.screenshot({ path: path.join(outDir, filename), type: 'png' });
        images.push({ filename });
        await page.close();
      }
    } else {
      const page = await browser.newPage({
        viewport: { width: dimensions.width, height: dimensions.height }
      });
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const filename = type === 'thumbnail' ? 'thumbnail.png' :
                       type === 'detail-page' ? 'detail-page.png' :
                       type === 'package' ? 'package.png' : 'design.png';
      const filepath = path.join(outDir, filename);

      if (type === 'detail-page') {
        await page.screenshot({ path: filepath, type: 'png', fullPage: true });
      } else {
        await page.screenshot({ path: filepath, type: 'png' });
      }
      images.push({ filename });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  return images;
}

// ═══════════════════════════════════════════════
// Reference Screenshot Capture
// ═══════════════════════════════════════════════
async function captureReferenceScreenshots(urls) {
  const browser = await chromium.launch({ headless: true });
  const screenshots = [];

  try {
    for (const url of urls.slice(0, 5)) { // max 5
      try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const buffer = await page.screenshot({ type: 'png', fullPage: false });
        screenshots.push({ url, base64: buffer.toString('base64') });
        await page.close();
      } catch (err) {
        console.error(`[ref] Failed to capture ${url}:`, err.message);
        screenshots.push({ url, error: err.message });
      }
    }
  } finally {
    await browser.close();
  }

  return screenshots;
}

// ═══════════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// Projects / Assets / Versions (Phase 1 DB)
// ═══════════════════════════════════════════════
app.get('/api/projects', (req, res) => {
  const rows = store.db.prepare('SELECT * FROM projects ORDER BY created_at ASC').all();
  if (!rows.length) {
    const p = store.getOrCreateDefaultProject();
    return res.json({ projects: [p] });
  }
  res.json({ projects: rows });
});

app.get('/api/assets', (req, res) => {
  const { projectId, type, limit } = req.query;
  const assets = store.listAssets({
    projectId: projectId || undefined,
    type: type || undefined,
    limit: limit ? Number(limit) : 100
  });
  res.json({ assets });
});

app.get('/api/assets/:id', (req, res) => {
  const asset = store.getAsset(req.params.id);
  if (!asset) return res.status(404).json({ error: 'not found' });
  res.json({ asset });
});

app.patch('/api/assets/:id', (req, res) => {
  const { title, favorite } = req.body || {};
  if (typeof title === 'string') store.updateAssetTitle(req.params.id, title);
  if (favorite === true || favorite === 'toggle') store.toggleFavorite(req.params.id);
  res.json({ asset: store.getAsset(req.params.id) });
});

app.delete('/api/assets/:id', (req, res) => {
  store.deleteAsset(req.params.id);
  res.json({ success: true });
});

app.post('/api/assets/:id/versions', async (req, res) => {
  try {
    const { html, note } = req.body || {};
    if (!html) return res.status(400).json({ error: 'html is required' });
    const asset = store.getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: 'asset not found' });

    const versionId = store.uuid();
    const dimensions = getDimensions(asset.type, asset.input_options);
    const assetOutDir = path.join(outputDir, asset.type, `${asset.id}_${versionId}`);
    fs.mkdirSync(assetOutDir, { recursive: true });
    const images = await captureHTML(html, dimensions, asset.type, asset.input_options, assetOutDir);
    const imagePaths = images.map(img => `/output/${asset.type}/${asset.id}_${versionId}/${img.filename}`);

    // Insert explicit version id by using addVersion; then set current.
    // addVersion uses internal uuid — adjust: we want controlled id.
    const vid = store.addVersion({
      versionId,
      assetId: asset.id,
      html,
      imagePaths,
      prompt: null,
      note: note || '수동 편집 저장'
    });

    res.json({
      success: true,
      assetId: asset.id,
      versionId: vid,
      images: imagePaths.map(url => ({ url, filename: path.basename(url) }))
    });
  } catch (e) {
    console.error('[versions] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/assets/:id/current-version', (req, res) => {
  const { versionId } = req.body || {};
  if (!versionId) return res.status(400).json({ error: 'versionId required' });
  store.setCurrentVersion(req.params.id, versionId);
  res.json({ asset: store.getAsset(req.params.id) });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKey: !!process.env.ANTHROPIC_API_KEY,
    db: store.health(),
    version: '1.1.0'
  });
});

// ═══════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`Design Auto server running on port ${PORT}`);
  console.log(`API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ configured' : '❌ missing (set ANTHROPIC_API_KEY)'}`);
});
