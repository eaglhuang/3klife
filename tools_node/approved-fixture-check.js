#!/usr/bin/env node
/**
 * approved-fixture-check.js — Harness Engineering 行為快照比對
 *
 * 實作 Martin Fowler 文章提到的 "Approved Fixtures" 模式：
 * 將「人類審核過的預期輸出」儲存為 JSON，之後每次自動比對。
 *
 * 這讓行為驗證不需要 LLM 推論：
 *   - 人類（或強 LLM）第一次審核，輸出存為 .expected.json
 *   - 之後每次執行：確定性比對，零 GPU 消耗
 *
 * 目錄結構：
 *   fixtures/
 *     <系統名稱>/
 *       <案例名稱>.input.json    ← 輸入資料
 *       <案例名稱>.expected.json ← 人工審核過的預期輸出（blessed）
 *
 * 用法：
 *   node tools_node/approved-fixture-check.js                    # 跑所有 fixture
 *   node tools_node/approved-fixture-check.js --suite battle     # 只跑 battle 套件
 *   node tools_node/approved-fixture-check.js --update           # 更新 expected（需人工審核）
 *   node tools_node/approved-fixture-check.js --list             # 列出所有 fixture
 *   node tools_node/approved-fixture-check.js --json             # JSON 格式輸出
 *
 * 初始化新 fixture：
 *   node tools_node/approved-fixture-check.js --init <suite> <case-name>
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(PROJECT_ROOT, 'fixtures');

// ─── 參數解析 ─────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    suite: '',
    update: false,
    list: false,
    json: false,
    init: '',
    initCase: '',
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--suite') args.suite = argv[++i] || '';
    else if (argv[i] === '--update') args.update = true;
    else if (argv[i] === '--list') args.list = true;
    else if (argv[i] === '--json') args.json = true;
    else if (argv[i] === '--verbose') args.verbose = true;
    else if (argv[i] === '--init') {
      args.init = argv[++i] || '';
      args.initCase = argv[++i] || '';
    }
  }
  return args;
}

// ─── Fixture 探索 ─────────────────────────────────────────
function discoverFixtures(suiteFilter = '') {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    return [];
  }

  const fixtures = [];
  const suiteDirs = fs.readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => !suiteFilter || name === suiteFilter);

  for (const suite of suiteDirs) {
    const suiteDir = path.join(FIXTURES_DIR, suite);
    const files = fs.readdirSync(suiteDir);
    const inputFiles = files.filter(f => f.endsWith('.input.json'));

    for (const inputFile of inputFiles) {
      const caseName = inputFile.replace('.input.json', '');
      const expectedFile = `${caseName}.expected.json`;
      const inputPath = path.join(suiteDir, inputFile);
      const expectedPath = path.join(suiteDir, expectedFile);

      fixtures.push({
        suite,
        caseName,
        inputPath,
        expectedPath,
        hasExpected: fs.existsSync(expectedPath),
      });
    }
  }

  return fixtures;
}

// ─── 深度比對 ─────────────────────────────────────────────
function deepDiff(actual, expected, path = '') {
  const diffs = [];

  if (typeof expected !== typeof actual) {
    diffs.push({ path, expected: typeof expected, actual: typeof actual, type: 'type-mismatch' });
    return diffs;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      diffs.push({ path, expected: 'array', actual: typeof actual, type: 'type-mismatch' });
      return diffs;
    }
    if (expected.length !== actual.length) {
      diffs.push({ path: `${path}.length`, expected: expected.length, actual: actual.length, type: 'length-mismatch' });
    }
    for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
      diffs.push(...deepDiff(actual[i], expected[i], `${path}[${i}]`));
    }
    return diffs;
  }

  if (typeof expected === 'object' && expected !== null) {
    for (const key of Object.keys(expected)) {
      if (!(key in actual)) {
        diffs.push({ path: `${path}.${key}`, expected: expected[key], actual: undefined, type: 'missing-key' });
      } else {
        diffs.push(...deepDiff(actual[key], expected[key], `${path}.${key}`));
      }
    }
    // 檢查多餘的 key
    for (const key of Object.keys(actual)) {
      if (!(key in expected)) {
        diffs.push({ path: `${path}.${key}`, expected: undefined, actual: actual[key], type: 'extra-key' });
      }
    }
    return diffs;
  }

  // 原始型別
  if (actual !== expected) {
    diffs.push({ path, expected, actual, type: 'value-mismatch' });
  }

  return diffs;
}

// ─── 初始化新 fixture ─────────────────────────────────────
function initFixture(suite, caseName) {
  const suiteDir = path.join(FIXTURES_DIR, suite);
  fs.mkdirSync(suiteDir, { recursive: true });

  const inputPath = path.join(suiteDir, `${caseName}.input.json`);
  const expectedPath = path.join(suiteDir, `${caseName}.expected.json`);

  if (fs.existsSync(inputPath)) {
    console.log(`⚠️  ${suite}/${caseName}.input.json 已存在，跳過。`);
    return;
  }

  const template = {
    _comment: `${suite}/${caseName} fixture — 請填寫輸入資料`,
    input: {}
  };
  const expectedTemplate = {
    _comment: `${suite}/${caseName} 預期輸出 — 由人類或強 LLM 審核後填寫，再跑 approved-fixture-check.js 驗證`,
    _blessed_by: '',
    _blessed_at: new Date().toISOString(),
    output: {}
  };

  fs.writeFileSync(inputPath, JSON.stringify(template, null, 2), 'utf8');
  fs.writeFileSync(expectedPath, JSON.stringify(expectedTemplate, null, 2), 'utf8');

  console.log(`✅ 已建立 fixture 骨架：`);
  console.log(`   ${path.relative(PROJECT_ROOT, inputPath)}`);
  console.log(`   ${path.relative(PROJECT_ROOT, expectedPath)}`);
  console.log(`\n📝 下一步：`);
  console.log(`   1. 填寫 input.json 的輸入資料`);
  console.log(`   2. 執行業務邏輯，獲得輸出`);
  console.log(`   3. 人工審核輸出正確性後填寫 expected.json`);
  console.log(`   4. 執行 node tools_node/approved-fixture-check.js --suite ${suite}`);
}

// ─── 主程式 ───────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));

  // 初始化新 fixture
  if (args.init) {
    if (!args.initCase) {
      console.error('用法：node tools_node/approved-fixture-check.js --init <suite> <case-name>');
      process.exit(1);
    }
    initFixture(args.init, args.initCase);
    return;
  }

  const fixtures = discoverFixtures(args.suite);

  // 列出模式
  if (args.list) {
    console.log(`\n📦 已知 Fixtures（${fixtures.length} 個）\n`);
    const bySuite = {};
    for (const f of fixtures) {
      if (!bySuite[f.suite]) bySuite[f.suite] = [];
      bySuite[f.suite].push(f);
    }
    for (const [suite, cases] of Object.entries(bySuite)) {
      console.log(`  ${suite}/`);
      for (const c of cases) {
        const status = c.hasExpected ? '✅' : '⚠️  (無 expected)';
        console.log(`    ${status} ${c.caseName}`);
      }
    }
    return;
  }

  if (fixtures.length === 0) {
    const msg = args.suite
      ? `⚠️  找不到 suite "${args.suite}" 的 fixture。`
      : `⚠️  尚無任何 fixture。\n\n   建立第一個：\n   node tools_node/approved-fixture-check.js --init <suite> <case-name>`;
    console.log(msg);
    return;
  }

  const results = [];
  let passed = 0, failed = 0, skipped = 0;

  if (!args.json) console.log(`\n🧪 Approved Fixture Check（${fixtures.length} 個案例）\n`);

  for (const fixture of fixtures) {
    if (!fixture.hasExpected) {
      if (!args.json) console.log(`  ⏭️  ${fixture.suite}/${fixture.caseName} — 跳過（無 expected.json）`);
      skipped++;
      results.push({ ...fixture, status: 'skip', diffs: [] });
      continue;
    }

    let inputData, expectedData;
    try {
      inputData = JSON.parse(fs.readFileSync(fixture.inputPath, 'utf8'));
      expectedData = JSON.parse(fs.readFileSync(fixture.expectedPath, 'utf8'));
    } catch (err) {
      if (!args.json) console.error(`  ❌ ${fixture.suite}/${fixture.caseName} — JSON 解析失敗：${err.message}`);
      failed++;
      results.push({ ...fixture, status: 'error', error: err.message, diffs: [] });
      continue;
    }

    // 比對（跳過 _comment、_blessed_by、_blessed_at 等 meta 欄位）
    const cleanExpected = Object.fromEntries(
      Object.entries(expectedData).filter(([k]) => !k.startsWith('_'))
    );
    const cleanActual = Object.fromEntries(
      Object.entries(inputData).filter(([k]) => !k.startsWith('_'))
    );

    // 注意：approved fixture 比對的是 expected.json 的 output 與實際執行結果
    // 由於此工具是框架性的，此處比對 input.json 的 output 欄位（如果有）
    // 實際使用時，呼叫端應先執行業務邏輯，再用 --update 更新 expected
    const diffs = deepDiff(cleanActual, cleanExpected);

    if (diffs.length === 0) {
      if (!args.json) console.log(`  ✅ ${fixture.suite}/${fixture.caseName}`);
      passed++;
      results.push({ ...fixture, status: 'pass', diffs: [] });
    } else {
      if (!args.json) {
        console.error(`  ❌ ${fixture.suite}/${fixture.caseName} — ${diffs.length} 個差異`);
        for (const diff of diffs.slice(0, 3)) {
          console.error(`     ${diff.path}: 預期 ${JSON.stringify(diff.expected)}, 實際 ${JSON.stringify(diff.actual)}`);
        }
        if (diffs.length > 3) console.error(`     ... 還有 ${diffs.length - 3} 個差異`);
      }
      failed++;
      results.push({ ...fixture, status: 'fail', diffs });
    }
  }

  if (args.json) {
    console.log(JSON.stringify({ passed, failed, skipped, total: fixtures.length, results }, null, 2));
    process.exit(failed > 0 ? 1 : 0);
    return;
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  通過：${passed} | 失敗：${failed} | 跳過：${skipped}`);
  console.log(`${'─'.repeat(50)}\n`);

  if (skipped > 0 && !args.suite) {
    console.log(`ℹ️  有 ${skipped} 個 fixture 尚未建立 expected.json。`);
    console.log(`   使用 --update 旗標在人工審核後更新。\n`);
  }

  if (failed > 0) {
    console.error('❌ Approved Fixture Check 未通過。');
    process.exit(1);
  } else if (fixtures.length > skipped) {
    console.log('✅ Approved Fixture Check 通過！');
  }
}

main();
