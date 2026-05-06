<!-- doc_id: doc_other_0037 -->
# ATM 知識路由索引（ATM Cross-Reference）

> 目的：AI 讀此單一文件後，可精準跳到對應文件的對應段落，無需通讀 9 份文件（5,400+ 行）。
> 維護：§快查路由表 與 §doc_refs 欄位規範 為手工維護；§Section Inventory 由 `node tools_node/rebuild-atm-crossref.js` 自動更新。
> 位置：`docs/ai_atomic_framework/ATM_cross_reference.md`

---

## 使用說明

1. 看當前任務觸發的關鍵字，查下方「快查路由表」找到對應 Domain
2. 用 `doc_id + §段落` 定位目標文件段落（見 §Section Inventory 中的行號）
3. 只讀需要的段落，不要通讀整份文件
4. 重大任務卡需在 frontmatter 加 `doc_refs` 欄位（格式見 §doc_refs 欄位規範）

**如需讀大型文件（AI_Atomic_Framework_Roadmap.md，2808 行）**：
→ 優先讀 `docs/ai_atomic_framework/shards/` 下對應分片（H2 level 分割）

名詞定位：`D1~D11` 是本索引的文件路由 Domain，不是開發 phase；`D2` 表示 ATM 版本政策、`D3` 表示 3KLife 消費策略。`ATM-7` 目前只保留為 DB/vector/advanced orchestrator 類後置討論名稱，不屬於 alpha0/alpha1 任務 shard。

---

## 快查路由表

| Domain | 觸發關鍵字 | 目標文件 + 段落 |
|---|---|---|
| **D1 並行開發協議** | freeze list, cross-shard, H2U vs ATM 衝突, 仲裁順序, 任務卡路由, 凍結清單 | `doc_other_0032` §1 §2 §3 §4 |
| **D2 ATM 版本政策** | SemVer, tier, alpha/beta/stable, deprecation cycle, compat matrix, breaking change, migration | `doc_other_0035` §1 §2 §3 §4 §5 |
| **D3 3KLife 消費策略** | S1/S2/S3/S4 stage, 升級節奏, rollback, npm link, git dep, pin minor, 消費路線圖 | `doc_other_0033` §S1~S4 §跨stage通則 |
| **D4 既有工具命運** | adapter化, wrapper, replaced, permanent, task-lock, compute-gate, doc-id-registry, shard-manager, finalize-agent-turn, 工具命運 | `doc_other_0036` §命運總表 §詳細命運說明 |
| **D5 Multi-Agent 兼容** | alpha gate, agent-neutral, AGENTS.md 中立性, 5 agent 測試, Claude Code/Cursor/Aider, 兼容矩陣 | `doc_other_0034` §測試矩陣 §Alpha Gate 4條判定 |
| **D6 開源抽取策略** | extraction, neutrality, 中立性, Phase A/B/C/D, B0/B1/B2/B3, monorepo, pnpm, Turborepo, 開源 | `doc_other_0030` §1 §2 §3 §3.0（Phase B預備）|
| **D7 ATM 核心架構** | 四區, atom spec, manager, police, registry, _workbench, AtomicInterface, 四層架構, 目錄結構 | `doc_other_0028` §目錄結構規劃 §解決問題的原理 |
| **D8 自舉進程** | B0/B1/B2/B3 sub-phase, seed, bootstrap paradox, self-host-alpha, 框架自舉, 第一批atom | `doc_other_0028` §v0.2.1補強 §Sub-phase與任務卡映射; `doc_other_0030` §Phase B預備 |
| **D9 Schema 演化** | atmSchemaVersion, spec migration, v1→v2, schema major bump, schema PR | `doc_other_0035` §7 |
| **D10 Cross-language** | Python adapter, LanguageAdapter SPI, 多語言, C#, Go | `doc_other_0035` §6 |
| **D11 里程碑 / 任務卡** | ATM-0~6 卡號, ATM-7 deferred optional, 任務清單, 北極星, 驗收命令, milestone, 任務總覽 | `doc_other_0028` §里程碑（ATM-0~ATM-6）; `doc_other_0030` §Phase A/B/C/D |

**大理論 / 背景知識（無需精確段落定位）**：
- Vibe Coding 失控原理 → `doc_other_0029` §1（AI_Atomic_Framework_Roadmap.md L49）
- ATM 願景全貌 → `doc_other_0029` §2（L116）
- 五層原子結構 → `doc_other_0029` §5（L795）
- 優化路線圖摘要 → `doc_other_0031` §0（AI_Atomic_Framework_Optimized_Roadmap_v0.2.md）

---

<!-- BEGIN:SECTION_INVENTORY -->
## Section Inventory

> 由 `node tools_node/rebuild-atm-crossref.js` 自動維護，請勿手工修改本區塊內容。
> 上次更新：2026-05-06

### doc_other_0028 — AI原子框架開發計畫書.md（646 行）⚠️ 超大，優先讀 shards/

| 行號 | 標題層級 | 標題 |
|---|---|---|
| 12 | H2 | Context |
| 28 | H2 | 上游先自舉、downstream 後驗證 |
| 43 | H2 | 2026-05-06 瘦身再開工補強決策 |
| 47 | H3 | 文件真相收斂 |
| 61 | H3 | alpha0 / alpha1 拆分 |
| 70 | H3 | gate 與 adapter 降風險規則 |
| 79 | H2 | 獨立 Repo 與 3KLife 分工 |
| 95 | H2 | v0.2 companion 採納矩陣 |
| 115 | H3 | 3KLife adapter 技術棧校正矩陣（細版） |
| 149 | H2 | 目標 |
| 157 | H2 | ATM 獨立可啟動的最小通用層 |
| 179 | H2 | 解決問題的原理 |
| 195 | H2 | 與本專案的相容性分析（Roadmap 必須校正的 8 點） |
| 212 | H2 | 目錄結構規劃（四區） |
| 240 | H3 | 區 1：框架工作區（AI 沙盒，CLI/Manager 入口） |
| 280 | H3 | 區 2：共用純邏輯（atm-cli 與 hook 共用） |
| 292 | H3 | 區 3：Runtime 原子產物（與 Legacy 共處的「正式」代碼） |
| 308 | H3 | 區 4：ATM 文件區 |
| 325 | H2 | 里程碑（ATM-0 ~ ATM-6）+ 已開任務卡清單 |
| 329 | H3 | ATM-0：3KLife governance bootstrap（14 卡） |
| 342 | H3 | ATM-1：上游 repo skeleton 與 self-hosting alpha0 gate（10 卡） |
| 353 | H3 | ATM-2：Core Manager、Registry、HashLock、Police、Governance Bundle（12 卡） |
| 366 | H3 | ATM-3：3KLife adapter 導入（downstream-only，需待 self-hosting alpha0 gate）（13 卡） |
| 374 | H3 | ATM-4：html-to-ucuf reference case study（downstream-only）（6 卡） |
| 383 | H3 | ATM-5：開源文件、Plugin SDK、alpha release（5 卡） |
| 391 | H3 | ATM-6：生態擴張與後置決策（5 卡） |
| 402 | H2 | v0.2.1 補強：開源獨立自舉路徑（B0–B3 sub-phasing 與新增任務卡） |
| 406 | H3 | Sub-phase 與任務卡映射 |
| 417 | H3 | 新增任務卡 |
| 458 | H3 | 並行開發協議 |
| 462 | H3 | 依賴與消費路線圖 |
| 466 | H3 | Versioning Policy |
| 472 | H2 | 執行 Checklist（每張 ATM 卡通用） |
| 474 | H3 | 開工序列 |
| 482 | H3 | 進行中（每次儲存後） |
| 489 | H3 | 收工序列 |
| 505 | H2 | 不退轉機制（hash lock + regression matrix 落地） |
| 507 | H3 | 要動的具體檔案 |
| 527 | H3 | §6.1 Schema versioning policy（v0.2.1 補強） |
| 540 | H2 | 風險與防範 |
| 553 | H2 | 驗證命令（階段性北極星） |
| 582 | H2 | Critical Files |
| 603 | H2 | 執行流程提醒 |
| 613 | H2 | 附錄 A：與 Roadmap 對應表 |
| 639 | H2 | 附錄 B：未在本計畫範圍內的事項（明確排除） |

### doc_other_0029 — AI_Atomic_Framework_Roadmap.md（2809 行）⚠️ 超大，優先讀 shards/

| 行號 | 標題層級 | 標題 |
|---|---|---|
| 10 | H2 | 0. 本文件的核心結論 |
| 28 | H2 | 0.1 v0.2 務實化補充 |
| 49 | H2 | 1. 問題背景：為什麼原本的 Vibe Coding 會失控 |
| 53 | H3 | 1.1 巨大檔案造成 AI 上下文污染 |
| 67 | H3 | 1.2 規則漂移造成方向不穩 |
| 84 | H3 | 1.3 驗收模糊造成過度擬合 |
| 103 | H3 | 1.4 單畫面驗證造成過度擬合 |
| 116 | H2 | 2. AI Atomic Framework 的願景 |
| 118 | H3 | 2.1 一句話定義 |
| 128 | H3 | 2.2 你要達成的終局效果 |
| 145 | H3 | 2.3 獨立開源與宿主系統適配策略 |
| 162 | H3 | 2.4 預期開源 Repo 形態 |
| 191 | H2 | 3. 核心設計原則 |
| 193 | H3 | 3.1 AI 不是自由工程師，而是受控加工機 |
| 214 | H3 | 3.2 契約優先，程式碼其次 |
| 239 | H3 | 3.3 Git 是真相來源，資料庫是索引層 |
| 257 | H3 | 3.4 開發期虛擬隔離，執行期貼近 Legacy |
| 320 | H3 | 3.5 Core 禁止耦合清單 |
| 332 | H3 | 3.5.1 Neutrality / Boundary Guard |
| 343 | H3 | 3.5.2 Upstream 文件中立性 |
| 351 | H3 | 3.5.3 Context Budget Guard |
| 366 | H2 | 4. 核心名詞定義 |
| 370 | H3 | 4.1 Atomic Spec |
| 445 | H3 | 4.2 Atomic Code |
| 472 | H3 | 4.3 Atomic Test |
| 498 | H3 | 4.4 Atomic Map |
| 555 | H3 | 4.5 Atomic Manager |
| 581 | H3 | 4.6 Atomic Registry |
| 625 | H3 | 4.7 Atomic Capability |
| 670 | H3 | 4.8 Atomic Police |
| 691 | H2 | 5. 原子分層：借鑑 Atomic Design 的五層結構 |
| 699 | H3 | 5.1 Atom：純函數原子 |
| 723 | H3 | 5.2 Molecule：小型流程 |
| 743 | H3 | 5.3 Organism：領域模組 |
| 763 | H3 | 5.4 Template：抽象骨架 |
| 783 | H3 | 5.5 Page：具體執行入口 |
| 795 | H2 | 6. 框架自舉：用原子方法建立原子框架 |
| 811 | H2 | 7. Blueprint #000：Genesis Framework Bootstrap |
| 831 | H3 | 7.1 Bootstrap 原子清單 |
| 990 | H3 | 7.2 Genesis Map |
| 1021 | H2 | 8. 里程碑總覽 |
| 1029 | H2 | 目標 |
| 1037 | H2 | Deliverables |
| 1039 | H3 | 0.1 Active Spec Freeze |
| 1058 | H3 | 0.2 Legacy Snapshot |
| 1076 | H3 | 0.3 Regression Matrix 初版 |
| 1095 | H2 | Acceptance |
| 1107 | H2 | 目標 |
| 1122 | H2 | 1.1 Atomic Spec Schema |
| 1147 | H2 | 1.2 Atomic Manager CLI |
| 1161 | H2 | 1.3 工作區結構 |
| 1182 | H2 | 1.4 產出規則 |
| 1197 | H2 | Phase 1 Acceptance |
| 1211 | H2 | 目標 |
| 1219 | H2 | 2.1 Atomic Interface |
| 1235 | H2 | 2.2 Atomic Registry Script |
| 1253 | H2 | 2.3 Atomic Location Index |
| 1274 | H2 | 2.4 Legacy Adapter Node |
| 1296 | H2 | 2.5 Strangler Migration Flow |
| 1320 | H2 | Phase 2 Acceptance |
| 1333 | H2 | 目標 |
| 1339 | H2 | 3.1 顆粒度規則 |
| 1364 | H2 | 3.2 禁止 Deep Copy 大物件 |
| 1392 | H2 | 3.3 Async Policy |
| 1419 | H2 | 3.4 靜態綁定，避免字串 Dispatcher |
| 1443 | H2 | 3.5 Performance Budget |
| 1470 | H2 | Phase 3 Acceptance |
| 1483 | H2 | 目標 |
| 1489 | H2 | 4.1 瘦身警察 |
| 1515 | H2 | 4.2 關係警察 |
| 1535 | H2 | 4.3 去重警察 |
| 1573 | H2 | 4.4 索引警察 |
| 1592 | H2 | 4.5 規格漂移警察 |
| 1606 | H2 | 4.6 測試完整性警察 |
| 1621 | H2 | 4.7 Known Gap 警察 |
| 1642 | H2 | Phase 4 Acceptance |
| 1655 | H2 | 目標 |
| 1663 | H2 | 5.1 Fidelity Score Spec |
| 1698 | H2 | 5.2 Owner Bucket |
| 1716 | H2 | 5.3 Multi-Fixture Matrix |
| 1734 | H2 | 5.4 Selector Trace |
| 1765 | H2 | Phase 5 Acceptance |
| 1779 | H2 | 目標 |
| 1791 | H2 | 6.1 第一個 Legacy Adapter |
| 1817 | H2 | 6.2 抽離第一個純 Atom：Typography |
| 1844 | H2 | 6.3 抽離順序建議 |
| 1865 | H2 | 6.4 每次抽離的驗收 |
| 1885 | H2 | Phase 6 Acceptance |
| 1899 | H2 | 目標 |
| 1905 | H2 | 7.1 PostgreSQL / pgvector |
| 1932 | H2 | 7.2 Semantic Reuse Flow |
| 1950 | H2 | 7.3 Atomic Merge |
| 1965 | H2 | 7.4 Atomic Split |
| 2013 | H2 | Atomic ID |
| 2016 | H2 | Goal |
| 2019 | H2 | Non-Goals |
| 2022 | H2 | Input Contract |
| 2025 | H2 | Output Contract |
| 2028 | H2 | Allowed Files |
| 2032 | H2 | Forbidden Files |
| 2037 | H2 | Allowed Dependencies |
| 2041 | H2 | Forbidden Dependencies |
| 2048 | H2 | Performance Budget |
| 2054 | H2 | Test Fixtures |
| 2059 | H2 | Validation Commands |
| 2066 | H2 | Acceptance Criteria |
| 2175 | H2 | 13.1 Hash Lock |
| 2193 | H2 | 13.2 Versioning |
| 2207 | H2 | 13.3 Rollback |
| 2222 | H2 | 13.4 Regression Summary |
| 2305 | H2 | 15.1 先不要做的事 |
| 2321 | H2 | 15.2 先做的事 |
| 2336 | H2 | 15.3 第一批救援原子 |
| 2357 | H2 | 15.4 第一個成功標準 |
| 2377 | H2 | 16.1 MVP 階段 |
| 2405 | H2 | 16.2 中期 |
| 2420 | H2 | 16.3 後期 |
| 2440 | H2 | 17.1 架構裁判 |
| 2452 | H2 | 17.2 任務發包者 |
| 2466 | H2 | 17.3 驗收者 |
| 2479 | H2 | 17.4 每次 AI 工作的最小循環 |
| 2509 | H2 | 18.1 過度工程化 |
| 2527 | H2 | 18.2 原子太碎造成性能差 |
| 2541 | H2 | 18.3 原子太多造成管理成本高 |
| 2554 | H2 | 18.4 AI 修改超出範圍 |
| 2567 | H2 | 18.5 Legacy 行為被破壞 |
| 2586 | H2 | Week 1：建立凍結與 baseline |
| 2598 | H2 | Week 2：建立 Atomic Manager MVP |
| 2611 | H2 | Week 3：讓 AI 生成第一個非框架原子 |
| 2622 | H2 | Week 4：接入 Legacy 第一個小功能 |
| 2634 | H2 | Week 5：建立 Police v0 |
| 2645 | H2 | Week 6：開始 reference case study |
| 2707 | H2 | 22. 附錄：第一個 Prompt 建議 |
| 2731 | H2 | 23. 附錄：第一批檔案清單 |

### doc_other_0030 — open-source-extraction-plan.md（392 行）

| 行號 | 標題層級 | 標題 |
|---|---|---|
| 9 | H2 | 1. 拆分原則 |
| 11 | H3 | 1.1 Core 必須保持獨立 |
| 29 | H3 | 1.1.1 v0.2 MVP 邊界 |
| 41 | H3 | 1.1.2 Default Governance Bundle 邊界 |
| 67 | H3 | 1.1.3 Agent Operating Layer |
| 79 | H3 | 1.1.4 Self-Hosting Alpha0 Gate |
| 88 | H3 | 1.1.5 Docs Neutrality / Boundary Guard |
| 96 | H3 | 1.1.5.1 Neutrality Scanner 落地細節 |
| 117 | H3 | 1.1.6 Context Budget Guard |
| 128 | H3 | 1.2 Adapter 承接所有宿主差異 |
| 150 | H2 | 2. 新 repo 建議結構 |
| 194 | H3 | 2.1 Monorepo Toolchain：pnpm + Turborepo（alpha 預設） |
| 231 | H2 | 3. 拆出階段 |
| 233 | H3 | Phase A：文件解耦 |
| 243 | H3 | Phase B 預備：B0 / B1 / B2 / B3 Sub-phasing |
| 262 | H3 | Phase B：上游 repo skeleton |
| 275 | H3 | Phase C：3KLife adapter |
| 286 | H3 | Phase D：Reference case study |
| 297 | H2 | 4. 開源發布清單 |
| 308 | H3 | 4.1 Examples 驗收矩陣 |
| 322 | H3 | 4.2 Open-source Operations 完整清單 |
| 342 | H2 | 5. 3KLife 回同步策略 |
| 351 | H2 | 6. 3KLife Consumption Roadmap（4-stage 演進） |
| 371 | H2 | 7. 多 AI Agent 兼容性 |
| 381 | H2 | 8. Versioning & Lifecycle Policy |

### doc_other_0031 — AI_Atomic_Framework_Optimized_Roadmap_v0.2.md（428 行）

| 行號 | 標題層級 | 標題 |
|---|---|---|
| 14 | H2 | 0. 執行摘要 |
| 29 | H2 | 1. 原規劃的主要問題與優化對策 |
| 31 | H3 | 1.1 自舉過於理想化 |
| 38 | H3 | 1.2 MVP 階段過度複雜 |
| 44 | H3 | 1.3 Legacy 注入假設過窄 |
| 51 | H3 | 1.4 早期治理摩擦過高 |
| 58 | H3 | 1.5 缺失的重要面向 |
| 70 | H2 | 2. 優化後的 6 週最小可行路線圖 |
| 72 | H3 | Week 1：Freeze + Baseline + 最小 Spec Schema |
| 83 | H3 | Week 2：Atomic Manager MVP（極簡版） |
| 99 | H3 | Week 3：Legacy 注入第一個原子 |
| 110 | H3 | Week 4：Performance & Safety 層 + Adapter 範例 |
| 120 | H3 | Week 5：Police v0.5 + Living Spec 機制 |
| 130 | H3 | Week 6：Reference Case Study 開頭 + 完整文件 |
| 143 | H2 | 3. 保留與強化的核心設計原則 |
| 145 | H3 | 3.1 契約優先，程式碼其次（完全保留） |
| 148 | H3 | 3.2 Git 是真相來源，DB 是索引層（微調） |
| 152 | H3 | 3.3 開發期虛擬隔離，執行期 Legacy 注入（保留並強化） |
| 157 | H3 | 3.4 新增：PEV Loop 作為標準流程 |
| 168 | H3 | 3.5 Harness Engineering 對齊（新增核心原則） |
| 183 | H2 | 4. 技術選型建議（強調鬆耦合與獨立性） |
| 185 | H3 | 核心原則（最重要） |
| 193 | H3 | MVP 階段（Week 1–3）—— 極度純淨版 |
| 207 | H3 | 中期（Week 4+）—— 可選增強（皆透過 Adapter） |
| 217 | H3 | 外部工具整合策略（鬆耦合設計） |
| 242 | H2 | 5. 2026 年生態對齊與定位 |
| 244 | H3 | 高度相關的現有框架（2026-05） |
| 253 | H3 | 與 Harness Engineering 的對齊度 |
| 259 | H2 | 5.5 與其他框架設計哲學比較（2026） |
| 277 | H2 | 6. 風險控管與防範 |
| 291 | H2 | 7. 建議的專案結構（v0.2 簡化版） |
| 323 | H2 | 8. 下一步行動建議 |
| 333 | H2 | 9. 未來演進方向（v0.3+ Roadmap） |
| 335 | H3 | 9.1 解決「純 Agent Pipeline 支援」侷限 |
| 368 | H3 | 9.2 其他長期演進方向 |
| 374 | H3 | 9.3 設計原則（任何演進都必須遵守） |
| 383 | H2 | 結語 |

### doc_other_0032 — 3klife-coexistence-plan.md（171 行）

| 行號 | 標題層級 | 標題 |
|---|---|---|
| 10 | H2 | 為什麼需要本協議 |
| 22 | H2 | 1. Freeze List（ATM 預定動區） |
| 26 | H3 | 1.1 全檔級凍結 |
| 31 | H3 | 1.2 函式級凍結（draft-builder.js 內） |
| 38 | H3 | 1.3 凍結期間允許的動作 |
| 48 | H2 | 2. 路由協議（哪種工作開哪種任務卡） |
| 50 | H3 | 2.1 開 `ATM-*` 卡的條件 |
| 58 | H3 | 2.2 開 `H2U-REFACTOR-*` 卡的條件 |
| 63 | H3 | 2.3 開 `PROG-2-*` 卡的條件 |
| 68 | H3 | 2.4 邊界決策樹 |
| 81 | H2 | 3. 仲裁順序（衝突時誰優先） |
| 83 | H3 | 3.1 結構性原則 |
| 88 | H3 | 3.2 具體仲裁案例 |
| 96 | H3 | 3.3 衝突時的處理流程 |
| 103 | H2 | 4. Cross-shard Task-lock 強化 |
| 105 | H3 | 4.1 現行 task-lock 行為 |
| 109 | H3 | 4.2 強化內容（屬 3KLife 端，由 ATM-0 補強卡實作） |
| 114 | H3 | 4.3 Cross-shard 偵測命令 |
| 123 | H2 | 5. 並行期間的同步機制 |
| 125 | H3 | 5.1 每週同步點 |
| 132 | H3 | 5.2 衝突早期警報 |
| 138 | H2 | 6. 並行期結束條件 |
| 151 | H2 | 7. 落地檢查表 |
| 161 | H2 | 8. 例外狀況的緊急處理 |

### doc_other_0033 — 3klife-consumption-roadmap.md（262 行）

| 行號 | 標題層級 | 標題 |
|---|---|---|
| 10 | H2 | 為什麼需要本路線圖 |
| 16 | H2 | 演進總覽 |
| 27 | H2 | S1 — Dev Stage（git submodule） |
| 29 | H3 | 適用條件 |
| 34 | H3 | 消費形式 |
| 41 | H3 | 升級行為 |
| 46 | H3 | 回退 |
| 51 | H3 | 結束條件 |
| 57 | H2 | S2 — Alpha Stage（npm link 或 git dep） |
| 59 | H3 | 適用條件 |
| 64 | H3 | 消費形式 |
| 86 | H3 | 升級節奏 |
| 95 | H3 | 回退 |
| 101 | H3 | 結束條件 |
| 106 | H2 | S3 — Beta Stage（npm dep + caret range） |
| 108 | H3 | 適用條件 |
| 113 | H3 | 消費形式 |
| 128 | H3 | 升級節奏 |
| 133 | H3 | Compatibility check |
| 141 | H3 | 回退 |
| 149 | H3 | 結束條件 |
| 154 | H2 | S4 — Stable Stage（pin minor + 季度升級） |
| 156 | H3 | 適用條件 |
| 161 | H3 | 消費形式 |
| 174 | H3 | 升級節奏 |
| 181 | H3 | 灰度策略（major 升級） |
| 187 | H3 | 回退 |
| 196 | H2 | Breaking Change 接受窗口 |
| 214 | H2 | 跨 stage 通則 |
| 216 | H3 | 通則 1：lockfile 是真相 |
| 220 | H3 | 通則 2：升級前必跑 compat-check |
| 226 | H3 | 通則 3：升級後必跑 dual-test |
| 236 | H3 | 通則 4：升級不在 freeze period 進行 |
| 242 | H2 | Stage 進入條件總覽 |
| 253 | H2 | 異常情境處理 |

### doc_other_0034 — multi-agent-compatibility-matrix.md（196 行）

| 行號 | 標題層級 | 標題 |
|---|---|---|
| 10 | H2 | 為什麼需要本矩陣 |
| 18 | H2 | 測試矩陣 |
| 35 | H2 | Alpha0 deterministic 4 條判定（與 `open-source-extraction-plan.md` §1.1.4 一致） |
| 46 | H2 | 各 Agent 測試流程 |
| 48 | H3 | Claude Code |
| 74 | H3 | Cursor |
| 88 | H3 | Aider |
| 106 | H3 | GitHub Copilot Agent |
| 121 | H3 | OpenAI Assistants API |
| 137 | H2 | AGENTS.md 中立性檢查 |
| 153 | H2 | 兼容矩陣維護節奏 |
| 164 | H2 | 結果記錄與透明度 |
| 177 | H2 | 退場機制 |
| 187 | H2 | 未來擴展（v1.0+） |

### doc_other_0035 — upstream-versioning-policy.md（295 行）

| 行號 | 標題層級 | 標題 |
|---|---|---|
| 11 | H2 | 為什麼需要本政策 |
| 26 | H2 | 1. Tier 定義 |
| 36 | H3 | Tier 切換條件 |
| 47 | H2 | 2. SemVer 2.0 對 ATM 的具體解讀 |
| 49 | H3 | 2.1 Major bump（X.y.z → X+1.0.0） |
| 63 | H3 | 2.2 Minor bump（X.Y.z → X.Y+1.0） |
| 68 | H3 | 2.3 Patch bump（X.Y.Z → X.Y.Z+1） |
| 75 | H2 | 3. Deprecation Cycle |
| 77 | H3 | 3.1 標準流程 |
| 87 | H3 | 3.2 例外 |
| 91 | H3 | 3.3 Deprecation 標記範例 |
| 103 | H2 | 4. Compatibility Matrix |
| 105 | H3 | 4.1 維護位置 |
| 130 | H3 | 4.2 升級檢查 |
| 140 | H3 | 4.3 維護節奏 |
| 147 | H2 | 5. Breaking Change PR Template |
| 152 | H2 | Type |
| 155 | H2 | Affected APIs |
| 159 | H2 | Reason |
| 162 | H2 | Migration Path |
| 169 | H2 | Compatibility Matrix Update |
| 180 | H2 | 6. Cross-language Roadmap |
| 182 | H3 | 6.1 Stage 對應 |
| 191 | H3 | 6.2 LanguageAdapter SPI（v0.2 開放） |
| 209 | H3 | 6.3 README 措辭規範 |
| 227 | H2 | 7. Atomic Spec Schema 演化 |
| 229 | H3 | 7.1 schemaVersion 必填 |
| 240 | H3 | 7.2 Schema major bump |
| 245 | H3 | 7.3 Schema minor bump |
| 250 | H3 | 7.4 Schema PR 必含 |
| 257 | H2 | 8. 釋出節奏與通告 |
| 259 | H3 | 8.1 釋出頻率 |
| 267 | H3 | 8.2 釋出通告渠道 |
| 275 | H3 | 8.3 LTS 政策（v2.0+ 規劃） |
| 282 | H2 | 9. 政策審查節奏 |
| 290 | H2 | 10. 引用與相依政策 |

### doc_other_0036 — 3klife-tooling-fate.md（294 行）

| 行號 | 標題層級 | 標題 |
|---|---|---|
| 10 | H2 | 為什麼需要本表 |
| 18 | H2 | 命運分類（5 類） |
| 30 | H2 | 命運總表 |
| 51 | H2 | 詳細命運說明 |
| 53 | H3 | task-lock.js → ATM LockAdapter thin wrapper |
| 80 | H3 | compute-gate.js → ATM GateAdapter thin wrapper |
| 108 | H3 | doc-id-registry.js → ATM DocumentIndexAdapter thin wrapper |
| 120 | H3 | shard-manager.js → ATM ShardAdapter thin wrapper |
| 132 | H3 | task-card-opener.js → ATM TaskAdapter thin wrapper |
| 146 | H3 | check-encoding-touched.js / check-encoding-integrity.js → ATM EncodingAdapter |
| 160 | H3 | check-task-scope.js / check-import-boundaries.js → 被 ATM RuleGuardAdapter 取代 |
| 187 | H3 | finalize-agent-turn.js → 3KLife 專屬 Wrapper（永久保留） |
| 208 | H3 | validate-html-to-ucuf-rule-guard.js → Permanent |
| 217 | H3 | validate-ui-specs.js → Permanent |
| 226 | H3 | dom-to-ui-self-test.js → Permanent |
| 234 | H2 | 棄用時程（C 類工具） |
| 245 | H2 | Adapter 化的具體任務 |
| 267 | H2 | 行為等價驗證 |
| 285 | H2 | 維護者責任 |

<!-- END:SECTION_INVENTORY -->

---

## doc_refs 欄位規範

### 格式

```yaml
doc_refs:
  - "doc_other_0032#§1"          # 3klife-coexistence-plan.md §1 Freeze List
  - "doc_other_0035#§3.1"        # upstream-versioning-policy.md §3.1 標準流程
```

或單行陣列形式：

```yaml
doc_refs: ["doc_other_0032#§1", "doc_other_0035#§3.1"]
```

### 強制情境（重大任務卡必填）

| 任務卡類型 | 必引用的 doc_ref |
|---|---|
| 並行開發 / freeze 相關 | `doc_other_0032#§1`（Freeze List）+ `doc_other_0032#§3`（仲裁順序） |
| Breaking change / migration | `doc_other_0035#§3`（Deprecation Cycle）+ `doc_other_0035#§5`（PR Template） |
| Adapter 化卡（ATM-3-*） | `doc_other_0036#§命運總表` + `doc_other_0036#§詳細命運說明` |
| 版本政策 / compat 升級 | `doc_other_0035#§1`（Tier）+ `doc_other_0035#§4`（Compatibility Matrix） |
| 3KLife 消費升級（S1→S4） | `doc_other_0033#§S2`（對應 stage）+ `doc_other_0033#§跨stage通則` |

### 不強制情境

- 日常 bug fix（P2/P3 小卡）
- 單純文件修正
- 測試補充（無行為變更）

### 加入 atm-task-template.md 的欄位位置

在 frontmatter `notes` 之後加入可選欄位：

```yaml
doc_refs: []      # 重大卡填入，格式: ["doc_other_XXXX#§N"]
```

---

## 維護說明

| 動作 | 如何更新 |
|---|---|
| 新增 ATM doc | 執行 `node tools_node/rebuild-atm-crossref.js`，Section Inventory 自動更新 |
| 新增/修改 Domain | 手動編輯 §快查路由表 |
| 修改 doc_refs 規範 | 手動編輯 §doc_refs 欄位規範 |
| AI_Atomic_Framework_Roadmap.md 分片後 | Section Inventory 中 doc_other_0029 條目自動改為指向 shards/ |
