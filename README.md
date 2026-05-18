<!-- doc_id: doc_index_0019 -->
# 3KLife

`3KLife` 是一個以三國人物養成、血脈傳承、戰場策略與長局治理為核心的 Cocos Creator 專案。

這個 repo 是 **主要遊戲 repo**，GitHub 名稱已是 `3klife`。這裡放的是遊戲本體、Cocos 前端、核心資料、正式規格、驗證工具與日常開發腳本，不是 ATM 上游 repo，也不是 NPC Brain 獨立服務 repo，亦非個人分享網站 repo。

## Repo 定位

- `3klife` / 本 repo / 本機資料夾 `3KLife`：主遊戲 repo。負責 Cocos 專案、遊戲資料、UI、戰鬥、規格文件與本地工具鏈。
- `AI-Atomic-Framework`：ATM 原子框架 repo。負責 Agent 治理、任務路由、驗證與開源框架本體，不是遊戲主內容真相來源。
- `npc-brain`：NPC Brain repo。負責三國人物知識、對話、檢索、LangGraph 與 runtime service；不是 Cocos 主遊戲 repo。
- `AI-learning-notes`：個人分享網站 repo。負責公開學習筆記、教學整理與對外內容展示；不是遊戲 runtime 與 ATM 核心治理來源。

## 專案焦點

- 三國人物養成、血脈、名將生命週期與長局治理
- Cocos Creator 3.8.8 遊戲前端與戰場 / UI 系統
- 武將資料、人物頁、虎符、裝備、戰法與長局資料流
- 與 NPC Brain service 的資料契約與整合

## 開發環境

- 引擎：`Cocos Creator 3.8.8`
- 語言：`TypeScript`
- 主要平台：`Web / Android / iOS`
- 本機 Editor 入口：`http://localhost:7456`

## 快速開始

### Cocos 專案

1. 用 `Cocos Creator 3.8.8` 開啟本專案。
2. 安裝 Node 依賴：

```bash
npm ci
```

3. 常用檢查：

```bash
npm test
npm run gate:quick
npm run check:encoding
```

### 常用本地驗證

```bash
npm run test:ucuf
npm run test:snapshot
npm run check:ui-spec
```

## 文件入口

- 共識摘要：`docs/keep.summary.md`
- 系統主規格：`docs/遊戲規格文件/系統規格書/`
- 人物頁規格：`docs/遊戲規格文件/系統規格書/武將人物介面規格書.md`
- 資料契約：`docs/遊戲規格文件/系統規格書/Data Schema文件（本機端與Server端）.md`
- NPC Brain 服務入口：`C:\Users\User\3klife-npc-brain\README.md`

## 開發提醒

- 這個 repo 的真相來源是遊戲規格與遊戲程式，不是 ATM 文件。
- 若工作內容是 Agent 治理、原子框架、開源 CLI，請切到 `AI-Atomic-Framework` repo 判斷。
- 若工作內容是對話、檢索、人物知識管線或 LangGraph，請切到 `npc-brain` repo 判斷。
- 若工作內容是公開教學、學習筆記、文章整理或個人網站內容，請切到 `AI-learning-notes` repo 判斷。

## 目前狀態

專案目前處於 `UI 量產期 + 資料管理中心基礎建設完成` 階段。新進 Agent 開工前，先讀 `docs/keep.summary.md`，再進入對應規格或任務卡。
