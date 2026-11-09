<!-- doc_id: doc_spec_0713 -->
# 3KLife 戰場軍師計謀錦囊施放與消耗型計略點數SP狀態機規格書

> **規格代碼**：SPEC-BAT-STRAT01  
> **關聯 WBS**：BATTLE-STRATAGEM-01（戰場軍師計謀錦囊庫、消耗型計略點數 SP 資源池與智力對抗演算法）  
> **系統分類**：戰鬥系統 / 謀略與資源控制管線  
> **狀態**：正式生效（單一真相來源，嚴禁尾端追加補丁）

---

## 1. 系統架構定位與運籌哲學

運籌帷幄之中，決勝千里之外。《三國人生》（3KLife）戰鬥中，軍師（諸葛亮、司馬懿、周瑜、郭嘉等）扮演超越單一格鬥單位的全域指揮角色。軍師不直接參與肉搏，而是透過全域計略點數（Stratagem Points, SP）在關鍵節點扭轉乾坤。

本系統核心價值：
1. **全域資源池管控（Global SP Pool）**：獨立於武將個人怒氣/TP之外的獨立戰略點數。
2. **智力差值壓制對抗（INT Contestation）**：成功率取決於施法者與敵方軍師/主將智力之博弈。
3. **不可逆戰略錦囊**：單場戰鬥每種錦囊通常僅能施放 1 次，體現「妙計定乾坤」之珍稀性。

---

## 2. 計略點數（SP）模型與每回合動態恢復

戰役開啟時，雙方陣營依據主軍師智力屬性配置初始與每回合恢復點數：

```typescript
export interface IBattleStratagemState {
  currentSp: number;            // 當前可用計略點數 (上限 100)
  readonly maxSp: number;       // 上限預設 100
  readonly baseRegenPerTurn: number; // 每回合自然回調
  readonly strategistId: string; // 陣營隨軍軍師識別碼
  usedStratagemIds: string[];   // 本場戰鬥已消耗之計略識別碼
}
```

每回合開始時的 SP 恢復演算法：
$$\text{SP}_{\text{regen}} = 10 + \left\lfloor \frac{\text{INT}_{\text{strategist}}}{20} \right\rfloor$$

若隨軍軍師陣亡或陷入混亂，當回合 SP 恢復量強制折半；若未配置軍師，則每回合僅獲得保底 5 點。

---

## 3. 四大核心錦囊卡資料結構

```typescript
export enum StratagemType {
  CICADA_SHELL = 'CICADA_SHELL',       // 金蟬脫殼 (解控撤退)
  FALSE_RETREAT = 'FALSE_RETREAT',     // 偽報退兵 (誘敵驅離)
  SHADOW_SOLDIERS = 'SHADOW_SOLDIERS', // 疑兵之計 (幻影誘餌)
  SEA_CROSSING = 'SEA_CROSSING'        // 瞞天過海 (全軍隱形)
}

export interface IStratagemCardDef {
  readonly id: StratagemType;
  readonly name: string;
  readonly spCost: number;             // 消耗 SP 點數
  readonly cooldownTurns: number;      // 冷卻回合數
  readonly maxUsesPerBattle: number;   // 單場使用上限 (通常為 1)
  readonly baseSuccessRate: number;    // 基礎成功率 (0.0 ~ 1.0)
}

export const STRATAGEM_REGISTRY: Record<StratagemType, IStratagemCardDef> = {
  CICADA_SHELL:    { id: StratagemType.CICADA_SHELL,    name: '金蟬脫殼', spCost: 40, cooldownTurns: 99, maxUsesPerBattle: 1, baseSuccessRate: 1.00 },
  FALSE_RETREAT:   { id: StratagemType.FALSE_RETREAT,   name: '偽報退兵', spCost: 50, cooldownTurns: 4,  maxUsesPerBattle: 2, baseSuccessRate: 0.70 },
  SHADOW_SOLDIERS: { id: StratagemType.SHADOW_SOLDIERS, name: '疑兵之計', spCost: 35, cooldownTurns: 3,  maxUsesPerBattle: 2, baseSuccessRate: 0.85 },
  SEA_CROSSING:    { id: StratagemType.SEA_CROSSING,    name: '瞞天過海', spCost: 60, cooldownTurns: 99, maxUsesPerBattle: 1, baseSuccessRate: 0.90 }
};
```

---

## 4. 智力博弈對抗判定公式

當施放具有心智控制或欺詐屬性之計謀（如【偽報退兵】）時，執行智力對抗演算法：

$$P_{\text{success}} = P_{\text{base}} + (\text{INT}_{\text{caster}} - \text{INT}_{\text{target}}) \times 0.01$$

```
     智力差值 ΔINT          最終成功率區間
  ┌─────────────────┐     ┌────────────────┐
  │ ΔINT >= +30     │ ──> │ 上限鎖定 95%   │ (極難被識破)
  │ -10 <= ΔINT < 30│ ──> │ 線性區間 60~90%│
  │ ΔINT <= -25     │ ──> │ 下限保底 30%   │ (極易被對手看穿反噬)
  └─────────────────┘     └────────────────┘
```

1. **看破反噬（Counter-Stratagem）**：若敵方軍師智力高於施法者超過 20 點且本次判定失敗，觸發「計謀被識破」，施法方扣除額外 15 點 SP，且施法者主將士氣下降 5 點。
2. **演算法防呆**：【金蟬脫殼】屬於對己方軍陣之戰術處置，不受敵方智力減免，判定成功率固定為 **100%**。
