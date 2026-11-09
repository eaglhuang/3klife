<!-- doc_id: doc_spec_0392 -->
# 戰場武將單挑AI接受判定與發起條件數值規格書

## 1. 核心定位與職責邊界
本規格書定義《三國人生》戰場武將相遇時觸發單挑（General Duel）的 AI 接受決策、主動發起門檻與拒絕懲罰模型（WBS `AIS-10`，代碼落位於 `AiDuelDecision.ts`、`BattleGeneralDuelFlow.ts` 與 `BattleDuelResolver.ts`）。
單挑作為扭轉戰場大局的高風險決鬥機制，防守方 AI 透過精密之戰力評估演算法決定迎戰或退縮，並在拒絕時承擔全軍士氣崩潰之連帶懲罰。

```
              ┌──────────────────────────────────────────────┐
              │          AiDuelDecision 單挑決策引擎         │
              └──────────────────────┬───────────────────────┘
                                     │
          ┌──────────────────────────┴──────────────────────────┐
          ▼                                                     ▼
   【防守方接受判定 (Accept)】                           【進攻方發起判定 (Initiate)】
   • duel_score = 0.45*HP + 0.35*Squad + 0.20*Power      • LOW/MEDIUM: 推進即發起
   • 抖動範圍 ±0.05                                      • HIGH 以上: 僅在防守方分數
   • EASY 閾值 0.45；其餘 0.58                             ≤ 0.50（確認有利）時發起
   • 拒絕懲罰：全軍攻防與武將 HP 減半
```

---

## 2. 防守方單挑接受評分模型（`duelScoreOf`）

### 2.1 三權重分數公式
防守方計算自身當前相對於進攻方之綜合戰況分數（`duel_score`）：
$$\text{duel\_score}_{\text{base}} = 0.45 \times \text{clamp01}(\text{hpRatio}) + 0.35 \times \text{clamp01}(\text{squadRatio}) + 0.20 \times \text{clamp01}(\text{powerRatio})$$

1. **HP 比例項（權重 45%）**：$\text{hpRatio} = \frac{\text{CurrentHP}}{\text{MaxHP}}$，反映主將肉身耐受力。
2. **分隊兵力比項（權重 35%）**：$\text{squadRatio}$ 為當前戰場存活部隊兵力比例，反映前鋒支援屏障。
3. **總戰力比項（權重 20%）**：$\text{powerRatio}$ 為雙方陣營武將與部隊的總戰力比值。

### 2.2 隨機抖動與接受判定
為避免決策僵化，結算時注入 $\pm 0.05$ 隨機抖動（Jitter）：
$$\text{jitter} = -0.05 + 2 \times 0.05 \times \text{roll} \quad (\text{roll} \in [0, 1])$$
$$\text{duel\_score}_{\text{final}} = \text{duel\_score}_{\text{base}} + \text{jitter}$$

- **接受判定式**：$\text{duel\_score}_{\text{final}} \ge \text{Threshold}_{\text{accept}}$
- **難度閾值表**：
  - **EASY 難度**：$\text{Threshold} = \mathbf{0.45}$（敵將心虛膽怯，易因微弱優勢接受挑戰）。
  - **NORMAL / HARD / NIGHTMARE / HELL**：$\text{Threshold} = \mathbf{0.58}$（常規冷靜防守閾值）。

### 2.3 拒絕單挑之崩潰懲罰（Refusal Penalty）
若防守方判定分數未達閾值而選擇「**拒絕單挑**」，承擔嚴厲代價：
1. **全軍攻防減半**：該陣營場上所有部隊之攻擊力與防禦力即時削減 **50%**（$\times 0.5$）。
2. **武將 HP 減半**：拒絕者主將當前生命值強制扣減 **50%**（$\times 0.5$），代表威信盡失引發之士氣大潰敗。

---

## 3. 進攻方主動發起單挑門檻（`aiShouldInitiateDuel`）

當部隊行軍推進至敵將相鄰格時，進攻方 AI 依據其智力等級（IQ）評估是否發起挑戰：

1. **LOW / MEDIUM IQ（匹夫之勇）**：
   只要順利推進至敵將面前，**100% 無條件主動發起單挑**（未掛載難度表時亦預設此行為）。
2. **HIGH / EXTREME / PERFECT IQ（智勇雙全）**：
   先評估敵方防守評分（`defenderScore`）。只有確認敵方防守分數處於劣勢時，始主動發起：
   $$\text{defenderScore} \le \mathbf{0.50} \quad (\text{AI\_DUEL\_INITIATE\_MAX\_DEFENDER\_SCORE})$$
   若敵方氣勢正盛（$\text{defenderScore} > 0.50$），高智力 AI 嚴禁魯莽發起單挑。
