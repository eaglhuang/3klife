<!-- doc_id: doc_spec_0595 -->
# AI家族奧義釋放決策與血脈五階傳承覺醒進度規格書

> 標記：Single Source of Truth（單一真相來源）  
> 涵蓋工作包：`ULT-13`、`ULT-14`  
> 狀態：正式發布 / 核心邏輯規格

---

## 1. 系統定位與架構

本模組規範戰鬥戰術層面「委任自動戰鬥與敵方 AI（Combat AI）」對名將奧義的智慧釋放決策，以及武將血脈命盤中「五階家傳奧義（Bloodline Ultimate）」的階梯覺醒進度模型：
1. **AI 家族奧義決策樹（ULT-13）**：依據奧義的功能家族分類（斬殺爆發、全體治療、群體增益、範圍控場），在符合戰術情勢時果斷釋放，杜絕 AI 盲目亂放或終生不放。
2. **血脈五階傳承覺醒（ULT-14）**：以武將當前「星階階位（Star Tier）」與歷練「名聲事蹟進度（Awakening Progress）」為雙軸，驅動命槽五階終極奧義之逐步破鎖覺醒。

```mermaid
flowchart TD
    subgraph ULT-13 AI 奧義決策
        TurnStart[AI 行動回合] --> CheckSP{SP 滿且未施放?}
        CheckSP -- 是 --> EvaluateFamily{奧義家族分類}
        EvaluateFamily -- UBURST 爆發 --> TargetLowHp{目標 HP <= 40%?}
        EvaluateFamily -- UTEAMHEAL 治療 --> TeamLowHp{我軍平均 HP <= 50%?}
        EvaluateFamily -- UTEAMBUFF 增益 --> AllyCluster{周圍友軍 >= 3 人?}
        EvaluateFamily -- UAREA 範圍AOE --> EnemyCluster{命中敵軍 >= 3 人?}
        TargetLowHp & TeamLowHp & AllyCluster & EnemyCluster -- 達標 --> Cast[判定釋放奧義]
    end

    subgraph ULT-14 血脈五階覺醒
        GeneralBorn[武將血脈命槽] --> CheckStar{星階門檻 (1~5★)}
        CheckStar --> AccumulateFame[累積生涯事蹟與戰場名聲]
        AccumulateFame --> UnlockStage[解鎖對應血脈傳承奧義 1~5 階]
    end
```

---

## 2. AI 家族奧義施放決策演算法（ULT-13）

AI 在自身行動回合且 SP 滿 100 點時，依所裝備奧義之 `family` 評估戰場態勢：

| 奧義家族代碼 | 家族定位 | 觸發釋放前置戰術條件 | 優先目標選取權重 |
|:---:|:---|:---|:---|
| **UBURST** | 單體絕殺爆發 | 射程內存在目標武將當前血量 $\le 40\%$（斬殺線） | 當前血量最低之敵將 |
| **UTEAMHEAL** | 全體團隊續航 | 我軍存活單位平均血量 $\le 50\%$，或主力瀕死（$< 25\%$） | 受創最深之核心主力 |
| **UTEAMBUFF** | 軍團士氣增益 | 技能作用範圍內包含自身在內之友軍數量 $\ge 3$ 人 | 友軍最密集核心格 |
| **UAREA** | 群體毀滅 AOE | 技能攻擊範圍覆蓋之敵軍單位總數 $\ge 3$ 人 | 敵軍聚集中心點 |
| **UCONTROL** | 戰術強控打斷 | 敵方具備即將施放高危戰法之目標單位 | 敵方高危技能詠唱者 |

```typescript
export type UltimateFamilyType = 'UBURST' | 'UTEAMHEAL' | 'UTEAMBUFF' | 'UAREA' | 'UCONTROL';

export function shouldAiCastUltimate(
  family: UltimateFamilyType,
  context: {
    targetHpPct: number;
    teamAvgHpPct: number;
    allyCountInRange: number;
    enemyCountInRange: number;
    hasThreateningEnemy: boolean;
  }
): boolean {
  switch (family) {
    case 'UBURST':
      return context.targetHpPct <= 0.40;
    case 'UTEAMHEAL':
      return context.teamAvgHpPct <= 0.50;
    case 'UTEAMBUFF':
      return context.allyCountInRange >= 3;
    case 'UAREA':
      return context.enemyCountInRange >= 3;
    case 'UCONTROL':
      return context.hasThreateningEnemy;
    default:
      return false;
  }
}
```

---

## 3. 血脈傳承奧義五階覺醒模型（ULT-14）

血脈奧義共分 5 個階梯，受「星階門檻」與「覺醒進度值（Awakening Progress）」雙重約束：

$$\text{Awakening\_Gain} = \lfloor \text{BattleFame} \times 1.2 + \text{GeneralsKilled} \times 50 \rfloor$$

### 3.1 五階覺醒門檻對照表
| 覺醒階梯 | 必備星階（`StarTier`） | 必備累積覺醒點數 | 命紋靈獸共鳴增幅 | 解鎖效果範例 |
|:---:|:---:|:---:|:---:|:---|
| **第一階** | 1 星 | 100 點 | 青龍印記（傷 $+5\%$） | 祖傳初窺：解鎖初階被動 |
| **第二階** | 2 星 | 300 點 | 白虎印記（暴 $+8\%$） | 氣血如虹：奧義範圍擴展 |
| **第三階** | 3 星 | 600 點 | 朱雀印記（怒 $+10\%$） | 先祖顯聖：追加 DOT 傷害 |
| **第四階** | 4 星 | 1,000 點 | 玄武印記（抗 $+15\%$） | 萬象森羅：施放返還 20 SP |
| **第五階** | 5 星（滿星） | 1,500 點 | 麒麟神祇（全能 $+20\%$） | 終極血脈奧義真名覺醒 |

---

## 4. 驗收與測試標準

1. **AI 斬殺決策驗證（TC-ULT-13-01）**：
   - 模擬敵將當前血量 41%，AI 評估回傳 `false`（保留奧義）；血量降至 39% 時即刻觸發施放。
2. **AI 群療決策驗證（TC-ULT-13-02）**：
   - 友軍均血 55% 時不盲目過度治療；均血跌破 50% 時瞬間釋放 `UTEAMHEAL`。
3. **血脈雙軸門檻破鎖（TC-ULT-14-01）**：
   - 驗證覺醒點數達 1,000 但星階僅 3 星時，第四階奧義維持鎖定；星階升至 4 星瞬間破鎖。
