# AI 原子框架開發計畫書 — 附錄

> 這是 `AI原子框架開發計畫書.md` 的「附錄」分片。完整索引見 `docs/ai_atomic_framework/AI原子框架開發計畫書.md`。

## 附錄 A：與 Roadmap 對應表

本計畫對應 Roadmap 章節：

| Roadmap 章節 | 本計畫對應 |
|---|---|
| §1 問題背景 | Context |
| §2 願景與終局 | 目標 |
| §3 核心設計原則 | 解決問題的原理 |
| §4 核心名詞（Spec/Code/Test/Map/Manager/Registry/Capability/Police） | 目錄結構區 1-3 + ATM-1/2 |
| §5 五層結構（Atom/Molecule/Organism/Template/Page） | 區 1 manager/ + atomic-map |
| §6-7 框架自舉 + Genesis Bootstrap | ATM-0 + ATM-1 |
| §8 Phase 0-7 里程碑 | ATM-0 ~ ATM-7（已映射） |
| §9 任務卡模板 | ATM-0-0006 |
| §10 AI Prompt 模板 | manager/scaffold-atom 子任務 |
| §11-12 修改/注入流程 | 執行 Checklist + 不退轉機制 |
| §13 不退轉機制 | hash-lock + regression-matrix + finalize 鈎子 |
| §14 檔案結構 | 目錄結構規劃（四區） |
| §15 對 html-to-ucuf 的具體救援 | ATM-3 + ATM-6 |
| §16 工具選型 | 相容性分析 #1 校正（Node + AJV） |
| §17 不人工寫 code 運作方式 | 執行 Checklist |
| §18 風險與防範 | 風險與防範 |
| §19 最小可行路線圖 | ATM-0~3 W1-W2 + ATM-4~6 W3-W4 |

---

## 附錄 B：未在本計畫範圍內的事項（明確排除）

1. **不追 95% pixel parity**：本計畫不負責 PROG-2-0007 的 95% 收斂。ATM 只負責建立可驗證的「替換管道」，分數本身由 PROG-2-* / H2U-* 卡負責。
2. **不重寫 draft-builder.js 主幹**：H2U-REFACTOR-0001 已負責拆檔，ATM-3 只抽純 helper（normalizeRect / parsePx / html-parser.js），不動主幹邏輯。
3. **不引入 PostgreSQL / pgvector / LangGraph / Mastra**：ATM-7-0002 才討論，前期僅 JSON registry。
4. **不上 TS 改寫**：tools_node 維持 CommonJS Node.js，不跟著 Roadmap 用 TS。
5. **不直接讓 AI 改 Legacy**：所有 Legacy 修改必須走 inject-plan.js 產 patch，由人/特定 ATM 卡 apply。
