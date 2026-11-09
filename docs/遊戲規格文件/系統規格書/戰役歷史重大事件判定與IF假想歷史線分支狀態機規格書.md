<!-- doc_id: doc_spec_0718 -->
# 3KLife 戰役歷史重大事件判定與IF假想歷史線分支狀態機規格書

> **規格代碼**：SPEC-CAMP-IF01  
> **關聯 WBS**：CAMPAIGN-IF-BRANCH01（戰役歷史關鍵事件觸發檢定、IF 假想歷史分支狀態機與地緣版圖重構）  
> **系統分類**：劇本系統 / 戰役沙盤與假想歷史引擎  
> **狀態**：正式生效（單一真相來源，嚴禁尾端追加補丁）

---

## 1. 系統架構定位與宿命逆轉哲學

滾滾長江東逝水，浪花淘盡英雄。三國最令人扼腕長嘆者，莫過於天不假年與一招走錯。《三國人生》（3KLife）戰役模式內建**IF 假想歷史分支引擎（Alternate Timeline Engine）**。玩家透過微觀戰鬥的逆天改命，撥動宏觀歷史車輪。

本系統核心價值：
1. **關鍵蝴蝶效應錨點（Butterfly Anchor Nodes）**：歷史重大節點（華容道、街亭、赤壁）內嵌檢定條件。
2. **條件嚴苛性與代價性**：IF 路線非輕易觸發，需滿足特定名將存活、關鍵戰術擊破與計策識破。
3. **地緣政治全盤重塑**：分支一旦敲定，沙盤陣營勢力、同盟關係與武將仕途全面動態重算。

---

## 2. IF 假想節點資料結構（ICampaignIfNode）

```typescript
export interface ICampaignIfNode {
  readonly nodeId: string;                 // 節點識別碼 (如: IF_HUA_RONG_DAO)
  readonly historicalBattleId: string;    // 對應戰役 (如: BTL_CHIBI_AFTERMATH)
  readonly prerequisiteGeneralsAlive: string[]; // 必要存活名將 (如: 關羽、曹操)
  readonly triggerCondition: {
    readonly requiredTacticalAchievement: string; // 戰術成就 (如: 於華容道擊潰曹操親衛隊)
    readonly playerChoiceKey: string;             // 抉擇分支點 ('EXECUTE' | 'RELEASE')
    readonly minPlayerPrestige: number;           // 所需威望門檻
  };
  readonly historicalOutcome: string;     // 史實線走向摘要
  readonly alternateOutcome: string;      // IF 假想線走向摘要
}
```

---

## 3. 三大經典戰役 IF 假想分支矩陣

```
                     ┌──────────────── 赤壁之戰 (CHIBI) ────────────────┐
                     │                                                  │
             史實線: 曹操赤壁大潰敗                           IF 線: 郭嘉存活識破苦肉計
                     │                                                  │
                     ▼                                                  ▼
           華容道抉擇 (HUARONG)                               【天下歸魏 / 提早統一】
          ┌──────────┴──────────┐
          ▼                     ▼
  史實: 關羽義釋曹操     IF: 關羽陣斬曹操！
  【三國鼎立正軌】       【曹魏諸子內訌，司馬提前掌權】
```

1. **赤壁之戰・郭嘉未死線（IF_GUOJIA_CHIBI）**：
   - 觸發條件：玩家前期救治郭嘉成功，官渡後郭嘉健康度 $\ge 80$ 並隨軍南征。
   - 效果：赤壁之戰第 2 回合自動發動【算無遺策】，強制識破周瑜「黃蓋詐降苦肉計」；東吳火攻失效，戰局逆轉為曹操水軍強渡長江！
2. **華容道・關羽斬曹線（IF_EXECUTE_CAOCAO）**：
   - 觸發條件：華容道伏擊戰中將曹操部隊逼至絕境（HP $< 15\%$），玩家手動選擇「刀斬奸雄」。
   - 效果：曹操陣亡，曹丕、曹植、曹彰爆發奪嫡內戰；劉備順勢全據荊襄九郡，北方陷入混亂。
3. **街亭之戰・馬謖紮營線（IF_JIETING_HOLD）**：
   - 觸發條件：戰前力排眾議指派魏延為副將，戰鬥中嚴守當道隘口地格滿 6 回合擊退張郃。
   - 效果：街亭穩如泰山，諸葛亮第一次北伐大獲全勝，直逼長安，解鎖「克復中原」專屬成就。

---

## 4. 假想時間線狀態機與世界線保存

```typescript
export enum TimelineBranchState {
  CANONICAL = 'CANONICAL',     // 史實時間線 (依三國正史演進)
  DIVERGING = 'DIVERGING',     // 分歧臨界點 (戰鬥正在進行，等待結算)
  BRANCHED_IF = 'BRANCHED_IF'  // 已切入 IF 假想世界線
}
```

1. **存檔獨立標記**：一旦戰役結算判定進入 `BRANCHED_IF`，存檔 Metadata 寫入 `alternateTimelineId`，後續所有隨機劇本事件自動切換為 IF 專屬事件池（如曹操死後觸發「魏武大喪」與「河北叛亂」）。
2. **歷史編年史圖譜**：在大廳檔案館中，解鎖「時空樹（Timeline Tree）」視覺分支節點，供玩家重溫與對比不同命運走向。
