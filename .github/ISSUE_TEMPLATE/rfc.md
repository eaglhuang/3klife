---
name: RFC（正式設計提案）
about: 提出需要廣泛討論的設計決策
title: "[RFC] "
labels: "type:rfc"
assignees: ''
---

> **RFC 流程說明**：請先閱讀 [docs/RFC_PROCESS.md](../../docs/RFC_PROCESS.md)  
> RFC 生命週期：草稿 → 審查中 → FCP（最終評論期 14 天）→ 接受/拒絕 → 實作

---

## RFC 摘要

<!-- 一段話說明這個 RFC 要解決什麼問題 -->

## 動機

<!-- 
為什麼需要這個改變？
- 目前的問題或限制是什麼？
- 這個改變的使用者價值是什麼？
-->

## 詳細設計

<!-- 
說明技術設計細節：
- 公開 API 變更（若有）
- 資料結構或狀態機變更
- 跨 package 的影響
- 舉一個具體的使用範例
-->

```typescript
// 若涉及 API 變更，請在此示意新舊介面
```

## Backward Compatibility

<!-- 
- 是否為破壞性變更？
- 若是，migration path 是什麼？
- 舊行為是否有 deprecation 期間？
-->

## 替代方案

<!-- 你考慮過哪些替代方案？為什麼選擇這個設計？ -->

## 未解決的問題

<!-- 還有哪些設計問題尚待討論？ -->

## 影響範圍

- **涉及的 package**: 
- **API 層級**: Public / Internal / Private
- **是否為破壞性變更**: 是 / 否
- **是否申請 Fast Track**: 是（說明理由）/ 否

---

**Maintainer 審查欄位**（提案者勿填）：

- [ ] Maintainer 1 審查通過：@
- [ ] Maintainer 2 審查通過：@
- [ ] 進入 FCP：日期 ____
- [ ] FCP 結束：日期 ____
- [ ] 最終決定：Accepted / Rejected
