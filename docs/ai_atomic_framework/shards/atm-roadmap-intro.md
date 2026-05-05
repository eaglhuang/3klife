# AI Atomic Framework Roadmap — 核心結論・問題背景（§0–§1）

> 這是 `AI_Atomic_Framework_Roadmap.md` 的「核心結論・問題背景（§0–§1）」分片。完整索引見 `../AI_Atomic_Framework_Roadmap.md`。

<!-- doc_id: doc_other_0029 -->
# AI Atomic Framework：可獨立開源的 AI Vibe Coding 原子化治理框架 Roadmap

> 版本：v0.2 integration  
> 目的：建立一套可獨立發布到 `https://github.com/eaglhuang/AI-Atomic-Framework` 的「原子化治理框架」，讓任何技術棧中的 AI 產出都可以被拆解、約束、驗證、索引、重用、接入既有系統，避免大型工程在多輪 AI 修改後發生方向漂移、規則失控、品質退轉與重做循環。
> 定位：本文件是上游開源框架藍圖；任何專案特定工具、遊戲引擎、任務卡系統或 legacy 案例，都只能透過 Adapter / Plugin / Example 接入，不得成為 core 的隱性前提。

---

## 0. 本文件的核心結論

AI Vibe Coding 失控時，真正的問題通常不是單純「某段程式碼寫不好」，而是大型工程缺少可攜、可驗證、可回滾的治理框架：

- AI 一次吃進太大的上下文，容易誤解歷史規則。
- 舊 plan、新 plan、老工具、新工具並存，造成規則漂移。
- 單一巨大腳本承載太多責任，導致任何小修改都有全局副作用。
- 缺乏可量化驗收與多場景回歸矩陣，造成過度擬合單一案例。
- 每一輪修改都看似合理，但沒有穩定的契約與防退轉機制，最終導致「五次大改仍然不穩」。

因此，真正要解的不是「再叫 AI 修一次」，而是建立一套能約束 AI、並可搬到任何專案中的工程框架：

> **先讓 AI 在嚴格契約中建立 AI Atomic Framework，再讓任何 host project 透過 Adapter 使用它，逐步接管、原子化、驗證、修復既有系統。**

這套框架的關鍵不是讓 AI 更自由，而是讓 AI 更像「受控的純函數加工機」。

---

## 0.1 v0.2 務實化補充

`AI_Atomic_Framework_Optimized_Roadmap_v0.2.md` 已被採納為 companion analysis，而不是取代本 Roadmap 的新真相。v0.2 的價值在於降低 MVP 門檻，避免框架在救援 legacy 前先變成另一個大型系統。

本 Roadmap 因此新增以下硬原則：

- **Core 極簡**：v0.1 alpha 只要求 Atomic Spec、Manager 最小指令、JSON Registry、HashLock、basic Police 與 Plugin SDK。其他能力一律先進 optional plugin 或 adapter。
- **Default Governance Bundle**：ATM 不能只剩 atom runner。v0.1 alpha 需提供可替換的預設治理套件，涵蓋 task cards、scope lock、doc index、shard、rule guard、encoding、context budget 與 evidence；但 `packages/core` 只能依賴 governance contracts，不得 import default plugin 實作。
- **Agent Operating Layer**：v0.1 alpha 需提供 model-neutral README / AGENTS template / project probe / default profile，讓使用者把 ATM 放入任意 repo 根目錄後，AI agent 讀文件即可自動開卡、鎖 scope、保存 artifacts/logs/evidence 並跑 default guards。
- **Self-Hosting Alpha Gate**：v0.1 alpha 必須先在 standalone upstream repo 內證明 AI agent 只讀 README / AGENTS / `.atm/profile` 就能完成 first task、scope lock、artifact/log/evidence 與 first atom smoke；在此之前不得拿 3KLife 當成功前提。
- **Docs Neutrality / Boundary Guard**：上游 protected surfaces（README / AGENTS / docs / examples / templates）不得夾帶 3KLife、Cocos、html-to-ucuf 或本地治理工具前提，且需由 deterministic guard 持續掃描，必要時再用 semantic audit 補抓隱性耦合。
- **Agent Governance Bundle**：`encoding guard`、`context budget guard` 與 `docs neutrality / boundary guard` 應被視為同一組 model-neutral agent governance bundle；3KLife 既有 keep/token 規則只能透過 adapter 映射，不得回寫成 upstream 私有前提。
- **無硬依賴**：Core 不得硬依賴 GitHub Spec Kit、Atomic Agents、LangGraph、PR-Agent、PostgreSQL、pgvector、OpenTelemetry、Prometheus、Deno sandbox 或任何單一 LLM vendor。這些只能透過 `packages/adapter-*` 或 `packages/plugin-*` 啟用。
- **PEV Loop 標準化**：所有原子工作都遵守 Plan（spec/task card）→ Execute（AI 只改 allowed files）→ Verify（test/police/regression/hash）→ Converge（registry/living spec/版本紀錄）。
- **6 週 MVP 節奏**：前 6 週以可注入第一個 low-risk atom 為目標；Performance Police、Capability Sandbox、Vector Index、完整 Observability 與多 agent workflow 均不阻塞 v0.1 alpha。
- **Living Spec 先輕後重**：MVP 只要求 spec 與 code 變更有差異提示；自動同步器列為後續 optional feature，不得成為早期核心 gate。

v0.2 建議的 TypeScript、Zod、Vitest、Commander、ts-morph 等工具，是 first implementation recommendation，不是框架哲學。Atomic Spec、Adapter API 與 CLI report schema 必須保持語言與工具無關。

---

## 1. 問題背景：為什麼原本的 Vibe Coding 會失控

以下症狀可以發生在網頁、遊戲、資料管線、後端服務、AI agent workflow 或任何長期由 AI 協作維護的專案中。`html-to-ucuf` / 3KLife 只是壓力測試案例，不是本框架的核心假設。

### 1.1 巨大檔案造成 AI 上下文污染

例如，一個 host project 可能出現：

- 單一 legacy script 約數千行，混雜 parser、型別推理、格式轉換、資產處理、互動解析。
- 單一 rule checker 同時處理掃描、驗證、摘要、telemetry、修補建議。
- 多個 CLI 各自處理 preload、telemetry、backup、browser / engine 初始化與截圖。

這會讓 AI 很難只改一個點。

它會為了解決 A 畫面的問題，順手改到 B 邏輯；為了修 pixel diff，破壞 rule registry；為了加一個 exception，污染整個 workflow。

---

### 1.2 規則漂移造成方向不穩

系統歷經 plan1 到 plan5，但各 plan 之間存在概念演化：

- plan2 偏 preserve-human / sync-existing。
- plan3 偏 zone ownership。
- plan4 偏 source-authoritative / rule registry。
- plan5 偏 root-cause taxonomy / ownership / multi-fixture。

問題不是每個 plan 都錯，而是：

> 新舊規則並列存在，但沒有明確 active spec 與 historical spec 的治理。

AI 看到 plan2 也覺得合理，看到 plan4 也覺得合理，看到 plan5 也覺得合理，最後就會產生混合式錯誤。

---

### 1.3 驗收模糊造成過度擬合

「95% 像素級對標」如果沒有數學定義，就會變成 AI 的災難。

AI 會問：

- 是 pixel coverage？
- 是 SSIM？
- 是 component coverage？
- 是 layout accuracy？
- 是 structure match？
- target runtime 做不到的效果算不算扣分？
- 已知 gap 是否要排除？
- assetization-required 是否算成功？

沒有明確定義，就會造成每次大改都朝不同方向努力。

---

### 1.4 單畫面驗證造成過度擬合

如果只用單一 flagship fixture 或單一畫面當驗證目標，AI 很容易：

- 修一個 tab-rail，破壞其他 layout。
- 修一個 button，破壞 text layout。
- 修一個 glow，破壞 runtime renderer。
- 為了讓單一 screenshot 變像，加入不可泛化的特殊規則。

這就是「看似進步，實際退化」的核心原因。

---
