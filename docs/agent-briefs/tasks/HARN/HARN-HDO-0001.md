---
doc_id: doc_task_0018
id: HARN-HDO-0001
priority: P0
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-04T21:07:09.9933481+08:00
started_by_agent: GitHubCopilot
type: handoff-validation
chain_id: HARN-CHAIN-HANDOFF
chain_step: 1/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-ART-0002
notes: "2026-05-04 | 狀態: done | 驗證: 臨時 git repo smoke strict pass；缺 beta 的 artifact 非 strict = warn；缺 beta 的 artifact strict = fail；get_errors=0 | 變更: 新增 tools_node/validate-handoff-diff.js，先重用 turn-artifact validator，再比對 artifact files 與 git status，輸出 missingInArtifact / extraInArtifact / dirtyButUnreported | 阻塞: none"
---

# [HARN-HDO-0001] 建立 Handoff Diff Validator Core

> **Harness rollout 開卡** — 直接對應「交接說了什麼是否符合事實」問題
> **定位**：Phase 1 / Handoff evidence 第 1 步
> **前置依賴**：`HARN-ART-0002` validator 已可確認 artifact 格式正確

## 問題描述

目前 handoff 主要靠 Agent 文字敘述。即使摘要寫得完整，仍有三個常見風險：

- handoff 宣稱修改 A/B 檔，但實際 changed files 不一致
- 有額外 dirty file 未被提及，下一位 Agent 會誤判範圍
- staged / unstaged / untracked 狀態沒有對帳，交接可信度不足

這張卡的任務是建立第一版 `validate-handoff-diff.js`，先做「artifact files vs git status」的確定性核對。

## INPUT_CONTRACT

- turn artifact validator 可保證 artifact 基本合法
- repo 有可讀取的 git status 資訊
- 第一版只檢查檔案層級，不讀完整 diff hunk

## OUTPUT_CONTRACT

- [x] 新增 `tools_node/validate-handoff-diff.js`
- [x] 支援讀取 artifact 內 `files[*].path` 與 git changed files 做對帳
- [x] 至少區分 `pass / warn / fail` 三種結果
- [x] 輸出需列出 `missingInArtifact`、`extraInArtifact`、`dirtyButUnreported` 類型摘要
- [x] strict 模式下 fail 需回傳 exit code = 1

## VALIDATION_CMD

```bash
powershell -NoProfile -Command "
$repo = Join-Path $env:TEMP ('hdo-0001-' + [guid]::NewGuid().ToString('N'));
$artifact = Join-Path $env:TEMP ('hdo-0001-pass-' + [guid]::NewGuid().ToString('N') + '.json');
New-Item -ItemType Directory -Path $repo | Out-Null;
git -C $repo init | Out-Null;
git -C $repo config user.email 'hdo-smoke@example.com';
git -C $repo config user.name 'HDO Smoke';
[System.IO.File]::WriteAllText((Join-Path $repo 'alpha.txt'), \"alpha v1`n\", [System.Text.UTF8Encoding]::new($false));
git -C $repo add alpha.txt;
git -C $repo commit -m 'init' | Out-Null;
[System.IO.File]::WriteAllText((Join-Path $repo 'alpha.txt'), \"alpha v2`n\", [System.Text.UTF8Encoding]::new($false));
[System.IO.File]::WriteAllText((Join-Path $repo 'beta.txt'), \"beta`n\", [System.Text.UTF8Encoding]::new($false));
$alphaBytes = (Get-Item (Join-Path $repo 'alpha.txt')).Length;
$betaBytes = (Get-Item (Join-Path $repo 'beta.txt')).Length;
$artifactObject = [ordered]@{
  schemaVersion = 'turn-artifact/v1'; kind = 'turn-artifact'; generatedAt = '2026-05-04T21:10:00+08:00';
  workflow = 'harness-upgrade'; task = 'HARN-HDO-0001-smoke-pass'; goal = 'handoff diff validator smoke';
  source = [ordered]@{ changed = $true; explicitFiles = @('alpha.txt', 'beta.txt'); maxFiles = 2 };
  totals = [ordered]@{ files = 2; textFiles = 2; imageFiles = 0; otherFiles = 0; totalBytes = ($alphaBytes + $betaBytes); estTokens = 5 };
  files = @(
    [ordered]@{ path = 'alpha.txt'; kind = 'text'; bytes = $alphaBytes; estTokens = 3; inlineSafe = $true; summary = 'alpha changed' },
    [ordered]@{ path = 'beta.txt'; kind = 'text'; bytes = $betaBytes; estTokens = 2; inlineSafe = $true; summary = 'beta untracked' }
  );
  summaryCard = [ordered]@{ workflow = 'harness-upgrade'; task = 'HARN-HDO-0001-smoke-pass'; goal = 'handoff diff validator smoke'; read = @('alpha.txt', 'beta.txt'); known = @('alpha changed'); need = @('beta untracked'); avoid = @('none') };
  riskHints = @('none'); nextActions = @('none');
};
[System.IO.File]::WriteAllText($artifact, ($artifactObject | ConvertTo-Json -Depth 10), [System.Text.UTF8Encoding]::new($false));
node tools_node/validate-handoff-diff.js --artifact $artifact --repository $repo --strict
"
```

## ROLLBACK_HINT

```bash
git checkout tools_node/validate-handoff-diff.js
```

## 執行步驟

1. 先限制範圍在檔案清單，不在第一版解析 diff 內容。
2. 將 git status 正規化成可比較的 repo-relative path。
3. 先定義 mismatch taxonomy，讓後續 fixture 與 finalize integration 可共用。
4. 對沒有 artifact、artifact 非法、repo 非 git 的情況，明確回傳 fail 或 blocked 訊號。
5. 錯誤訊息需可直接被下一輪 Agent 消費，不只丟 raw JSON。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：已達成
- 驗證證據：已新增 `tools_node/validate-handoff-diff.js`；以臨時 git repo 驗證完整覆蓋 `pass / warn / strict fail` 三條路徑，其中 strict pass 可對上 `alpha.txt + beta.txt`，缺少 `beta.txt` 的 artifact 在非 strict 為 warn、在 strict 為 fail；`get_errors` 對新 CLI 回報 0 錯誤。
- 需修改：下一步可進入 `HARN-HDO-0002`，把目前 smoke 情境收斂成固定 fixtures，避免每次都臨時造 repo。
