<!-- doc_id: doc_spec_0396 -->
# 戰鬥分段控制器破釜沉舟殘局模式切換與STR軟上限規格書

## 1. 核心定位與設計理念
本規格書定義《三國人生》戰鬥大回合推進中的分段控制器（Segmented Battle Controller）、破釜沉舟殘局模式切換（Last Spurt Mode）與武力值（STR）平方根軟上限爆發公式（WBS `FORM-10` 與 `FORM-06`，代碼落位於 `LastSpurtJudge.ts` 與 `LastSpurt.ts`）。
戰鬥在進入中後期或全軍傷亡慘重時，切換至決戰節奏，大幅拔高傷害爆發力與武將個人英雄主義表現。

```
              ┌──────────────────────────────────────────────┐
              │          LastSpurt 分段戰鬥控制器            │
              └──────────────────────┬───────────────────────┘
                                     │
          ┌──────────────────────────┴──────────────────────────┐
          ▼                                                     ▼
   【殘局切換雙條件 (Gate)】                             【殘局爆發傷害 (Damage)】
   • 回合條件: turn ≥ 5                                  • BaseDamage * STRFactor * TroopFactor
   • 減員條件: livingTroops / peakTroops < 50%           • STR ≤ 1200: sqrt(STR / 500)
   • 單向鎖定 (Sticky): 一旦切入不逆轉                   • STR > 1200: 溢出增量折半 (0.5)
```

---

## 2. 破釜沉舟殘局切換雙條件判定（`LastSpurtJudge`）

### 2.1 觸發條件與判定式
戰鬥在大回合開始前檢核是否切換至破釜沉舟模式（`lastSpurtReasonOf`）：
1. **回合條件優先（`turn`）**：
   $$\text{turn} \ge \mathbf{5} \quad (\text{LAST\_SPURT\_TURN})$$
   當戰鬥推進至第 5 回合起，無論在場兵力多寡，強制進入殘局決戰。
2. **減員嚴重條件（`attrition`）**：
   $$\frac{\text{livingTroops}}{\text{peakTroops}} < \mathbf{0.50} \quad (\text{LAST\_SPURT\_SURVIVOR\_RATIO})$$
   雙方現存總兵力低於戰場曾出現過的最高兵力總和之 50% 時，觸發背水一戰。

### 2.2 單向粘滯特性（Sticky State）
殘局模式為**單向不可逆狀態**：一旦標記為進入殘局，戰鬥控制器恆久保留 `isLastSpurt = true`，即便後續透過召喚、援軍或治療使兵力回升至 50% 以上，亦絕不退回常規模式。

---

## 3. 殘局爆發傷害與武力平方根軟上限模型（`LastSpurt`）

進入殘局後，部隊普通攻擊與戰法傷害全面接入破釜沉舟加成公式：
$$\text{FinalDamage} = \text{baseDamage} \times \text{lastSpurtStrFactor}(\text{STR}) \times \text{troopFinaleFactor}$$

### 3.1 武力平方根增益公式（`lastSpurtStrFactor`）
基準武力錨定點為 500 點（`LAST_SPURT_STR_BASE = 500`），並於 1200 點設置防數值崩潰軟上限（`LAST_SPURT_STR_SOFT_CAP = 1200`）：
$$\text{raw} = \sqrt{\frac{\max(0, \text{STR})}{500}}$$
$$\text{capped} = \sqrt{\frac{1200}{500}} \approx 1.549$$
$$\text{STRFactor} = \begin{cases} \text{raw}, & \text{STR} \le 1200 \\ \text{capped} + (\text{raw} - \text{capped}) \times \mathbf{0.5}, & \text{STR} > 1200 \end{cases}$$

- **軟上限溢出折半**：$\text{LAST\_OVERFLOW\_FACTOR} = \mathbf{0.5}$，當超稀有名將或轉生大成武將武力破千（$>1200$）時，溢出部分的平方根增量以 50% 斜率放緩，保障戰術克制依舊有效。
- **兵種終盤係數**：`troopFinaleFactor` 由兵種特質傳入（常規兵種為 1.0，特殊決戰兵種如陷陣營可配置為 1.25）。
