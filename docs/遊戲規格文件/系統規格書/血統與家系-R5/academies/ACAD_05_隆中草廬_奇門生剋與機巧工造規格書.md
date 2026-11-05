<!-- doc_id: doc_spec_0307 -->
# 隆中草廬：奇門生剋與機巧工造功能規格書 (Longzhong Academy: Eight Gates & Crafting)

> **所屬目錄**：[`docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/)  
> **關聯總目錄**：[`doc_index_1053`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/README.md)  
> **關聯母規格**：[`doc_spec_0288`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/C2_R5_遊戲性決策拍板與體驗強化增補規格書.md) §5.5、[`doc_spec_0302`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md)  
> **學府代號**：`ACAD_LONGZHONG`  
> **特化職能**：五維極致均衡、奇門遁甲陣法、軍械發明與後勤輜重

---

## 1. 學府文化與設計目標

南陽臥龍崗，草廬高臥，諸葛孔明躬耕於此，黃月英精研機關木牛。
- 本學府對標《賽馬娘》之「部件研造改裝與八門盤面運轉機制」。
- 與偏科特化學府不同，隆中草廬追求**「五維全面無死角（均衡成長）」**與**「機巧輔助以弱勝強」**。
- 玩家每回合依循八門生剋轉動調整心法，並收集機械部件組裝傳世機巧，培育出通曉奇門遁甲與發明神器的經世奇才。

---

## 2. 核心小遊戲機制：八陣羅盤與機巧工造

### 2.1 八陣生剋羅盤（Eight Gates Compass）
草廬天象儀上設有八門羅盤，每回合順時針自轉 45 度（由確定性 PRNG 推進），八門具備相異生剋律：

| 八門方位 | 象徵意義 | 當期開盤專屬效果 | 最佳對應行動 |
|:---:|:---|:---|:---|
| **生門（LIFE）** | 萬物生發、陰陽調和 | 休息效果 $+100\%$，精力全滿且治癒負傷 | 體力休整與固本培元 |
| **開門（OPEN）** | 天門大啟、通達無阻 | **全五維訓練觸發均衡大彩圈（$\times 2.0$）** | 任何五維訓練皆爆發 |
| **景門（BRIGHT）**| 明察秋毫、文才大顯 | 智力／政治成長 $+80\%$，部件掉落率翻倍 | 謀略策劃與研讀典籍 |
| **傷門（HARM）** | 殺氣騰騰、鋒芒外露 | 武力成長 $+90\%$，但精力消耗額外 $+10$ | 極限近戰武藝操練 |
| **杜門（CLOSE）** | 閉關自省、遁隱無形 | 規避一切隨機負面事件，但訓練效率 $-20\%$ | 穩健修習、整理手稿 |
| **死／驚／休門** | 考驗心性、生剋轉換 | 依學子當前五維屬性觸發意志考驗 | 見招拆招 |

### 2.2 機巧工造台（Crafting Workshop）
學子在訓練期間可收集三類機巧部件：
1. **精鋼齒輪（Gear）**：代表精密傳動。
2. **楠木榫卯（Mortise）**：代表骨架與韌性。
3. **玄鐵機簧（Spring）**：代表爆發彈力。

- **三階工造發明目標**：
  - **發明一【木牛流馬】**（需要：2 齒輪 ＋ 2 榫卯）：後勤糧草神物，修煉完成獎勵統率／政治 $+30$。
  - **發明二【諸葛連弩】**（需要：2 機簧 ＋ 2 齒輪）：遠程連射兵器，修煉完成獎勵武力／統率 $+30$。
  - **發明三【八陣演武沙盤】**（需要：各 2 件部件）：解鎖天下第一陣法，五維全體 $+25$。

---

## 3. 專屬產出目錄（戰法與特質）

| 識別碼 | 類型 | 名稱 | 獲得條件 | 戰場／內政具體效果 |
|:---|:---:|:---|:---|:---|
| `TAC_BAZHEN_XUANJI` | 陣法戰法 | **八陣玄機** | 統率 $\ge 85$ 且完成八陣演武沙盤 | 部隊處於泥沼、深山或逆境地形時，防禦力反增 $+25\%$，敵軍無法包圍包抄。 |
| `TAC_SHENJI_LIANNU` | 軍械戰法 | **神機連弩** | 武力 $\ge 85$ 且完成諸葛連弩組裝 | 麾下遠程部隊發動射擊時，有 $40\%$ 機率觸發「三連齊射」，傷害連續遞增 $15\%$。 |
| `TRT_QIAOJIANG_TIANGONG`| 門閥特質 | **巧匠天工** | 五維皆 $\ge 70$ 且完成全部三項發明 | 所在勢力攻城器械建造工時 $-40\%$；出征部隊輜重糧草損耗永久降低 $20\%$。 |

---

## 4. TypeScript 資料結構與演算法

```typescript
export enum EightGate {
  LIFE = 'LIFE',   // 生門
  OPEN = 'OPEN',   // 開門
  BRIGHT = 'BRIGHT', // 景門
  HARM = 'HARM',   // 傷門
  CLOSE = 'CLOSE', // 杜門
  REST = 'REST',   // 休門
  DEATH = 'DEATH', // 死門
  SHOCK = 'SHOCK', // 驚門
}

export interface LongzhongGimmickState {
  currentGate: EightGate;
  gears: number;    // 齒輪
  mortises: number; // 榫卯
  springs: number;  // 機簧
  completedInventions: string[];
}

export class LongzhongCompassResolver {
  private static readonly GATE_ORDER: EightGate[] = [
    EightGate.LIFE, EightGate.BRIGHT, EightGate.HARM, EightGate.CLOSE,
    EightGate.REST, EightGate.DEATH, EightGate.SHOCK, EightGate.OPEN,
  ];

  public static nextGate(current: EightGate): EightGate {
    const idx = this.GATE_ORDER.indexOf(current);
    return this.GATE_ORDER[(idx + 1) % this.GATE_ORDER.length];
  }

  public static evaluateGateBonus(gate: EightGate): {
    multiplier: number;
    extraEnergyCost: number;
    description: string;
  } {
    switch (gate) {
      case EightGate.OPEN:
        return { multiplier: 2.0, extraEnergyCost: 0, description: '【開門大吉】：八門通達，全屬性均衡大彩圈！' };
      case EightGate.BRIGHT:
        return { multiplier: 1.8, extraEnergyCost: 0, description: '【景門高懸】：文韜顯耀，智謀研習飛速！' };
      case EightGate.HARM:
        return { multiplier: 1.9, extraEnergyCost: 10, description: '【傷門肅殺】：武藝突破，但極耗體力！' };
      case EightGate.LIFE:
        return { multiplier: 1.0, extraEnergyCost: -20, description: '【生門休養】：精力充沛，神清氣爽！' };
      default:
        return { multiplier: 1.1, extraEnergyCost: 0, description: '【陣位轉移】：氣機流轉，平常演練。' };
    }
  }
}
```

---

## 5. 單元測試案例

1. **TC-LZ-01：八門羅盤順序流轉檢驗**：
   - 呼叫 `nextGate(EightGate.LIFE)`。
   - **斷言**：下一門為 `EightGate.BRIGHT`，依此類推，8 回合後精確循環回 `LIFE`。
2. **TC-LZ-02：開門均衡大彩圈斷言**：
   - 當 `currentGate === EightGate.OPEN` 時計算加成。
   - **斷言**：倍率為 $2.0$，無額外精力損耗。
