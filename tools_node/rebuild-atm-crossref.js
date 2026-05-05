#!/usr/bin/env node
/**
 * rebuild-atm-crossref.js
 * Scans docs/ai_atomic_framework/*.md and updates the Section Inventory
 * block in ATM_cross_reference.md (between BEGIN/END fence markers).
 * Hand-maintained sections (routing table, doc_refs spec) are never touched.
 *
 * Usage:
 *   node tools_node/rebuild-atm-crossref.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const ATM_DIR = path.join(REPO_ROOT, 'docs', 'ai_atomic_framework');
const CROSSREF_PATH = path.join(ATM_DIR, 'ATM_cross_reference.md');
const SHARDS_DIR = path.join(ATM_DIR, 'shards');

const BEGIN_MARKER = '<!-- BEGIN:SECTION_INVENTORY -->';
const END_MARKER = '<!-- END:SECTION_INVENTORY -->';

const isDryRun = process.argv.includes('--dry-run');

function extractDocId(content) {
  const match = content.match(/<!--\s*doc_id:\s*(\S+)\s*-->/);
  return match ? match[1] : null;
}

function extractHeadings(content) {
  const lines = content.split('\n');
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    if (h2) {
      headings.push({ lineNo: i + 1, level: 'H2', text: h2[1].trim() });
    } else if (h3) {
      headings.push({ lineNo: i + 1, level: 'H3', text: h3[1].trim() });
    }
  }
  return headings;
}

function countLines(content) {
  return content.split('\n').length;
}

function renderInventoryBlock(docs) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push(BEGIN_MARKER);
  lines.push('## Section Inventory');
  lines.push('');
  lines.push('> 由 `node tools_node/rebuild-atm-crossref.js` 自動維護，請勿手工修改本區塊內容。');
  lines.push(`> 上次更新：${today}`);

  for (const doc of docs) {
    lines.push('');
    const sizeWarning = doc.lineCount > 600 ? '⚠️ 超大，優先讀 shards/' : '';
    const suffix = sizeWarning ? `（${doc.lineCount} 行）${sizeWarning}` : `（${doc.lineCount} 行）`;
    lines.push(`### ${doc.docId} — ${doc.filename}${suffix}`);
    lines.push('');
    lines.push('| 行號 | 標題層級 | 標題 |');
    lines.push('|---|---|---|');
    for (const h of doc.headings) {
      const escapedText = h.text.replace(/\|/g, '\\|');
      lines.push(`| ${h.lineNo} | ${h.level} | ${escapedText} |`);
    }
  }

  lines.push('');
  lines.push(END_MARKER);
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(CROSSREF_PATH)) {
    console.error(`ERROR: ATM_cross_reference.md not found at ${CROSSREF_PATH}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(ATM_DIR)
    .filter(f => f.endsWith('.md') && f !== 'ATM_cross_reference.md')
    .sort();

  const docs = [];

  for (const filename of allFiles) {
    const filepath = path.join(ATM_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    const docId = extractDocId(content);
    const headings = extractHeadings(content);
    const lineCount = countLines(content);

    if (!docId) {
      console.warn(`WARN: No doc_id found in ${filename}, skipping`);
      continue;
    }

    docs.push({ docId, filename, lineCount, headings });
    console.log(`  scanned: ${docId} — ${filename} (${lineCount} lines, ${headings.length} headings)`);
  }

  // Also scan shards/ if present
  if (fs.existsSync(SHARDS_DIR)) {
    const shardFiles = fs.readdirSync(SHARDS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort();
    if (shardFiles.length > 0) {
      console.log(`  shards/ found: ${shardFiles.length} shard file(s) — listed under parent doc's entry`);
    }
  }

  docs.sort((a, b) => a.docId.localeCompare(b.docId));

  const newInventory = renderInventoryBlock(docs);

  const crossrefContent = fs.readFileSync(CROSSREF_PATH, 'utf8');
  const beginIdx = crossrefContent.indexOf(BEGIN_MARKER);
  const endIdx = crossrefContent.indexOf(END_MARKER);

  if (beginIdx === -1 || endIdx === -1) {
    console.error('ERROR: BEGIN/END markers not found in ATM_cross_reference.md');
    process.exit(1);
  }

  const before = crossrefContent.slice(0, beginIdx);
  const after = crossrefContent.slice(endIdx + END_MARKER.length);
  const updated = before + newInventory + after;

  if (isDryRun) {
    console.log('\n[dry-run] Would write the following inventory block:\n');
    console.log(newInventory.slice(0, 800) + '\n...(truncated)');
    console.log(`\n[dry-run] Total docs scanned: ${docs.length}`);
  } else {
    fs.writeFileSync(CROSSREF_PATH, updated, 'utf8');
    console.log(`\n✅ Updated Section Inventory in ATM_cross_reference.md`);
    console.log(`   Docs scanned: ${docs.length}`);
    console.log(`   File: ${CROSSREF_PATH}`);
  }
}

main();
