<!-- doc_id: doc_other_0025 -->
# Inside OpenAI's AI Agent Collaboration System 學習筆記

> 來源限制：本文件不是影片逐字稿。
>
> 本回合已嘗試從 YouTube 頁面、`Show transcript` 面板、字幕 track URL，以及 `youtubei/v1/get_transcript` 內部 API 擷取文字稿，但在目前環境下 transcript 內容不是空白，就是回 `FAILED_PRECONDITION`。因此以下內容採用「影片公開頁面資訊 + 活動頁 + OpenAI 與相關公開技術文章」交叉整理。
>
> 這份筆記適合作為學習版摘要與實務對照，不宜視為影片的逐句轉寫。

## 1. 影片基本資訊

| 項目 | 內容 |
| --- | --- |
| 影片標題 | Inside OpenAI's AI Agent Collaboration System |
| 頻道 | MLOps.community |
| 發布日期 | 2026-01-09 |
| 長度 | 19:21 |
| 可見關鍵字 | AI Agents, Agent Evals, OpenAI, codex |
| 公開描述 | Join us at our South Bay Coding Agents event on March 3rd at the Computer History Museum |
| 活動脈絡 | `Coding Agents: AI Driven Dev Conference` |

## 2. 先講結論

單看影片標題、關鍵字與活動脈絡，這場分享的核心並不是「多 Agent 很酷」這種泛泛介紹，而是比較像在講：

1. OpenAI 如何把 `Codex` 這種 coding agent 從單一模型能力，變成可以長時間穩定運作的工程系統。
2. 真正的重點不在 prompt 小技巧，而在 harness，也就是代理人工作的執行環境、上下文來源、工具邊界、驗證回路與可觀測性。
3. 所謂的「agent collaboration system」，本質上是在講人類、主 agent、sub-agent、工具、驗證器、repo 規則與 runtime 事件流之間如何協作，而不是只講模型彼此互相對話。

## 3. 重點整理

### 3.1 Harness engineering 才是代理人可靠性的主戰場

這組資料最一致的訊號是：當 agent 要做的是長任務、跨檔修改、工具呼叫、PR 迭代、UI 驗證這類真正的工程工作時，可靠性主要不是靠模型本身保證，而是靠 harness 保證。

可以把 harness 理解成「代理人的工作台與規則系統」，至少包含：

- context 從哪裡來
- 工具能做什麼、不能做什麼
- 中途失敗怎麼觀測、怎麼回復
- 哪些結果算完成，哪些不算
- 哪些證據可以證明它真的做好了

OpenAI 的 `Harness engineering: leveraging Codex in an agent-first world` 直接把焦點放在這件事上：人類的主要工作不再是親手寫每一行 code，而是設計讓 agent 能穩定產出的環境。

### 3.2 人類角色從「直接生產 code」轉成「設計環境、指定目標、建立回路」

OpenAI 那篇文章裡最值得記住的一句話可以濃縮成：`Humans steer. Agents execute.`

這代表工程師的職責重心轉移成：

- 把需求拆成 agent 可完成的工作單元
- 讓 repo 有足夠清楚的規則與知識來源
- 建立 review、test、lint、browser 驗證、observability 等回授機制
- 當 agent 做不好時，不是一直重試，而是回頭問「缺的是哪個能力、哪個文件、哪個規則、哪個工具」

這種思路很重要，因為它把問題從「模型怎麼又犯錯」改寫成「我們的工程環境是否對 agent 足夠 legible 與 enforceable」。

### 3.3 Repository 要變成 system of record

OpenAI 的實作很強調：真正能被 agent 用到的知識，必須存在 repo 裡，而且最好是版本化、可交叉引用、可機械檢查的。

幾個很關鍵的觀念：

- `AGENTS.md` 不應該是一本巨大的百科全書，而應該比較像目錄或入口
- 真正的知識要拆進結構化 `docs/`、architecture 文件、plans、quality 文件、product specs
- 大型任務的執行計畫、進度與決策過程也要成為 repo 內可追蹤 artifact
- 文件不能只存在，還要被 lint、被檢查、被清理，避免很快腐化成過期說明

這件事跟我們現在的專案實踐其實高度一致：`keep.summary.md`、`AGENTS.md`、task cards、sharded docs、本地腳本化 gate，本質上都在做同一件事，就是讓 agent 能在 repo 內找到足夠可靠的真相來源。

### 3.4 Agent legibility 比「塞很多指令」更重要

OpenAI 的文章一再強調：你不是把更多字硬塞進 context，而是要把系統變得更容易被 agent 看懂。

他們做的事情包括：

- 讓 app 能在每個 worktree 啟動
- 把 Chrome DevTools 接進 agent runtime，讓 agent 能看 DOM、截圖、走 UI 路徑
- 暴露 logs、metrics、traces，讓 agent 能直接用查詢語言判讀問題

這裡最重要的不是工具名稱，而是思維方式：

- 任何 agent 在執行時看不到的資訊，對它來說幾乎等於不存在
- 口頭共識、Slack 討論、腦內知識，如果沒被寫回 repo，就不是真正可用的上下文
- UI、runtime state、log、trace 若不能被 agent 讀取，它就只能盲修

### 3.5 規則不能只寫在文件裡，最好還要被機械執行

OpenAI 的案例非常重視 architecture invariants 與 taste invariants。

重點不是每個實作細節都要手把手指定，而是：

- 邊界要清楚
- 依賴方向要清楚
- 型別與資料 shape 的入口要清楚
- 命名、logging、file size、結構層次等規範要能被 lint 與測試抓到

更值得學的是，他們把 lint error message 本身也寫成對 agent 友善的 remediation 指令，讓規則不只是阻止，而是直接引導修正。

這點可以直接對應到我們專案現在的方向：硬規則、bridge interface、doc-id、encoding guard、context budget、compile gate、UI contract，如果只停留在文件層，效果有限；一旦變成 script、lint、gate、lock、validator，才會真正穩。

### 3.6 Agent collaboration 不是抽象概念，而是可操作的事件流與工作流

`Unlocking the Codex harness: how we built the App Server` 裡把這件事講得更具體：同一套 Codex harness 被 CLI、IDE、desktop app、web runtime 共用，靠的是一個清楚的協議層，而不是每個 client 各做各的。

裡面幾個很值得記的 primitive：

- `Thread`：持久化的對話與工作容器
- `Turn`：一次由使用者觸發的工作循環
- `Item`：這輪工作中的原子事件，例如 user message、agent message、tool execution、approval request、diff

這個設計的重要性在於：

- agent 工作不是單一 request/response
- 一次任務會包含很多中間事件、增量輸出、工具呼叫與批准流程
- 如果沒有事件級別的 primitive，很難做 IDE 呈現、恢復工作、跨 client 同步，以及細粒度觀測

因此，所謂的 collaboration system，真正的底座是「可持久化的 thread/turn/item 流」加上工具與批准機制，而不是單純把多個 agent 湊在一起。

### 3.7 Agent evals 的重點不是只看最後答案，而是看整條路徑

影片關鍵字裡出現 `Agent Evals`，而相關公開資料最值得搭配的是 `Agent Evals Get a Reproducibility Floor`。

這篇補上了一個很關鍵的觀念：agent 系統的失敗，常常不是輸出內容本身錯，而是路徑不穩。

它整理的重點包括：

- deterministic execution traces 讓兩次 run 可以做步驟級比對，而不只是最終輸出比對
- 當 agent 會呼叫工具、轉分支、handoff 給 sub-agent 時，真正要 debug 的是「哪一步開始漂」
- CI baseline 不只要記住正確答案，還要記住合理的執行軌跡

換句話說，agent eval 不能只問「答對了沒有」，還要問：

- 有沒有走到不該走的工具路徑
- 是否多繞了很多步才偶然成功
- 某個 sub-agent 是否特別容易 flaky
- 模型更新之後，是哪個 execution path 開始產生漂移

### 3.8 Boundary design 是理解整個 agent collaboration stack 的好框架

Medium 那篇 `The missing mental model of harness engineering: boundary design` 提供了一個很適合學習的框架。

它的核心句可以濃縮成：

> Harness engineering 是為模型自治設計邊界，而不只是堆一堆元件。

這篇把 system 拆成幾層：

- L1：generic agent runtime
- L2：project/repository harness
- L3：product-facing harness
- 外加 operator substrate 與 governance/memory 兩個 control plane

這個框架很有價值，因為它不是只問「你有沒有 tools、memory、evals」，而是進一步問：

- 這個邊界是誰負責
- 這個邊界回答的是哪個 accountability question
- 什麼 evidence 可以證明這個邊界有守住

這對多 agent 協作尤其重要，因為同樣叫做 hook、skill、MCP、eval，放在不同邊界，責任與驗證方式完全不同。

## 4. 把這些觀念翻成白話

如果要用一句比較白話的方式講這支影片相關脈絡，我會這樣翻：

1. AI agent 不會因為模型比較強就自動變成可靠工程師。
2. 真正讓它變可靠的，是你幫它準備的 repo、工具、權限、觀測、驗證與回授系統。
3. 多 agent 協作也不是叫多幾個模型來聊天，而是要把 thread、task、handoff、approval、trace、artifact 管好。
4. 人類沒有消失，而是從「手寫每一段程式」轉成「定義規格、建立約束、設計驗證、管理風險、決定何時升級規則」。

## 5. 對我們專案最有價值的啟發

| 啟發 | 對我們專案的直接對應 |
| --- | --- |
| `AGENTS.md` 應該是入口不是百科全書 | 維持 `AGENTS.md` + `keep.summary.md` + 分片 docs 的結構，不把所有規則塞進單一檔案 |
| repo 要成為 system of record | 口頭共識、UI 契約、debug 結論、task handoff 都要回寫到 repo 內可追蹤文件 |
| 規則要可機械執行 | `task-lock`、`doc-id-registry`、`encoding guard`、`context budget guard`、compile gate 這類腳本要繼續強化 |
| agent 需要 runtime legibility | 繼續投資 screenshot、browser QA、log reader、compile signal、結構化 logger |
| eval 要看路徑不是只看結果 | 保留 task artifact、validation trace、錯誤快照、review feedback，而不只看最後是否「看起來修好了」 |
| collaboration 需要 thread/turn/item 思維 | 任務卡、handoff、子 agent、approve/reject、逐步驗證，最好都能對應到明確工作單元與 artifact |
| 邊界清楚比功能堆疊更重要 | 我們目前推的 interface-first bridge、shared interfaces、模組邊界收斂，本質上就是在降低 agent 推理成本 |

## 6. 我會怎麼記這支影片

如果之後要快速回想，我會把它記成下面這幾句：

- `Harness > Prompt`：可靠性主要來自 harness，而不是 prompt 魔法。
- `Humans steer, agents execute`：人類工作上移到規格、環境、驗證與治理。
- `Repo is memory`：agent 看不到的知識，等於不存在。
- `Legibility beats verbosity`：讓系統更可讀，比塞更多文字更有效。
- `Evals must inspect trajectories`：只看最終答案，抓不到多步代理人的真問題。
- `Collaboration needs protocol and artifacts`：協作系統的底座是事件流、批准流、trace 與持久化 artifact。

## 7. 待補項目

如果之後能拿到 transcript，建議補兩塊：

1. 逐段時間軸摘要
2. 可直接引用的原句與原意對照

目前這份版本已足夠作為學習導讀與專案對照，但不適合拿來當逐字引用來源。

## 8. 參考來源

- YouTube: https://www.youtube.com/watch?v=qbVC-Q-wQlc
- Luma event page: https://luma.com/codingagents
- OpenAI: https://openai.com/index/harness-engineering/
- OpenAI: https://openai.com/index/unlocking-the-codex-harness/
- Medium: https://medium.com/@wencheng.zheng_50256/the-missing-mental-model-of-harness-engineering-boundary-design-9d89ad422025
- Substack: https://codexscorner.substack.com/p/agent-evals-get-a-reproducibility
- GitHub: https://github.com/walkinglabs/awesome-harness-engineering