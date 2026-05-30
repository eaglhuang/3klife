'use strict';

const fs = require('fs');
const path = require('path');

// 讀取 AAF 上游 plugin dist 的路徑
const PLUGIN_PATH = 'C:/Users/User/AI-Atomic-Framework/packages/atm-markdown-task-source/dist/index.js';

/**
 * Shadow Advisor Runner
 * 同步在後台跑上游 plugin 進行 parser 與 validator 對照
 * 永不阻擋主流程，僅於 stderr 輸出 advisory 對照報告
 *
 * @param {string} mdPath 任務卡 markdown 檔案路徑
 * @param {string} rawContent 任務卡原始 Markdown 內容
 */
async function runShadowAdvisor(mdPath, rawContent) {
  try {
    const resolvedPath = path.resolve(mdPath);
    if (!fs.existsSync(PLUGIN_PATH)) {
      process.stderr.write(`⚠️ [D2 Shadow Advisor] Upstream plugin not found at: ${PLUGIN_PATH}\n`);
      return;
    }

    // 1. 動態加載 AAF 側的標準 plugin
    const { default: plugin } = await import(`file:///${PLUGIN_PATH}`);
    if (!plugin || typeof plugin.parse !== 'function' || typeof plugin.validate !== 'function') {
      process.stderr.write(`⚠️ [D2 Shadow Advisor] Loaded plugin is missing parse/validate hooks.\n`);
      return;
    }

    // 2. 執行 plugin.parse
    const parsed = await plugin.parse({
      sourcePath: resolvedPath,
      raw: rawContent
    });

    if (!parsed) {
      process.stderr.write(`⚠️ [D2 Shadow Advisor] Plugin parse returned null for card: ${path.basename(resolvedPath)}\n`);
      return;
    }

    // 3. 執行 plugin.validate
    const validationResult = await plugin.validate(parsed);

    // 4. 輸出對照報告 (Advisory Info / Warnings)
    process.stderr.write(`\n=== 🔍 [D2 Shadow Advisor] Upstream Plugin Parsing & Validation Report ===\n`);
    process.stderr.write(`Task ID: ${parsed.taskId || 'UNKNOWN'}\n`);
    process.stderr.write(`Source Path: ${parsed.sourcePath || 'UNKNOWN'}\n`);
    process.stderr.write(`Parsed Front-matter: ${JSON.stringify(parsed.frontmatter, null, 2)}\n`);

    if (validationResult.diagnostics && validationResult.diagnostics.length > 0) {
      process.stderr.write(`Diagnostics findings (${validationResult.diagnostics.length}):\n`);
      for (const diag of validationResult.diagnostics) {
        const levelIcon = diag.level === 'error' ? '❌' : '⚠️';
        process.stderr.write(`  ${levelIcon} [${diag.code}] (${diag.level}): ${diag.message}\n`);
      }
    } else {
      process.stderr.write(`✅ Upstream plugin validation passed with 0 findings.\n`);
    }
    process.stderr.write(`=== ================================================================= ===\n\n`);

  } catch (err) {
    // 嚴格不阻擋原則：catch 所有錯誤，僅在 stderr 輸出以供除錯，維持 exit code = 0
    process.stderr.write(`⚠️ [D2 Shadow Advisor] Runner caught error: ${err.message}\n`);
  }
}

module.exports = {
  runShadowAdvisor
};
