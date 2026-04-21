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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
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
규칙:
- 완성된 HTML 코드만 출력 (설명 없이)
- <!DOCTYPE html>로 시작
- Tailwind CSS CDN 사용: <script src="https://cdn.tailwindcss.com"></script>
- Google Fonts 사용: Noto Sans KR
- 모든 스타일 인라인 또는 <style> 태그 내 포함
- 이미지는 그라디언트, 이모지, SVG로 대체 (외부 이미지 URL 사용 금지)
- 한국어 텍스트 사용`;

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
    return `쇼핑몰 상품 상세페이지를 HTML로 만들어줘.

콘텐츠:
- 상품명: ${content.title || ''}
- 셀링포인트: ${content.body || ''}
- 가격: ${content.price || ''}
- 타겟 고객: ${content.audience || ''}
${brandInfo}

프리셋: ${preset || '히어로 이미지형'}
너비: 860px, 세로 스크롤 가능

${preset === 'hero' ? '구성: 히어로 배너 → 3열 특징 그리드 → 상세 설명 (이미지+텍스트 교차) → 리뷰 → CTA 버튼' :
  preset === 'steps' ? '구성: 상품 개요 → Step 1/2/3 (번호 원+설명) → 요약 → CTA' :
  '구성: "왜 이 제품인가요?" → 비교표 → 차별점 → 소셜 프루프 → CTA'}

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
