#!/usr/bin/env node
// doc_id: doc_other_0018 — R-26 puppeteer bake script (R-15 implementation).
//
// Generic CLI: reads a `*.bake-manifest.json` produced by the dom-to-ui-json
// pipeline (R-25 schema), launches a headless browser ONCE, navigates to the
// manifest's `sourceHtml`, and only for entries explicitly approved by the
// manifest (`autoBake=true`, `bakeAction=auto-screenshot-fragment`) takes a
// transparent small-fragment PNG at `outputPath`. Strictly build-time /
// dev-time / CI — never runtime.
//
// Usage:
//   node tools_node/bake-ucuf-sidecars.js --manifest <path> [--source <html>]
//                                          [--repo-root <dir>] [--dry-run]
//                                          [--only <bakeId>[,<bakeId>...]]
//                                          [--update-status]
//
// Generic for every UI run through the HTML→UCUF skill: the manifest is the
// only contract; nothing in here is screen-specific.
//
// Architecture invariants (must remain true across all callers):
//   * Puppeteer is build-time only. PNGs are committed to git as normal
//     SpriteFrame assets. Runtime sees zero puppeteer dependency.
//   * Element targeting uses `data-ucuf-capture-id="<nodeId>"` which the
//     `computed-style-capture` capture pass already stamps onto every
//     captured element. The bake walk RE-STAMPS the same ids using the
//     same algorithm so the contract holds even if the host browser
//     differs across runs.
//   * Output PNGs are transparent (`omitBackground: true`) and are limited to
//     small standalone missing fragments. Large backgrounds, cards, and masks
//     stay as art-review / converter work and are skipped by default.
//   * dpr defaults to manifest's `target.dpr` (R-25 default = 2).
//   * Deterministic: re-running with the same manifest + same source HTML
//     produces byte-identical PNGs (modulo browser anti-aliasing noise).
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = { only: null, dryRun: false, updateStatus: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--manifest') { out.manifest = next; i++; }
    else if (a === '--source') { out.source = next; i++; }
    else if (a === '--repo-root') { out.repoRoot = next; i++; }
    else if (a === '--only') { out.only = String(next).split(',').map(s => s.trim()).filter(Boolean); i++; }
    else if (a === '--dry-run') { out.dryRun = true; }
    else if (a === '--no-update-status') { out.updateStatus = false; }
    else if (a === '--help' || a === '-h') { out.help = true; }
  }
  return out;
}

function findBrowser() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.CHROME_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.EDGE_PATH,
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

function toFileUrl(filePath) {
  return `file:///${path.resolve(filePath).replace(/\\/g, '/')}`;
}

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isAutoBakeEntry(entry) {
  return !!entry && entry.autoBake === true &&
    entry.bakeAction === 'auto-screenshot-fragment' &&
    typeof entry.outputPath === 'string' && entry.outputPath.length > 0;
}

function clipFromTarget(target) {
  if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') return null;
  return {
    x: Math.max(0, Math.round(target.x)),
    y: Math.max(0, Math.round(target.y)),
    width: Math.max(1, Math.round(target.width || 0)),
    height: Math.max(1, Math.round(target.height || 0)),
  };
}

// Mirror of computed-style-capture id assignment (same enumeration order).
// MUST stay byte-equivalent with the capture-side walk to preserve the
// `data-ucuf-capture-id="<nodeId>"` contract.
const CAPTURE_ID_STAMP = `(() => {
  let nodeId = 0;
  const all = Array.from(document.querySelectorAll('*'));
  all.forEach(el => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'link' || tag === 'meta' || tag === 'br') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    el.setAttribute('data-ucuf-capture-id', String(++nodeId));
  });
  return nodeId;
})()`;

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.manifest) {
    console.log('Usage: node tools_node/bake-ucuf-sidecars.js --manifest <path> [--source <html>] [--repo-root <dir>] [--dry-run] [--only <bakeId>] [--no-update-status]');
    process.exit(args.help ? 0 : 1);
  }

  const repoRoot = args.repoRoot ? path.resolve(args.repoRoot) : process.cwd();
  const manifestPath = path.resolve(args.manifest);
  if (!fs.existsSync(manifestPath)) {
    console.error(`[bake] manifest not found: ${manifestPath}`);
    process.exit(2);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest || !Array.isArray(manifest.entries)) {
    console.error('[bake] manifest is not in R-25/R-26 schema (missing entries[])');
    process.exit(2);
  }

  // Resolve source HTML: CLI arg wins, then manifest.sourceHtml, else fail.
  let sourcePath = args.source ? path.resolve(args.source) : null;
  if (!sourcePath && manifest.sourceHtml) {
    sourcePath = path.resolve(repoRoot, manifest.sourceHtml);
  }
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    console.error('[bake] could not resolve source HTML; pass --source <html> or regenerate manifest with R-26 schema');
    process.exit(2);
  }

  const onlySet = args.only ? new Set(args.only) : null;
  const requested = manifest.entries.filter(e => !onlySet || onlySet.has(e.bakeId));
  const queue = requested.filter(isAutoBakeEntry);
  const skipped = requested.filter(e => !isAutoBakeEntry(e));
  if (queue.length === 0) {
    console.log(`[bake] nothing to bake. autoBake=0 requested=${requested.length} skipped=${skipped.length}`);
    for (const e of skipped.slice(0, 20)) {
      console.log(`  [skip] ${e.bakeId}  ${e.bakeAction || 'not-auto-bake'}  ${e.artGuidance || e.status || ''}`);
    }
    process.exit(0);
  }

  console.log(`[bake] manifest=${path.relative(repoRoot, manifestPath)} screen=${manifest.screenId} auto=${queue.length} requested=${requested.length}/${manifest.entries.length} skipped=${skipped.length}${args.dryRun ? ' (dry-run)' : ''}`);
  console.log(`[bake] source=${path.relative(repoRoot, sourcePath)}`);

  if (args.dryRun) {
    for (const e of queue) {
      const abs = path.resolve(repoRoot, e.outputPath);
      console.log(`  - ${e.bakeId}  ${e.target.width}x${e.target.height}@${e.target.dpr || 2}  -> ${path.relative(repoRoot, abs)}`);
    }
    for (const e of skipped.slice(0, 20)) {
      console.log(`  [skip] ${e.bakeId}  ${e.bakeAction || 'not-auto-bake'}  ${e.artGuidance || e.status || ''}`);
    }
    process.exit(0);
  }

  const browserPath = findBrowser();
  if (!browserPath) {
    console.error('[bake] no Chrome/Edge found; set CHROME_PATH or install Chrome.');
    process.exit(3);
  }

  let puppeteer;
  try { puppeteer = require('puppeteer-core'); }
  catch (_) { console.error('[bake] puppeteer-core missing. npm i puppeteer-core'); process.exit(3); }

  const viewport = (manifest.viewport && manifest.viewport.width && manifest.viewport.height)
    ? { width: manifest.viewport.width, height: manifest.viewport.height, deviceScaleFactor: queue[0].target.dpr || 2 }
    : { width: 1334, height: 750, deviceScaleFactor: queue[0].target.dpr || 2 };

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-extensions', '--allow-file-access-from-files'],
  });
  const t0 = Date.now();
  const results = [];
  let baked = 0;
  let failed = 0;
  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    await page.goto(toFileUrl(sourcePath), { waitUntil: 'networkidle0', timeout: 30000 });
    try { await page.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()); } catch (_) {}
    await new Promise(r => setTimeout(r, 100));
    await page.evaluate(CAPTURE_ID_STAMP);

    for (const entry of queue) {
      const sel = `[data-ucuf-capture-id="${entry.nodeId}"]`;
      const handle = await page.$(sel);
      const absOut = path.resolve(repoRoot, entry.outputPath);
      ensureDirSync(path.dirname(absOut));
      if (!handle) {
        console.error(`  [miss] ${entry.bakeId}  selector not found: ${sel}`);
        results.push({ bakeId: entry.bakeId, status: 'bake-missed', reason: 'selector-not-found' });
        failed++;
        continue;
      }
      try {
        const box = await handle.boundingBox();
        if (!box || box.width <= 0 || box.height <= 0) {
          await handle.dispose();
          console.error(`  [miss] ${entry.bakeId}  zero-area at bake time`);
          results.push({ bakeId: entry.bakeId, status: 'bake-missed', reason: 'zero-area' });
          failed++;
          continue;
        }
        const clip = clipFromTarget(entry.target);
        if (clip) await page.screenshot({ path: absOut, omitBackground: true, type: 'png', clip });
        else await handle.screenshot({ path: absOut, omitBackground: true, type: 'png' });
        await handle.dispose();
        const stat = fs.statSync(absOut);
        results.push({ bakeId: entry.bakeId, status: 'baked', bytes: stat.size, mtime: stat.mtimeMs, outputPath: entry.outputPath });
        baked++;
        const sizeLabel = clip ? `${clip.width}x${clip.height} clip` : `${Math.round(box.width)}x${Math.round(box.height)}`;
        console.log(`  [ok]   ${entry.bakeId}  ${sizeLabel} -> ${path.relative(repoRoot, absOut)} (${stat.size}B)`);
      } catch (err) {
        await handle.dispose();
        console.error(`  [err]  ${entry.bakeId}  ${err.message}`);
        results.push({ bakeId: entry.bakeId, status: 'bake-failed', reason: err.message });
        failed++;
      }
    }
    await page.close();
  } finally {
    await browser.close();
  }

  // Update manifest entries' status (build-time only; PNG fingerprints are
  // the source of truth, status is just an audit hint).
  if (args.updateStatus) {
    const byId = new Map(results.map(r => [r.bakeId, r]));
    for (const e of manifest.entries) {
      const r = byId.get(e.bakeId);
      if (!r) continue;
      e.status = r.status;
      if (r.status === 'baked') {
        e.bakedBytes = r.bytes;
        e.bakedMtime = r.mtime;
      } else if (r.reason) {
        e.bakeReason = r.reason;
      }
    }
    manifest.lastBake = {
      at: new Date().toISOString(),
      tool: 'tools_node/bake-ucuf-sidecars.js (R-26)',
      bakedCount: baked,
      failedCount: failed,
      durationMs: Date.now() - t0,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }

  console.log(`[bake] done. baked=${baked} failed=${failed} elapsed=${Date.now() - t0}ms`);
  process.exit(failed === 0 ? 0 : 4);
}

main().catch(err => { console.error('[bake] fatal:', err && err.stack || err); process.exit(99); });
