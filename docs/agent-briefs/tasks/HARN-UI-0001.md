---
doc_id: doc_task_TBD
id: HARN-UI-0001
priority: P1
phase: G
created: 2026-05-04
created_by_agent: compute-gate-sensor
owner: Antigravity (Gemini 1.5 Pro)
status: done
type: ui-contract
chain_id: HARN-CHAIN-GDUI
chain_step: 1/1
sensor_triggered_by: compute-gate general-detail-ui
depends:
  []
notes: "2026-05-04 | 狀態: done | Antigravity: 已修正 GeneralDetailComposite 的 mount 呼叫、調整 PortraitImage 寬度至 46%、補齊 RightTabBar/RightContentArea 背景槽位，並重構卡片結構通過閘門驗證。"
---

# [HARN-UI-0001] 修復 GeneralDetail UI 契約 4 個結構問題

> 🔗 **韁繩感測器自動偵測** — 由 `compute-gate.js --gates general-detail-ui` 觸發
> ⚡ **修改上限**：≤ 3 個檔案

## 問題描述（感測器輸出）

`validate-general-detail-ui.js` 回報以下 4 個阻擋性問題：

```
❌ GeneralDetailComposite 尚未使用 general-detail-screen 或 general-detail-unified-screen 作為載入入口
❌ PortraitImage 寬度應維持在 44%~50%，避免角色主視覺過窄或過寬
❌ RightTabBar 應保留 detail.tabbar.bg 單層相容入口，或提供 tab rail 的 fill/bleed/frame 分層節點
❌ RightContentArea 應保留 detail.content.bg 單層相容入口，或提供內容主區的 fill/bleed/frame 分層節點
```

## INPUT_CONTRACT（前置條件）

- `assets/scripts/ui/components/GeneralDetailComposite.ts` 可正常編譯
- `assets/resources/ui-spec/screens/` 下存在 GeneralDetail 相關 screen JSON
- `node tools_node/validate-general-detail-ui.js` 可執行

## OUTPUT_CONTRACT（交付成果）

- [ ] `GeneralDetailComposite.ts` 的載入入口改為 `general-detail-screen` 或 `general-detail-unified-screen`
- [ ] `PortraitImage` 的寬度設定在 44%~50% 範圍
- [ ] `RightTabBar` 節點含 `detail.tabbar.bg` 相容 slot 或分層節點
- [ ] `RightContentArea` 節點含 `detail.content.bg` 相容 slot 或分層節點
- [ ] `validate-general-detail-ui.js` 輸出「✅ 通過」

## VALIDATION_CMD

```bash
node tools_node/compute-gate.js --gates general-detail-ui
```

> 必須輸出「✅ GeneralDetail UI 契約 (XXms)」才算通過。

## ROLLBACK_HINT

```bash
git checkout assets/scripts/ui/components/GeneralDetailComposite.ts
git checkout assets/resources/ui-spec/screens/
```

## 執行步驟

### 步驟 1：診斷當前結構

```bash
node tools_node/validate-general-detail-ui.js
```

閱讀完整錯誤輸出，確認各問題的精確位置。

### 步驟 2：修正載入入口（問題 1）

在 `GeneralDetailComposite.ts` 找到場景載入邏輯，將 screen ID 改為 `general-detail-screen` 或 `general-detail-unified-screen`。

**修改範圍：1 個 .ts 檔案**

### 步驟 3：驗證問題 1 修正

```bash
node tools_node/compute-gate.js --gates ts-syntax eslint-rules
```

### 步驟 4：修正 PortraitImage 寬度（問題 2）

在對應的 screen/layout JSON 中找到 `PortraitImage` 節點，調整 `width` 為 44%~50%。

**修改範圍：1 個 screen JSON 檔案**

### 步驟 5：修正 RightTabBar（問題 3）

在 screen/layout JSON 中找到 `RightTabBar` 節點，確保含有 `detail.tabbar.bg` slot。

**修改範圍：同上 JSON 檔案**

### 步驟 6：修正 RightContentArea（問題 4）

在同一 JSON 中找到 `RightContentArea` 節點，確保含有 `detail.content.bg` slot。

### 步驟 7：最終驗收

```bash
node tools_node/compute-gate.js --gates general-detail-ui
npm run test:ucuf:governance
```

## 相關文件

- `docs/遊戲規格文件/系統規格書/武將人物介面規格書.md`
- `docs/keep.summary.md`（Pre-flight 必讀）
- `tools_node/validate-general-detail-ui.js`（感測器原始碼）

---
*由 Harness Engineering compute-gate 感測器自動偵測開立 | 2026-05-04*
