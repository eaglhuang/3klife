<!-- doc_id: doc_spec_0384 -->
# 委任AI四級智力部署策略與保留模型規格書

## 1. 核心定位與委任決策契約

本規格書為自動戰鬥與出兵委任 AI 決策邏輯（Delegate AI Deployment Policy，代號 `DEP-11`）的單一真相來源（Single Source of Truth）。委任 AI 依據主將智力（INT）劃分四個決策品質等級（`DelegateQuality`），各品質嚴格遵守軍糧保留底線、精銳器械保留槽與主將戰王牌保留模型。

```typescript
export type DelegateQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPERT';

export interface DelegateReservePolicy {
  keepFoodFloorRate: number;      // 糧草保留底線比例
  reserveSpecialForBoss: boolean; // 特殊兵是否僅留待主將戰
  reserveSiegeSlots: number;      // 保留的精銳/器械名額數
}
```

---

## 2. 智力階梯映射與四級保留政策矩陣

### 2.1 智力品質分級（`delegateQualityOf`）

$$\text{Quality} = \begin{cases}
\text{EXPERT}, & \text{若 } \text{INT} \ge 90 \\
\text{HIGH}, & \text{若 } 70 \le \text{INT} < 90 \\
\text{MEDIUM}, & \text{若 } 50 \le \text{INT} < 70 \\
\text{LOW}, & \text{若 } \text{INT} < 50
\end{cases}$$

### 2.2 四級戰略資源保留政策矩陣（`DELEGATE_RESERVE_POLICY`）

| 決策等級 | 智力區間 | 糧草安全保留底線 (`keepFoodFloorRate`) | 特殊兵保留主將戰 (`reserveSpecialForBoss`) | 保留精銳名額 (`reserveSiegeSlots`) | 決策風格特徵 |
|:---:|:---:|:---:|:---:|:---:|---|
| **LOW** | $<50$ | **0%**（傾巢而出） | `false`（有兵即派） | **0** | 莽撞狂攻，不留後手，糧草耗盡方休。 |
| **MEDIUM** | $50 \sim 69$ | **10%** 糧草底線 | `false`（不保留特殊兵） | **0** | 中庸之策，保留 10% 應急糧草。 |
| **HIGH** | $70 \sim 89$ | **18%** 糧草底線 | `true`（王牌留待主將戰） | **1** | 老練持重，保留 18% 糧草與 1 槽精銳。 |
| **EXPERT** | $\ge 90$ | **25%** 糧草底線 | `true`（王牌留待主將戰） | **1** | 神機妙算，嚴守 25% 糧草與精銳，決戰方出王牌。 |

---

## 3. 部署決策流水線與理由裁定（`delegateDecideDeploy`）

AI 評估單支部隊是否派遣時，依序套用四道檢核閘門：

1. **基本合法性閘門**：
   - 執行 `checkDeploy`，若因軍勢、糧草或名額不足未通過，回傳 `{ deploy: false, reason: 'deploy-check-failed' }`。
2. **糧草安全線閘門**：
   - 若部署該部隊後之剩餘糧草 $\text{Food}_{\text{after}} < \text{maxFood} \times \text{keepFoodFloorRate}$：
   - 裁定為違反安全底線，回傳 `{ deploy: false, reason: 'food-floor' }`。
3. **精銳保留槽閘門**：
   - 若該部隊為精銳，且場上尚未出現主將戰目標（`bossTargetVisible == false`）：
     $$\text{eliteActive} + 1 > \text{state.eliteCap} - \text{policy.reserveSiegeSlots}$$
   - 若觸犯保留槽，回傳 `{ deploy: false, reason: 'hold-reserved-elite' }`。
4. **王牌決戰保留閘門**：
   - 若 `policy.reserveSpecialForBoss == true` 且該部隊為虎符特殊兵，若當前未發現敵將或大營，回傳 `{ deploy: false, reason: 'hold-for-boss' }`。
5. **核准放行**：通過全數閘門，回傳 `{ deploy: true, reason: 'ok' }`。

---

## 4. 自動化測試與驗收標準

1. **單元測試對齊**：
   - 對齊 `tests/DelegateAi.test.ts` 與 `tests/DelegateWiring.test.ts`。
   - 驗收條件 1：驗證智力 95 映射為 `EXPERT`，智力 45 映射為 `LOW`。
   - 驗收條件 2：驗證在非 Boss 目標下，HIGH/EXPERT AI 派遣精銳部隊時嚴格保留 1 個槽位。
   - 驗收條件 3：驗證當部署後糧草將低於 25% 時，EXPERT AI 拒絕部署並回報 `food-floor`。
