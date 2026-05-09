<!-- doc_id: doc_other_0101 -->
# ATM Governance Policy

本文件定義 ATM 的公開治理流程：角色責任、提案審核、release 決策與升級爭議處理。

## 1. Roles

| 角色 | 主要責任 | 必要輸出 |
|---|---|---|
| Release Owner | 主持當次 release、簽署最終決策 | release sign-off、風險聲明 |
| Maintainer | 審核提案、維護契約一致性 | review 結論、核可/駁回紀錄 |
| Validator Owner | 維護 deterministic validators 與 gate 結果 | validator report、fail findings |
| Proposal Author | 提交 upgrade proposal / RFC | proposal 文件、影響分析 |

## 2. Duty Matrix

| 面向 | Release Owner | Maintainer | Validator Owner | Proposal Author |
|---|---|---|---|---|
| SemVer 判定 | A | R | C | C |
| Breaking RFC 審核 | A | R | C | R |
| Compatibility Matrix 更新 | A | R | C | R |
| Release Checklist 完成 | A | R | R | C |
| Rollback Decision | A | R | R | C |

說明：`A=Accountable`, `R=Responsible`, `C=Consulted`。

## 3. PEV / Upgrade Proposal Review Flow

1. Proposal Author 提交 proposal（參見 [UPGRADE_PROPOSAL_PUBLIC_RULES.md](./UPGRADE_PROPOSAL_PUBLIC_RULES.md)）。
2. Maintainer 做初審：確認範圍、SemVer 建議、compatibility impact。
3. Validator Owner 附 deterministic 驗證結果與風險 findings。
4. Release Owner 做決策：`approve` / `request-changes` / `reject`。
5. 決策結果回寫到 release artifacts（changelog + checklist + decision record）。

## 4. Public Review Rules

1. 任何 breaking change 一律需公開 RFC 與審核紀錄。
2. proposal 至少要有一位 maintainer + 一位 validator owner 評註。
3. 未附 compatibility impact 的 proposal 不得進入 release 決策。
4. 若爭議未收斂，Release Owner 必須記錄 escalation 與最終裁決理由。

## 5. Escalation Path

1. Maintainer 間意見不一致：升級到 Release Owner 仲裁。
2. Validator 與提案衝突：以 deterministic findings 為先，提案必須回應每項 blocker。
3. 若存在 production risk：優先執行 rollback window 機制，後續再補齊提案。

## 6. Required Governance Artifacts

1. upgrade proposal（含欄位完整性）。
2. review comments（至少 maintainer + validator）。
3. release decision（含 owner sign-off）。
4. rollback 判斷記錄（若觸發）。
5. 對應 changelog 條目。

## 7. Related Contracts

1. Lifecycle：參見 [LIFECYCLE.md](./LIFECYCLE.md)。
2. Compatibility：參見 [ATOM_COMPATIBILITY.md](./ATOM_COMPATIBILITY.md)。
3. Release Execution：參見 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)。
