<!-- doc_id: doc_spec_0306 -->
# 洛陽太學：五經注疏與九品官聲功能規格書 (Luoyang Imperial Academy: Classics & Rank)

> **所屬目錄**：[`docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/)  
> **關聯總目錄**：[`doc_index_1053`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/README.md)  
> **關聯母規格**：[`doc_spec_0288`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/C2_R5_遊戲性決策拍板與體驗強化增補規格書.md) §5.5、[`doc_spec_0302`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md)  
> **學府代號**：`ACAD_LUOYANG`  
> **特化職能**：魅力（CHA）、政治（POL）、世家名望、外交公卿權柄

---

## 1. 學府文化與設計目標

洛陽太學為天下官學之巔峰，生徒三萬人，公卿大儒（鄭玄、蔡邕、盧植）主持講壇。
- 本學府對標《賽馬娘》之「公卿名流遊說與名望聲譽積累機制」。
- 子嗣修業圍繞**「五經章句研習」**與**「朝野九品官聲評第」**展開，透過大儒薦拔與世家遺物加持，培育出兼具名望威儀與治國奇才的朝廷重臣。

---

## 2. 核心小遊戲機制：五經注疏與九品官聲

### 2.1 五經注疏卷軸（Classics Annotation）
學子在修業期間研習五部儒家經典：
1. **《易經》**：偏向智略謀劃。
2. **《尚書》**：偏向帝王政略與法度。
3. **《詩經》**：偏向風雅詩禮與魅力。
4. **《周禮》**：偏向制度規範與治民。
5. **《春秋》**：偏向微言大義與名分大義。

- 每卷注疏進度達 $100\%$ 時，學子可向宮廷祭酒提交「請益呈文」，立即獲得大額魅力／政治成長，並解鎖「經生筆記」。

### 2.2 九品官聲等級（Official Rank Status）
學子在太學中享有朝野公論之品階：
- **等級序列**：九品寒士 $\to$ 七品秀才 $\to$ 五品明經 $\to$ 三品公卿子弟 $\to$ **一品三公之選**。
- **晉升條件**：消耗經生筆記與家族名望，拜謁駐京公卿大儒獲取「引薦信（Letter of Recommendation）」。
- **品階特權加成**：
  - 每晉升一品，魅力與政治訓練之常態效率提升 $+10\%$。
  - 當達到「三品」以上時，在第 12 與 24 回合考評可借用**「世家因緣遺物」**（如蔡邕焦尾琴、鄭玄注易手稿），觸發**【公卿名望大彩圈】（效率 $\times 2.4$）**。

### 2.3 朝野清議非議檢定（Pure Criticism Risk）
太學生最忌德行瑕疵：
- 若玩家在隨機事件中選擇急功近利或違背禮法選項，有 $25\%$ 機率觸發「士林清議彈劾」。
- **代價**：官聲降等 1 級，且下一輪拜謁公卿所需花費之名望翻倍。

---

## 3. 專屬產出目錄（戰法與特質）

| 識別碼 | 類型 | 名稱 | 獲得條件 | 戰場／內政具體效果 |
|:---|:---:|:---|:---|:---|
| `TAC_JIUPIN_ZHONGZHENG`| 制度戰法 | **九品中正** | 政治 $\ge 88$，官聲達「三品」以上 | 招募在野名士或世家武將時，對方初始忠誠度 $+25$，聘金花費降低 $30\%$。 |
| `TAC_GONGQING_WEIYI` | 外交戰法 | **公卿威儀** | 魅力 $\ge 90$，官聲達「一品三公之選」 | 執行求盟、停戰或說降任務時，基礎成功率判定直接 $+35\%$，敵君主心生敬仰。 |
| `TRT_GUANMIAN_SHIZU` | 門閥特質 | **冠冕世族** | 魅力＋政治總和 $\ge 170$ | 自身魅力屬性永久 $+15$；所在勢力全家族每季額外獲得家族名望 $+20$ 點。 |

---

## 4. TypeScript 資料結構與演算法

```typescript
export enum ClassicsBook {
  YIJING = 'YIJING',     // 易
  SHANGSHU = 'SHANGSHU', // 書
  SHIJING = 'SHIJING',   // 詩
  LIZHI = 'LIZHI',       // 禮
  CHUNQIU = 'CHUNQIU',   // 春秋
}

export interface LuoyangGimmickState {
  classicsProgress: Record<ClassicsBook, number>; // 0 ~ 100%
  officialRank: number; // 9 (lowest) ~ 1 (highest)
  recommendationLetters: number;
  relicsBorrowed: string[];
}

export class LuoyangRankResolver {
  public static canPromote(state: LuoyangGimmickState): boolean {
    const totalProgress = Object.values(state.classicsProgress).reduce((a, b) => a + b, 0);
    const requiredProgress = (10 - state.officialRank) * 40;
    return totalProgress >= requiredProgress && state.recommendationLetters > 0;
  }
  
  public static promote(state: LuoyangGimmickState): { success: boolean; newRank: number } {
    if (!this.canPromote(state)) return { success: false, newRank: state.officialRank };
    state.recommendationLetters -= 1;
    state.officialRank = Math.max(1, state.officialRank - 2);
    return { success: true, newRank: state.officialRank };
  }
  
  public static getTrainingMultiplier(rank: number): number {
    // 品級越高，太學尊榮乘區越高
    const rankBonus = (10 - rank) * 0.15;
    return 1.0 + rankBonus;
  }
}
```

---

## 5. 單元測試案例

1. **TC-LY-01：五經注疏累計與品階晉升斷言**：
   - 當經典進度達標且持有引薦信時呼叫 `promote`。
   - **斷言**：晉升成功，`officialRank` 由 9 升至 7，引薦信數量減 1。
2. **TC-LY-02：一品極限加成封頂斷言**：
   - 當 `rank = 1` 時呼叫 `getTrainingMultiplier`。
   - **斷言**：乘區為 $1.0 + 9 \times 0.15 = 2.35$，數值不溢出。
