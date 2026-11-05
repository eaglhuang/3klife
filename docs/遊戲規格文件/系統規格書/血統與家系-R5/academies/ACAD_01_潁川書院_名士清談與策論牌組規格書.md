<!-- doc_id: doc_spec_0303 -->
# 潁川書院：名士清談與策論牌組功能規格書 (Yingchuan Academy: Debate & Essay Deck)

> **所屬目錄**：[`docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/)  
> **關聯總目錄**：[`doc_index_1053`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/README.md)  
> **關聯母規格**：[`doc_spec_0288`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/C2_R5_遊戲性決策拍板與體驗強化增補規格書.md) §5.5、[`doc_spec_0302`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md)  
> **學府代號**：`ACAD_YINGCHUAN`  
> **特化職能**：智力（INT）、政治（POL）、神機奇策戰法

---

## 1. 學府文化與設計目標

潁川乃東漢名士搖籃（荀彧、荀攸、郭嘉、陳群、徐庶、司馬徽皆出於此）。本學府設計對標《賽馬娘》之「智謀牌組組裝機制」：
- 子嗣在此修業並非單純苦讀，而是透過**「日常訓練獲得策論牌」**，並在定期舉辦的**「潁水清談大會」**上組裝牌組進行辯難。
- 透過「天時、地利、人和」三才牌型的排列組合，觸發智力與政治的大彩圈爆發，產出名震天下的王佐之才。

---

## 2. 核心小遊戲機制：策論手牌與清談辯難

### 2.1 策論牌（Essay Cards）三系體系
學子手牌庫上限為 **5 張**。每次執行智力、政治或統率訓練時，由確定性 PRNG 抽取 1 張策論牌：

| 策論系別 | 代表色彩 | 對應領域 | 牌面代表論點 |
|:---|:---:|:---|:---|
| **天時系（SKY）** | 湛藍 | 天文、兵勢、戰略大勢 | 《六韜·天門》、《論治亂盛衰之勢》、《星象分野考》 |
| **地利系（EARTH）**| 土黃 | 地形、屯田、水利農政 | 《管子·地員篇》、《陳平屯田策》、《河渠治水經》 |
| **人和系（PEOPLE）**| 絳紅 | 禮樂、治心、選拔人倫 | 《名理學綱要》、《論士林品藻策》、《九府官箴》 |

- **牌品階級（Rarity）**：
  - **1★ 初解（Bronze）**：基礎牌，基礎辯難點數 $P = 10$。
  - **2★ 通儒（Silver）**：精進牌，基礎辯難點數 $P = 25$。
  - **3★ 經緯（Gold）**：名士真傳牌（出現率 $15\%$），基礎點數 $P = 50$。

### 2.2 清談大會（Debate Gathering）辯難規則
在第 **6、12、18、24、30、36 回合**，系統暫停常規訓練，進入專屬清談大會介面：
1. **組牌決策**：玩家從手牌庫（至多 5 張）中挑選出 **3 張牌** 呈堂辯難。
2. **三才連鎖組合（Synergy Combos）判定**：
   - **同氣相求（Three of a Kind）**：3 張同系牌（如 天+天+天 或 地+地+地）
     - **效果**：對應主屬性（智力或政治）單項爆發 $+100\%$，額外獲得該系專屬靈感。
   - **天人合一（Tri-Harmonic Resonance）**：3 張各不同系（天 + 地 + 人）
     - **效果**：觸發潁川書院**特級大彩圈（Resonance $\times 2.5$）**，智力與政治雙雙飛躍，並獲得【名士認可印章】。
   - **雜駁之論（Common Debate）**：2 同 1 異
     - **效果**：常態發揮，屬性成長 $+30\%$。
3. **名士評審挑戰（Master Challenge）**：
   - 潁川三老輪流主持大會：
     - Turn 6 / 12：司馬徽（水鏡先生）——考評「天時大勢」。
     - Turn 18 / 24：龐德公——考評「人和人品」。
     - Turn 30 / 36：荀爽（潁川荀氏領袖）——考評「經世地利」。
   - 牌面總點數 $\sum P$ 超過考評線時，獲得名士親筆評語，永久記錄進成長集錦。

---

## 3. 專屬產出目錄（戰法與特質）

修業圓滿且通過荀爽大考者，於結業（Turn 36）解鎖專屬戰法與門閥特性（佔用通用 3 戰法 + 2 特質槽位）：

| 識別碼 | 類型 | 名稱 | 獲得條件 | 戰場／內政具體效果 |
|:---|:---:|:---|:---|:---|
| `TAC_LIAODI_JIXIAN` | 奇謀戰法 | **料敵機先** | 智力 $\ge 85$，且清談達成 2 次【天人合一】 | 戰鬥中每回合有 $30\%$ 機率看穿敵軍伏兵與奇襲，全軍規避動搖，先手行動。 |
| `TAC_SHISHENG_SHIBAI` | 頂級戰法 | **十勝十敗** | 智力 $\ge 92$，且獲得司馬徽「識人之明」印章 | 戰鬥開局敵方主將士氣 $-20$；我方全軍攻擊力 $+15\%$、暴擊抗性 $+30\%$，持續 3 回合。 |
| `TRT_YINGSHUI_QINGLIU` | 門閥特質 | **潁水清流** | 政治 $\ge 80$ | 擔任太守或尚書時，所轄郡縣民忠自然衰退速度 $-50\%$，流民招募速度 $+25\%$。 |

---

## 4. TypeScript 資料結構與演算法

```typescript
export enum EssayCardCategory {
  SKY = 'SKY',       // 天時
  EARTH = 'EARTH',   // 地利
  PEOPLE = 'PEOPLE', // 人和
}

export interface EssayCard {
  id: string;
  name: string;
  category: EssayCardCategory;
  star: 1 | 2 | 3;
  debatePower: number; // 10 / 25 / 50
}

export interface YingchuanGimmickState {
  handCards: EssayCard[];       // 最多 5 張
  debatePointsPool: number;     // 累計清談點數
  masterEndorsements: string[]; // 獲取之名士印章清單
}

export class YingchuanDebateResolver {
  public static evaluateCombo(selected: [EssayCard, EssayCard, EssayCard]): {
    comboType: 'THREE_OF_KIND' | 'TRI_HARMONIC' | 'COMMON';
    multiplier: number;
    description: string;
  } {
    const cats = selected.map(c => c.category);
    const uniqueCats = new Set(cats);
    
    if (uniqueCats.size === 1) {
      return {
        comboType: 'THREE_OF_KIND',
        multiplier: 2.0,
        description: '【同氣相求】：三論歸一，單系專研大突破！',
      };
    }
    if (uniqueCats.size === 3) {
      return {
        comboType: 'TRI_HARMONIC',
        multiplier: 2.5,
        description: '【天人合一】：天時地利人和俱全，潁川特級大彩圈！',
      };
    }
    return {
      comboType: 'COMMON',
      multiplier: 1.3,
      description: '【通達事理】：理路明暢，平穩發揮。',
    };
  }
}
```

---

## 5. 單元測試案例

1. **TC-YC-01：牌組上限與溢出防護**：
   - 學子手牌已有 5 張牌時再度執行智力訓練。
   - **斷言**：系統提示「手牌已滿」，允許玩家選擇丟棄 1 張或自動放棄新牌，手牌數嚴格維持 $\le 5$。
2. **TC-YC-02：天人合一組合倍率斷言**：
   - 傳入 `[SKY, EARTH, PEOPLE]` 三張不同牌。
   - **斷言**：`comboType === 'TRI_HARMONIC'`，倍率精確為 $2.5$。
