<!-- doc_id: doc_spec_0360 -->
# 天賦戰法自動施放設定檔與AI決策節奏規格書

> **文件狀態**：單一真相來源（Single Source of Truth）  
> **系統代碼**：`TAC-09`、`SYS-SKILL-PROFILE-AI-CADENCE`  
> **核心職責**：確立全域武將天賦戰法之自動施放設定檔（BattleSkillProfiles）、四大自動錨點索敵模式（autoAimMode），以及敵方 AI 戰法施放之最小回合節奏間隔（Cadence: 2 回合冷卻），杜絕敵軍連續秒殺與玩家挫折感。

---

## 1. 自動索敵模式分類（AutoAimMode）

在委任戰鬥或敵方 AI 決策時，戰法設定檔指定以下四大索敵演算法：

| 索敵模式 (Mode) | 決策核心優先級 | 最佳適用戰法類別 | 錨點選擇標準 |
|---|---|---|---|
| **`LowestHp` (斬殺優先)** | 優先鎖定當前 HP 比例最低之敵軍 | 單體高爆發戰法 (TDIR) | 當前生命值最接近斬殺線之敵將 |
| **`EnemyCluster` (密集打擊)** | 優先尋找覆蓋最多敵軍部隊之格點 | 直線貫穿/扇形戰法 (TLINE, TFAN) | 幾何計算覆蓋敵軍數最大化之九宮格 |
| **`VanguardChoke` (要道封阻)**| 封鎖前線衝鋒路徑或狹窄隘口 | 地格危害/擊退戰法 (Hazard) | 敵軍前衛部隊行進必經之路徑中點 |
| **`SupportLowAlly` (急救援護)**| 優先檢核友軍生命值 $< 50\%$ 單位 | 醫療/防禦光環 (THEAL, TBUFF) | 生命值最低或正承受集火之友軍主將 |

---

## 2. AI 戰法決策節奏與冷卻保護（AI Cadence Rule）

為保障玩家戰術博弈空間，防止高階 AI 連續每回合傾瀉高耗大戰法：
1. **內部冷卻週期（Internal Cooldown - 2 Turns）**：
   - 敵方 AI 成功施放 Tier 2 以上之精銳戰法後，該單位戰法決策進入 **2 回合冷卻期**（下一回合與下下回合僅允許普攻或走位）。
2. **TP 儲備安全線**：
   - AI 保留至少 20 點 TP 作為反應防禦，禁止將 TP 徹底抽乾至 0。

---

## 3. 設定檔資料結構（BattleSkillProfile）

```typescript
export interface BattleSkillProfile {
  skillId: string;
  manualTargeting: boolean;      // 是否強制手動拉線
  autoAimMode: 'LowestHp' | 'EnemyCluster' | 'VanguardChoke' | 'SupportLowAlly';
  internalCooldownTurns: number; // 預設 2 回合
  hpThresholdTrigger?: number;   // 例如 0.5 表示血量 <50% 觸發
}

export class AiCadenceController {
  private lastTacticTurnMap = new Map<string, number>();

  public canCastTactic(generalUid: string, currentTurn: number, profile: BattleSkillProfile): boolean {
    const lastTurn = this.lastTacticTurnMap.get(generalUid) ?? -999;
    if (currentTurn - lastTurn <= profile.internalCooldownTurns) {
      return false; // 處於 AI 節奏冷卻中
    }
    return true;
  }

  public recordTacticCast(generalUid: string, currentTurn: number): void {
    this.lastTacticTurnMap.set(generalUid, currentTurn);
  }
}
```

---

## 4. 驗收標準與 CI 閘門（Acceptance Criteria）

1. **AI 施放間隔單元測試**：
   - 模擬連續 5 回合戰鬥，檢驗敵方 AI 發動戰法之回合間隔必定 $\ge 2$。
2. **LowestHp 索敵精確度**：
   - 面對 100%、60%、20% 三隻敵軍，單元測試確認目標鎖定 20% 殘血單位。
3. **密集打擊覆蓋率**：
   - 扇形戰法必定選擇擊中 $\ge 2$ 名敵軍之坐標，若全場分散則退回最近目標。
