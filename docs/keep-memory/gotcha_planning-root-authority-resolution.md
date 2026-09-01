---
name: gotcha-planning-root-authority-resolution
description: Planning root 解析應以 series-registry 存在且包含 active series 為準，多候選 fail-closed
type: gotcha
updated: 2026-08-16
repo: AI-Atomic-Framework
status: active
---

# Gotcha: Planning Root Authority Resolution & Ambiguity Fail-Closed

## 踩坑症狀
過去 planning-root 解析僅依據目錄存在（`existsSync`）與 sibling Heuristic 推導，若遇到無效、空目錄或未註冊 series-registry 的資料夾，容易誤判或忽略已存在且具有 active series 註冊的 canonical planning authority，甚至在有多個候選時隨機選取第一項。

## 核心規則與防禦
1. **明確優先權**：顯式 `--planning-root` 參數或環境變數永遠具備最高優先權，不做任何隱式猜測。
2. **合法註冊檢查**：候選目錄必須包含符合 `atm.seriesRegistry.v1` 且具備 `active` 狀態的 `series-registry.json`。未註冊或空目錄不可作為 write planning root 覆蓋已註冊 authority。
3. **單一權威選定**：若只有一個候選目錄具備合法註冊 series，自動選定為 canonical root。
4. **多候選 Fail-Closed**：若存在多個同等合法的 registered authorities 且無上層 canonical 基礎，嚴格執行 fail-closed，拋出 `ATM_PLANNING_ROOT_AMBIGUOUS` 並附帶候選清單與操作修復指引（--planning-root），禁止任意挑選。
5. **快取防護**：快取與解析必須在目錄結構與 registry 變更時重置，避免錯誤決定長期留存。
