#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch (error) {
  console.error('[bake-css-background-asset] puppeteer-core is required');
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {
    sourceHtml: null,
    selector: null,
    output: null,
    width: null,
    height: null,
    browser: '',
    mode: 'background',
    selectorIndex: 0,
    padding: 0,
    transparent: false,
    quality: 100,
    settleMs: 500,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case '--source-html': opts.sourceHtml = next(); break;
      case '--selector': opts.selector = next(); break;
      case '--output': opts.output = next(); break;
      case '--width': opts.width = Number(next()); break;
      case '--height': opts.height = Number(next()); break;
      case '--browser': opts.browser = next(); break;
      case '--mode': opts.mode = next(); break;
      case '--selector-index': opts.selectorIndex = Number(next()); break;
      case '--padding': opts.padding = Number(next()); break;
      case '--transparent': opts.transparent = true; break;
      case '--quality': opts.quality = Number(next()); break;
      case '--settle-ms': opts.settleMs = Number(next()); break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`[bake-css-background-asset] unknown arg: ${arg}`);
        process.exit(2);
    }
  }
  for (const key of ['sourceHtml', 'selector', 'output', 'width', 'height']) {
    if (!opts[key]) {
      console.error(`[bake-css-background-asset] --${toKebab(key)} is required`);
      process.exit(2);
    }
  }
  if (!['background', 'box'].includes(opts.mode)) {
    console.error('[bake-css-background-asset] --mode must be background or box');
    process.exit(2);
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: node tools_node/bake-css-background-asset.js \
  --source-html <html> --selector <css-selector> \
  --width <px> --height <px> --output <png|jpg> [--mode background|box]`);
}

function toKebab(value) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function findBrowser(explicit) {
  if (explicit && fs.existsSync(explicit)) return explicit;
  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || explicit;
}

async function main() {
  const opts = parseArgs(process.argv);
  const sourceHtml = path.resolve(opts.sourceHtml);
  const output = path.resolve(opts.output);
  if (!fs.existsSync(sourceHtml)) {
    throw new Error(`source html not found: ${sourceHtml}`);
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: findBrowser(opts.browser),
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-extensions', '--allow-file-access-from-files'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: opts.width, height: opts.height, deviceScaleFactor: 1 });
    await page.goto(`file://${sourceHtml.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
    if (opts.settleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, opts.settleMs));
    }
    const styles = await page.evaluate((selector, selectorIndex) => {
      const element = document.querySelectorAll(selector)[selectorIndex];
      if (!element) return null;
      const base = getComputedStyle(element);
      const after = getComputedStyle(element, '::after');
      const toBackground = (style) => ({
        image: style.backgroundImage,
        color: style.backgroundColor,
        size: style.backgroundSize,
        position: style.backgroundPosition,
        repeat: style.backgroundRepeat,
      });
      return {
        base: toBackground(base),
        after: toBackground(after),
        afterContent: after.content,
        box: {
          backgroundColor: base.backgroundColor,
          backgroundImage: base.backgroundImage,
          backgroundSize: base.backgroundSize,
          backgroundPosition: base.backgroundPosition,
          backgroundRepeat: base.backgroundRepeat,
          borderTop: base.borderTop,
          borderRight: base.borderRight,
          borderBottom: base.borderBottom,
          borderLeft: base.borderLeft,
          borderRadius: base.borderRadius,
          boxShadow: base.boxShadow,
          opacity: base.opacity,
        },
      };
    }, opts.selector, opts.selectorIndex);
    if (!styles) {
      throw new Error(`selector not found: ${opts.selector} at index ${opts.selectorIndex}`);
    }

    const clean = await browser.newPage();
    const padding = Math.max(0, Math.round(opts.padding || 0));
    const captureWidth = opts.width + padding * 2;
    const captureHeight = opts.height + padding * 2;
    await clean.setViewport({ width: captureWidth, height: captureHeight, deviceScaleFactor: 1 });
    const html = opts.mode === 'box'
      ? buildBoxHtml(styles, opts.width, opts.height, padding, opts.transparent)
      : buildIsolatedHtml(styles, opts.width, opts.height, opts.transparent);
    await clean.setContent(html);
    const type = /\.jpe?g$/i.test(output) ? 'jpeg' : 'png';
    const screenshotOptions = { path: output, type, clip: { x: 0, y: 0, width: captureWidth, height: captureHeight } };
    if (type === 'jpeg') screenshotOptions.quality = Math.max(1, Math.min(100, opts.quality || 100));
    if (type === 'png' && opts.transparent) screenshotOptions.omitBackground = true;
    await clean.screenshot(screenshotOptions);
    console.log(`[bake-css-background-asset] wrote ${path.relative(process.cwd(), output).replace(/\\/g, '/')}`);
  } finally {
    await browser.close();
  }
}

function buildIsolatedHtml(styles, width, height, transparent = false) {
  const base = styles.base;
  const after = styles.after;
  const hasAfter = styles.afterContent && styles.afterContent !== 'none' && after.image && after.image !== 'none';
  const bodyBg = transparent ? 'transparent' : (base.color || '#000');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:${bodyBg};}
.target{position:absolute;inset:0;width:${width}px;height:${height}px;overflow:hidden;background-color:${base.color};background-image:${base.image};background-size:${base.size};background-position:${base.position};background-repeat:${base.repeat};}
.target::after{content:"";position:absolute;inset:0;${hasAfter ? `background-color:${after.color};background-image:${after.image};background-size:${after.size};background-position:${after.position};background-repeat:${after.repeat};` : 'background:transparent;'}}
</style></head><body><div class="target"></div></body></html>`;
}

function buildBoxHtml(styles, width, height, padding = 0, transparent = true) {
  const box = styles.box || {};
  const canvasWidth = width + padding * 2;
  const canvasHeight = height + padding * 2;
  const bodyBg = transparent ? 'transparent' : '#000';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:${canvasWidth}px;height:${canvasHeight}px;overflow:hidden;background:${bodyBg};}
.target{box-sizing:border-box;position:absolute;left:${padding}px;top:${padding}px;width:${width}px;height:${height}px;
background-color:${box.backgroundColor || 'transparent'};
background-image:${box.backgroundImage || 'none'};
background-size:${box.backgroundSize || 'auto'};
background-position:${box.backgroundPosition || '0% 0%'};
background-repeat:${box.backgroundRepeat || 'repeat'};
border-top:${box.borderTop || '0 none transparent'};
border-right:${box.borderRight || '0 none transparent'};
border-bottom:${box.borderBottom || '0 none transparent'};
border-left:${box.borderLeft || '0 none transparent'};
border-radius:${box.borderRadius || '0'};
box-shadow:${box.boxShadow || 'none'};
opacity:${box.opacity || '1'};}
</style></head><body><div class="target"></div></body></html>`;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[bake-css-background-asset] ${error.stack || error.message || error}`);
    process.exit(1);
  });
}

module.exports = { parseArgs, buildIsolatedHtml, buildBoxHtml };