<!-- doc_id: doc_spec_0699 -->
# 3KLife 計算型閘門Quick與Full雙階梯掃描策略與防回歸門禁規格書

> **規格代碼**：SPEC-OPS-GATE01  
> **關聯 WBS**：GATE-AUDIT-01（計算型閘門雙階梯掃描與防回歸門禁）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：全域架構總控（Global Architecture & Index Governance）

---

## 1. 核心宗旨與設計哲學

為在 Agentic 高頻自動化協同開發中兼顧「秒級反饋速度」與「代碼庫極致品質」，本規格書制定計算型閘門（Compute Gate）之**雙階梯分級防回歸門禁機制（Two-Stage Tiered Policy）**。明確區分 Quick（秒級輕量）與 Full（全量嚴格）之執行邊界與阻斷條款。

---

## 2. 雙階梯閘門掃描矩陣

```
                     [代碼或規格變更事件]
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
   [階梯 1: Quick Profile]           [階梯 2: Full Profile]
   - 目標: 10 秒內快速反饋           - 目標: 60 秒內全量深度防回歸
   - 包含: TS語法/編碼/ESLint        - 包含: Quick + 單元測試 + UI Spec + 數據驗證
   - 適用: Agent巡檢 / Pre-commit    - 適用: PR合併 / CI發布 / Nightly
```

### 2.1 雙階梯詳細檢測項目表

| 階梯級別 (Tier) | 執行耗時上限 | 涵蓋之計算型感測器 (Sensors) | 阻斷條件 (Failure Action) |
|---|---|---|---|
| **Quick Profile**<br>`--profile quick` | $\le 12\text{ 秒}$ | 1. **TypeScript 語法掃描** (`tsc --noEmit`)。<br>2. **檔案編碼完整性**（禁止 UTF-8 BOM，禁止 U+FFFD 亂碼）。<br>3. **ESLint 關鍵規則**（禁止未宣告全域變數、禁止裸 console.log）。 | 任何一項未通過立即中斷，禁止生成提交。 |
| **Full Profile**<br>`--profile full` | $\le 60\text{ 秒}$ | 1. 包含 Quick 全部三項。<br>2. **全量單元測試**（6500+ 項測試 100% PASS）。<br>3. **UI Spec 靜態驗證** (`validate-ui-specs.js`)。<br>4. **武將數據驗證** (`validate-generals-data.js`)。<br>5. **啟動場景邊界審計** (`lint-start-scene-dependencies.js`)。 | 任何測試失敗立即拒絕 PR 合併，阻斷發布。 |

---

## 3. 資料介面與執行報告契約

```typescript
export interface ComputeGateConfig {
  profile: 'quick' | 'full';
  maxDurationTimeoutMs: number;       // quick 為 15000，full 為 75000
  failFast: boolean;                  // 是否遇錯即停
  autoFixEncoding: boolean;           // 是否自動清除 UTF-8 BOM
}

export interface GateSensorResult {
  sensorName: string;
  durationMs: number;
  passed: boolean;
  errorMessages: string[];
}

export interface GateAuditSummary {
  profile: string;
  totalSensorsCount: number;
  passedCount: number;
  totalDurationMs: number;
  verdict: 'PASS' | 'FAIL';
}
```

---

## 4. 驗收測試案例 (Test Cases)

- **TC-GATE-01【Quick 12 秒極速通過驗證】**：執行 `node tools_node/compute-gate.js --profile quick`，在 10.5 秒內完成 3/3 閘門掃描，回傳 code 0。
- **TC-GATE-02【BOM 檔案即時攔截】**：刻意將一個 `.md` 檔案保存為帶 BOM 的 UTF-8 格式，編碼感測器立即報警並阻斷。
- **TC-GATE-03【Full Profile 整合 CI 阻斷】**：刻意修改戰鬥傷害公式導致單元測試未通過，Full Profile 自動回報失敗並阻斷 GitHub Actions 合併。
