'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

function parseArgs(argv) {
  const args = {
    viewport: '1920x1080',
    settleMs: 800,
    selectors: [],
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input') args.input = argv[++i];
    else if (arg === '--selectors') args.selectors.push(...String(argv[++i] || '').split(',').map(s => s.trim()).filter(Boolean));
    else if (arg === '--selector') args.selectors.push(String(argv[++i] || '').trim());
    else if (arg === '--selectors-file') args.selectorsFile = argv[++i];
    else if (arg === '--wait-selector') args.waitSelector = argv[++i];
    else if (arg === '--viewport') args.viewport = argv[++i];
    else if (arg === '--settle-ms') args.settleMs = Number(argv[++i]);
    else if (arg === '--output') args.output = argv[++i];
    else if (arg === '--browser') args.browser = argv[++i];
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

function usage() {
  return [
    'Usage: node tools_node/measure-html-selectors.js --input <html-or-url> --selectors <a,b,c> [options]',
    '',
    'Options:',
    '  --selector <css>          Add one selector. Can be repeated.',
    '  --selectors-file <json>   JSON array of selectors.',
    '  --wait-selector <css>     Wait until selector appears before measuring.',
    '  --viewport <WxH>          Default: 1920x1080.',
    '  --settle-ms <ms>          Default: 800.',
    '  --output <json>           Write result to file as well as stdout.',
  ].join('\n');
}

function parseViewport(value) {
  const m = String(value || '').match(/^(\d+)x(\d+)$/i);
  if (!m) return { width: 1920, height: 1080 };
  return { width: Number(m[1]), height: Number(m[2]) };
}

function findBrowser(explicit) {
  const candidates = [
    explicit,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('No browser executable found. Pass --browser <path>.');
}

function toUrl(input) {
  if (/^https?:\/\//i.test(input) || /^file:\/\//i.test(input)) return input;
  return pathToFileURL(path.resolve(input)).href;
}

function ensureBaseHref(html, baseHref) {
  if (/<base\s+href=/i.test(html)) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>\n<base href="${baseHref}">`);
  }
  return `<head><base href="${baseHref}"></head>\n${html}`;
}

function inlineLocalBabelScripts(html, htmlDir) {
  return html.replace(
    /<script([^>]*\btype=["']text\/babel["'][^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi,
    (fullMatch, _beforeSrc, src) => {
      if (/^(https?:|data:|file:|\/\/)/i.test(src)) return fullMatch;
      const scriptPath = path.resolve(htmlDir, src);
      if (!fs.existsSync(scriptPath)) return fullMatch;
      return `<script type="text/babel">\n${fs.readFileSync(scriptPath, 'utf8')}\n</script>`;
    }
  );
}

function prepareLocalSource(input) {
  if (/^https?:\/\//i.test(input) || /^file:\/\//i.test(input)) return null;
  const absPath = path.resolve(input);
  const sourceDir = path.dirname(absPath);
  const baseHref = `${pathToFileURL(sourceDir).href}/`;
  let html = fs.readFileSync(absPath, 'utf8');
  html = ensureBaseHref(html, baseHref);
  html = inlineLocalBabelScripts(html, sourceDir);
  const preparedPath = path.join(os.tmpdir(), `measure-html-selectors-${Date.now()}.html`);
  fs.writeFileSync(preparedPath, html, 'utf8');
  return preparedPath;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.input) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }
  if (args.selectorsFile) {
    const fileSelectors = JSON.parse(fs.readFileSync(args.selectorsFile, 'utf8'));
    if (!Array.isArray(fileSelectors)) throw new Error('--selectors-file must contain a JSON array.');
    args.selectors.push(...fileSelectors.map(String));
  }
  if (args.selectors.length === 0) throw new Error('At least one --selector or --selectors value is required.');

  const viewport = parseViewport(args.viewport);
  const preparedPath = prepareLocalSource(args.input);
  const browser = await puppeteer.launch({
    executablePath: findBrowser(args.browser),
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-extensions', '--allow-file-access-from-files'],
    defaultViewport: { ...viewport, deviceScaleFactor: 1 },
  });

  try {
    const page = await browser.newPage();
    await page.goto(preparedPath ? toUrl(preparedPath) : toUrl(args.input), { waitUntil: 'domcontentloaded', timeout: 45000 });
    try {
      await page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
      });
    } catch {}
    if (args.settleMs > 0) await new Promise(resolve => setTimeout(resolve, args.settleMs));
    if (args.waitSelector) await page.waitForSelector(args.waitSelector, { timeout: 20000 });

    const result = await page.evaluate((selectors) => {
      const rectOf = (el) => {
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x * 100) / 100,
          y: Math.round(r.y * 100) / 100,
          w: Math.round(r.width * 100) / 100,
          h: Math.round(r.height * 100) / 100,
        };
      };
      const styleOf = (el) => {
        const cs = window.getComputedStyle(el);
        return {
          display: cs.display,
          position: cs.position,
          boxSizing: cs.boxSizing,
          gridTemplateColumns: cs.gridTemplateColumns,
          gridTemplateRows: cs.gridTemplateRows,
          gap: cs.gap,
          rowGap: cs.rowGap,
          columnGap: cs.columnGap,
          padding: cs.padding,
          margin: cs.margin,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
        };
      };
      return selectors.map((selector) => {
        const nodes = Array.from(document.querySelectorAll(selector));
        return {
          selector,
          count: nodes.length,
          matches: nodes.slice(0, 20).map((el, index) => ({
            index,
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            className: typeof el.className === 'string' ? el.className : null,
            text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
            rect: rectOf(el),
            style: styleOf(el),
          })),
        };
      });
    }, args.selectors);

    const payload = {
      input: args.input,
      viewport,
      measuredAt: new Date().toISOString(),
      selectors: result,
    };
    const json = JSON.stringify(payload, null, 2);
    if (args.output) {
      fs.mkdirSync(path.dirname(args.output), { recursive: true });
      fs.writeFileSync(args.output, json + '\n', 'utf8');
    }
    console.log(json);
  } finally {
    await browser.close();
    if (preparedPath) {
      try { fs.unlinkSync(preparedPath); } catch {}
    }
  }
}

main().catch((err) => {
  console.error(`[measure-html-selectors] ${err.stack || err.message}`);
  process.exit(1);
});