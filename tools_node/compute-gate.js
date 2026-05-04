#!/usr/bin/env node
/**
 * compute-gate.js — Harness Engineering 計算型閘門
 *
 * 依據 compute-gate-config.json 的設定，依序執行一組確定性驗證。
 * 所有驗證均為 CPU 計算（Computational Sensor），不需要 LLM 推論。
 *
 * 設計哲學（來自 Martin Fowler Harness Engineering）：
 *   - 計算型感測器便宜且可靠，應在每次變更時執行
 *   - 錯誤訊息應被設計為「適合 LLM 消費」的格式
 *   - 失敗訊息可直接作為 Agent 的下一輪 prompt（正向 Prompt Injection）
 *
 * 用法：
 *   node tools_node/compute-gate.js                    # 執行 standard profile
 *   node tools_node/compute-gate.js --profile quick    # 快速檢查
 *   node tools_node/compute-gate.js --profile full     # 完整檢查
 *   node tools_node/compute-gate.js --gates ts-syntax encoding  # 指定特定 gate
 *   node tools_node/compute-gate.js --json             # JSON 格式輸出（供 Agent 解析）
 *   node tools_node/compute-gate.js --agent-feedback   # 輸出適合 Agent 消費的修正提示
 *
 * @see https://martinfowler.com/articles/harness-engineering.html
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'compute-gate-config.json');

// ────────────────────────────────────────────────────────────
// 參數解析
// ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    profile: 'standard',
    gates: [],
    json: false,
    agentFeedback: false,
    stopOnFail: true,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--profile') {
      args.profile = argv[i + 1] || args.profile;
      i += 1;
    } else if (arg === '--gates') {
      i += 1;
      while (i < argv.length && !argv[i].startsWith('--')) {
        args.gates.push(argv[i]);
        i += 1;
      }
      i -= 1;
    } else if (arg === '--json') {
      args.json = true;
    } else if (arg === '--agent-feedback') {
      args.agentFeedback = true;
    } else if (arg === '--no-stop') {
      args.stopOnFail = false;
    } else if (arg === '--verbose') {
      args.verbose = true;
    }
  }

  return args;
}

// ────────────────────────────────────────────────────────────
// 設定檔載入
// ────────────────────────────────────────────────────────────
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`[compute-gate] 設定檔不存在：${CONFIG_PATH}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error(`[compute-gate] 設定檔解析失敗：${err.message}`);
    process.exit(1);
  }
}

// ────────────────────────────────────────────────────────────
// 決定要跑哪些 gate
// ────────────────────────────────────────────────────────────
function resolveGates(config, args) {
  const allGates = config.gates || [];

  // 如果使用者指定了特定 gate
  if (args.gates.length > 0) {
    const selected = [];
    for (const id of args.gates) {
      const gate = allGates.find((g) => g.id === id);
      if (!gate) {
        console.warn(`[compute-gate] 警告：未找到 gate "${id}"，已跳過`);
        continue;
      }
      selected.push(gate);
    }
    return selected;
  }

  // 依 profile 選取
  const profiles = config.profiles || {};
  const profile = profiles[args.profile];
  if (!profile) {
    console.warn(`[compute-gate] 警告：profile "${args.profile}" 不存在，使用全部 gate`);
    return [...allGates].sort((a, b) => a.priority - b.priority);
  }

  const gateIds = new Set(profile.gates || []);
  return allGates
    .filter((g) => gateIds.has(g.id))
    .sort((a, b) => a.priority - b.priority);
}

// ────────────────────────────────────────────────────────────
// 執行單一 gate
// ────────────────────────────────────────────────────────────
function runGate(gate) {
  const startTime = Date.now();
  const cmdPath = gate.cmd === 'node' ? process.execPath : gate.cmd;
  const cmdArgs = (gate.args || []).map((arg) =>
    arg.startsWith('tools_node/') ? path.join(PROJECT_ROOT, arg) : arg
  );

  // 檢查腳本檔案是否存在
  if (gate.cmd === 'node' && cmdArgs.length > 0) {
    const scriptPath = cmdArgs[0];
    if (!fs.existsSync(scriptPath)) {
      return {
        id: gate.id,
        label: gate.label,
        status: 'skip',
        exitCode: -1,
        durationMs: 0,
        stdout: '',
        stderr: `腳本不存在：${path.relative(PROJECT_ROOT, scriptPath)}`,
        agentHint: `[跳過] ${gate.label}：腳本尚未建立`,
      };
    }
  }

  const result = spawnSync(cmdPath, cmdArgs, {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: false,
    timeout: 60000, // 60 秒超時
  });

  const durationMs = Date.now() - startTime;
  const exitCode = result.status ?? 1;
  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  const passed = exitCode === 0;

  // 產生 Agent 友善的修正提示
  let agentHint = '';
  if (!passed) {
    const errorLines = (stderr || stdout).split('\n').filter(Boolean);
    const firstErrors = errorLines.slice(0, 10).join('\n');
    agentHint = [
      `[計算型閘門失敗] ${gate.label} (${gate.id})`,
      `說明：${gate.description}`,
      `失敗動作：${gate.failAction === 'block' ? '阻擋（必須修正）' : '警告（建議修正）'}`,
      `錯誤摘要：`,
      firstErrors,
      errorLines.length > 10 ? `... 還有 ${errorLines.length - 10} 行錯誤` : '',
      `修正指引：請根據上述錯誤訊息修正對應的檔案，然後重新執行此 gate。`,
    ].filter(Boolean).join('\n');
  }

  return {
    id: gate.id,
    label: gate.label,
    status: passed ? 'pass' : (gate.failAction === 'block' ? 'fail' : 'warn'),
    exitCode,
    durationMs,
    stdout,
    stderr,
    agentHint,
  };
}

// ────────────────────────────────────────────────────────────
// 主程式
// ────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const gates = resolveGates(config, args);

  if (gates.length === 0) {
    console.log('[compute-gate] 無可執行的 gate');
    return;
  }

  const results = [];
  let hasBlockingFailure = false;
  const startTotal = Date.now();

  if (!args.json) {
    console.log(`\n🔒 Compute Gate — profile: ${args.profile} (${gates.length} 個閘門)\n`);
  }

  for (const gate of gates) {
    if (!args.json) {
      process.stdout.write(`  ▶ ${gate.label} ...`);
    }

    const result = runGate(gate);
    results.push(result);

    if (!args.json) {
      const icon = result.status === 'pass' ? '✅'
        : result.status === 'warn' ? '⚠️'
        : result.status === 'skip' ? '⏭️'
        : '❌';
      const duration = result.durationMs > 0 ? ` (${result.durationMs}ms)` : '';
      // 使用 clearLine 覆蓋「...」
      process.stdout.clearLine?.(0);
      process.stdout.cursorTo?.(0);
      console.log(`  ${icon} ${gate.label}${duration}`);

      if (result.status === 'fail' || result.status === 'warn') {
        // 只顯示前幾行錯誤
        const preview = (result.stderr || result.stdout)
          .split('\n')
          .filter(Boolean)
          .slice(0, 5)
          .map((line) => `     ${line}`)
          .join('\n');
        if (preview) console.log(preview);
      }
    }

    if (result.status === 'fail') {
      hasBlockingFailure = true;
      if (args.stopOnFail) break;
    }
  }

  const totalDuration = Date.now() - startTotal;

  // 統計摘要
  const summary = {
    profile: args.profile,
    totalGates: gates.length,
    executed: results.length,
    passed: results.filter((r) => r.status === 'pass').length,
    warned: results.filter((r) => r.status === 'warn').length,
    failed: results.filter((r) => r.status === 'fail').length,
    skipped: results.filter((r) => r.status === 'skip').length,
    totalDurationMs: totalDuration,
    blocked: hasBlockingFailure,
  };

  // JSON 格式輸出
  if (args.json) {
    console.log(JSON.stringify({ summary, results }, null, 2));
    process.exit(hasBlockingFailure ? 1 : 0);
    return;
  }

  // Agent Feedback 格式輸出
  if (args.agentFeedback) {
    const failures = results.filter((r) => r.status === 'fail' || r.status === 'warn');
    if (failures.length > 0) {
      console.log('\n' + '═'.repeat(60));
      console.log('📋 Agent 自動修正提示（可直接作為下一輪 prompt）');
      console.log('═'.repeat(60));
      for (const f of failures) {
        console.log(`\n${f.agentHint}`);
      }
      console.log('\n' + '═'.repeat(60));
    }
  }

  // 文字摘要
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  計算型閘門摘要：${summary.passed}/${summary.totalGates} 通過`
    + (summary.warned > 0 ? ` | ${summary.warned} 警告` : '')
    + (summary.failed > 0 ? ` | ${summary.failed} 阻擋` : '')
    + (summary.skipped > 0 ? ` | ${summary.skipped} 跳過` : '')
    + ` | ${totalDuration}ms`);
  console.log(`${'─'.repeat(50)}\n`);

  if (hasBlockingFailure) {
    console.error('❌ 計算型閘門未通過，請修正阻擋錯誤後重試。');
    process.exit(1);
  } else if (summary.warned > 0) {
    console.warn('⚠️  計算型閘門通過（含警告），建議修正警告項目。');
  } else {
    console.log('✅ 計算型閘門全部通過！');
  }
}

main();
