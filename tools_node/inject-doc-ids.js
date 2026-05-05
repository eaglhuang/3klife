/**
 * inject-doc-ids.js — 批次將 doc_id 插入所有 registry 記錄的 .md 文件
 *
 * Usage:
 *   node tools_node/inject-doc-ids.js --dry-run                    # 只列出會改的文件，不真正修改
 *   node tools_node/inject-doc-ids.js                              # 正式同步 doc_id
 *   node tools_node/inject-doc-ids.js --categories task,ai,index   # 只同步指定 category
 *
 * 規則:
 *   - 有 YAML frontmatter (以 --- 開頭)：在 frontmatter 內加/改一行 doc_id: <id>
 *   - 無 YAML frontmatter：在第一行之前插入，或直接改寫既有 <!-- doc_id: ... -->
 *   - 已有錯誤 doc_id 的文件：改成 registry 真值
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const registryStore = require('./lib/doc-id-registry-loader');

const ROOT          = path.resolve(__dirname, '..');

function parseCategoriesArg(argv) {
  const index = argv.indexOf('--categories');
  if (index === -1 || index === argv.length - 1) {
    return null;
  }

  return new Set(
    String(argv[index + 1] || '')
      .split(/[;,|]/)
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function parsePathsArg(argv) {
  const index = argv.indexOf('--paths');
  if (index === -1 || index === argv.length - 1) {
    return null;
  }

  return new Set(
    String(argv[index + 1] || '')
      .split(/[;,|]/)
      .map((value) => value.trim().replace(/\\/g, '/'))
      .filter(Boolean)
  );
}

function detectFrontmatter(content) {
  if (!(content.startsWith('---\n') || content.startsWith('---\r\n'))) {
    return null;
  }

  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r\n|\n/);
  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (endIndex === -1) {
    return null;
  }

  return {
    eol,
    lines,
    endIndex,
  };
}

function extractDocId(content) {
  const frontmatter = detectFrontmatter(content);
  if (frontmatter) {
    for (let index = 1; index < frontmatter.endIndex; index += 1) {
      const yamlMatch = frontmatter.lines[index].match(/^doc_id:\s*(\S+)\s*$/);
      if (yamlMatch) {
        return String(yamlMatch[1] || '').trim();
      }
    }
  }

  const commentMatch = content.match(/<!--\s*doc_id:\s*(\S+)\s*-->/);
  if (commentMatch) {
    return String(commentMatch[1] || '').trim();
  }

  const looseMatch = content.match(/\bdoc_id:\s*(\S+)\s*$/m);
  if (looseMatch) {
    return String(looseMatch[1] || '').trim();
  }

  return '';
}

function findTrailingDocIdLineIndex(lines) {
  let tailIndex = lines.length - 1;
  while (tailIndex >= 0 && String(lines[tailIndex]).trim() === '') {
    tailIndex -= 1;
  }
  if (tailIndex >= 0 && /^doc_id:\s*\S+\s*$/.test(lines[tailIndex])) {
    return tailIndex;
  }
  return -1;
}

function syncDocId(fullPath, docId, dryRun) {
  let content;
  try { content = fs.readFileSync(fullPath, 'utf8'); }
  catch (e) { return `ERROR reading: ${e.message}`; }

  const hasFm  = content.startsWith('---\n') || content.startsWith('---\r\n');
  const eol    = content.includes('\r\n') ? '\r\n' : '\n';
  const currentDocId = extractDocId(content);
  const mixedLines = content.split(/\r\n|\n/);
  const trailingDocIdIndex = hasFm ? findTrailingDocIdLineIndex(mixedLines) : -1;
  const hasTrailingStrayDocId = trailingDocIdIndex >= 0 && trailingDocIdIndex > 0;
  if (currentDocId === docId && !hasTrailingStrayDocId) return 'keep';

  let newContent;

  if (hasFm) {
    const frontmatter = detectFrontmatter(content);
    const lines = frontmatter ? [...frontmatter.lines] : content.split(/\r\n|\n/);
    const frontmatterEndIndex = frontmatter ? frontmatter.endIndex : lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    let replaced = false;

    for (let index = 1; index < (frontmatterEndIndex === -1 ? lines.length : frontmatterEndIndex); index += 1) {
      if (/^doc_id:\s*/.test(lines[index])) {
        lines[index] = `doc_id: ${docId}`;
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      lines.splice(1, 0, `doc_id: ${docId}`);
    }

    // Clean up a stray trailing doc_id line left by earlier buggy sync runs.
    const tailIndex = findTrailingDocIdLineIndex(lines);
    if (tailIndex >= 0 && tailIndex > frontmatterEndIndex) {
      lines.splice(tailIndex, lines.length - tailIndex);
    }

    newContent = lines.join(eol);
  } else if (/<!--\s*doc_id:\s*\S+\s*-->/.test(content)) {
    newContent = content.replace(/<!--\s*doc_id:\s*\S+\s*-->/, `<!-- doc_id: ${docId} -->`);
  } else if (/\bdoc_id:\s*\S/m.test(content)) {
    newContent = content.replace(/\bdoc_id:\s*\S+/m, `doc_id: ${docId}`);
  } else {
    newContent = `<!-- doc_id: ${docId} -->\n${content}`;
  }

  if (!dryRun) {
    try { fs.writeFileSync(fullPath, newContent, 'utf8'); }
    catch (e) { return `ERROR writing: ${e.message}`; }
  }

  if (!currentDocId) {
    return hasFm ? 'inject-yaml' : 'inject-html';
  }

  return hasFm ? 'update-yaml' : 'update-html';
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const categoryFilter = parseCategoriesArg(process.argv);
  const pathFilter = parsePathsArg(process.argv);

  let registry;
  try {
    registry = registryStore.loadDocIdRegistryMap();
  } catch (error) {
    console.error(`${error.message}\nRun: node tools_node/doc-id-registry.js --reshard-current`);
    process.exit(1);
  }

  const entries = Object.entries(registry)
    .filter(([, data]) => !categoryFilter || categoryFilter.has(String(data.category || '').trim()))
    .filter(([, data]) => !pathFilter || pathFilter.has(String(data.path || '').replace(/\\/g, '/')));

  console.log(dryRun
    ? '🔍 DRY RUN — no files will be modified\n'
    : '💉 Syncing doc_ids from registry...\n');

  if (categoryFilter && categoryFilter.size > 0) {
    console.log(`🎯 Category filter: ${[...categoryFilter].join(', ')}\n`);
  }
  if (pathFilter && pathFilter.size > 0) {
    console.log(`📁 Path filter: ${[...pathFilter].join(', ')}\n`);
  }

  let changed = 0, kept = 0, errors = 0;
  const changedPaths = [];

  for (const [docId, data] of entries) {
    const fullPath = path.join(ROOT, data.path);

    if (!fs.existsSync(fullPath)) {
      console.error(`  ❌ not found: ${data.path}`);
      errors++;
      continue;
    }

    const result = syncDocId(fullPath, docId, dryRun);

    if (result === 'keep') {
      kept++;
    } else if (result.startsWith('ERROR')) {
      console.error(`  ❌ ${data.path}: ${result}`);
      errors++;
    } else {
      changed++;
      changedPaths.push(data.path);
      if (dryRun || changed <= 40) {
        const icon = dryRun ? '🔍' : '✅';
        const labelMap = {
          'inject-yaml': '[ADD YAML]',
          'inject-html': '[ADD HTML]',
          'update-yaml': '[FIX YAML]',
          'update-html': '[FIX HTML]',
        };
        console.log(`  ${icon} ${docId.padEnd(22)} ${String(labelMap[result] || result).padEnd(11)} ${data.path}`);
      } else if (changed === 41) {
        console.log(`  ... (remaining files omitted from output)`);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ${dryRun ? 'Would change' : 'Changed'} : ${changed}`);
  console.log(`  Kept (already in sync): ${kept}`);
  if (errors > 0) console.error(`  Errors: ${errors}`);

  if (!dryRun && changedPaths.length > 0) {
    const listPath = path.join(ROOT, 'temp_doc_id_changed.txt');
    fs.writeFileSync(listPath, changedPaths.join('\n'), 'utf8');
    console.log(`\n📋 Changed files list saved: temp_doc_id_changed.txt`);
    console.log('   Encoding check:');
    console.log('   node tools_node/check-encoding-touched.js $(cat temp_doc_id_changed.txt)');
    console.log('\n   Verify:');
    console.log('   node tools_node/doc-id-registry.js --verify');
  }

  if (dryRun) {
    console.log('\n   Run without --dry-run to apply changes.');
  }
}

main();
