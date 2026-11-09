<!-- doc_id: doc_spec_0558 -->
# 戰法學習TP門檻智力槽位與世家血脈金戰法保底規格書

## 1. 模組職責與架構定位
本規格書規範學府培育體系中武將的「戰法槽位解鎖動態計算」、「戰法學習 TP 點數門檻與扣除」，以及「世家名門血脈姓氏匹配三段事件保底」與「金色戰法學習折扣」演算法。此邏輯由 `TacticLoadout` 與 `BloodlineGuarantee` 模組共同承載，提供純函式資料運算與防呆保護。

## 2. 戰法槽位與 TP 門檻精算

### 2.1 智力槽位階梯公式
武將可攜帶之戰法槽位上限依據當前實力層之「智力（`INT`）」數值動態推導，單項下限為 2 槽，全域上限封頂 6 槽：
$$\text{TacticSlots} = \max\left(2, \min\left(6, \left\lfloor \frac{\text{INT}}{30} \right\rfloor\right)\right)$$

| 智力區間 | 戰法槽位數 | 說明 |
| :---: | :---: | :--- |
| $\text{INT} < 60$ | 2 槽 | 基礎槽位（保底） |
| $60 \le \text{INT} < 90$ | 2 槽 | 啟蒙水準 |
| $90 \le \text{INT} < 120$ | 3 槽 | 儒將入門 |
| $120 \le \text{INT} < 150$ | 4 槽 | 謀士良才 |
| $150 \le \text{INT} < 180$ | 5 槽 | 王佐之資 |
| $\text{INT} \ge 180$ | 6 槽 | 天下奇策（滿額） |

### 2.2 戰法學習 TP 門檻精算
學員於培育期間研習新戰法時，必須持有充足的修煉點數（`TP`）。學習門檻為該戰法基礎點數消耗的 2 倍，學習成功後扣除基礎點數：
$$\text{ThresholdTP} = \text{BaseTacticCost} \times 2$$
$$\text{RemainingTP} = \text{CurrentTP} - \text{BaseTacticCost}$$

```typescript
export interface TacticStudyCheck {
  canLearn: boolean;
  requiredThresholdTP: number;
  actualCostTP: number;
  reason?: 'INSUFFICIENT_TP' | 'SLOTS_FULL' | 'ALREADY_KNOWN';
}

export function evaluateTacticStudy(
  currentTP: number,
  baseCost: number,
  knownTacticsCount: number,
  maxSlots: number
): TacticStudyCheck {
  if (knownTacticsCount >= maxSlots) {
    return { canLearn: false, requiredThresholdTP: 0, actualCostTP: 0, reason: 'SLOTS_FULL' };
  }
  const threshold = baseCost * 2;
  if (currentTP < threshold) {
    return { canLearn: false, requiredThresholdTP: threshold, actualCostTP: baseCost, reason: 'INSUFFICIENT_TP' };
  }
  return { canLearn: true, requiredThresholdTP: threshold, actualCostTP: baseCost };
}
```

## 3. 世家血脈保底與金戰法特權

### 3.1 姓氏匹配與三段強制歷練事件
當學員姓氏與預載之名門世家字典（如「諸葛」、「司馬」、「夏侯」、「周」、「陸」、「關」）相符時，系統啟動世家保底狀態機：
- **第 12 回合（啟蒙終考）**：強制觸發「祖德垂訓」，保底習得藍色家傳戰法且 TP 消耗全免。
- **第 24 回合（發奮終考）**：強制觸發「門閥重光」，保底獲得全五維 $+15$ 祖產加護。
- **第 36 回合（結業前夕）**：強制觸發「衣缽真傳」，保底洗練並解鎖金色核心戰法候選。

### 3.2 金色戰法學習 TP 折扣
世家血脈匹配之學員，研習金色品質（`TIER_GOLD`）戰法享有 $20\%$ 點數減免：
$$\text{DiscountedCost} = \left\lceil \text{BaseCost} \times 0.8 \right\rceil$$
同時，金色戰法研習失敗率完全歸零（豁免任何走火入魔或學習失敗檢定）。

## 4. 單元測試驗證規範
1. **TC-TAC-01（智力槽位邊界檢驗）**：智力 59 為 2 槽；智力 90 為 3 槽；智力 180 為 6 槽；智力 300 仍為 6 槽。
2. **TC-TAC-02（TP 門檻與扣除雙倍隔離）**：基礎消耗 40 點戰法，當 TP 為 75 時無法學習（需 80）；當 TP 為 80 時可研習，結算扣除 40 點。
3. **TC-TAC-03（世家金戰法折扣計算）**：基礎消耗 100 點金色戰法，世家學員享有 $20\%$ 折扣，門檻為 $80 \times 2 = 160$ 點，實扣 80 點。
