<!-- doc_id: doc_spec_0684 -->
# 3KLife NPC敘事中台Healthz探針健康度監測與降級靜態模板狀態機規格書

> **規格代碼**：SPEC-NET-BRAIN01  
> **關聯 WBS**：BRAIN-01（M11 NPC Brain 服務骨架與 /healthz）、BRAIN-10（M11 對話/情境/關鍵字 API 與 Prompt 組裝）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：數值、架構與底層支援（Formula, Architecture & Backend）

---

## 1. 核心宗旨與設計哲學

NPC 敘事大腦中台（`3klife-npc-brain`）負責提供高擬真之歷史人物動態對話與證據檢索。考慮到手機網路環境動態多變，若客戶端強依賴中台連線，當伺服器維護或網路中斷時將造成對話卡頓或黑屏崩潰。本規格書制定客戶端 `NpcDialogueService` 之**Healthz 探活監測契約**與**熔斷降級狀態機（Circuit Breaker FSM）**，確保在任何弱網與中台宕機情境下，客戶端均能在 2.5 秒內零感知降級至本地靜態模板。

---

## 2. /healthz 探活 API 契約規格

客戶端與監控管線定期或於啟動時向中台發起探針檢查：

### 2.1 請求與回應結構

```typescript
export interface NpcBrainHealthResponse {
  status: 'ok' | 'degraded' | 'maintenance' | 'down';
  service: '3klife-npc-brain';
  version: string;                    // 如 1.4.0
  activeLlmProvider: string;          // 如 'gemini-2.5-flash' | 'local_llama'
  vectorDbStatus: 'connected' | 'disconnected';
  averageLatencyMs: number;
  serverTimestamp: number;
}
```

- **狀態判定**：
  - `status === 'ok'`：全功能正常運作。
  - `status === 'degraded'`：向量檢索不可用，改走無 RAG 之純 LLM 模式。
  - `status === 'maintenance' || 'down'`：中台不可用，觸發客戶端全面離線降級。

---

## 3. 客戶端熔斷降級狀態機 (Circuit Breaker FSM)

客戶端 `NpcDialogueService` 內建三態熔斷器，主動隔離故障傳播：

```
      [連續 3 次失敗或超時 >2.5s]
  +----------------------------------> OPEN (完全降級)
  |                                        |
  |                                        | 靜止 60 秒後
  |                                        v
CLOSED (正常連網) <------------------ HALF_OPEN (單次探針)
               [探針成功 200 OK]
```

### 3.1 狀態機轉換規則表

| 狀態名稱 | 行為模式 (Behavior) | 轉移條件 (Transition Trigger) | 對話輸出管道 (Output Channel) |
|---|---|---|---|
| **CLOSED** | 優先發送 HTTP POST `/v1/npc/dialogue`，超時門檻設定為 $2500\text{ms}$。 | 單次超時或 5xx 累計達 3 次 $\rightarrow$ 轉移至 `OPEN`。 | 遠端 LLM 生成之動態對話。 |
| **OPEN** | 立即遮斷所有對外網路請求，不再嘗試連線。 | 進入此狀態維持滿 60 秒 $\rightarrow$ 轉移至 `HALF_OPEN`。 | 100% 本地 `OfflineTemplateEngine`（$<16\text{ms}$）。 |
| **HALF_OPEN** | 允許下一筆玩家對話嘗試發送至中台作為探針測試。 | 請求成功回傳 200 $\rightarrow$ `CLOSED`；若再次失敗 $\rightarrow$ `OPEN`。 | 探針成功則採中台文本；失敗即刻降級。 |

### 3.2 降級資料一致性約制

當進入降級路徑時，`NpcDialogueService` 調用本地 `OfflineTemplateEngine`，依據武將性格（義/豪/睿/貪）與好感度階梯進行靜態插槽替換，回傳 20~60 字典雅漢風台詞，並在回應結構中標註 `fallbackUsed = true` 與 `offlineTemplateId`，確保遊戲體驗零中斷。

---

## 4. 驗收測試案例 (Test Cases)

- **TC-BRAIN-01-01【中台斷網 2.5 秒超時降級】**：模擬中台服務無響應，客戶端發起對話後在精確第 2.5 秒觸發超時中斷，無縫顯示本地趙雲台詞，UI 點擊無卡頓。
- **TC-BRAIN-01-02【連續 3 次失敗觸發 OPEN 熔斷】**：連續發起 3 次失敗請求，狀態機進入 `OPEN`；後續 10 次對話點擊不再發出任何 HTTP 封包，全部由本地模板直出。
- **TC-BRAIN-01-03【HALF_OPEN 探測自動復原】**：在熔斷 60 秒後，後台服務恢復正常，客戶端發出探針請求成功，狀態機平滑恢復為 `CLOSED`。
