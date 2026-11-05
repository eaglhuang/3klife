<!-- doc_id: doc_spec_0302 -->
# 學府培育總控與防 SL 確定性引擎功能規格書 (Academy Core & Anti-SL Engine)

> **所屬目錄**：[`docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/)  
> **關聯總目錄**：[`doc_index_1053`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/README.md)  
> **關聯母規格**：[`doc_spec_0288`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/C2_R5_遊戲性決策拍板與體驗強化增補規格書.md) §5.5、[`doc_spec_0289`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/C2_R5_待補數據表與Catalog定案總表.md) §5.8  
> **主要職責**：定義 36 回合修業時鐘、三態代管狀態機、防 SL 確定性 PRNG 種子流、操作即原子落盤（WAL）與異常中斷防作弊自愈機制。

---

## 1. 模組架構與時鐘生命週期

學府培育引擎（`AcademyTrainingEngine`）承擔子嗣入學後的 36 回合（3 年，每年 4 季，每季 3 旬）全生命週期運作，架構分為三層：

```
                    ┌────────────────────────────────────────┐
                    │       AcademyScenarioRouter           │
                    │   (分派學府: 潁川/幽州/江東/太學/隆中)    │
                    └──────────────────┬─────────────────────┘
                                       │
                    ┌──────────────────▼─────────────────────┐
                    │       AcademyTrainingEngine            │
                    │  (36 回合時鐘、三態代管、高光打斷點)      │
                    └─────────┬────────────────────┬─────────┘
                              │                    │
          ┌───────────────────▼──┐              ┌──▼───────────────────┐
          │  AcademyAntiSLManager│              │ BaseAcademyGimmick   │
          │ (PRNG 種子鏈、WAL 落盤)│              │ (各學府專屬小遊戲介面) │
          └──────────────────────┘              └──────────────────────┘
```

### 1.1 36 回合時間維度映射
- **總長度**：36 個訓練刻度（Turn $1 \sim 36$）。
- **年齡對齊**：子嗣於 15 歲入學，於 18 歲行弱冠加冠禮並正式結業踏入仕途。
- **時鐘刻度**：
  - Turn $1 \sim 12$：建基期（第 1 年），第 12 回合觸發**【期中考評（Midterm Assessment）】**。
  - Turn $13 \sim 24$：造詣期（第 2 年），第 24 回合觸發**【弱冠加冠禮（Coming-of-Age Rite）】**。
  - Turn $25 \sim 36$：大成期（第 3 年），第 36 回合觸發**【大考結業與一頁式成長集錦（Graduation & Growth Digest）】**。

---

## 2. 確定性防 SL 引擎技術規範（Anti-SL Engine）

為了杜絕玩家透過關閉應用、殺進程（Force-Quit）或存讀檔（SL）重刷訓練數值、彩圈大成功或戰法選項，底層強制採用兩大技術規範：

### 2.1 確定性 PRNG 種子管線（Deterministic Seed Stream）
1. **種子衍生公式**：
   子嗣在踏入學府第 1 回合瞬間，由 `GameSession` 衍生該次入學專屬的 256-bit 根種子：
   $$S_0 = \text{HMAC-SHA256}(\text{WorldSeed}, \text{ClanUUID} + \text{ChildID} + \text{AcademyID} + \text{AdmissionTurn})$$
2. **狀態轉移與消耗協議**：
   - 培育中的所有隨機事件、彩圈出現率、小遊戲抽牌、成功率判定，嚴格依序消耗 PRNG 狀態：
     $$S_{t+1} = \text{SHA256}(S_t \parallel \text{StepSalt})$$
   - 嚴禁呼叫系統原生無確定性的 `Math.random()`。
   - 所有浮點檢定改用**整數權重採樣（Discrete Integer Alias Method）**，杜絕跨平台或瀏覽器浮點運算誤差。
3. **防重刷特性保證**：
   玩家若在第 15 回合殺進程重新載入，系統從存檔讀取當前狀態機與種子 $S_{15}$，重新執行的隨機結果、數值增量與觸發事件**與退出前 100% 完全相同**。

### 2.2 操作即原子落盤協議（Write-Ahead Checkpoint）
1. **存檔提交時序**：
   ```
   [玩家點擊 UI 決策按鈕]
            │
            ▼
   Phase 1: 記憶體計算下一狀態 (NextState) 與消耗種子 (NextSeed)
            │
            ▼
   Phase 2: 執行本地 / 伺服端 SaveState 原子寫入 (Atomic Disk Flush)
            │
            ├─ [失敗] ──> 拋出 StorageError，畫面停留在決策點，禁止推進
            │
            ▼ [成功]
   Phase 3: 向前端發送 ActionCommitted 事件，開始播放結算動畫
   ```
2. **禁止內存延遲存檔**：
   任何數值結算與抽卡一旦決定，必須先落盤才顯示畫面，不存在「看到結果不滿意立刻關掉遊戲」的灰色視窗。

### 2.3 異常中斷自愈與反作弊處罰機制（Anti-Abuse Protocol）
存檔中維護 `sessionCrashCounter: number`：
- **正常關閉／保存**：重置 `sessionCrashCounter = 0`。
- **重啟偵測到未結案動作（Crash Recovery）**：
  - 讀取已落盤的最新快照，直接向玩家呈現上一動作既定之結算結果，跳過隨機動畫，要求玩家點擊確認。
  - 將 `sessionCrashCounter += 1`。
- **惡意重刷判定（CrashCounter $\ge 3$）**：
  - 若在同一決策點連續異常退出達 3 次，系統觸發「學子心浮氣躁」逞罰：
    - 當前回合數值成長鎖定為最低保底值（$+5$ 能力點）。
    - 扣減精力 20 點。
    - 鎖定接下來 2 回合無法觸發任何彩圈或專屬機制連鎖。

---

## 3. 三態代管模式與高光打斷合約

### 3.1 三態模式定義
```typescript
export enum AcademyControlMode {
  MANUAL = 'MANUAL',         // 1.00 效率：每回合手動選擇訓練與專屬機制
  SEMI_AUTO = 'SEMI_AUTO',   // 0.95 效率：設定優先級代管，遇 3 大高光強制打斷
  AUTO = 'AUTO',             // 0.70 效率：旁系一鍵結算，產出基線數值
}
```

### 3.2 半自動 3 大高光打斷點協定（Mandatory Interrupts）
在 `SEMI_AUTO` 模式下，推進過程中遇以下情境**必須暫停代管並彈出互動視窗**：
1. **第 12 回合（期中考評 Midterm Assessment）**：
   - 系統依據當前五維相較目標的差距，生成「三選一方針微調」：
     - 方針 A【揚長避短】：主力屬性獲取效率 $+20\%$，次要屬性 $-10\%$。
     - 方針 B【補齊短板】：最低屬性獲取效率 $+30\%$，消耗精力額外 $+5$。
     - 方針 C【固本培元】：每回合精力回復 $+10$，防禦生病與意外。
2. **第 24 回合（弱冠禮戰法突破 Coming-of-Age Rite）**：
   - 結合學府專屬產出與子嗣遺傳因子，提供 3 項戰術特性／戰法三選一。
3. **重大彩圈共鳴（$u \ge 1.8$）**：
   - 當名師太傅與專屬機制達成極稀有大共鳴時，強制中斷，彈出專屬高光特寫立繪，讓玩家親手按下「見證突破」。

---

## 4. TypeScript 介面定義 (Engine Interfaces)

```typescript
/**
 * 學府代號枚舉
 */
export enum AcademyId {
  YINGCHUAN = 'ACAD_YINGCHUAN', // 潁川書院
  YOUZHOU = 'ACAD_YOUZHOU',     // 幽州突騎演武堂
  JIANGDONG = 'ACAD_JIANGDONG', // 江東橫江督府
  LUOYANG = 'ACAD_LUOYANG',     // 洛陽宮廷太學
  LONGZHONG = 'ACAD_LONGZHONG', // 隆中草廬工造閣
}

/**
 * 學府修業即時狀態機快照（落盤存檔結構）
 */
export interface AcademyStateSnapshot {
  schemaVersion: 1;
  clanUuid: string;
  childId: string;
  academyId: AcademyId;
  currentTurn: number;          // 1 ~ 36
  energy: number;               // 0 ~ 100
  controlMode: AcademyControlMode;
  
  // 確定性隨機狀態
  prngSeedHex: string;          // 當前 64-char hex 種子
  stepIndex: number;            // 已消耗隨機步數
  sessionCrashCounter: number;  // 異常斷線次數計數器
  
  // 五維能力點（Talent 0~100，單項上限 500，總量上限 2000）
  stats: {
    str: number; // 武力
    lea: number; // 統率
    int: number; // 智力
    pol: number; // 政治
    cha: number; // 魅力
  };
  
  // 終生特性槽位（硬上限 3 戰法 + 2 門風特質）
  learnedTactics: string[];     // 最多 3 條
  learnedTraits: string[];      // 最多 2 條
  
  // 學府專屬機制狀態 Payload（多型保存）
  gimmickStatePayload: Record<string, unknown>;
  
  // 成長大事記（用於畢業一頁式集錦）
  chronicles: Array<{
    turn: number;
    title: string;
    description: string;
    highlightScore: number;
  }>;
}

/**
 * 訓練決策輸入動作
 */
export interface AcademyActionPayload {
  actionType: 'TRAIN' | 'REST' | 'GIMMICK_INTERACT' | 'RESOLVE_INTERRUPT';
  targetStat?: 'str' | 'lea' | 'int' | 'pol' | 'cha';
  selectedOptionId?: string;
}

/**
 * 學府專屬機制通用外掛介面
 */
export interface IAcademyGimmickHandler {
  readonly academyId: AcademyId;
  initGimmickState(seedHex: string): Record<string, unknown>;
  onTurnStart(state: AcademyStateSnapshot, rng: IDeterministicRng): void;
  onTrain(state: AcademyStateSnapshot, targetStat: string, rng: IDeterministicRng): {
    statBonusMultiplier: number;
    extraEnergyCost: number;
    gimmickLogs: string[];
  };
  onTurnEnd(state: AcademyStateSnapshot, rng: IDeterministicRng): void;
}
```

---

## 5. 單元測試與驗收標準 (Acceptance Test Suite)

1. **TC-CORE-01：PRNG 確定性回放驗證**：
   - 輸入相同的 `WorldSeed + ClanUUID + ChildID`。
   - 模擬兩次獨立執行相同的 36 回合訓練動作序列。
   - **斷言**：兩次產出的最終五維數值、彩圈觸發回合數、手牌／事件完全一致，Byte-level 雜湊相等。
2. **TC-CORE-02：操作即原子落盤防 SL 驗證**：
   - 在第 12 回合彈出期中考評選項時，強制注入程序中斷信號（`process.exit(1)`）。
   - 重啟系統載入存檔。
   - **斷言**：存檔狀態精確停留在第 12 回合期中選項等待輸入狀態，且 `sessionCrashCounter` 正確自增為 1。
3. **TC-CORE-03：五維總量硬天花板約束驗證**：
   - 注入作弊級別的超高彩圈加成（例如每回合 $+100$）。
   - **斷言**：在任意回合與結業時，單項五維始終被 `Math.min(500, val)` 限制，五維總和始終被 `Math.min(2000, total)` 限制。
