<!-- doc_id: doc_other_0091 -->
# ATM Documentation Role Map

## Purpose

本文件盤點 `docs/ai_atomic_framework/` 當前文件集合的治理角色，用來回答兩件事：

1. 哪些文件應該是 canonical。
2. 哪些文件應該轉成 reference / adopter / history / asset。

這份 role map 是**現況治理地圖**，重點在先完成邏輯分類，不是立刻搬檔。

## Current Snapshot

截至本次盤點，`docs/ai_atomic_framework/` 根目錄共有：

- `18` 份 root files
- `7` 個 shard directories

治理原則上，真正應長期留在 root 的，只應該是少數 canonical、唯一 index、少量高價值 reference，以及必要 asset。

## Root Files

| 路徑 | 建議角色 | 建議處置 | 說明 |
|---|---|---|---|
| `AI_Atomic_Framework_Roadmap.md` | `canonical` | 保留 root | ATM 願景、原理、長期方向主文件 |
| `AI原子框架開發計畫書.md` | `canonical` | 保留 root | 當前可執行主計畫 |
| `ATM框架演進執行規劃書.md` | `canonical` | 保留 root | 演進修正、治理補丁、delta ledger |
| `ATM_cross_reference.md` | `index` | 保留 root | 唯一路由入口索引 |
| `framework-function-atomization-manifest.md` | `canonical` | 保留 root | 全框架功能原子化 coverage manifest |
| `upstream-versioning-policy.md` | `canonical` | 保留 root | upstream 版本與生命周期政策 |
| `原子行為參考手冊.md` | `canonical` | 保留 root | 行為層參考手冊 |
| `關於進化版的原子提案.md` | `reference` | 短期保留 root；長期拆出可用內容後凍結 | 大型提案 / 分析彙編，不能再與 canonical 平行競爭 |
| `open-source-extraction-plan.md` | `reference` | 後續移入 `references/` | open-source / upstream 萃取規劃 |
| `multi-agent-compatibility-matrix.md` | `reference` | 後續移入 `references/` | 多 Agent 相容性矩陣 |
| `AI_Atomic_Framework_Optimized_Roadmap_v0.2.md` | `history` | 凍結後移入 `history/` | 舊版 optimized roadmap，保留脈絡即可 |
| `3klife-coexistence-plan.md` | `adopter` | 後續移入 `adopters/` | 3KLife 與 ATM 共存策略 |
| `3klife-consumption-roadmap.md` | `adopter` | 後續移入 `adopters/` | 3KLife 作為採用者的消費路徑 |
| `3klife-tooling-fate.md` | `adopter` | 後續移入 `adopters/` | 3KLife 下游 tooling fate |
| `html-to-ucuf-case-study.md` | `adopter` | 後續移入 `adopters/` | 下游案例研究，不屬於 core canonical |
| `h2u-regression-matrix.md` | `adopter` | 後續移入 `adopters/` | 下游 H2U regression matrix |
| `atom-lifecycle-state-machine.svg` | `asset` | 保留 root 或後續移入 `assets/` | 狀態機視覺輔助圖 |
| `atom-map-relationship.svg` | `asset` | 保留 root 或後續移入 `assets/` | map 關係視覺輔助圖 |

## Shard Directories

| 目錄 | 建議角色 | 父文件 / 主題 | 建議處置 |
|---|---|---|---|
| `shards/` | `shard` | `AI_Atomic_Framework_Roadmap.md` | 持續作為 roadmap shard；不得獨立演化成另一套真相 |
| `dev-plan-shards/` | `shard` | `AI原子框架開發計畫書.md` | 持續作為主計畫 shard |
| `atm-evolution-plan-shards/` | `shard` | `ATM框架演進執行規劃書.md` | 持續作為演進計畫 shard |
| `atm-cross-reference-shards/` | `shard` | `ATM_cross_reference.md` | 持續作為索引 shard |
| `behavior-reference-shards/` | `shard` | `原子行為參考手冊.md` | 持續作為手冊 shard |
| `evolution-proposal-shards/` | `shard-reference` | `關於進化版的原子提案.md` | 先保留為 reference shard；長期等內容吸收後凍結 |
| `optimized-roadmap-v02-shards/` | `shard-history` | `AI_Atomic_Framework_Optimized_Roadmap_v0.2.md` | 與歷史 roadmap 一起凍結，後續歸入 `history/` |

## Immediate Governance Actions

1. 停止再新增 root-level 的平行 roadmap / proposal 主文件。
2. 將 `AI_Atomic_Framework_Optimized_Roadmap_v0.2.md` 視為 freeze candidate。
3. 將 `關於進化版的原子提案.md` 視為大型 `reference`，逐步把可執行真相回寫到 canonical 與手冊。
4. 未來新的 3KLife / H2U / html-to-ucuf 相關文件，預設走 `adopter` 路線。
5. 新文件建立前，必須先檢查本表；若主題已有 canonical owner，優先 backwrite 而不是平行開新主文。

## Suggested Future Physical Structure

```text
docs/ai_atomic_framework/
  AI_Atomic_Framework_Roadmap.md
  AI原子框架開發計畫書.md
  ATM框架演進執行規劃書.md
  ATM_cross_reference.md
  framework-function-atomization-manifest.md
  upstream-versioning-policy.md
  原子行為參考手冊.md
  references/
  adopters/
  history/
  assets/
  shards/
```

## Conclusion

這個目錄真正缺的不是「馬上搬資料夾」，而是**先把治理身分說清楚**。只要每份文件的 role、owner、回寫路徑先穩住，之後新版本再進來時，就比較不會持續堆出新的平行真相。
