# ATM Cross Reference — 快查路由表

> 這是 `ATM_cross_reference.md` 的「快查路由表」分片。完整索引見 `docs/ai_atomic_framework/ATM_cross_reference.md`。

## 快查路由表

| Domain | 觸發關鍵字 | 目標文件 + 段落 |
|---|---|---|
| **D1 並行開發協議** | freeze list, cross-shard, H2U vs ATM 衝突, 仲裁順序, 任務卡路由, 凍結清單 | `doc_other_0032` §1 §2 §3 §4 |
| **D2 ATM 版本政策** | SemVer, tier, alpha/beta/stable, deprecation cycle, compat matrix, breaking change, migration | `doc_other_0035` §1 §2 §3 §4 §5 |
| **D3 3KLife 消費策略** | S1/S2/S3/S4 stage, 升級節奏, rollback, npm link, git dep, pin minor, 消費路線圖 | `doc_other_0033` §S1~S4 §跨stage通則 |
| **D4 既有工具命運** | adapter化, wrapper, replaced, permanent, task-lock, compute-gate, doc-id-registry, shard-manager, finalize-agent-turn, 工具命運 | `doc_other_0036` §命運總表 §詳細命運說明 |
| **D5 Multi-Agent 兼容** | alpha gate, agent-neutral, AGENTS.md 中立性, 5 agent 測試, Claude Code/Cursor/Aider, 兼容矩陣 | `doc_other_0034` §測試矩陣 §Alpha Gate 4條判定 |
| **D6 開源抽取策略** | extraction, neutrality, 中立性, Phase A/B/C/D, B0/B1/B2/B3, monorepo, pnpm, Turborepo, 開源 | `doc_other_0030` §1 §2 §3 §3.0（Phase B預備）|
| **D7 ATM 核心架構** | 四區, atom spec, manager, police, registry, _workbench, AtomicInterface, 四層架構, 目錄結構, canonical folder, atom-space, 家目錄, Atomic ID folder | `doc_other_0028` §與本專案的相容性分析 §目錄結構規劃 §解決問題的原理; `doc_other_0043` §1 §3 §5 |
| **D8 自舉進程** | B0/B1/B2/B3 sub-phase, seed, bootstrap paradox, self-host-alpha, 框架自舉, 第一批atom | `doc_other_0028` §v0.2.1補強 §Sub-phase與任務卡映射; `doc_other_0030` §Phase B預備 |
| **D9 Schema 演化** | atmSchemaVersion, spec migration, v1→v2, schema major bump, schema PR | `doc_other_0035` §7 |
| **D10 Cross-language** | Python adapter, LanguageAdapter SPI, 多語言, C#, Go | `doc_other_0035` §6 |
| **D11 里程碑 / 任務卡** | ATM-0~6 卡號, ATM-7 deferred optional, 任務清單, 北極星, 驗收命令, milestone, 任務總覽 | `doc_other_0028` §里程碑（ATM-0~ATM-6）; `doc_other_0030` §Phase A/B/C/D |

**大理論 / 背景知識（無需精確段落定位）**：
- Vibe Coding 失控原理 → `doc_other_0029` §1（AI_Atomic_Framework_Roadmap.md L49）
- ATM 願景全貌 → `doc_other_0029` §2（L116）
- 五層原子結構 → `doc_other_0029` §5（L795）
- 優化路線圖摘要 → `doc_other_0031` §0（AI_Atomic_Framework_Optimized_Roadmap_v0.2.md）
- canonical atom 家目錄規則 → `doc_other_0028` §與本專案的相容性分析 §目錄結構規劃；`doc_other_0043` §1 §3 §5

---

<!-- BEGIN:SECTION_INVENTORY -->