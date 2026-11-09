<!-- doc_id: doc_spec_0367 -->
# 戰法AI選技決策打分與七步驗收矩陣規格書

## 1. 核心定位與效用評分架構

本規格書為敵方武將與自動戰鬥 AI 戰法決策層（Tactic AI Decision Rules，代號 `TAC-15`）的單一真相來源（Single Source of Truth）。AI 採用效用評分器架構（Utility Scorer），在每回合行動時評估可用戰法候選（`TacticAiCandidate`）與戰場當前態勢（`TacticAiSituation`），計算效用分數並選取最高分執行。

```typescript
export interface TacticAiRuleContract {
  category: 'TACTIC_AI_DECISION';
  scoreFunction: 'scoreTacticCandidate';
  decisionFunction: 'pickTacticByAiRule';
  dangerHpThreshold: 0.35;        // 我方危險線 35%
  killBonus: 1000;               // 斬殺加權 1000 分
  dangerBonus: 1000;             // 急救加權 1000 分
}
```

---

## 2. 三大類戰法效用評分公式（Utility Scoring）

戰法依據戰術目標分為三大類別，各自套用專屬打分模型：

### 2.1 單體傷害類（`single-damage`）

優先追求戰場減員，具備斬殺可能時權重最大化：

$$S_{\text{damage}} = \begin{cases} 
0, & \text{若 } D_{\text{est}} \le 0 \\
D_{\text{est}} + 1000, & \text{若 } \exists u \in \text{Enemies}, 0 < \text{HP}_u \le D_{\text{est}} \text{ (可斬殺)} \\
D_{\text{est}}, & \text{其他常規狀態}
\end{cases}$$

### 2.2 增益治療類（`buff-heal`）

以維持我方生存為最高原則，血線危急時優先急救：

$$S_{\text{heal}} = \begin{cases} 
0, & \text{若 } V_{\text{effect}} \le 0 \\
V_{\text{effect}} + 1000, & \text{若 } \text{LowestHpRate}_{\text{ally}} \le 0.35 \text{ (危急狀態)} \\
\lfloor V_{\text{effect}} \times 0.5 \rfloor, & \text{若 } \text{LowestHpRate}_{\text{ally}} > 0.35 \text{ (平安狀態降權)}
\end{cases}$$

### 2.3 地格場景類（`tile-scene`）

強調地形控制與天候相容性：

$$S_{\text{scene}} = \begin{cases} 
0, & \text{若 } \text{weatherCompatible} == \text{false (天候阻絕，如暴雨放火)} \\
(C_{\text{choke}} \times 10) + (C_{\text{dense}} \times 10), & \text{天候相容狀態}
\end{cases}$$

---

## 3. 最高分抉擇與穩定性規則

1. **極值選取**：
   - 遍歷所有候選戰法，取 $S > 0$ 且分數最高者（$\max(S)$）。
   - 若全部候選得分均為 0 或負數，回傳 `null`，AI 放棄施放戰法改為普通攻擊。
2. **同分穩定性（Tie-Breaking）**：
   - 若兩項戰法計算得分嚴格相等，**優先選取陣列中較早出現者（First-Found Priority）**，確保相同情境下之決策具備確定性，杜絕隨機抖動。

---

## 4. 七步全流程驗收矩陣（7-Step Verification Matrix）

為確保戰法 AI 在整合管線中之決策正確性，建立標準 7 步驗收檢驗清單：

| 步驟 | 檢驗階段 | 驗證標的與期望行為 |
|:---:|---|---|
| **Step 1** | 候選收集 | 依據當前冷卻、TP 與兵力狀態，正確篩選可用戰法候選清單。 |
| **Step 2** | 態勢採集 | 正確取樣敵我雙方當前血量、最低血量比例與當前天候。 |
| **Step 3** | 天候硬斷 | 驗證暴雨下火攻等天候不相容戰法得分為 0，不得入選。 |
| **Step 4** | 斬殺優先 | 敵方有單位進入斬殺線時，單體傷害戰法獲得 $+1000$ 斬殺加權。 |
| **Step 5** | 急救優先 | 我方單位瀕危（$\le 35\%$）時，治療與護盾戰法獲得 $+1000$ 急救加權。 |
| **Step 6** | 平安節制 | 我方血線健康時，治療戰法得分折半（$0.5\times$），不浪費 TP。 |
| **Step 7** | 決策回傳 | 準確回傳最優 `tacticId`，並能與 `BattleController` 執行端無縫接合。 |

---

## 5. 自動化測試與驗收標準

1. **單元測試對齊**：
   - 對齊 `tests/TacticAiRules.test.ts` 與 `tests/BattleSkillProfileAutoTargeting.test.ts`。
   - 驗收條件 1：單體傷害在可斬殺情況下得分必須高於未斬殺情況 1000 分。
   - 驗收條件 2：我方血量比例 30%（$\le 35\%$）時，治療戰法得分必定超越常規傷害戰法。
   - 驗收條件 3：天候不相容標記為 `false` 時，打分結果嚴格等於 0。
