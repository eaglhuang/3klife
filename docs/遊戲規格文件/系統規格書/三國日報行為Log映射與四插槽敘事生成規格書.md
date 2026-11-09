<!-- doc_id: doc_spec_0480 -->
<!-- spec_id: RET-04 -->
# 三國日報行為Log映射與四插槽敘事生成規格書

## 1. 核心定位與設計理念
本規格書定義三國生活（3KLife）留存系統之「三國日報（Daily News）事件引擎、24小時行為Log採樣映射與四插槽式敘事拼裝」規範（對應 WBS `RET-04` 與 `PROG-2-1169`）。
三國日報作為玩家每日登入時最生動的個人化敘事報紙，堅持**行為回扣、插槽拼裝、情緒生動、無Log保底**原則：
1. **24小時真實行為映射**：精確採樣玩家前 24 小時內之核心行為 Log（戰敗、抽卡失利、資源短缺、晉升等），依觸發表動態派生新聞主題。
2. **四插槽結構化敘事（4-Slot Narrative）**：統一採 `[角色] + [情緒] + [行為] + [結果]` 語法結構，保證文法通順且支援多語參數化。
3. **無行為保底機制（Idle Fallback）**：若玩家 24 小時內未產生任何行為 Log，自動觸發 `IDLE_LONG` 主題，指派家臣代勞或團購。

---

## 2. 24小時行為Log觸發映射表 (`NEWS_TRIGGER_TABLE`)
系統依據過去 24 小時（`DAILY_NEWS_LOG_WINDOW_MS = 86,400,000 ms`）之行為 Log 進行映射：

| 玩家前 24h 行為類型 (`PlayerLogType`) | 代表情境 | 派生之日報主題候選 (`DailyNewsType`) |
| :--- | :--- | :--- |
| **BATTLE_LOSE** | 戰場遭遇敗績、陣亡折兵 | `COMFORT` (家臣慰勉)、`REVENGE` (連夜復仇反搶) |
| **RESOURCE_LOW** | 糧草或銅錢告急、國庫空虛 | `REVENGE` (反搶補糧)、`SHOPPING` (特價團購採購) |
| **GACHA_FAIL** | 轉蛋多抽未出金、抽卡不順 | `COMFORT` (溫言開導)、`GOSSIP` (軍中趣聞解悶) |
| **GACHA_SUCCESS** | 歐氣爆發抽中焦點名將 | `GOSSIP` (名震三軍奇聞) |
| **BATTLE_WIN** | 破敵大捷、斬將奪旗 | `TRAINING` (士氣大振自主練功)、`OFFLINE_SOCIAL` (武將切磋) |
| **GENERAL_RETIRE** | 宿將年邁榮退致仕 | `COMFORT` (感懷送別功臣) |
| **GENERAL_BORN** | 世家子嗣呱呱墜地 | `GOSSIP` (天降麟兒吉兆) |
| **TALLY_UPGRADE** | 虎符精煉升星 | `TRAINING` (全軍加緊研習陣法) |
| **IDLE_LONG** | 超過 24 小時未登入營帳 | `AUTO_TASK` (家臣自動代勞內政)、`SHOPPING` (商隊採辦) |

---

## 3. 四插槽式敘事結構與文字模板 (`NarrativeSlot`)
日報條目採用四段插槽拼裝：
```typescript
export interface NarrativeSlot {
    character: string;   // 角色名（如「張飛」、「趙雲」）
    emotion: string;     // 情緒反應（如「憤怒地」、「得意地」）
    action: string;      // 具體行為敘述
    result: string;      // 最終產生成果
    actionKey?: string;  // 多語 i18n key
    actionArgs?: string[];
    resultKey?: string;
    resultArgs?: string[];
}
```

### 3.1 標準語法模板定義 (`DAILY_NEWS_TEMPLATE`)
- **REVENGE (復仇)**：`[角色]` + `[憤怒地]` + `帶隊反搶昨日失去的{0}` + `取回了 {0}% 的{1}！`
- **AUTO_TASK (代勞)**：`[角色]` + `[得意地]` + `自動幫你完成了「{0}」` + `主公日理萬機，小事就交給我吧。`
- **TRAINING (特訓)**：`[角色]` + `[專注地]` + `離線期間自行練功` + `{0} +{1}！`
- **OFFLINE_SOCIAL (切磋)**：`[角色]` + `[欣然]` + `在路邊遇到了{0}的 {1}` + `切磋後獲得經驗！`
- **GOSSIP (趣聞)**：`[角色]` + `[神秘地]` + `和{0}在營中閒聊` + `傳出了一則趣聞。`

---

## 4. 日報生成條數與同類去重原則
- **生成條數區間 (`DAILY_NEWS_COUNT`)**：
  每次登入生成 **1 至 3 則** 日報（$\min = 1, \max = 3$）。
- **同次登入同類去重**：
  在同一次日報結算中，每種 `DailyNewsType` 僅允許產出 1 則條目（例如不會同時出現兩則 `REVENGE`），確保版面內容多元豐富。

---

## 5. Unity 與 Cocos Creator 概念對照
| 概念維度 | Cocos Creator 實作架構 | Unity 引擎對照架構 |
| :--- | :--- | :--- |
| **日報事件引擎** | `DailyNewsEngine.ts` 純邏輯生成器，依賴注入 Log | C# `DailyNewsEngine` 靜態生成器 |
| **插槽敘事拼裝** | 模板字串搭配正則取代 `{0}` 佔位符 | `string.Format()` 或 SmartLocalization 模組 |
| **日報 UI 渲染** | `DailyReportController` 動態填充新聞卡片 Prefab | UI Canvas 搭配 Newspaper Layout 組件渲染 |

---

## 6. 驗證條件與測試矩陣 (Acceptance Gate)
1. **TC-RET04-01 24小時無日誌保底**：傳入空 Log 陣列，驗證觸發 `IDLE_LONG` 並產出 `AUTO_TASK` 或 `SHOPPING`。
2. **TC-RET04-02 條數嚴格介於1至3**：傳入大量各類 Log，驗證最終產生日報條數必然在 $[1, 3]$ 範圍內。
3. **TC-RET04-03 同類主題不重複出現**：驗證產出的 1~3 則日報中，`type` 互不相同，無同類重複。
4. **TC-RET04-04 四插槽欄位完整齊全**：驗證產出的每一則日報 `character`、`emotion`、`action`、`result` 均為非空字串。
