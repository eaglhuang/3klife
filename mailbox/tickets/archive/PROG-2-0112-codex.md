# [PROG-2-0112] 受傷事件可觀測性：讓訓練受傷能被確定性驗收（不改機率）

給：Codex Agent｜里程碑：整合驗收（M3）｜性質：驗收工具與測試，**不改遊戲規則**

## 為什麼做
0108 的自然新局驗收中，24 次訓練、0 次受傷。核心機率是 `NURTURE_INJURY_CHANCE = 0.03`（`assets/scripts/core/systems/NurtureEvents.ts`），每次訓練獨立擲骰。24 次全未受傷的機率約 0.97^24 ≈ 48%，所以這次結果是**統計上正常**，不是邏輯故障。但 0108 需要在 Web 實機上看到「受傷」畫面與日誌，目前沒有可靠的方法做到這點，因此要補一條可重現的驗收路徑。

## 範圍
1. **不改** `NURTURE_INJURY_CHANCE`、不改 `rollNurtureRoundEvents`、不改亂數來源、不改培育核心規則。
2. 在**測試層**（headless）新增測試：注入一個會讓第一次擲骰落在受傷區間的 `RandomSource`，驗證 `injured=true` 時：該回合跳過（Skip_1_round）、日誌寫入 Injury 紀錄、後續回合恢復。
3. 確認培育日誌（IndexedDB 那份）每回合都寫入 `injured` 與 `skipped` 欄位；若缺欄位，只補寫入欄位，不改判定。
4. 在 PR 說明寫出：`NURTURE_INJURY_CHANCE` 的值、24 次不受傷的機率（上面的估算），以及「本卡不改機率」。
5. 若 Web 驗收需要「強制受傷」，只能用**測試專用**的開關（不得出現在正式建置的預設行為中），並在 PR 說明列出開關名稱與預設值。沒有這類開關就不要加。

## 開工前
- `git fetch origin`，看 **master 的 git log**、開著的 PR 與遠端分支，確認 PROG-2-0112 沒有人做過。
- 工作分支 `codex/PROG-2-0112-injury-observability`，base `master`。

## 共同規則（每張都適用）
- 只用本工單編號，不得自行另取編號。
- 新增測試需在 `tests/run-cli.ts` 註冊（若主線已自動收集則照專案慣例）。
- 不開 Cocos 編輯器；不手改 meta；UTF-8 無 BOM；`git diff --check` 通過。
- 驗收：全套 headless 通過，`compute-gate --profile standard --agent-feedback` 通過。
- 交回：PR 說明開頭寫「Before／After」；任務卡 `status: done`，寫明測試結果，然後解鎖。完成後，0108 才能重跑驗收。
