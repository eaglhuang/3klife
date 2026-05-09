#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { findBrowser } = require('./render-html-snapshot');

function parseArgs(argv) {
  const args = {
    outDir: 'server/npc-brain/pipelines/sanguo-rag/diagram-assets',
    browser: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case '--out-dir':
        args.outDir = next();
        break;
      case '--browser':
        args.browser = next();
        break;
      case '--help':
      case '-h':
        console.log('Usage: node tools_node/render-sanguo-rag-highway-diagrams.js [--out-dir <dir>] [--browser <path>]');
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown arg: ${arg}`);
    }
  }

  return args;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rectNode(node) {
  return [
    `<rect x="${node.x}" y="${node.y}" rx="22" ry="22" width="${node.w}" height="${node.h}" fill="${node.fill}" stroke="${node.stroke || '#27445d'}" stroke-width="3"/>`,
    textBlock(node),
  ].join('\n');
}

function decisionNode(node) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const points = [
    `${cx},${node.y}`,
    `${node.x + node.w},${cy}`,
    `${cx},${node.y + node.h}`,
    `${node.x},${cy}`,
  ].join(' ');
  return [
    `<polygon points="${points}" fill="${node.fill}" stroke="${node.stroke || '#5d4037'}" stroke-width="3"/>`,
    textBlock(node),
  ].join('\n');
}

function textBlock(node) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const lines = node.lines || [];
  const totalHeight = lines.length * 24;
  const startY = cy - totalHeight / 2 + 10;
  const spans = lines.map((line, index) => {
    const isSub = index > 0;
    const size = isSub ? 20 : 24;
    const weight = isSub ? 500 : 700;
    return `<tspan x="${cx}" y="${startY + index * 24}" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</tspan>`;
  }).join('');
  return `<text x="${cx}" y="${cy}" text-anchor="middle" fill="#102a43" font-family="'Microsoft JhengHei','Noto Sans TC',sans-serif">${spans}</text>`;
}

function anchor(node, side) {
  switch (side) {
    case 'top':
      return [node.x + node.w / 2, node.y];
    case 'right':
      return [node.x + node.w, node.y + node.h / 2];
    case 'bottom':
      return [node.x + node.w / 2, node.y + node.h];
    case 'left':
      return [node.x, node.y + node.h / 2];
    default:
      throw new Error(`Unknown anchor side: ${side}`);
  }
}

function renderEdge(edge, nodesById) {
  const fromNode = nodesById.get(edge.from[0]);
  const toNode = nodesById.get(edge.to[0]);
  const start = anchor(fromNode, edge.from[1]);
  const end = anchor(toNode, edge.to[1]);
  const points = [start, ...(edge.via || []), end];
  const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' ');
  const dash = edge.dashed ? ' stroke-dasharray="10 8"' : '';
  return `<path d="${d}" fill="none" stroke="${edge.color || '#486581'}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow)"${dash}/>`;
}

function renderDiagram(diagram) {
  const nodesById = new Map(diagram.nodes.map((node) => [node.id, node]));
  const nodeMarkup = diagram.nodes.map((node) => {
    if (node.shape === 'decision') return decisionNode(node);
    return rectNode(node);
  }).join('\n');
  const edgeMarkup = diagram.edges.map((edge) => renderEdge(edge, nodesById)).join('\n');
  const captionMarkup = (diagram.captions || []).map((caption) => (
    `<text x="${caption.x}" y="${caption.y}" font-size="20" font-weight="700" fill="#7c4d1f" font-family="'Microsoft JhengHei','Noto Sans TC',sans-serif">${escapeXml(caption.text)}</text>`
  )).join('\n');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      background: #efe7d8;
      font-family: 'Microsoft JhengHei', 'Noto Sans TC', sans-serif;
    }
    .frame {
      width: ${diagram.width}px;
      height: ${diagram.height}px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,241,230,0.98)),
        radial-gradient(circle at top left, rgba(137, 207, 240, 0.18), transparent 28%),
        radial-gradient(circle at bottom right, rgba(201, 162, 39, 0.16), transparent 24%);
      position: relative;
      overflow: hidden;
    }
    .title {
      position: absolute;
      left: 0;
      right: 0;
      top: 28px;
      text-align: center;
      color: #1f2933;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 0;
    }
    .subtitle {
      position: absolute;
      left: 0;
      right: 0;
      top: 72px;
      text-align: center;
      color: #52606d;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0;
    }
    svg {
      position: absolute;
      left: 0;
      top: 120px;
    }
  </style>
</head>
<body>
  <div class="frame">
    <div class="title">${escapeXml(diagram.title)}</div>
    <div class="subtitle">${escapeXml(diagram.subtitle)}</div>
    <svg width="${diagram.width}" height="${diagram.height - 120}" viewBox="0 0 ${diagram.width} ${diagram.height - 120}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
          <path d="M 0 0 L 12 6 L 0 12 z" fill="#486581"/>
        </marker>
      </defs>
      ${edgeMarkup}
      ${nodeMarkup}
      ${captionMarkup}
    </svg>
  </div>
</body>
</html>`;
}

function buildDiagrams() {
  return [
    {
      filename: 'full-roster-confidence-etl-flow.jpg',
      title: '全量武將高速公路 ETL 主流程',
      subtitle: '來源政策 -> 外部證據 -> claim graph -> 全 roster scorecard -> lane 循環 -> staged artifacts',
      width: 1900,
      height: 1320,
      nodes: [
        { id: 'start', x: 780, y: 20, w: 340, h: 88, fill: '#d9f0ff', lines: ['Start Run', '啟動高速公路'] },
        { id: 'policy', x: 780, y: 142, w: 340, h: 96, fill: '#dff5e3', lines: ['Load Source Policies', '讀取來源設定'] },
        { id: 'fetch', x: 780, y: 272, w: 340, h: 96, fill: '#dff5e3', lines: ['Fetch Approved Evidence', '抓取核准外部證據'] },
        { id: 'normalize', x: 780, y: 402, w: 340, h: 96, fill: '#fff0cf', lines: ['Normalize Evidence Cards', '標準化證據卡'] },
        { id: 'claims', x: 780, y: 532, w: 340, h: 96, fill: '#fff0cf', lines: ['Build Claim Graph', '建立 claim graph'] },
        { id: 'pilot', x: 780, y: 662, w: 340, h: 96, fill: '#d9f0ff', lines: ['Run Full Roster Pilot', '全量 pilot 掃描'] },
        { id: 'merge', x: 780, y: 792, w: 340, h: 96, fill: '#d9f0ff', lines: ['Merge Canonical + Shadow', '合併正式 roster 與 shadow roster'] },
        { id: 'score', x: 420, y: 940, w: 360, h: 110, fill: '#fce2c4', lines: ['Build Person Scorecards', '重算雙分數與 next lane'] },
        { id: 'lane', x: 850, y: 938, w: 260, h: 120, fill: '#fde6d6', shape: 'decision', lines: ['Next Lane?', '下一條車道'] },
        { id: 'stage', x: 1250, y: 940, w: 350, h: 110, fill: '#dff5e3', lines: ['Stage Ready-Eval Artifacts', '產出 staged ready-eval'] },
        { id: 'report', x: 1250, y: 1090, w: 350, h: 110, fill: '#d9f0ff', lines: ['Write Reports + Manifest', '輸出報表與 baseline manifest'] },
        { id: 'discovery', x: 80, y: 1100, w: 280, h: 100, fill: '#fff0cf', lines: ['Evidence Discovery', '補 alias / 外部證據'] },
        { id: 'repair', x: 400, y: 1100, w: 280, h: 100, fill: '#fff0cf', lines: ['Deterministic Repair', '補缺欄位與邊界'] },
        { id: 'preview', x: 720, y: 1100, w: 280, h: 100, fill: '#fff0cf', lines: ['Skill Preview', 'agent reviewer 預覽'] },
        { id: 'rumination', x: 1040, y: 1100, w: 280, h: 100, fill: '#fff0cf', lines: ['Rumination', '反芻重驗既有 A'] },
        { id: 'human', x: 1360, y: 1100, w: 280, h: 100, fill: '#fff0cf', lines: ['Human Review', '門檻滿才出人工題'] },
      ],
      edges: [
        { from: ['start', 'bottom'], to: ['policy', 'top'] },
        { from: ['policy', 'bottom'], to: ['fetch', 'top'] },
        { from: ['fetch', 'bottom'], to: ['normalize', 'top'] },
        { from: ['normalize', 'bottom'], to: ['claims', 'top'] },
        { from: ['claims', 'bottom'], to: ['pilot', 'top'] },
        { from: ['pilot', 'bottom'], to: ['merge', 'top'] },
        { from: ['merge', 'bottom'], to: ['score', 'top'], via: [[950, 900], [600, 900]] },
        { from: ['score', 'right'], to: ['lane', 'left'] },
        { from: ['score', 'right'], to: ['stage', 'left'], dashed: true, via: [[880, 995], [1180, 995]] },
        { from: ['stage', 'bottom'], to: ['report', 'top'] },
        { from: ['lane', 'bottom'], to: ['discovery', 'top'], via: [[980, 1080], [220, 1080]] },
        { from: ['lane', 'bottom'], to: ['repair', 'top'], via: [[980, 1080], [540, 1080]] },
        { from: ['lane', 'bottom'], to: ['preview', 'top'], via: [[980, 1080], [860, 1080]] },
        { from: ['lane', 'bottom'], to: ['rumination', 'top'], via: [[980, 1080], [1180, 1080]] },
        { from: ['lane', 'bottom'], to: ['human', 'top'], via: [[980, 1080], [1500, 1080]] },
        { from: ['discovery', 'top'], to: ['score', 'left'], via: [[220, 1068], [220, 995], [400, 995]] },
        { from: ['repair', 'top'], to: ['score', 'bottom'], via: [[540, 1068], [540, 1058], [600, 1058]] },
        { from: ['preview', 'top'], to: ['score', 'bottom'], via: [[860, 1068], [860, 1058], [600, 1058]] },
        { from: ['rumination', 'top'], to: ['score', 'bottom'], via: [[1180, 1068], [1180, 1058], [600, 1058]] },
        { from: ['human', 'top'], to: ['score', 'bottom'], via: [[1500, 1068], [1500, 1058], [600, 1058]] },
      ],
      captions: [
        { x: 1170, y: 890, text: '收斂後可直接 stage，不需 canonical writes' },
      ],
    },
    {
      filename: 'full-roster-confidence-rag-flow.jpg',
      title: 'RAG 查證與評分流程',
      subtitle: 'retrieval 只做召回，真正判定必須回到 quote / locator / hash / source family',
      width: 1800,
      height: 1260,
      nodes: [
        { id: 'claim', x: 710, y: 20, w: 380, h: 94, fill: '#d9f0ff', lines: ['Claim Candidate', '候選 claim 進站'] },
        { id: 'internal', x: 330, y: 180, w: 340, h: 96, fill: '#dff5e3', lines: ['Retrieve Internal sourceRefs', '抓內部 sourceRef'] },
        { id: 'external', x: 1130, y: 180, w: 340, h: 96, fill: '#dff5e3', lines: ['Retrieve External Evidence', '抓外部 evidence card'] },
        { id: 'filter', x: 710, y: 330, w: 380, h: 96, fill: '#fff0cf', lines: ['Metadata Filter', '先過 layer / source / claim 篩選'] },
        { id: 'dedupe', x: 710, y: 470, w: 380, h: 96, fill: '#fff0cf', lines: ['Source-family Dedupe', '同書不同站不算獨立史料'] },
        { id: 'rerank', x: 710, y: 610, w: 380, h: 96, fill: '#fff0cf', lines: ['Claim-specific Rerank', '依 claim 型別重排證據'] },
        { id: 'pack', x: 710, y: 750, w: 380, h: 96, fill: '#fce2c4', lines: ['Evidence Pack', 'quote / locator / hash / family'] },
        { id: 'validator', x: 710, y: 890, w: 380, h: 96, fill: '#dff5e3', lines: ['Deterministic Validator', '規則先判斷是否足夠'] },
        { id: 'enough', x: 770, y: 1030, w: 260, h: 120, fill: '#fde6d6', shape: 'decision', lines: ['Enough to Decide?', '證據夠不夠定案'] },
        { id: 'review', x: 1150, y: 1038, w: 320, h: 100, fill: '#fff0cf', lines: ['Skill Reviewer Preview', '不足時才進 agent'] },
        { id: 'strict', x: 1150, y: 1180, w: 320, h: 100, fill: '#fff0cf', lines: ['Strict Parser + Citation Gate', '沒 citation 不准升 A'] },
        { id: 'grade', x: 330, y: 1038, w: 320, h: 100, fill: '#d9f0ff', lines: ['Assign A / B / C / D', '分級與 claim layer'] },
        { id: 'score', x: 330, y: 1180, w: 320, h: 100, fill: '#dff5e3', lines: ['Score Claim + Scorecard', '回寫 trust / usability'] },
      ],
      edges: [
        { from: ['claim', 'bottom'], to: ['internal', 'top'], via: [[900, 140], [500, 140]] },
        { from: ['claim', 'bottom'], to: ['external', 'top'], via: [[900, 140], [1300, 140]] },
        { from: ['internal', 'bottom'], to: ['filter', 'top'], via: [[500, 300], [900, 300]] },
        { from: ['external', 'bottom'], to: ['filter', 'top'], via: [[1300, 300], [900, 300]] },
        { from: ['filter', 'bottom'], to: ['dedupe', 'top'] },
        { from: ['dedupe', 'bottom'], to: ['rerank', 'top'] },
        { from: ['rerank', 'bottom'], to: ['pack', 'top'] },
        { from: ['pack', 'bottom'], to: ['validator', 'top'] },
        { from: ['validator', 'bottom'], to: ['enough', 'top'] },
        { from: ['enough', 'left'], to: ['grade', 'right'] },
        { from: ['grade', 'bottom'], to: ['score', 'top'] },
        { from: ['enough', 'right'], to: ['review', 'left'] },
        { from: ['review', 'bottom'], to: ['strict', 'top'] },
        { from: ['strict', 'left'], to: ['grade', 'right'], via: [[1120, 1230], [680, 1230], [680, 1088]] },
      ],
      captions: [
        { x: 664, y: 1188, text: 'vector score 只能幫召回，不能直接當真相分數' },
      ],
    },
    {
      filename: 'full-roster-confidence-rumination-flow.jpg',
      title: '反芻重驗與降級流程',
      subtitle: '已通過的 A 不是永久真理；新證據、舊缺口與單來源 A 都要定期回頭驗',
      width: 1800,
      height: 1180,
      nodes: [
        { id: 'accepted', x: 690, y: 20, w: 420, h: 96, fill: '#d9f0ff', lines: ['Accepted A Claims', '既有 A claim 池'] },
        { id: 'cohort', x: 690, y: 170, w: 420, h: 96, fill: '#dff5e3', lines: ['Select Rumination Cohort', '抽反芻重驗 cohort'] },
        { id: 'old', x: 80, y: 360, w: 280, h: 96, fill: '#fff0cf', lines: ['Old Low-score A', '早期低分 A'] },
        { id: 'single', x: 410, y: 360, w: 280, h: 96, fill: '#fff0cf', lines: ['Single-source A', '單來源 A'] },
        { id: 'female', x: 740, y: 360, w: 280, h: 96, fill: '#fff0cf', lines: ['Female Worldbuilding A', '女性世界觀 A'] },
        { id: 'impact', x: 1070, y: 360, w: 280, h: 96, fill: '#fff0cf', lines: ['High-impact A', '高影響事件 / 關係 A'] },
        { id: 'stale', x: 1400, y: 360, w: 280, h: 96, fill: '#fff0cf', lines: ['Missing Quote / Hash', '缺 quote / hash / locator'] },
        { id: 'retrieve', x: 690, y: 540, w: 420, h: 96, fill: '#fce2c4', lines: ['Retrieve Newest Evidence', '抓最新內外部證據'] },
        { id: 'recompute', x: 690, y: 690, w: 420, h: 96, fill: '#dff5e3', lines: ['Recompute Scores', '重算 trust / usability'] },
        { id: 'pass', x: 770, y: 840, w: 260, h: 120, fill: '#fde6d6', shape: 'decision', lines: ['Still Passes?', '重驗後仍然成立嗎'] },
        { id: 'keep', x: 350, y: 1000, w: 360, h: 100, fill: '#dff5e3', lines: ['Keep A + Refresh Stamp', '保留 A 並更新驗證時間'] },
        { id: 'downgrade', x: 1040, y: 1000, w: 360, h: 100, fill: '#fce2c4', lines: ['Downgrade A -> B', '記錄原因與降級'] },
        { id: 'backlog', x: 1040, y: 1130, w: 360, h: 100, fill: '#fff0cf', lines: ['Repair / Evidence Backlog', '回 repair / evidence lane'] },
      ],
      edges: [
        { from: ['accepted', 'bottom'], to: ['cohort', 'top'] },
        { from: ['cohort', 'bottom'], to: ['old', 'top'], via: [[900, 320], [220, 320]] },
        { from: ['cohort', 'bottom'], to: ['single', 'top'], via: [[900, 320], [550, 320]] },
        { from: ['cohort', 'bottom'], to: ['female', 'top'], via: [[900, 320], [880, 320]] },
        { from: ['cohort', 'bottom'], to: ['impact', 'top'], via: [[900, 320], [1210, 320]] },
        { from: ['cohort', 'bottom'], to: ['stale', 'top'], via: [[900, 320], [1540, 320]] },
        { from: ['old', 'bottom'], to: ['retrieve', 'top'], via: [[220, 480], [900, 480]] },
        { from: ['single', 'bottom'], to: ['retrieve', 'top'], via: [[550, 480], [900, 480]] },
        { from: ['female', 'bottom'], to: ['retrieve', 'top'] },
        { from: ['impact', 'bottom'], to: ['retrieve', 'top'], via: [[1210, 480], [900, 480]] },
        { from: ['stale', 'bottom'], to: ['retrieve', 'top'], via: [[1540, 480], [900, 480]] },
        { from: ['retrieve', 'bottom'], to: ['recompute', 'top'] },
        { from: ['recompute', 'bottom'], to: ['pass', 'top'] },
        { from: ['pass', 'left'], to: ['keep', 'right'] },
        { from: ['pass', 'right'], to: ['downgrade', 'left'] },
        { from: ['downgrade', 'bottom'], to: ['backlog', 'top'] },
      ],
      captions: [
        { x: 1010, y: 938, text: '降級條件：新衝突 / 分數跌破門檻 / 缺原文憑證 / 兩輪無法重建' },
      ],
    },
  ];
}

async function screenshotHtml(browser, html, outputPath, width, height) {
  const tempPath = path.join(os.tmpdir(), `sanguo-rag-diagram-${Date.now()}-${path.basename(outputPath, '.jpg')}.html`);
  fs.writeFileSync(tempPath, html, 'utf8');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.goto(`file:///${tempPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({
      path: outputPath,
      type: 'jpeg',
      quality: 92,
      fullPage: true,
    });
    await page.close();
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {}
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const outDir = path.resolve(args.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const browserPath = args.browser || findBrowser();
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-extensions', '--allow-file-access-from-files'],
  });

  try {
    for (const diagram of buildDiagrams()) {
      const html = renderDiagram(diagram);
      const outputPath = path.join(outDir, diagram.filename);
      await screenshotHtml(browser, html, outputPath, diagram.width, diagram.height);
      const size = fs.statSync(outputPath).size;
      console.log(`[render-sanguo-rag-highway-diagrams] wrote ${path.relative(process.cwd(), outputPath).replace(/\\/g, '/')} (${size} bytes)`);
    }
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[render-sanguo-rag-highway-diagrams] error:', error && error.stack || error);
    process.exit(1);
  });
}
