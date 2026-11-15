# 轉蛋系統規格書 — H–I 字串與 Data Schema

> 這是 `轉蛋系統.md` 的「H–I 字串與 Data Schema」分片。完整索引見 `docs/遊戲規格文件/系統規格書/轉蛋系統.md`。

## H. 字串內容相關

| Key | 預設值 | 備註 |
|---|---|---|
| UI_GACHA_HERO | 「三國名將池」 | |
| UI_GACHA_SUPPORT | 「支援卡・教官池」 | |
| UI_PITY_SMALL | 「距離保底還差 {N} 抽」 | |
| UI_PITY_BIG | 「天命值：{N}/200」 | |
| UI_REBIRTH | 「{Name} 達成 {N} 轉！屬性上限提升至 {Cap}」 | |
| UI_LOYALTY_LOCK | 「忠誠度：100（永忠不渝）」 | 轉蛋名將專屬 |
| UI_SUPPORT_RATE | 「策謀紅類池——SSR 5% / SR 25%」 | 機率公告 |
| UI_POOL_TAB_HERO | 「三國名將池」 | 頁簽 |
| UI_POOL_TAB_SUPPORT | 「策謀紅類池」 | 頁簽 |
| UI_POOL_TAB_LIMITED | 「限定活動」 | 頁簽 |
| UI_CURRENCY_SPIRIT | 「靈玉」 | 付費貨幣名稱 |
| UI_CURRENCY_BRONZE | 「銅錢符」 | 免費貨幣名稱 |
| UI_CURRENCY_SIGN | 「求籤令」 | 定向保底道具 |
| UI_OVERFLOW_NOTICE | 「{CardName} 已滿突破，轉化為積分×{N}」 | 溢出轉化 Toast |

---

## I. Data Schema 需求

### 本機端 (Client)
```json
{
  "Gacha_Pool": {
    "Pool_ID": "GENERAL_STANDARD_01",
    "Pool_Type": "General",
    "Pool_Positioning": "Bloodline_Seed",
    "Featured_SSR": ["ZY_01", "GY_01"],
    "Female_Role_Type_Map": {
      "SUN_SHANGXIANG": "COMBAT",
      "DA_QIAO": "SUPPORT"
    },
    "SR_Rate": 0.10,
    "SSR_Rate": 0.03,
    "Pity_Small": 50,
    "Pity_Big": 200
  },
  "Support_Pool": {
    "Pool_ID": "SUPPORT_STANDARD_01",
    "Pool_Type": "Support",
    "Pool_Positioning": "Nurture_Depth",
    "Featured_SSR": ["SUP_ZHAO_SSR_01"],
    "SR_Rate": 0.25,
    "SSR_Rate": 0.05,
    "Pity_Small": 50,
    "Pity_Big": 200,
    "Pity_Independent": true
  },
  "Player_Gacha_State": {
    "General_Pool": {
      "Pull_Count": 47,
      "Pity_Counter": 147,
      "Bonding_Points": 320
    },
    "Support_Pool": {
      "Pull_Count": 12,
      "Pity_Counter": 12
    }
  },
  "Player_Currency": {
    "Spirit_Jade": 1200,
    "Bronze_Charm": 450,
    "Divination_Token": 2
  }
}
}
```

### Server 端
| 欄位 | 型別 | 說明 |
|---|---|---|
| Player_ID | VARCHAR(32) FK | 玩家 |
| Pool_ID | VARCHAR(32) FK | 池子 ID |
| Total_Pulls | INT | 累計抽數 |
| Pity_Counter | INT | 大保底計數器 |
| Bonding_Points | INT | 結義點數 |
| Last_SSR_Pull | INT | 上次出 SSR 的抽數 |

---
