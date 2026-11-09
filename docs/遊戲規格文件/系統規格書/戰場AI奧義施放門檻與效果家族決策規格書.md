<!-- doc_id: doc_spec_0391 -->
# 戰場AI奧義施放門檻與效果家族決策規格書

## 1. 核心定位與職責邊界
本規格書定義《三國人生》戰鬥中敵方與委任 AI 施放武將終極奧義（Ultimate）的雙層決策審批模型（WBS `AIS-07` 與 `ULT-13`，代碼落位於 `AiUltimateDecision.ts` 與 `AiUltimateFamilyRule.ts`）。
奧義具備毀天滅地之戰局翻轉力，AI 必須在「SP/能量蓄滿」之硬前置下，依序通過「智力層級審批（IQ Tier Gate）」與「效果家族情境審批（Effect Family Gate）」，雙重確認後始得宣洩終極武力。

```
              ┌──────────────────────────────────────────────┐
              │          AI Ultimate Dual-Gate 雙層審批      │
              └──────────────────────┬───────────────────────┘
                                     │ 前置：SP 滿額且有奧義
          ┌──────────────────────────┴──────────────────────────┐
          ▼                                                     ▼
   【第一層：智力審批 (IQ)】                             【第二層：家族審批 (Family)】
   • LOW: 絕不主動施放                                   • SelfBurst: 斬殺或血量 ≤30%
   • MEDIUM: 精力 >50 且敵方 >3 支                       • TeamBuff/Heal: 血量 ≤50% 或落後
   • HIGH: 擊殺 ≥2 支，或落後且精力 >30                 • Debuff/Control: 敵方存活 ≥3 支
```

---

## 2. 第一層：智力等級審批狀態機（`AiUltimateDecision`）

本層檢定 AI 武將之體力儲備、敵方兵力規模與大局勝負走向：

### 2.1 審批判斷式（`aiShouldUseUltimate`）
```typescript
if (iq === 'LOW') return false;
if (iq === 'MEDIUM') {
    return vitality > 50 && enemyCount > 3;
}
// HIGH / EXTREME / PERFECT
return estimatedKills >= 2 || (isLosing && vitality > 30);
```

### 2.2 數值門檻與行為規範
1. **低智力（LOW IQ）**：
   - 無統籌奧義之氣魄，**絕不主動施放奧義**，恆次回傳 `false`。
2. **中智力（MEDIUM IQ）**：
   - **精力門檻**：$\text{vitality} > 50$（`ULTIMATE_MEDIUM_VITALITY`），確保奧義消耗後不致虛脫。
   - **敵勢門檻**：場上敵軍（玩家）單位數 $> 3$ 支（`ULTIMATE_MEDIUM_ENEMY_COUNT`），見敵勢浩大即傾力一擊。
3. **高智力及以上（HIGH / EXTREME / PERFECT IQ）**：
   - **毀滅打擊**：預估斬殺敵軍數 $\ge 2$ 支（`ULTIMATE_HIGH_KILL_COUNT = 2`），以迅速瓦解敵方編制為目標。
   - **殘局逆轉（Comeback Trigger）**：若全軍總兵力落後（`isLosing = true`）且精力仍有餘裕（$\text{vitality} > 30$，`ULTIMATE_HIGH_LOSING_VITALITY`），果斷施放奧義挽救敗局。

---

## 3. 第二層：效果家族戰術策略審批（`AiUltimateFamilyRule`）

通過智力審批後，系統進一步依據奧義之「技能效果家族（`UltimateEffectFamily`）」檢驗當前戰場態勢是否符合最佳戰術窗口（`aiUltimateFamilyPermits`）：

| 效果家族 (`UltimateEffectFamily`) | 審批放行條件 (Permit Condition) | 戰術常數定義 | 戰略意圖 |
| :--- | :--- | :--- | :--- |
| **`SelfBurst`（自身爆發）** | 預估可斬殺 $\ge 1$ 支，或施法者自身血量 $\le 30\%$ | `ULT_FAMILY_MIN_KILLS = 1`<br>`ULT_FAMILY_SELF_DANGER_HP_RATIO = 0.3` | **背水一戰**：斬殺目標或垂死狂暴反撲 |
| **`TeamBuff`（全隊增益）**<br>**`TeamHeal`（團隊治療）** | 我方全隊平均血量 $\le 50\%$，或大局總兵力落後（`isLosing`） | `ULT_FAMILY_ALLY_LOW_HP_RATIO = 0.5` | **守護陣線**：全軍傷損顯著時抬升血線與士氣 |
| **`EnemyMassDebuff`（全體減益）**<br>**`ControlOverride`（強力控制）** | 敵方在場存活單位數 $\ge 3$ 支 | `ULT_FAMILY_MASS_ENEMY_COUNT = 3` | **群控收益**：敵軍聚居時壓制全域行動與戰力 |
| **`SingleExecute`（單體斬殺）**<br>**`AreaBurst`（範圍轟炸）** | 技能預估可直接擊殺目標 $\ge 1$ 支 | `ULT_FAMILY_MIN_KILLS = 1` | **定點清除**：確保高額傷害不浪費於殘血溢出 |
| **`SpecialRule` / `null`（特殊機制）** | 無特定時機約束，恆次回傳 `true` | - | 依賴第一層 IQ 門檻直接放行 |

---

## 4. 執行協調與安全邊界

1. **雙重與邏輯（AND Gate）**：
   $$\text{FinalCastDecision} = \text{aiShouldUseUltimate}(\dots) \land \text{aiUltimateFamilyPermits}(\dots)$$
   任一審批未過即放棄施放，退回常規行動或等待下一回合更優時機。
2. **零副作用保證**：審批函式為純邏輯運算，不就地扣除 SP 與精力，實際扣除與冷卻由 `BattleSkillDispatcher` 統一承擔。
