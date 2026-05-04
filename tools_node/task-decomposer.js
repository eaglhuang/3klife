#!/usr/bin/env node
/**
 * task-decomposer.js — 任務原子化拆解器
 *
 * Harness Engineering 前饋引導（Feedforward Guide）：
 * 將一個大型功能需求自動拆解成一系列有順序依賴的原子任務卡，
 * 每張卡都小到「即使是 1.5B 的小型 LLM 也能穩定完成」。
 *
 * 每張產出的任務卡內建：
 *   - INPUT_CONTRACT  : 此任務需要哪些先決條件已存在
 *   - OUTPUT_CONTRACT : 此任務完成後產出哪些成果
 *   - VALIDATION_CMD  : 完成後跑哪條計算型驗證
 *   - ROLLBACK_HINT   : 失敗時如何復原
 *
 * 設計原則：
 *   - 每張卡的修改範圍不超過 3 個檔案
 *   - 每張卡有明確的通過 / 不通過判斷（可計算的）
 *   - 任務鏈可由任何型號的 Agent 循序執行
 *
 * 用法：
 *   node tools_node/task-decomposer.js --feature <功能名稱> --type <類型>
 *   node tools_node/task-decomposer.js --feature "戰場部署系統" --type system
 *   node tools_node/task-decomposer.js --feature "武將列表 UI" --type ui
 *   node tools_node/task-decomposer.js --feature "技能資料 Schema" --type data
 *   node tools_node/task-decomposer.js --list-types        # 列出所有可用類型
 *   node tools_node/task-decomposer.js --preview           # 預覽不輸出檔案
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TASKS_DIR = path.join(PROJECT_ROOT, 'docs', 'agent-briefs', 'tasks');
const DOC_ID_REGISTRY = path.join(PROJECT_ROOT, 'docs', 'doc-id-registry.json');

// ─── 參數解析 ─────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    feature: '',
    type: 'system',
    spec: '',
    prefix: '',
    outputDir: '',
    listTypes: false,
    preview: false,
    json: false,
    priority: 'P2',
    owner: 'Agent',
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--feature') args.feature = argv[++i] || '';
    else if (argv[i] === '--type') args.type = argv[++i] || 'system';
    else if (argv[i] === '--spec') args.spec = argv[++i] || '';
    else if (argv[i] === '--prefix') args.prefix = argv[++i] || '';
    else if (argv[i] === '--output-dir') args.outputDir = argv[++i] || '';
    else if (argv[i] === '--priority') args.priority = argv[++i] || 'P2';
    else if (argv[i] === '--owner') args.owner = argv[++i] || 'Agent';
    else if (argv[i] === '--list-types') args.listTypes = true;
    else if (argv[i] === '--preview') args.preview = true;
    else if (argv[i] === '--json') args.json = true;
  }
  return args;
}

// ─── 功能類型模板定義 ─────────────────────────────────────
const FEATURE_TEMPLATES = {
  /**
   * system：後端系統功能
   * 例：戰場部署系統、技能計算器、NPC 記憶系統
   */
  system: {
    label: '後端系統功能',
    description: '後端系統功能（資料流 / 業務邏輯 / 狀態管理）',
    phases: [
      {
        id: 'interface',
        label: '定義 TypeScript 介面與型別',
        prefix: 'IFACE',
        desc: '定義所有 Interface、Enum、Type alias',
        inputContract: ['母規格書已存在', '相關 Data Schema 文件已更新'],
        outputContract: ['assets/scripts/shared/ 下的 .ts 介面檔', '無運行時副作用'],
        validationCmd: 'node tools_node/compute-gate.js --gates ts-syntax encoding',
        rollbackHint: '直接刪除新增的介面檔',
        maxFiles: 2,
      },
      {
        id: 'data-layer',
        label: '實作資料存取層',
        prefix: 'DATA',
        desc: '實作 Repository / Service 的資料讀寫方法',
        inputContract: ['介面任務已完成', '介面檔案已存在'],
        outputContract: ['data service 檔案', '通過型別掃描'],
        validationCmd: 'node tools_node/compute-gate.js --gates ts-syntax eslint-rules',
        rollbackHint: 'git checkout 回滾資料層實作',
        maxFiles: 3,
      },
      {
        id: 'logic',
        label: '實作核心業務邏輯',
        prefix: 'LOGIC',
        desc: '實作計算公式、狀態機、驗證規則',
        inputContract: ['資料層任務已完成', '資料服務可調用'],
        outputContract: ['邏輯模組檔案', '通過型別掃描', '通過 ESLint 規則'],
        validationCmd: 'node tools_node/compute-gate.js --gates ts-syntax eslint-rules import-boundary',
        rollbackHint: 'git checkout 回滾邏輯層實作',
        maxFiles: 3,
      },
      {
        id: 'integration',
        label: '整合測試與 Fixture 建立',
        prefix: 'TEST',
        desc: '建立 Approved Fixture 並驗證端到端行為',
        inputContract: ['邏輯層任務已完成', '核心函數可獨立呼叫'],
        outputContract: ['fixtures/<功能>/case-01.input.json', 'fixtures/<功能>/case-01.expected.json'],
        validationCmd: 'node tools_node/approved-fixture-check.js',
        rollbackHint: '刪除 fixtures 目錄下新增的案例檔',
        maxFiles: 4,
      },
    ],
  },

  /**
   * ui：UI 元件功能
   * 例：武將列表介面、虎符卡元件、大廳 HUD
   */
  ui: {
    label: 'UI 元件功能',
    description: 'UI 元件開發（Layout JSON → Skin JSON → Prefab → 驗收）',
    phases: [
      {
        id: 'spec',
        label: '建立 UI 規格書',
        prefix: 'SPEC',
        desc: '定義 Component Sizing Table、內容契約、Skin Fragment 清單',
        inputContract: ['母規格書或任務卡需求已明確'],
        outputContract: ['docs/遊戲規格文件/... 規格書更新或新建', '含 Component Sizing Table'],
        validationCmd: 'node tools_node/compute-gate.js --gates encoding',
        rollbackHint: '回滾規格書更動',
        maxFiles: 2,
      },
      {
        id: 'layout',
        label: '建立 Layout JSON',
        prefix: 'LAYOUT',
        desc: '在 assets/resources/ui-spec/layouts/ 建立或更新 layout.json',
        inputContract: ['UI 規格書已建立', 'Component Sizing Table 已確認'],
        outputContract: ['layout JSON 檔', '通過 validate-ui-specs.js'],
        validationCmd: 'node tools_node/compute-gate.js --gates ui-spec-contract',
        rollbackHint: '刪除或回滾 layout JSON',
        maxFiles: 2,
      },
      {
        id: 'skin',
        label: '建立 Skin JSON',
        prefix: 'SKIN',
        desc: '在 assets/resources/ui-spec/skins/ 建立 skin.json，引用 Design Token',
        inputContract: ['Layout JSON 已建立', 'Design Token 已定義'],
        outputContract: ['skin JSON 檔', '通過 validate-skin-contracts.js'],
        validationCmd: 'node tools_node/compute-gate.js --gates ui-spec-contract skin-contracts',
        rollbackHint: '刪除或回滾 skin JSON',
        maxFiles: 2,
      },
      {
        id: 'prefab',
        label: '實作 Prefab TypeScript 邏輯',
        prefix: 'PREFAB',
        desc: '建立對應的 .ts 元件，綁定資料與 UI 節點',
        inputContract: ['Layout / Skin JSON 已建立', 'TypeScript 介面已定義'],
        outputContract: ['assets/scripts/ui/ 下的元件 .ts', '通過型別掃描', '通過 ESLint'],
        validationCmd: 'node tools_node/compute-gate.js --gates ts-syntax eslint-rules import-boundary',
        rollbackHint: 'git checkout 回滾元件 .ts',
        maxFiles: 3,
      },
      {
        id: 'smoke',
        label: '截圖驗收',
        prefix: 'SMOKE',
        desc: '跑截圖捕捉工具並比對 baseline，確認視覺正確',
        inputContract: ['Prefab 已完成', 'Cocos Editor 已刷新 asset-db'],
        outputContract: ['artifacts/ui-qa/<screen-id>/review/ 截圖', 'runtime-verdict.json'],
        validationCmd: 'node tools_node/headless-snapshot-test.js',
        rollbackHint: '回滾 Prefab 到上一版本並重新截圖',
        maxFiles: 2,
      },
    ],
  },

  /**
   * data：資料 Schema 更新
   * 例：新增武將欄位、調整技能資料結構
   */
  data: {
    label: '資料 Schema 更新',
    description: '資料 Schema 設計與遷移（不含 UI 或業務邏輯實作）',
    phases: [
      {
        id: 'schema-design',
        label: '設計新欄位 Schema',
        prefix: 'SCHEMA',
        desc: '在 Data Schema 文件定義新欄位、型別、約束',
        inputContract: ['規格書需求已明確'],
        outputContract: ['Data Schema 文件更新', '交叉索引同步'],
        validationCmd: 'node tools_node/compute-gate.js --gates encoding crossref-integrity',
        rollbackHint: '回滾 Schema 文件更動',
        maxFiles: 2,
      },
      {
        id: 'json-update',
        label: '更新 JSON 資料檔',
        prefix: 'JSON',
        desc: '更新 assets/resources/data/ 下的資料 JSON，加入新欄位',
        inputContract: ['Schema 設計已確認', '欄位命名已鎖定'],
        outputContract: ['JSON 資料檔更新', '通過 validate-generals-data.js 或對應驗證'],
        validationCmd: 'node tools_node/compute-gate.js --gates general-data',
        rollbackHint: 'git checkout 回滾 JSON 資料',
        maxFiles: 3,
      },
      {
        id: 'interface-sync',
        label: '同步 TypeScript 介面',
        prefix: 'IFACE',
        desc: '更新對應的 TypeScript 介面定義，與 JSON Schema 保持一致',
        inputContract: ['JSON 資料已更新', '新欄位型別已確認'],
        outputContract: ['介面 .ts 更新', '通過型別掃描'],
        validationCmd: 'node tools_node/compute-gate.js --gates ts-syntax',
        rollbackHint: 'git checkout 回滾介面 .ts',
        maxFiles: 2,
      },
    ],
  },

  /**
   * doc：文件整合任務
   * 例：疑問書回寫、規格書合併、任務卡批次建立
   */
  doc: {
    label: '文件整合任務',
    description: '規格書整合、疑問書回寫、交叉索引維護',
    phases: [
      {
        id: 'gather',
        label: '蒐集決策依據',
        prefix: 'GATHER',
        desc: '確認所有相關討論文件、疑問書條目、利害關係人決策',
        inputContract: ['相關討論文件已知路徑'],
        outputContract: ['決策摘要草稿'],
        validationCmd: 'node tools_node/compute-gate.js --gates encoding',
        rollbackHint: '無（僅閱讀操作）',
        maxFiles: 1,
      },
      {
        id: 'write',
        label: '回寫規格書',
        prefix: 'WRITE',
        desc: '將決策結果寫入母規格書，維護 doc_id 與文件格式',
        inputContract: ['決策摘要已確認', '目標規格書路徑已知'],
        outputContract: ['規格書更新', '通過編碼檢查'],
        validationCmd: 'node tools_node/compute-gate.js --gates encoding crossref-integrity',
        rollbackHint: 'git checkout 回滾規格書',
        maxFiles: 2,
      },
      {
        id: 'crossref',
        label: '更新交叉索引',
        prefix: 'XREF',
        desc: '執行 rebuild-crossref.js 更新文件間的引用關係',
        inputContract: ['規格書回寫已完成'],
        outputContract: ['cross-ref shards 更新', '通過 crossref-integrity'],
        validationCmd: 'node tools_node/compute-gate.js --gates crossref-integrity',
        rollbackHint: '重新執行 rebuild-crossref.js',
        maxFiles: 3,
      },
    ],
  },
};

// ─── 生成任務 ID ───────────────────────────────────────────
function getNextTaskId(prefix) {
  const tasks = fs.readdirSync(TASKS_DIR).filter(f => f.startsWith(`${prefix}-`) && f.endsWith('.md'));
  if (tasks.length === 0) return `${prefix}-0001`;
  const nums = tasks.map(f => {
    const match = f.match(/-(\d+)\.md$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const max = Math.max(...nums);
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

// ─── 生成任務卡內容 ───────────────────────────────────────
function generateTaskCard(args, phase, phaseIndex, totalPhases, chainId, taskId) {
  const today = new Date().toISOString().split('T')[0];
  const featureName = args.feature;
  const specRef = args.spec ? `\n  - ${args.spec}` : '';

  const inputList = phase.inputContract.map(s => `  - ${s}`).join('\n');
  const outputList = phase.outputContract.map(s => `  - ${s}`).join('\n');

  // 依賴鏈
  const chainLabel = `${featureName}/${phase.id}`;
  const prevPhase = phaseIndex > 0
    ? `\n  - ${chainId}-${String(phaseIndex).padStart(4, '0')} (前置任務)`
    : '';

  return `---
doc_id: doc_task_TBD
id: ${taskId}
priority: ${args.priority}
phase: G
created: ${today}
created_by_agent: task-decomposer
owner: ${args.owner}
status: pending
type: ${args.type}
chain_id: ${chainId}
chain_step: ${phaseIndex + 1}/${totalPhases}
depends:${prevPhase || '\n  []'}
---

# [${taskId}] ${featureName} — ${phase.label}

> 🔗 **任務鏈**：\`${chainLabel}\`（步驟 ${phaseIndex + 1}/${totalPhases}）
> ⚡ **設計原則**：此任務拆解至可由任何 LLM 模型穩定執行的最小粒度（≤${phase.maxFiles} 個修改檔案）

## 目標

${phase.desc}，作為「${featureName}」功能鏈的第 ${phaseIndex + 1} 步。

## INPUT_CONTRACT（前置條件）

在開始執行此任務前，請確認以下條件已滿足：

${inputList}

> [!IMPORTANT]
> 如果前置條件未滿足，請先完成前一張任務卡再繼續。

## OUTPUT_CONTRACT（交付成果）

此任務完成後，必須提供以下成果：

${outputList}

**修改範圍上限**：此任務不得修改超過 **${phase.maxFiles} 個檔案**。
如果發現需要改超過此數量，請拆成新的子任務卡。

## VALIDATION_CMD（計算型驗證）

完成代碼修改後，必須執行以下驗證（確定性、不依賴 LLM）：

\`\`\`bash
${phase.validationCmd}
\`\`\`

> [!CAUTION]
> 驗證**必須通過**後才算完成此任務。如果失敗，錯誤訊息已包含精確的修正位置。

## ROLLBACK_HINT（失敗復原）

如果此任務無法完成或驗證持續失敗：

${phase.rollbackHint}

## 執行步驟

1. 確認 INPUT_CONTRACT 所有條件
2. 執行代碼修改（不超過 ${phase.maxFiles} 個檔案）
3. 執行 \`${phase.validationCmd}\`
4. 確認 OUTPUT_CONTRACT 所有成果存在
5. 更新此任務卡狀態為 \`done\`
6. 交棒至下一張任務卡

## 相關文件${specRef}
- \`docs/keep.summary.md\`（Pre-flight 必讀）
- \`tools_node/compute-gate-config.json\`（閘門設定參考）

---
*由 task-decomposer.js 自動生成 | ${today}*
`;
}

// ─── 主程式 ───────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.listTypes) {
    console.log('\n📋 可用的功能類型（--type）\n');
    for (const [key, tmpl] of Object.entries(FEATURE_TEMPLATES)) {
      console.log(`  ${key.padEnd(10)} — ${tmpl.label}`);
      console.log(`             ${tmpl.description}\n`);
    }
    return;
  }

  if (!args.feature) {
    console.error('❌ 請指定功能名稱：--feature <功能名稱>');
    console.error('   範例：node tools_node/task-decomposer.js --feature "戰場部署系統" --type system');
    process.exit(1);
  }

  const template = FEATURE_TEMPLATES[args.type];
  if (!template) {
    console.error(`❌ 未知的功能類型：${args.type}`);
    console.error('   執行 --list-types 查看所有可用類型');
    process.exit(1);
  }

  const outputDir = args.outputDir
    ? path.resolve(PROJECT_ROOT, args.outputDir)
    : TASKS_DIR;

  // 生成 chain_id（功能名稱縮寫）
  const featureSlug = args.feature
    .replace(/[^\w\u4e00-\u9fff]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
  const chainPrefix = args.prefix || args.type.toUpperCase().slice(0, 3);
  const chainId = `${chainPrefix}-CHAIN-${featureSlug.slice(0, 8).toUpperCase()}`;

  const cards = [];

  console.log(`\n🔧 任務原子化拆解：${args.feature}\n`);
  console.log(`   類型：${template.label}`);
  console.log(`   鏈 ID：${chainId}`);
  console.log(`   步驟數：${template.phases.length}\n`);

  for (let i = 0; i < template.phases.length; i++) {
    const phase = template.phases[i];
    const taskPrefix = `${chainPrefix}-${phase.prefix.slice(0, 4)}`;

    // 在預覽模式下生成假 ID
    const taskId = args.preview
      ? `${taskPrefix}-XXXX`
      : getNextTaskId(taskPrefix);

    const content = generateTaskCard(args, phase, i, template.phases.length, chainId, taskId);
    const fileName = `${taskId}.md`;
    const filePath = path.join(outputDir, fileName);

    cards.push({ taskId, fileName, filePath, phase, content });

    if (args.preview) {
      console.log(`  步驟 ${i + 1}: ${taskId}`);
      console.log(`    標籤：${phase.label}`);
      console.log(`    驗證：${phase.validationCmd}`);
      console.log(`    上限：${phase.maxFiles} 個檔案`);
      console.log();
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ 已建立：${fileName}`);
    }
  }

  if (args.json) {
    const output = cards.map(c => ({
      taskId: c.taskId,
      fileName: c.fileName,
      phase: c.phase.id,
      label: c.phase.label,
      validationCmd: c.phase.validationCmd,
    }));
    console.log('\n' + JSON.stringify(output, null, 2));
  }

  if (!args.preview) {
    console.log(`\n✅ 已建立 ${cards.length} 張原子任務卡`);
    console.log(`   目錄：${path.relative(PROJECT_ROOT, outputDir)}`);
    console.log('\n📋 執行順序：');
    for (const card of cards) {
      console.log(`   ${card.taskId} → ${card.phase.label}`);
    }
    console.log('\n💡 提示：每張卡完成後執行 VALIDATION_CMD 確認通過，再繼續下一張。');
  }
}

main();
