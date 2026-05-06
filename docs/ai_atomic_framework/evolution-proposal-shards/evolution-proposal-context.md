# 關於進化版的原子提案 — Context、現況與治理問題

> 這是 `關於進化版的原子提案.md` 的「Context、現況與治理問題」分片。完整索引見 `docs/ai_atomic_framework/關於進化版的原子提案.md`。

<!-- doc_id: doc_other_0044 -->
# ATM 框架穩定性保護分析 + ATM-1 全卡檢核報告

## Context

使用者提出兩個問題：
1. **ATM-1-0001 ~ ATM-1-0010 完成度檢核**（延伸上次只查 0001~0003 的範圍）
2. **架構命題**：框架穩定後，應該用 hash-lock 鎖起來、還是轉化為原子自我管理？還是有更好的方法？

---

## 2026-05-06 補充：Canonical Atom 家目錄規則

ATM-2-0013 完成後，atom 的「家目錄規則」已收成單一真相，後續計畫文件若提到預設工作區或 workbench 路徑，都應以這條規則為準：

- 預設 per-atom home 一律是 `atomic_workbench/atoms/<Atomic ID>/`
- 資料夾名稱直接等於 Atomic ID 本身，不再允許 sanitize / alias folder
- scaffold / test-runner / registry / workbench 的預設路徑都必須指向同一個 canonical folder
- 只有 adapter 明確指定 override 時，才能暫時使用其他 `workbenchPath` / `reportPath`；這是例外，不是新的預設
- 既有散落 atom 可分階段遷移，但新 atom 與新 test report 不得再落到其他預設位置

這條規則的目的不是重新命名所有 atom，而是先把「同一個 atom 的家」固定下來，避免 spec、code、test、report、registry proof 再往外散。

---

# Part I：ATM-1-0001 ~ ATM-1-0010 完成度檢核

## 全卡驗證結果

| 卡號 | MD status | JSON status | Upstream commit | 交付物 | 結論 |
|---|---|---|---|---|---|
| ATM-1-0001 product charter | done | done | `d165def` | 6/8 | ✅ 真實完成 |
| ATM-1-0002 monorepo skeleton | done | done | `28b368a` | 5/6 + workspace | ✅ 真實完成 |
| ATM-1-0003 Atomic Spec schema | done | done | `5267326` | 10/10 | ✅ 真實完成 |
| ATM-1-0004 CLI MVP | done | done | `0176686` | init/status/validate + fixture | ✅ 真實完成 |
| ATM-1-0005 LocalGitAdapter | done | done | `8164a89` | adapter + no-op lock/gate + fixture | ✅ 真實完成 |
| ATM-1-0006 LanguageAdapter | done | done | `6f4bcaa` | import scan + forbidden import fixture | ✅ 真實完成 |
| ATM-1-0007 hello-world | done | done | `2d7e21f` | examples + QUICK_START + validation gate | ✅ 真實完成 |
| ATM-1-0008 bootstrap pack | done | done | `1702bfd` | templates + validator + sandbox 驗證 | ✅ 真實完成 |
| ATM-1-0009 self-hosting alpha | done | **open** | `75dfca9` | 4/4 [x] in MD | ✅ 真實完成 — **JSON shard 未同步** |
| ATM-1-0010 neutrality audit | done | done | `6460be7` | audit doc + scan policy | ✅ 真實完成 |

**ATM-1 phase 全數完成（10/10）。**

## 發現的治理問題

| # | 問題 | 嚴重度 | 修正方式 |
|---|---|---|---|
| 1 | ATM-1-0009 JSON shard status=open（MD=done，notes=done） | 高 | `rebuild-tasks-atm-auto-parts.js` |
| 2 | ATM-1-0009 stale depends on ATM-2-0008（仍 open） | 中 | ATM-0-0014 已合法 bypass；應在 MD 註記 bypass reason |
| 3 | ATM-6-0005 JSON status=done 但 notes=open, completed_at=null | 高 | 修回 open |
| 4 | ATM-1.5-0001/0002/0003 均已 done 但 JSON shard 可能未全同步 | 中 | rebuild 確認 |

## 更新後的整體進度

| Phase | Done（真實） | Open | 備註 |
|---|---|---|---|
| **ATM-0** | 13 | 1 | ✅ ATM-0-0002 名詞定義仍 open |
| **ATM-1** | **10** | **0** | **✅ 全數完成** |
| **ATM-1.5** | **3** | **0** | **✅ 全數完成** — Seed-as-Spec 自舉完成 |
| **ATM-2** | 0 | 12 | ⏳ 待開 |
| **ATM-2.5** | 0 | 3 | 🔴 alpha0 gate |
| **ATM-3** | 0 | 13 | 🔴 等 alpha0 |
| **ATM-4** | 0 | 6 | 🔴 等 alpha0 + coexistence |
| **ATM-5** | 0 | 5 | ⏳ |
| **ATM-6** | 0 | 5 | ⏳ ATM-6-0005 應修回 open |
| **Total** | **26** | **45** | 完成率 **36.6%** |

**下一張可動卡**：`ATM-2-0001`（Spec loader/parser），依賴 `ATM-1.5-0003`（已 done）

**下一個里程碑**：Alpha0 自舉閘門（`ATM-2.5-0002`），距離剩 **~4 個節點**（ATM-2-0001 → ATM-2-0004/0005 → ATM-2.5-0001 → ATM-2.5-0002）

---

# Part II：框架穩定後的保護策略分析
