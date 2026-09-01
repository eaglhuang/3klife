---
name: status-atm-plan41-common-frozen-publication
description: Plan 4.1 0406/0407 唯一一次共同 frozen publication 已從封印 source ff37dccd 完成；尚未 close／push
type: status
updated: 2026-08-23
repo: AI-Atomic-Framework
status: active
---

# Plan 4.1 共同 frozen publication（2026-08-23）

1. 封印 source 是 `ff37dccd44f6870636ce0609fbb0420e8dbf581d`；`a910f1dc599375845e703bfeb68bd7b22481da80` 是其祖先。publication 前沒有新增 source commit。
2. Cursor 隊長以 ATM-GOV-0407 取得 runner-sync queue-head 後只 enqueue 一次、只 build 一次（`ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build`）。ATM 未要求 takeover-publication。
3. Receipt：`.atm/history/evidence/ATM-GOV-0407.runner-sync-receipt.json`，`publicationDisposition=published`，`sealedSourceSha` 對得上封印 source。queue 已回到 0。
4. 未 close 0406/0407、未 push、未做 internal adopter repo sync。
