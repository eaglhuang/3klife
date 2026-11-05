<!-- doc_id: doc_spec_0305 -->
# 江東督府：水文天時與陣型火攻功能規格書 (Jiangdong Naval Academy: Hydrology & Tactics)

> **所屬目錄**：[`docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/)  
> **關聯總目錄**：[`doc_index_1053`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/README.md)  
> **關聯母規格**：[`doc_spec_0288`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/C2_R5_遊戲性決策拍板與體驗強化增補規格書.md) §5.5、[`doc_spec_0302`](file:///c:/Users/User/3KLife/docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md)  
> **學府代號**：`ACAD_JIANGDONG`  
> **特化職能**：統率（LEA）、智力（INT）、全軍水戰、神機火攻連鎖

---

## 1. 學府文化與設計目標

長江天塹，艨艟千艘，周郎赤壁，陸遜連營。江東橫江水軍都督府結合水上兵法、天象水文與大艦協同。
- 本學府聚焦於**「觀天象、知水情、換陣型、發神火」**的動態策略循環。
- 玩家每回合透過觀測長江水文氣象，調整下一回合的水戰陣型，達成「風火相生」的大彩圈連鎖，培育出名震江淮的水師大都督。

---

## 2. 核心小遊戲機制：水文天時與陣型推演

### 2.1 長江水文氣候系統（Hydrology System）
學府環境中存在隨時間流轉的動態氣象（由確定性 PRNG 決定），氣候包含兩大維度：
1. **江上風向**：
   - **東南順風（SOUTHEAST）**：火攻神兵天降之時機。
   - **西北逆風（NORTHWEST）**：水勢湍急，宜固守或設伏。
   - **微風無常（BREEZE）**：平穩常態。
2. **水勢汛期**：
   - **春汛大浪（HIGH_TIDE）**：船速極快，衝擊力大幅提升。
   - **秋江枯水（LOW_TIDE）**：淺灘交錯，考驗水深測量與調度。

- **天象預報功能**：介面固定提前 1 回合展示「長江明日風向水情」，給予玩家充份規劃陣型之窗口。

### 2.2 水陸三大陣型切換
玩家在每回合訓練前可隨時調整當期演習陣型：

| 陣型名稱 | 特點與定位 | 契合之天候水文 | 完美匹配之加成效果 |
|:---|:---|:---|:---|
| **艨艟衝鋒陣**（Warship Ram） | 快速穿透、切斷敵軍首尾 | 春汛大浪 ＋ 順風 | 統率成長 $+80\%$，衝鋒穿透經驗激增。 |
| **樓船固守方陣**（Tower Fortress）| 萬弩齊發、江面堅壁 | 西北逆風 ＋ 枯水 | 統率／防禦成長 $+70\%$，部隊受挫率歸零。 |
| **赤馬走舸火攻陣**（Fire Raider） | 載滿薪柴、乘風縱火 | **東南順風** | **觸發【風助火勢】特級彩圈（成長 $\times 2.3$）**，累積連環火攻點數。 |

### 2.3 長江大閱兵（Naval Fleet Inspection）
在第 **9、18、27 回合**，都督府檢閱水軍三陣配合度：
- 若玩家在過去 9 回合內達成 3 次以上陣型天候完美匹配，大閱兵評定為「甲上神威」。
- 獲得全隊統率大飛躍，並解鎖「江東水軍都督印」。

---

## 3. 專屬產出目錄（戰法與特質）

| 識別碼 | 類型 | 名稱 | 獲得條件 | 戰場具體效果 |
|:---|:---:|:---|:---|:---|
| `TAC_HENGJIANG_ESHO` | 防禦戰法 | **橫江扼守** | 統率 $\ge 85$，大閱兵評定為甲等 | 部隊處於水域或臨水作戰時，防禦力 $+30\%$，免疫一切水流衝撞與失足溺水。 |
| `TAC_LIANHUAN_SHENHUO`| 頂級火計戰法 | **連環神火** | 智力 $\ge 88$，達成 3 次【風助火勢】 | 戰場發動火攻時，火焰蔓延速度與範圍 $+40\%$；處於火場之敵軍陷入恐慌，命中率 $-30\%$。 |
| `TRT_JIANGDONG_NONGCHAO`| 門閥特質 | **江東弄潮** | 統率＋智力總和 $\ge 165$ | 部隊涉水行動不扣減移動力；麾下水軍士氣上限 $+10$，乘船作戰絕不眩暈動搖。 |

---

## 4. TypeScript 資料結構與演算法

```typescript
export enum NavalFormation {
  WARSHIP_RAM = 'WARSHIP_RAM',       // 艨艟衝鋒
  TOWER_FORTRESS = 'TOWER_FORTRESS', // 樓船方陣
  FIRE_RAIDER = 'FIRE_RAIDER',       // 赤馬火攻
}

export enum WindDirection {
  SOUTHEAST = 'SOUTHEAST', // 東南風
  NORTHWEST = 'NORTHWEST', // 西北風
  BREEZE = 'BREEZE',       // 微風
}

export interface JiangdongGimmickState {
  currentFormation: NavalFormation;
  currentWind: WindDirection;
  forecastWind: WindDirection;
  firelinkPoints: number;      // 火計連鎖點數
  perfectMatchesCount: number; // 完美天候匹配累計
}

export class JiangdongTacticResolver {
  public static evaluateSynergy(formation: NavalFormation, wind: WindDirection): {
    multiplier: number;
    isPerfectMatch: boolean;
    synergyName: string;
  } {
    if (formation === NavalFormation.FIRE_RAIDER && wind === WindDirection.SOUTHEAST) {
      return {
        multiplier: 2.3,
        isPerfectMatch: true,
        synergyName: '【風助火勢】：東南風起，赤壁神火連鎖大彩圈！',
      };
    }
    if (formation === NavalFormation.WARSHIP_RAM && wind === WindDirection.SOUTHEAST) {
      return {
        multiplier: 1.8,
        isPerfectMatch: true,
        synergyName: '【順流破浪】：艨艟快船急馳，江面衝鋒勢不可擋！',
      };
    }
    if (formation === NavalFormation.TOWER_FORTRESS && wind === WindDirection.NORTHWEST) {
      return {
        multiplier: 1.7,
        isPerfectMatch: true,
        synergyName: '【鐵壁橫江】：逆風巨艦拋錨，陣勢固若金湯！',
      };
    }
    return {
      multiplier: 1.1,
      isPerfectMatch: false,
      synergyName: '【平流操演】：風向平緩，常態舟師演練。',
    };
  }
}
```

---

## 5. 單元測試案例

1. **TC-JD-01：風火大共鳴倍率檢驗**：
   - 設定陣型為 `FIRE_RAIDER`，風向為 `SOUTHEAST`。
   - **斷言**：`isPerfectMatch === true`，倍率精確為 $2.3$。
2. **TC-JD-02：逆風火攻失利檢驗**：
   - 設定陣型為 `FIRE_RAIDER`，風向為 `NORTHWEST`（逆風用火）。
   - **斷言**：`isPerfectMatch === false`，倍率不高於 $1.1$。
