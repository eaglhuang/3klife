<!-- doc_id: doc_spec_0346 -->
# 虎符名錄圖鑑收錄與委任AI出展調配規格書

> **文件狀態**：單一真相來源（Single Source of Truth）  
> **系統代碼**：`TRP-20`、`SYS-TALLY-CODEX-AI`  
> **核心職責**：確立三十四營特殊兵種虎符在圖鑑系統（EliteTroopCodex）中之四階收錄狀態機，以及委任自動戰鬥模式下，主將根據智力門檻、戰場糧草儲備與相剋評分之出展調配決策模型。

---

## 1. 虎符圖鑑收錄四態狀態機

玩家在遊戲進程中獲取或遭遇虎符時，圖鑑依下列狀態機流轉：

```
[LOCKED (未解鎖)] ──> [DISCOVERED (見聞)] ──> [ACQUIRED (入庫)] ──> [STAR_ENHANCED (星階共鳴)]
```

1. **LOCKED (未解鎖)**：
   - 僅顯示黑影剪影與「？？？」問號，不顯示兵種屬性與專屬戰法。
2. **DISCOVERED (戰場見聞)**：
   - 於敵軍陣營中遭遇過該特殊兵種，點亮兵種外觀與歷史背景，但無法主動調遣裝配。
3. **ACQUIRED (已獲入庫)**：
   - 完成歷史名將傳承、戰役大捷或宗族結盟正式獲取虎符，解鎖 1500 兵力調配權限與出征扣糧。
4. **STAR_ENHANCED (星階共鳴)**：
   - 投入重複兵符碎片或功業精華完成升星（1~5 星），解鎖專屬戰法傷害加成與被動減耗。

---

## 2. 委任戰鬥 AI 虎符調配決策模型

當玩家開啟自動戰鬥或委任代理時，主將依據下列三維決策模型評估是否調遣特殊兵種：

### 2.1 主將智力與糧草雙重安全閘門
- **智力決策門檻**：主將智謀值 $\text{INT} \ge 75$。若 $\text{INT} < 75$，AI 缺乏統御特殊軍勢之策術，一律使用常規通用部隊。
- **糧草防枯竭底線**：當前軍團糧草儲備必須 $\ge 2 \times \text{TallyGrainCost}$，避免出陣後部隊因斷糧崩潰。

### 2.2 出展優先級評分算式
$$\text{DeployScore} = R_{\text{counter}} \times 0.40 + \frac{\text{INT}_{\text{general}}}{100} \times 0.35 + S_{\text{star}} \times 0.25$$

- **剋制優勢比 ($R_{\text{counter}}$)**：敵軍主陣容受該特殊兵種剋制之部隊比例（取值 $0.0 \sim 1.5$）。
- **主將智謀係數 ($\frac{\text{INT}}{100}$)**：主將智謀越高，戰術時機判定越敏銳。
- **星階共鳴加權 ($S_{\text{star}}$)**：虎符星級加權（1星 0.2，5星 1.0）。
- **觸發閾值**：當 $\text{DeployScore} \ge 0.65$ 且通過安全閘門時，AI 於第 1 回合或敵方衝鋒前夕主動出展。

---

## 3. TypeScript 決策演算法範例

```typescript
export interface AiTallyEvaluationInput {
  generalInt: number;
  currentGrain: number;
  tallyGrainCost: number;
  counterRatio: number;
  tallyStarLevel: number;
}

export function evaluateAiTallyDeployment(input: AiTallyEvaluationInput): boolean {
  // 1. 雙重安全閘門檢核
  if (input.generalInt < 75) return false;
  if (input.currentGrain < input.tallyGrainCost * 2) return false;

  // 2. 計算出展評分
  const starWeight = Math.min(1.0, input.tallyStarLevel * 0.2);
  const score = input.counterRatio * 0.40 + (input.generalInt / 100) * 0.35 + starWeight * 0.25;

  return score >= 0.65;
}
```

---

## 4. 驗收標準與 CI 閘門（Acceptance Criteria）

1. **圖鑑狀態持久化**：
   - 存檔讀寫驗證四態轉換不回退，`isAcquired` 旗標正確連動出征名單。
2. **AI 低智力/低糧草嚴格阻絕**：
   - 單元測試驗證 $\text{INT} = 74$ 或糧草不足時，AI 絕對不觸發虎符出陣。
3. **優勢兵種優先出擊**：
   - 面對重裝步兵陣容時，AI 優先選派破步兵之陷陣營或大戟士。
