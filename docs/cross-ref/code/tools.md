<!-- 分片：cross-ref-code / tools -->
# 代碼索引分片：工具、建置與 Agent Skills

> 入口：`docs/cross-ref/cross-ref-code.md`（doc_index_0001）。欄位說明見入口。

#### Tools (`assets/scripts/tools/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| SceneAutoBuilder.ts | doc_tech_0007 | 概: 自動生成場景節點樹 |
| vfx-block-registry.ts | doc_tech_0015, doc_art_0003 | D: VfxBlockDef; 概: 特效積木登錄與 VFX 積木命名 / 路徑治理 |
| vfx-usage-table.ts | doc_tech_0015 | 概: 積木組合宣告 + 死資源偵測 |
| VfxComposerTool.ts | doc_tech_0015, doc_art_0003 | 概: 即時特效預覽工具與 VFX Core 路徑規則 |
| VideoPlayerTest.ts | doc_art_0003 | 概: 影片播放測試 |
| UnityParticlePrefabParser.ts | — | 概: Unity 粒子遷移工具（無直接規格書對應） |
| UnityParticleCompoundMapper.ts | — | 概: Unity 複合粒子映射（無直接規格書對應） |

#### Build Tools (`tools_node/`)

> 更新日期：2026-04-10。所有工具透過 `tools_node/lib/project-config.js` 取得集中路徑，禁止工具內部 `path.join(__dirname, '../assets/...')` 硬編碼。

| 工具 | 功能 | 關鍵路徑 / 產出 |
|------|------|----------------|
| `validate-ui-specs.js` | UI spec 三層 JSON 靜態驗證器（R1–R18） | 輸入：layouts/skins/screens；輸出：errors / warnings |
| `validate-widget-registry.js` | widget-registry.json ↔ 實際 widget 檔案一致性驗證 | `fragments/widget-registry.json` ↔ `fragments/widgets/*.json` |
| `build-fragment-usage-map.js` | 掃 layouts 的 `$ref` 引用，輸出片段使用地圖 | `--query <ref>` 查單一 fragment 影響範圍 |
| `task-lock.js` | Multi-Agent file-based task 鎖定 | `.task-locks/<id>.lock.json`；並確保 .gitignore 排除 |
| `headless-snapshot-test.js` | UI spec JSON 結構 hash 快照測試（baseline 113 specs） | `tools_node/.ui-spec-snapshot.json`；`--update` 更新 baseline |
| `layout-diff.js` | 兩份 layout JSON 人類可讀 diff 比對 | `--git <file>` 比對 HEAD vs 工作目錄 |
| `i18n-overflow-check.js` | CJK 文字寬度估算 + 溢出風險報告 | `i18n/*.json`；目錄不存在 graceful exit |
| `bootstrap-new-project.js` | 匯出 18 個可移植元件至新專案目錄 | `--name/--out/--list/--dry-run/--include/--exclude` |
| `lib/project-config.js` | 集中路徑管理（30+ paths, scenes, locales, templateFamilies, ROOT） | 被 validate-ui-specs / validate-widget-registry / task-lock / build-fragment-usage-map 等引用 |
| `skills-manager.js` | Agent Skills CLI（list / info / validate / export / sync-mirrors / status） | `.github/skills-manifest.json`（25 skills） |
| `check-encoding-touched.js` | 修改後 UTF-8 BOM / mojibake 防護 | 傳入 `<changed-files>` 清單 |
| `scaffold-ui-spec-family.js` | 以 config JSON 一鍵產出三層 UI spec 骨架 | `--config <json>`；輸出 layouts / skins / screens |

#### UCUF Compiler / Orchestrator (`tools_node/`)

> 更新日期：2026-04-16。以下工具為 UCUF UI 模板化藍圖（doc_ui_0046）的工具鏈核心。

| 工具 | 功能 | 關鍵路徑 / 產出 |
|------|------|----------------|
| `compile-proof-to-family-map.js` | proof draft → family-map | `artifacts/ui-source/<screen-id>/proof/<screen-id>.family-map.json` |
| `compile-proof-to-mcq.js` | proof draft 未決欄位 → MCQ 問卷 | `artifacts/ui-source/<screen-id>/mcq/*.json` |
| `compile-mcq-answer-to-recipe.js` | MCQ answers → normalized recipe | `docs/ui/examples/<screen>.recipe.json` |
| `compile-recipe-to-screen-spec.js` | recipe → screen JSON | `assets/resources/ui-spec/screens/<screen>.json` |
| `compile-recipe-to-panel-scaffold.js` | recipe → CompositePanel / ChildPanel .ts 骨架 | `assets/scripts/ui/components/` |
| `compile-recipe-to-task-card.js` | recipe → 可執行任務卡 | `docs/ui-quality-tasks/<task-id>.json` |
| `compile-family-map-to-asset-tasks.js` | family-map → asset-task-manifest | `artifacts/ui-source/<screen-id>/manifests/asset-task-manifest.json` |
| `compile-family-map-to-param-tune-tasks.js` | family-map（80%+ reuse）→ param-tune-manifest | `artifacts/ui-source/<screen-id>/manifests/param-tune-manifest.json` |
| `run-ui-vibe-workflow.js` | 圖驅動 orchestration front-end（串接上述全部） | `--proof-source <image> --screen-id <id>` |

#### Agent Skills（`.github/skills/` + `.agents/skills/`）

> 更新日期：2026-04-16。共 27 個 unique skill（19 僅 .github、2 僅 .agents、6 雙鏡像）。

| Skill | doc_id | 主要消費工具 | 關聯規格 |
|-------|--------|-------------|----------|
| best-mode | doc_agentskill_0001 | check-context-budget.js, report-turn-usage.js | doc_ai_0018 |
| cocos-bug-triage | doc_agentskill_0009 / 0002 | cocos-screenshot + cocos-log-reader 組合 | doc_ui_0049 |
| cocos-log-reader | doc_agentskill_0010 / 0003 | project.log 讀取 | doc_ui_0049 |
| cocos-preview-qa | doc_agentskill_0011 / 0004 | capture-ui-screens.js | doc_ui_0049, doc_ui_0051 |
| cocos-screenshot | doc_agentskill_0012 / 0005 | PrintWindow capture | doc_ui_0049 |
| comfyui-sdxl-partial-asset-gen | doc_agentskill_0013 | ComfyUI local backend | doc_ui_0046 |
| context-budget-guard | doc_agentskill_0006 | check-context-budget.js, summarize-structured-diff.js | doc_ai_0015 |
| crossref-progress-scanner | doc_agentskill_0032 | resolve-doc-id.js, cross-ref shards | doc_index_0007 |
| dalle3-image-gen | doc_agentskill_0014 | MCP DALL-E 3 | doc_ui_0046 |
| doc-consolidation-flow | doc_agentskill_0034 | consolidation-manifest tools | doc_index_0007 |
| doc-shard-manager | doc_agentskill_0015 | shard-manager.js | doc_index_0007 |
| encoding-touched-guard | doc_agentskill_0016 / 0007 | check-encoding-integrity.js, check-encoding-touched.js | doc_ai_0008 |
| general-balance-tuner | doc_agentskill_0017 | — | doc_data_0001 |
| general-data-pipeline | doc_agentskill_0018 | — | doc_data_0001, doc_spec_0016 |
| general-story-writer | doc_agentskill_0019 | — | doc_spec_0016 |
| nano-banana-gen | doc_agentskill_0020 | — | — |
| ui-asset-gen-director | doc_agentskill_0021 | compile-family-map-to-asset-tasks.js | doc_ui_0046 |
| ui-asset-qc | doc_agentskill_0022 | validate-visual-assets.js, validate-ui-specs.js | doc_ui_0049 |
| ui-asset-slice-pipeline | doc_agentskill_0023 | slice-ui-sheet.js, trim-png-by-background.js | doc_ui_0045 |
| ui-brief-generator | doc_agentskill_0024 | — | doc_ui_0046 |
| ui-family-architect | doc_agentskill_0025 | compile-proof-to-family-map.js | doc_ui_0046 |
| ui-i18n-localize | doc_agentskill_0026 | i18n-overflow-check.js | doc_art_0003 |
| ui-preview-judge | doc_agentskill_0027 | cocos-screenshot | doc_ui_0049 |
| ui-reference-decompose | doc_agentskill_0028 | run-ui-vibe-workflow.js | doc_ui_0046 |
| ui-runtime-verify | doc_agentskill_0029 | capture-ui-screens.js, validate-ui-specs.js | doc_ui_0049 |
| ui-spec-scaffold | doc_agentskill_0030 | compile-recipe-to-screen-spec.js, compile-recipe-to-panel-scaffold.js | doc_ui_0046, doc_ui_0049 |
| ui-vibe-pipeline | doc_agentskill_0031 / 0008 | run-ui-vibe-workflow.js + 全 compiler chain | doc_ui_0046, doc_ui_0048 |

---
