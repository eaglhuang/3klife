# ATM 開發實務操作指南

> 更新日期：2026-06-02  
> 對象：第一次參與 ATM 框架開發、或第一次在 ATM 治理下工作的 AI / 代理  
> 目的：用一份泛用通則，幫新手先知道流程、順序、規則、坑點與 Git 操作習慣。

## 1. 先理解：你不是只在寫程式，你是在「被治理地開發」

ATM 的重點不是多一個聊天指令，而是讓 AI 在多人、多任務、多 repo 的情況下，還能：

- 先知道下一步該做什麼
- 不亂碰別人的工作
- 留下可審查的證據
- 把 commit、PR、close 都收得乾淨

如果你是第一次進場，先記住這句話：

> 先問 ATM 下一步，再動手；先切清故事線，再 commit。

## 2. 三種 repo 角色

| 類型 | 典型 repo | 主要責任 |
| --- | --- | --- |
| planning repo | `3KLife` | 開 task card、維護 ledger、做規劃與派工 |
| framework repo | `AI-Atomic-Framework` | 修 ATM CLI、hooks、schema、validator、runner、framework evidence |
| adopter repo | 例如 `3klife-npc-brain` | 真正的業務修補、repo-local evidence、分支、PR、merge |

先分清楚你站在哪一種 repo，很重要。  
因為「哪裡可以改、哪裡不能改、哪裡 close」都跟 repo 角色有關。

## 3. 第一次進 repo 的標準起手式

### 3.1 先讀入口

1. 讀 `README.md`
2. 如果是 planning repo，再看本地規劃文件或 task card 規則
3. 不要直接看著 dirty tree 就開始猜

### 3.2 先問 ATM

在 repo root 跑：

```bash
node atm.mjs next --prompt "<目前使用者需求>" --json
```

然後一定要讀：

- `messages`
- `evidence.nextAction.playbook`

不要跳過 playbook 自己發明流程。

### 3.3 `node atm.mjs` 跟 `node atm.dev.mjs` 的差別

- `node atm.mjs`：正常治理入口，走 frozen runner
- `node atm.dev.mjs`：只有在「你明確要驗證尚未 build 的 framework source」時才用

如果看到：

`ATM_RUNNER_SYNC_REQUIRED`

就代表 frozen runner 落後 source，先補：

```bash
npm run build
```

再重跑 `node atm.mjs ...`

不要拿 `node atm.dev.mjs` 去掩蓋 runner 沒同步這件事。

## 4. 先看懂 `closure_authority`

這是新手最常搞混的地方。

### `planning_repo`

代表這張卡主要在 planning repo 內收口。

常見情況：

- 規劃卡
- 文件卡
- 純 ledger / 卡面整理

通常是：

- task card
- ledger
- 1 個 planning commit

### `target_repo`

代表 task card 在 planning repo 開，但真正的實作、驗證、close 在 target repo。

這是目前最常見的健康模式。

常見順序：

1. `3KLife` 開卡
2. target repo 實作
3. target repo 驗證與 evidence
4. target repo close

注意：

> `closure_authority=target_repo` 時，不要回頭在 planning repo 補 status mirror commit。

## 5. 開 task card 的基本順序

### 5.1 先檢查 task id

至少要查：

```bash
git -C C:\Users\User\3KLife log --oneline --grep="TASK-XXXX"
git -C C:\Users\User\AI-Atomic-Framework log --oneline --grep="TASK-XXXX"
```

如果有 ledger shard，也要看 shard 裡有沒有同 id。

### 5.2 Phase 0 只做該做的事

在 planning repo 的 Phase 0，通常只做：

- 新增 task card
- 更新 ledger shard
- 規劃 allowedFiles / validators / rollback / notes

不要在 Phase 0 順手去 target repo 改碼。

### 5.3 status 用能被路由的值

實務上，Phase 0 開卡常用：

- `open`
- `planned`

避免一開始就寫成一堆不會被正常 claim / route 的狀態。

## 6. 實作前先看目前 Git 現實

新手很容易犯的錯，是把 `git status -sb` 當成唯一真相。

### 6.1 `git status` 不一定等於真正 diff

有些 repo 會出現：

- 背景 runtime modified
- guidance cache
- false-M
- generated noise

所以要一起看：

```bash
git status -sb
git diff --name-only
git diff --cached --name-only
```

### 6.2 不要亂 clean

如果你看到：

- `.atm/guidance/`
- `.tmp/`
- runtime logs
- 某些既有 untracked

不要第一反應就是 `git clean` 或 `restore`。

先判斷：

1. 這是不是你這次真的改的
2. 這是不是 pre-existing background noise
3. 這是不是別條 workstream 的東西

沒有 Captain 明確同意，不要清。

## 7. 小包、大包、證據包要分開

這是 ATM 開發最重要的 Git 習慣之一。

### 小包

適合單一故事線，例如：

- 單一 source fix
- 工具鏈同步
- rejected proposal evidence

特徵：

- 檔案少
- 語意單一
- validator 對應清楚
- rollback 容易

### 大包

例如：

- 1 個 export 腳本 + 幾百個 regenerated artifacts
- 大型 map / registry / projection 重生

這種包不要跟小修混在一起。

### 證據包

例如：

- rejected proposal evidence
- closure packet
- reviewable evidence

通常也要獨立看待，不要和業務修補混在同一顆 commit，除非它本來就是收口的一部分。

## 8. 什麼時候要切乾淨分支

以下情況，優先考慮從 `origin/main` 切乾淨分支，再 cherry-pick 真正要出的 commit：

1. 本地 `main` 已經 ahead 很多顆
2. ahead 裡夾了 unrelated 大包
3. 你只想出其中 2-3 顆小修
4. 你不想把 generated artifacts 或背景 workstream 一起推出去

這種時候，乾淨分支比硬推 `main` 健康很多。

## 9. 什麼時候要開 Draft PR

以下情況很適合先開 Draft：

1. 大量 regenerated artifacts
2. 還缺 deterministic rerun 證據
3. 還缺 3-5 個關鍵樣本 spot-check
4. 還缺前置附件，例如某個 index、summary、policy-generated json
5. 功能主體自洽，但 reviewer 一眼看不完

Draft 的意思不是失敗，而是：

> 先把大貨櫃停進檢驗車道，不要和已可 merge 的小修快車混在一起。

## 10. 大包進 Ready for review 前，至少補哪些檢驗單

建議至少補：

1. deterministic rerun
2. 關鍵樣本 spot-check
3. release note
4. rollback note
5. 前置附件 / 前置條件說明

如果某條邏輯還依賴尚未落地的前置附件，就先誠實標註：

- 目前是 dormant
- 還缺哪個前置 PR / follow-up

不要假裝它已經 fully active。

## 11. commit 與 close 的實務順序

### framework repo 常見模式

很多 `target_repo` 卡在 framework repo 內會長這樣：

1. delivery commit
2. validators / evidence
3. close
4. closure ledger commit

### planning repo 常見模式

planning-only 或 Phase 0 卡通常就是：

1. task card
2. ledger
3. 1 commit

### adopter repo 常見模式

常見做法是：

1. 工具鏈同步一包
2. source fix 一包
3. evidence 一包
4. generated artifacts 另包或另 Draft PR

## 12. 禁止事項

新手最容易踩的坑，大多都在這裡。

- 不要手改 `.atm/` runtime state
- 不要用 `--no-verify`
- 不要用 `--force`
- 不要用 `SAFE_MODE` 繞治理
- 不要把背景 dirty / untracked 順手混進 commit
- 不要看到 generated artifacts 就跟 source fix 一起送
- 不要因為本地有 build artifact 就誤判 clean checkout 也會過
- 不要把 planning repo 和 target repo 的責任混在同一個 agent 身上亂做

## 13. 目前實際環境要特別注意什麼

### 13.1 runner 與 build

現在實務上要特別注意：

- frozen runner 是否落後 source
- clean checkout 下能不能直接跑 `node atm.mjs`
- CI / validator 是否依賴 build artifact

### 13.2 generated artifacts 不再是「順手一起出」

現在的健康做法是：

- generated artifacts 要有理由
- 要知道它是不是 deterministic
- 要知道它和本次 source fix 是不是同一故事線

### 13.3 三國 RAG 這類 pipeline repo

這種 repo 常會同時出現：

- source fix
- governance evidence
- runtime profile regenerated outputs
- routing / guidance cache

這四種東西通常不應全部混在一顆 commit。

## 14. 新手建議操作順序

如果你完全是第一次進 ATM 開發，可以照這個順序做：

1. 先判斷 repo 類型
2. 讀 `README.md`
3. 跑 `node atm.mjs next --prompt "..."`
4. 讀 playbook
5. 查 task id 與 ledger
6. 看 `git status` + `git diff`
7. 切清這次的故事線是：
   - 規劃
   - source fix
   - evidence
   - artifacts
8. 只做你這一條線
9. validator / evidence 跑完再 commit
10. 需要時用乾淨分支或 Draft PR

## 15. 一句總結

ATM 開發跑得順，不是因為規則很多，而是因為你知道：

> 先讓 ATM 告訴你下一步，再把任務卡、commit、evidence、generated artifacts 各自裝進對的袋子。
