<!-- doc_id: doc_spec_0304 -->
# 幽州演武：沙盤巡哨與煞氣突破功能規格書 (Youzhou Academy: Recon & Malice Surge)

> **所屬目錄**：[`docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/)  
> **關聯總目錄**：[`doc_index_1053`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/README.md)  
> **關聯母規格**：[`doc_spec_0288`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/C2_R5_遊戲性決策拍板與體驗強化增補規格書.md) §5.5、[`doc_spec_0302`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md)  
> **學府代號**：`ACAD_YOUZHOU`  
> **特化職能**：武力（STR）、統率（LEA）、塞外騎射、突騎穿透戰法

---

## 1. 學府文化與設計目標

「幽州突騎，天下稱雄」。本學府坐落於長城要隘，結合公孫瓚白馬義從與邊疆突騎實戰傳承。
- 與書院書生不同，幽州演武堂以**「邊境巡哨、沙盤推演、血性煞氣」**為核心體驗。
- 機制強調「極限博弈」：玩家藉由實戰積累「戰意煞氣值（Malice）」，適時開啟「煞氣突破（Surge）」，以精力急遽消耗為代價換取武力與統率的爆發性成長。

---

## 2. 核心小遊戲機制：巡哨演習與煞氣突破

### 2.1 雙軌訓練與煞氣計量表（Malice Gauge）
學子在幽州演武堂擁有專屬量表：**煞氣值（$M \in [0, 100]$）**。
每次訓練分為兩條路線：
1. **常規操練（Regular Drill）**：
   - 消耗常規精力（$-10$），武統平穩成長，煞氣值 $+5$。
2. **邊境沙盤巡哨（Border Recon Patrol）**：
   - 消耗更高精力（$-20$），進行模擬野戰對抗，武統成長 $+50\%$，煞氣值 $+15$。

### 2.2 煞氣突破模式（Surge Mode）爆發機制
當煞氣值達到 $M \ge 80$ 時，演武堂解鎖**【煞氣突破（Surge Mode）】**狀態：
- **持續時間**：3 回合。
- **正向爆發加成**：
  - 訓練武力與統率的獲取效率提升至 **$2.2$ 倍**（彩圈共鳴）。
  - 單挑勝率與衝鋒評等直接鎖定在頂級判定。
- **高風險平衡代價**：
  - 每回合額外消耗精力 **$20$ 點**。
  - 若在突破期間精力跌破 $20$ 點，將有 $30\%$ 機率觸發「戰傷負傷（Battle Strain）」，強制終止突破並休養 1 回合。
- **突破結束結算**：
  - 3 回合結束後，煞氣值重置為 $0$，並額外獲得 1 點「百戰武勳（Valor Point）」。

### 2.3 塞外沙盤突發事件（Border Skirmish Event）
在第 **10、20、30 回合**，強制觸發「胡騎犯邊沙盤演練」，彈出戰術抉擇：
- **選項 A【白馬衝陣】**：要求武力判定。成功後直接補滿煞氣值，並獲得騎射經驗；失敗則精力 $-15$。
- **選項 B【堅壁設伏】**：要求統率判定。成功後獲得統率大量加成與穩健戰法；失敗則部隊防禦經驗折半。

---

## 3. 專屬產出目錄（戰法與特質）

| 識別碼 | 類型 | 名稱 | 獲得條件 | 戰場具體效果 |
|:---|:---:|:---|:---|:---|
| `TAC_TUQI_POZHEN` | 突擊戰法 | **突騎破陣** | 武力 $\ge 88$，完成 2 次成功煞氣突破 | 騎兵部隊發動衝鋒時暴擊率 $+15\%$，首擊必定擊碎敵軍防禦護盾與陣型。 |
| `TAC_BAIMA_YICONG` | 專屬兵種戰法 | **白馬義從** | 統率 $\ge 85$，累積百戰武勳 $\ge 2$ | 麾下弓騎兵射程 $+1$ 格，攻擊後可再度移動 2 格，白馬銀鞍令敵軍膽寒。 |
| `TRT_SAIWAI_BAIZHAN` | 門閥特質 | **塞外百戰** | 武力＋統率總和 $\ge 170$ | 部隊陷入重圍或瀕死（兵力 $<20\%$）時，士氣鎖定為滿值絕不潰逃，攻速反增 $+20\%$。 |

---

## 4. TypeScript 資料結構與演算法

```typescript
export interface YouzhouGimmickState {
  maliceGauge: number;       // 0 ~ 100
  isSurgeActive: boolean;    // 是否處於突破狀態
  surgeRemainingTurns: number; // 突破剩餘回合 (0 ~ 3)
  valorPoints: number;       // 百戰武勳點數
  hasInjury: boolean;        // 是否負傷
}

export class YouzhouSurgeResolver {
  public static processTurn(state: YouzhouGimmickState, energy: number, isReconAction: boolean): {
    statMultiplier: number;
    energyDelta: number;
    maliceDelta: number;
    logs: string[];
  } {
    const logs: string[] = [];
    
    // 若處於突破狀態
    if (state.isSurgeActive) {
      state.surgeRemainingTurns -= 1;
      let energyCost = -20;
      
      // 疲勞極限檢定
      if (energy < 20) {
        logs.push('【極限疲乏】：學子體力透支，動作遲緩！');
      }
      
      if (state.surgeRemainingTurns <= 0) {
        state.isSurgeActive = false;
        state.maliceGauge = 0;
        state.valorPoints += 1;
        logs.push('【煞氣收束】：3 回合極限突破圓滿完成，獲取百戰武勳！');
      }
      
      return {
        statMultiplier: 2.2,
        energyDelta: energyCost,
        maliceDelta: 0,
        logs,
      };
    }
    
    // 常態訓練
    const maliceGain = isReconAction ? 15 : 5;
    const energyCost = isReconAction ? -20 : -10;
    const statMult = isReconAction ? 1.5 : 1.0;
    
    state.maliceGauge = Math.min(100, state.maliceGauge + maliceGain);
    logs.push(`煞氣值上升至 ${state.maliceGauge}/100。`);
    
    return {
      statMultiplier: statMult,
      energyDelta: energyCost,
      maliceDelta: maliceGain,
      logs,
    };
  }
}
```

---

## 5. 單元測試案例

1. **TC-YZ-01：煞氣突破啟用與持續回合遞減**：
   - 當 `maliceGauge = 85` 時觸發突破。
   - **斷言**：`isSurgeActive === true`，倍率為 $2.2$，經過 3 回合後自動恢復常態且 `maliceGauge === 0`。
2. **TC-YZ-02：疲勞受傷邊界檢定**：
   - 在突破期間將精力設為 $10$ 推進回合。
   - **斷言**：輸出包含極限疲乏警告日誌，且精力如實扣減。
