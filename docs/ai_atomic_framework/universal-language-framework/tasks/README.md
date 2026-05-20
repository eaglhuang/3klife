---
doc_id: doc_index_0025
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
english_companion: docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
last_updated: 2026-05-20T23:29:50+08:00
---

# ATM 通用語言框架 Task Cards

本索引追蹤 `ATM通用語言框架計畫書.md` 的內部任務卡。這些卡模仿 `agent-pack-onboarding/tasks` 的結構，但目前只屬於計畫資料夾內部追蹤，不代表已經建立 active ATM task state。

正式拿卡時仍需遵守 repo 規則：

```bash
node tools_node/task-lock.js check <task-id>
node tools_node/task-lock.js lock <task-id> <agent-name>
```

並更新任務卡 frontmatter：`status: in-progress`、`started_at`、`started_by_agent`。

## 任務索引

| Task ID | 任務 | Map | 狀態 | 依賴 |
|---|---|---|---|---|
| ATM-LANG-0001 | 繁中主規劃書與 atomic-map roadmap | ATM-MAP-LANG-0001 | done | 無 |
| ATM-LANG-0002 | 英文 companion 教學文件骨架 | ATM-MAP-LANG-0900 | done | 0001 |
| ATM-LANG-0003 | 新舊需求 traceability matrix | ATM-MAP-LANG-0001 | done | 0001 |
| ATM-LANG-1101 | Roadmap no-shrink and traceability validator | ATM-MAP-LANG-1100 | done | 0003 |
| ATM-LANG-1102 | Atom/map coverage validator | ATM-MAP-LANG-1100 | done | 1101 |
| ATM-LANG-1103 | Script facade boundary validator | ATM-MAP-LANG-1100 | done | 1102 |
| ATM-LANG-0100 | `LanguageAdapter v2` public contract | ATM-MAP-LANG-0100 | done | 0003 |
| ATM-LANG-0101 | Shared language analysis schemas | ATM-MAP-LANG-0100 | done | 0100 |
| ATM-LANG-0102 | Runtime/equivalence/evidence contracts | ATM-MAP-LANG-0100 | done | 0101 |
| ATM-LANG-0200 | Adapter registry and resolver | ATM-MAP-LANG-0200 | done | 0100 |
| ATM-LANG-0201 | Capability fallback and user messages | ATM-MAP-LANG-0200 | done | 0200 |
| ATM-LANG-0202 | Bundled/external adapter discovery strategy | ATM-MAP-LANG-0200 | done | 0200 |
| ATM-LANG-0300 | LegacyRoutePlan adapter delegation | ATM-MAP-LANG-0300 | done | 0201 |
| ATM-LANG-0301 | Remove core language regex ownership | ATM-MAP-LANG-0300 | done | 0300 |
| ATM-LANG-0302 | Guidance and police integration update | ATM-MAP-LANG-0300 | done | 0300 |
| ATM-LANG-0400 | Adapter-driven source inventory service | ATM-MAP-LANG-0400 | done | 0101 |
| ATM-LANG-0401 | Candidate ranking signal model | ATM-MAP-LANG-0400 | done | 0400 |
| ATM-LANG-0402 | `candidates rank` thin facade conversion | ATM-MAP-LANG-0400 | done | 0401 |
| ATM-LANG-0500 | Generic atomize/infect dry-run plan contracts | ATM-MAP-LANG-0500 | done | 0102 |
| ATM-LANG-0501 | Import rewrite, shim, rollback plan contracts | ATM-MAP-LANG-0500 | done | 0500 |
| ATM-LANG-0502 | Dry-run proposal evidence envelope | ATM-MAP-LANG-0500 | done | 0501 |
| ATM-LANG-0600 | Atomic map decomposition contract | ATM-MAP-LANG-0600 | done | 0101 |
| ATM-LANG-0601 | Graph-to-map decomposition proposal | ATM-MAP-LANG-0600 | done | 0600 |
| ATM-LANG-0602 | Large-feature decomposition evidence gate | ATM-MAP-LANG-0600 | done | 0601 |
| ATM-LANG-0700 | Python AST inventory and symbol ranges | ATM-MAP-LANG-0700 | done | 0101 |
| ATM-LANG-0701 | Python dependency/call/artifact graph | ATM-MAP-LANG-0700 | done | 0700 |
| ATM-LANG-0702 | Python CLI/API/side-effect surface detection | ATM-MAP-LANG-0700 | done | 0701 |
| ATM-LANG-0703 | Python precise atomize/infect dry-run | ATM-MAP-LANG-0700 | done | 0502 |
| ATM-LANG-0704 | Python equivalence fixtures and diagnostics | ATM-MAP-LANG-0700 | done | 0703 |
| ATM-LANG-0800 | JS/TS v2 capability alignment | ATM-MAP-LANG-0800 | done | 0102 |
| ATM-LANG-0801 | JS/TS inventory and route planning | ATM-MAP-LANG-0800 | done | 0800 |
| ATM-LANG-0802 | JS/TS dry-run and validator expansion | ATM-MAP-LANG-0800 | done | 0801 |
| ATM-LANG-0900 | English guide: adding a new language adapter | ATM-MAP-LANG-0900 | done | 0102 |
| ATM-LANG-0901 | English guide: complete Go adapter code example | ATM-MAP-LANG-0900 | done | 0900 |
| ATM-LANG-0902 | English guide: Go atom/map development example | ATM-MAP-LANG-0900 | done | 0901 |
| ATM-LANG-0903 | English guide: Go validator and thin facade example | ATM-MAP-LANG-0900 | done | 0902 |
| ATM-LANG-1000 | Java/C#/Go adapter feasibility notes | ATM-MAP-LANG-1000 | done | 0903 |
| ATM-LANG-1001 | PHP dynamic include RFC | ATM-MAP-LANG-1000 | done | 1000 |
| ATM-LANG-1002 | Future adapter conformance checklist | ATM-MAP-LANG-1000 | done | 1001 |
| ATM-LANG-1100 | Cross-map validator suite | ATM-MAP-LANG-1100 | done | 0802 |
| ATM-LANG-1104 | Docs neutrality and bilingual positioning validator | ATM-MAP-LANG-1100 | done | 0903 |

## C# Future Adapter Task Pack

這組任務是 `ATM-LANG-CSHARP-*` extension pack，不列入核心 41 張 `ATM-LANG-\d{4}` task count。它承接 `ATM-LANG-TABLE-0010` 的 future adapter readiness，目標是先建立 fixture-backed、dry-run-only、validator-backed 的 C# 可行性層，不宣稱 C# 已成為 official support。

| C# Task ID | 任務 | Map | 狀態 | 依賴 | Atomic Tables |
|---|---|---|---|---|---|
| ATM-LANG-CSHARP-0001 | C# adapter package skeleton | ATM-MAP-LANG-CSHARP-0001 | done | ATM-LANG-1002 | 0006, 0010 |
| ATM-LANG-CSHARP-0002 | `.sln` / `.csproj` profile detection | ATM-MAP-LANG-CSHARP-0002 | done | CSHARP-0001 | 0006, 0010 |
| ATM-LANG-CSHARP-0003 | C# source inventory + symbol range | ATM-MAP-LANG-CSHARP-0003 | done | CSHARP-0002 | 0006, 0010 |
| ATM-LANG-CSHARP-0004 | partial class / generated file risk model | ATM-MAP-LANG-CSHARP-0004 | done | CSHARP-0003 | 0006, 0010 |
| ATM-LANG-CSHARP-0005 | diagnostics parser fixture | ATM-MAP-LANG-CSHARP-0005 | done | CSHARP-0004 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0006 | dry-run planner | ATM-MAP-LANG-CSHARP-0006 | done | CSHARP-0005 | 0007, 0010 |
| ATM-LANG-CSHARP-0007 | validate-language-csharp validator | ATM-MAP-LANG-CSHARP-0007 | done | CSHARP-0006 | 0006, 0007, 0009, 0010 |
| ATM-LANG-CSHARP-0101 | C# fixture expansion for modern syntax surface | ATM-MAP-LANG-CSHARP-0101 | done | CSHARP-0007 | 0006, 0010 |
| ATM-LANG-CSHARP-0102 | C# partial declaration merge index | ATM-MAP-LANG-CSHARP-0102 | done | CSHARP-0101 | 0006, 0010 |
| ATM-LANG-CSHARP-0103 | C# diagnostics parser multi-format hardening | ATM-MAP-LANG-CSHARP-0103 | done | CSHARP-0102 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0104 | C# advisory runtime command detection | ATM-MAP-LANG-CSHARP-0104 | done | CSHARP-0103 | 0006, 0010 |
| ATM-LANG-CSHARP-0105 | C# atomic map decomposition implementation | ATM-MAP-LANG-CSHARP-0105 | done | CSHARP-0104 | 0008, 0009, 0010 |
| ATM-LANG-CSHARP-0106 | C# equivalence contract fixture implementation | ATM-MAP-LANG-CSHARP-0106 | done | CSHARP-0105 | 0006, 0007, 0009, 0010 |
| ATM-LANG-CSHARP-0200 | C# registry integration with language adapter resolver | ATM-MAP-LANG-CSHARP-0200 | done | CSHARP-0106 | 0006, 0010 |
| ATM-LANG-CSHARP-0201 | C# legacy route planning integration | ATM-MAP-LANG-CSHARP-0201 | done | CSHARP-0200 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0202 | C# symbol stability hardening | ATM-MAP-LANG-CSHARP-0202 | done | CSHARP-0200 | 0006, 0010 |
| ATM-LANG-CSHARP-0203 | C# csproj deep profile parsing | ATM-MAP-LANG-CSHARP-0203 | done | CSHARP-0202 | 0006, 0010 |
| ATM-LANG-CSHARP-0204 | C# cross-file symbol reference index | ATM-MAP-LANG-CSHARP-0204 | done | CSHARP-0202 | 0006, 0010 |
| ATM-LANG-CSHARP-0205 | C# solution and project graph | ATM-MAP-LANG-CSHARP-0205 | done | CSHARP-0203 | 0006, 0010 |
| ATM-LANG-CSHARP-0206 | C# csproj risk rules | ATM-MAP-LANG-CSHARP-0206 | done | CSHARP-0205 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0207 | C# diagnostics parser SARIF expansion | ATM-MAP-LANG-CSHARP-0207 | done | CSHARP-0206 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0208 | C# legacy route deep planning | ATM-MAP-LANG-CSHARP-0208 | done | CSHARP-0206 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0209 | C# atomic map large-solution threshold profile | ATM-MAP-LANG-CSHARP-0209 | done | CSHARP-0208 | 0008, 0009, 0010 |
| ATM-LANG-CSHARP-0210 | C# enterprise multi-project smoke fixture | ATM-MAP-LANG-CSHARP-0210 | done | CSHARP-0209 | 0006, 0008, 0010 |
| ATM-LANG-CSHARP-0300 | C# modern syntax inventory coverage expansion | ATM-MAP-LANG-CSHARP-0300 | done | CSHARP-0210 | 0006, 0010 |
| ATM-LANG-CSHARP-0301 | C# symbol resolution hardening for alias static and generic calls | ATM-MAP-LANG-CSHARP-0301 | done | CSHARP-0300 | 0006, 0010 |
| ATM-LANG-CSHARP-0302 | C# csproj and solution deep profile v2 | ATM-MAP-LANG-CSHARP-0302 | done | CSHARP-0301 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0303 | C# diagnostics parser normalization v2 | ATM-MAP-LANG-CSHARP-0303 | done | CSHARP-0302 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0304 | C# advisory readiness gate and threshold profile | ATM-MAP-LANG-CSHARP-0304 | done | CSHARP-0303 | 0006, 0008, 0009, 0010 |
| ATM-LANG-CSHARP-0400 | C# capability baseline realignment | ATM-MAP-LANG-CSHARP-0400 | done | CSHARP-0304 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0401 | C# source inventory full promotion | ATM-MAP-LANG-CSHARP-0401 | done | CSHARP-0400 | 0006, 0010 |
| ATM-LANG-CSHARP-0402 | C# dependency and artifact graph full promotion | ATM-MAP-LANG-CSHARP-0402 | done | CSHARP-0401 | 0006, 0008, 0010 |
| ATM-LANG-CSHARP-0403 | C# validator and readiness baseline hardening | ATM-MAP-LANG-CSHARP-0403 | done | CSHARP-0402 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0500 | C# runtime command detection full promotion | ATM-MAP-LANG-CSHARP-0500 | done | CSHARP-0403 | 0006, 0010 |
| ATM-LANG-CSHARP-0501 | C# diagnostics parsing full promotion | ATM-MAP-LANG-CSHARP-0501 | done | CSHARP-0500 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0502 | C# dry-run planner full promotion | ATM-MAP-LANG-CSHARP-0502 | done | CSHARP-0501 | 0007, 0009, 0010 |
| ATM-LANG-CSHARP-0503 | C# equivalence contract full promotion | ATM-MAP-LANG-CSHARP-0503 | done | CSHARP-0502 | 0006, 0009, 0010 |
| ATM-LANG-CSHARP-0504 | C# validator and capability full-baseline hardening | ATM-MAP-LANG-CSHARP-0504 | done | CSHARP-0503 | 0006, 0009, 0010 |

## 維護規則

- 任務進入 `done` 前必須在 task card 的 Notes 寫入實際 validation command。
- 任務若改動 public-facing 文件，需同步更新 doc-id registry 或相關 shard。
- CLI/script 任務不得持有核心語言邏輯；只允許呼叫 package module 或 atomized implementation。
- Python 任務必須以既有 `packages/language-python` 升級為前提，不得重複建立第二套 Python adapter。
- 英文 companion 是 adapter author guide，不是中文計畫書直譯。
- 任務若會產生或更新 Atomic Maps table，必須回指主計畫書 §5.1 的 `ATM-LANG-TABLE-*`；其中 `0002/0003/0008/0009` 為核心必備，不得缺漏。

## Atomic Maps Table Coverage

| Table ID | 層級 | 由哪些任務維護 | 任務卡驗收重點 | 啟用規則 |
|---|---|---|---|---|
| ATM-LANG-TABLE-0001 | Optional Extension | ATM-LANG-0001 | overview map 清單與 owned surface 保持一致 | 需要額外人工總覽時啟用 |
| ATM-LANG-TABLE-0002 | Core Required | ATM-LANG-0003, ATM-LANG-1102 | 每張 task card 都能對到 map、owned surface、depends | 一律啟用 |
| ATM-LANG-TABLE-0003 | Core Required | ATM-LANG-0003, ATM-LANG-1101 | 原始 10 個 interface 需求不可遺漏 | 一律啟用 |
| ATM-LANG-TABLE-0004 | Optional Extension | ATM-LANG-0003, ATM-LANG-1101 | 舊 82 卡主題合併必須可追溯 | 需要做新舊方案吸收比對時啟用 |
| ATM-LANG-TABLE-0005 | Optional Extension | ATM-LANG-1102 | owned surface 衝突要被 validator 擋下 | 需要跨 map ownership 清點時啟用 |
| ATM-LANG-TABLE-0006 | Optional Extension | ATM-LANG-0100, ATM-LANG-1100 | adapter capability 必須有 evidence 與 validator | 需要比較多語言 adapter 能力時啟用 |
| ATM-LANG-TABLE-0007 | Optional Extension | ATM-LANG-0502, ATM-LANG-1100 | dry-run evidence、rollback、mutates 規則不可缺 | 需要 dry-run 治理報告時啟用 |
| ATM-LANG-TABLE-0008 | Core Required | ATM-LANG-0600, ATM-LANG-0602 | decomposition graph 必須列 members / edges / entrypoints | 一律啟用 |
| ATM-LANG-TABLE-0009 | Core Required | ATM-LANG-1100 | validator ownership 與 failure mode 必須明確 | 一律啟用 |
| ATM-LANG-TABLE-0010 | Optional Extension | ATM-LANG-1000, ATM-LANG-1002 | future adapter readiness 不可誤宣稱正式支援 | 涉及未來語言規劃時啟用 |

`ATM-LANG-CSHARP-*` task pack 會消費上表既有 table registry，不新增新的 Atomic Maps table。後續若 C# adapter 需要獨立產出新的 map table，必須先回主計畫書 §5.1 登記新的 `ATM-LANG-TABLE-*`，再更新 validator。
