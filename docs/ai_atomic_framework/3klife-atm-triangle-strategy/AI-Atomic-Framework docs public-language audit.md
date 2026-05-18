<!-- doc_id: doc_other_0241 -->
<!--
title: AI-Atomic-Framework docs public-language audit
author: codex
created: 2026-05-18
status: ready-for-review
related:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
  - C:/Users/User/AI-Atomic-Framework/docs/ATOM_EVOLUTION_PLAN.md
-->

# AI-Atomic-Framework docs public-language audit

## 結論

已掃描 `C:/Users/User/AI-Atomic-Framework/docs/**/*.md`，共 35 份 Markdown。只有 1 份文件含中文內容：`docs/ATOM_EVOLUTION_PLAN.md`。

這表示 AI-Atomic-Framework 的 public docs 大致已符合英文對外精神；真正需要處理的是 Atom evolution 計畫。

## 掃描結果

| 類別 | 數量 |
|---|---:|
| Markdown 文件總數 | 35 |
| 含 CJK 中文字元的文件 | 1 |
| 檔名含中文的文件 | 0 |

## 需要處置的文件

| 文件 | CJK 字元數 | 判定 | 建議處置 |
|---|---:|---|---|
| `docs/ATOM_EVOLUTION_PLAN.md` | 3559 | 不適合直接作為英文 public docs | 中文詳版已保存為 `docs/ai_atomic_framework/3klife-atm-triangle-strategy/ATOM_EVOLUTION_PLAN.zh-TW.md`；AI-Atomic 端改為英文 public design note |

## 建議的處置策略

1. 3KLife 保存中文詳版：`docs/ai_atomic_framework/3klife-atm-triangle-strategy/ATOM_EVOLUTION_PLAN.zh-TW.md`，作為母專案治理脈絡與設計推理來源。
2. AI-Atomic-Framework 保留英文 public 版本，聚焦 contributor 能理解的 architecture、contract、CLI、schema、validator 與 safety gates。
3. 若短期無法完整翻譯，至少把 AI-Atomic 端 `ATOM_EVOLUTION_PLAN.md` 改成英文摘要，並移除 3KLife-specific 語氣。
4. 後續 public-language gate 應進 CI 或 pre-release checklist，防止新的中文內部文件流入 AI-Atomic public docs。

## 驗證腳本摘要

本次掃描邏輯：遞迴讀取 `docs/**/*.md`，用 CJK Unicode 範圍偵測中文內容，並檢查檔名是否含中文。
