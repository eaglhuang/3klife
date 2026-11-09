<!-- doc_id: doc_spec_0578 -->
# 同血緣版本血脈灌注成長與戰魂寄宿TP回流規格書

## 1. 模組職責與架構定位
本規格書規範同名同血脈（相同 `bloodlineId`）武將體系中的「血脈灌注英靈虎符成長模型（`BloodlineInfusion`）」以及身故後「戰魂寄宿 TP 繼承回流狀態機（`SoulTransfer`）」。模組確保玩家重複抽取或培育同名名將時，能持續累積英靈濃度與虎符戰力，並在版本更替時保全培養心血。

```
┌─────────────────────────────────────────────────────────────┐
│                 Bloodline Infusion & Soul Transfer          │
├──────────────────────────────┬──────────────────────────────┤
│ 重複抽卡 → 血脈灌注         │ 武將身故 → 戰魂寄宿         │
│ Bloodline_Level 提升 (+1)    │ Soul_Fragment 定向注入       │
│ 英靈濃度 +10% / 虎符階級躍升 │ 繼承生前 20% 累計 TP 點數    │
└──────────────────────────────┴──────────────────────────────┘
```

## 2. 血脈灌注與英靈虎符雙重成長模型

### 2.1 灌注觸發與等級上限
當玩家獲取與已持有武將具備相同 `bloodlineId` 的重複卡片，且於分流彈窗（`SAME-03`）選擇「血脈灌注」時：
- **血脈等級提升**：該血脈代碼之 `bloodlineLevel` 加算 **$+1$**（上限封頂 10 級）。
- **英靈濃度躍升（`Spirit_Power`）**：宗祠內對應英靈卡之戰法傳授加成與屬性共鳴每級提升 **$+10\%$**。
- **關聯虎符升階（`Linked_Tally_Level`）**：兵符倉之關聯兵種虎符，每提升 2 級血脈等級自動升階 1 級（提升特殊兵種基礎攻擊力與防禦力 $5\%$）。

```typescript
export interface InfusionResult {
  bloodlineId: string;
  previousLevel: number;
  newLevel: number;
  spiritPowerMultiplier: number;
  linkedTallyLevel: number;
  isMaxLevel: boolean;
}

export function executeBloodlineInfusion(currentLevel: number, bloodlineId: string): InfusionResult {
  const MAX_LEVEL = 10;
  if (currentLevel >= MAX_LEVEL) {
    return {
      bloodlineId,
      previousLevel: MAX_LEVEL,
      newLevel: MAX_LEVEL,
      spiritPowerMultiplier: 2.0, // 1.0 + 10 * 0.1
      linkedTallyLevel: 5,        // Math.floor(10 / 2)
      isMaxLevel: true
    };
  }

  const nextLevel = currentLevel + 1;
  return {
    bloodlineId,
    previousLevel: currentLevel,
    newLevel: nextLevel,
    spiritPowerMultiplier: Number((1.0 + nextLevel * 0.10).toFixed(2)),
    linkedTallyLevel: Math.floor(nextLevel / 2),
    isMaxLevel: nextLevel === MAX_LEVEL
  };
}
```

## 3. 戰魂寄宿 TP 繼承回流狀態機

### 3.1 寄宿條件與折算比例
武將壽終死亡切換至 `DEAD` 狀態時，系統將其生前投入修煉之「總戰法點數（`Total_TP`）」進行提煉：
- 生成「戰魂碎片（`Soul_Fragment`）」。
- 玩家可將該碎片注入玩家名冊中**相同 `bloodlineId` 之其他存活版本武將**（例如青年趙雲死後，戰魂注入限定版常山趙雲）。
- **TP 回流比例**：注入之可用修煉點數為生前總量之 **$20\%$**：
  $$\text{InjectedTP} = \left\lfloor \text{TotalTP} \times 0.20 \right\rfloor$$

```typescript
export function transferSoulFragment(
  sourceTotalTp: number,
  targetCurrentTp: number,
  isSameBloodline: boolean
): { success: boolean; grantedTp: number; newTargetTp: number } {
  if (!isSameBloodline || sourceTotalTp <= 0) {
    return { success: false, grantedTp: 0, newTargetTp: targetCurrentTp };
  }

  const granted = Math.floor(sourceTotalTp * 0.20);
  return {
    success: true,
    grantedTp: granted,
    newTargetTp: targetCurrentTp + granted
  };
}
```

## 4. 單元測試驗證規範
1. **TC-INFUSE-GROWTH（血脈升級與倍率檢驗）**：當前 Lv3，執行灌注升至 Lv4，英靈倍率為 1.40，虎符等級為 2。
2. **TC-INFUSE-CAP（Lv10 滿級封頂保護）**：當前 Lv10，再次灌注維持 Lv10，回傳 `isMaxLevel = true`。
3. **TC-SOUL-TRANSFER（戰魂 20% TP 精確折算）**：生前累積 550 點 TP，戰魂注入同血脈武將，獲得 $\lfloor 550 \times 0.2 \rfloor = 110$ 點 TP。
