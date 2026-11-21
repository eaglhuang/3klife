<!-- doc_id: doc_spec_0364 -->
# 教官靈感戰法六招體系數值公式與TP消耗規格書

> **【依 2026-11-21 裁決修訂（PROG-2-9224），下午再改寫（PROG-2-9230）】教官仍由名冊武將擔任（傳戰法、師徒羈絆，不給屬性加成）；另恢復教官池與支援卡（學府修業專用的「連線卡」，不出征；三類：歷史名師名士、武將特別版、紅顏教官），一切以 doc_spec_1264《學府支援卡與教官池規格書》為準。本文舊內容中的「教官卡退場」「不設教官卡」一律作廢；舊的星等突破、五來源、被動技詞條由 1264 的「等級、傳承、效果欄」取代；碎片合成、借將、教官武將本人的屬性加成與個性傳承仍退場。〔上午原註記：教官改由名冊武將擔任（資格：將階達標或 40 歲以上），指派走人員占用 OCC 的 `mentorAssign`，被指派期間不能出征；教學內容只有「傳授教官會的戰法」與「師徒羈絆」。本文舊內容保留作歷史紀錄，與本註記衝突處以本註記為準；細則見 doc_spec_1179 第 14 章。〕**

## 1. 核心定位與契約命名

本規格書為學府培育與支援卡教官靈感戰法六招體系（G-2 Inspired Tactics Suite，代號 `TAC-11`）的單一真相來源（Single Source of Truth）。武將在學府研習與七日頓悟中，受名將教官指點可領悟專屬靈感戰法。

```typescript
export interface InspiredTacticsSuiteContract {
  category: 'MENTOR_INSPIRED_G2';
  tactics: [
    'TAC_LONE_RIDER',   // 單騎破陣
    'TAC_EIGHT_ARRAY',  // 八陣圖
    'TAC_EMPTY_FORT',   // 空城計
    'TAC_HEAL',         // 醫療
    'TAC_INSPIRE',      // 鼓舞
    'TAC_SLOW'          // 緩速
  ];
}
```

---

## 2. G-2 六招逐條數值模型與效果契約

| 規格代碼 | 戰法名稱 | 戰鬥技能識別碼 | 目標模式 | 效果型別 | 核心效果與數值公式 |
|---|---|---|---|---|---|
| `TAC_LONE_RIDER` | 單騎破陣 | `tactic-insp-lone-rider` | Line (3格) | damage | 貫穿先鋒陣線，造成 $\lfloor \text{STR} \times 1.2 \rfloor$ 傷害 |
| `TAC_EIGHT_ARRAY` | 八陣圖 | `eight-formation` | Self (3x3) | tile-buff | 召喚奇門迷障，友軍受傷 $-20\%$，敵方命中 $-15\%$ |
| `TAC_EMPTY_FORT` | 空城計 | `empty-fort` | Self (半徑2) | push | $\text{INT}_{\text{caster}} > \text{INT}_{\text{enemy}}$ 時，敵退 2 格 |
| `TAC_HEAL` | 醫療 | `medical-aid` | AllySingle | heal | 治療量 $\text{Heal} = \lfloor (\text{HP}_{\text{max}} - \text{HP}_{\text{current}}) \times 0.25 \rfloor$ |
| `TAC_INSPIRE` | 鼓舞 | `mentor-morale` | AllyAll | morale | 全體友軍士氣值強制提升 $+20$ 點 |
| `TAC_SLOW` | 緩速 | `mentor-slow` | EnemySingle | slow | 目標部隊移動速度 $-1$ 格，持續 2 回合 |

---

## 3. 戰場消耗與冷卻模型（TP Cost & Cooldown）

依據全域戰法消耗階梯（`doc_spec_0344`），六招戰法對應明確階層：

### 3.1 階梯消耗對照

1. **輔助干擾階（Tier 1）**：
   - `TAC_SLOW`（緩速）：基礎 15 TP，冷卻 1 回合。
   - `TAC_HEAL`（醫療）：基礎 15 TP，冷卻 2 回合（防守方急救回流）。
2. **戰術強化階（Tier 2）**：
   - `TAC_INSPIRE`（鼓舞）：基礎 25 TP，冷卻 3 回合（全軍士氣拉升）。
3. **戰略破陣階（Tier 3）**：
   - `TAC_LONE_RIDER`（單騎破陣）：基礎 40 TP，冷卻 3 回合。
   - `TAC_EMPTY_FORT`（空城計）：基礎 40 TP，冷卻 4 回合。
4. **陣法至寶階（Tier 4）**：
   - `TAC_EIGHT_ARRAY`（八陣圖）：基礎 60 TP，冷卻 5 回合。

### 3.2 綠色因子的節能折半

若武將具備對應系譜之綠色天賦因子（如【省糧巧手】、【神機節用】）：

$$\text{TP}_{\text{final}} = \max\left(10, \lfloor \text{TP}_{\text{base}} \times 0.5 \rfloor\right)$$

- 例：八陣圖 60 TP 折半為 30 TP；醫療 15 TP 折半保底為 10 TP。

---

## 4. 教官好感度與靈感解鎖條件

在學府研習過程中，解鎖特定靈感戰法需滿足特定名將好感階級與屬性要求：

1. **諸葛亮（神算門閥）**：
   - 好感達「泛泛之交」（Lv 2）：解鎖 `TAC_SLOW`（緩速）傳授。
   - 好感達「莫逆之交」（Lv 4）且智力 $\ge 80$：解鎖 `TAC_EMPTY_FORT`（空城計）。
   - 好感達「生死與共」（Lv 5）且智力 $\ge 90$：解鎖 `TAC_EIGHT_ARRAY`（八陣圖）。
2. **趙雲 / 關羽（豪勇將門）**：
   - 力量 $\ge 80$ 且羈絆滿 100 觸發七日頓悟：解鎖 `TAC_LONE_RIDER`（單騎破陣）。
3. **荀彧 / 魯肅（輔國良臣）**：
   - 魅力 $\ge 75$：解鎖 `TAC_INSPIRE`（鼓舞）與 `TAC_HEAL`（醫療）。

---

## 5. 自動化測試與驗收標準

1. **單元測試對齊**：
   - 對齊 `tests/BattleSkillExecutor.test.ts` 與 `tests/BattleSkillSourceTranslator.test.ts`。
   - 驗收條件 1：驗證 `INSPIRED_TACTIC_MAP` 完整收錄六招之對照映射。
   - 驗收條件 2：驗證醫療戰法依照 25% 損失生命值計算，空城計具備智力差檢定。
   - 驗收條件 3：驗證 TP 消耗模型精確對位 15/25/40/60 點，並正確響應綠色因子減免。
