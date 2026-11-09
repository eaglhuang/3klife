<!-- doc_id: doc_spec_0342 -->
# 特殊兵種與虎符UI多語系鍵值字典規格書

> **文件狀態**：單一真相來源（Single Source of Truth）  
> **系統代碼**：`TRP-19`、`SYS-TROOP-TALLY-I18N`  
> **核心職責**：確立三國三十四營特殊兵種、虎符裝配面板、出征調度卡面之 UI 多語系鍵值命名標準（`UI_TROOP_*`、`UI_TALLY_*`）與字典結構，徹底根絕前端介面與字串資源中的硬編碼。

---

## 1. 鍵值命名規範原則

1. **模組前綴隔離**：
   - 兵種本體資訊統一採用 `UI_TROOP_` 前綴。
   - 虎符裝配與糧草計費面板統一採用 `UI_TALLY_` 前綴。
2. **層級語義命名**：
   - `{前綴}_{屬性類別}_{營別/動作標識}`（一律使用大寫蛇形命名）。
3. **無硬編碼鐵律**：
   - 所有 UI 元件（`TigerTallyComposite`, `EliteTroopCodexComposite`）必須透過本地化解析器 `i18n.t(key)` 讀取文字，禁止直接呈現未經查表之字串。

---

## 2. 鍵值規格表（Key Conventions）

| 鍵值範式 (Key Pattern) | 說明與作用範圍 | 範例鍵值 | 繁體中文標準文案範例 |
|---|---|---|---|
| `UI_TROOP_NAME_{CAMP}` | 兵種營別全稱 | `UI_TROOP_NAME_TIGER_LEOPARD` | 虎豹騎 |
| `UI_TROOP_DESC_{CAMP}` | 兵種歷史背景與軍勢說明 | `UI_TROOP_DESC_TIGER_LEOPARD` | 曹魏精銳鐵騎，驍勇善戰，百人一選。 |
| `UI_TROOP_TACTIC_{CAMP}` | 專屬特殊戰法名稱 | `UI_TROOP_TACTIC_TIGER_LEOPARD` | 迅雷奔襲 |
| `UI_TROOP_EFFECT_{CAMP}` | 戰鬥機制與加成摘要 | `UI_TROOP_EFFECT_TIGER_LEOPARD` | 突擊暴擊率 +20%，追擊位移 +1 格 |
| `UI_TALLY_GRAIN_COST` | 出征糧草消耗標籤 | `UI_TALLY_GRAIN_COST` | 出征糧耗：%d 斛 |
| `UI_TALLY_STAR_BONUS` | 虎符星級加成標籤 | `UI_TALLY_STAR_BONUS` | 星級共鳴：%s 階 |
| `UI_TALLY_DEPLOY_LIMIT` | 全場出陣限制提示 | `UI_TALLY_DEPLOY_LIMIT` | 本營全場僅限調遣 1 隊 |
| `UI_TALLY_EQUIP_SUCCESS`| 虎符裝配成功反饋 | `UI_TALLY_EQUIP_SUCCESS` | 已將【%s】授與主將【%s】 |

---

## 3. 多語系字典結構範例（四語系架構）

```json
{
  "zh-TW": {
    "UI_TROOP_NAME_WHITE_FEATHER": "白毦兵",
    "UI_TROOP_DESC_WHITE_FEATHER": "蜀漢中軍禁衛，陳到督統，以丹陽精兵為底，誓死衛主。",
    "UI_TROOP_TACTIC_WHITE_FEATHER": "白毦禦陣",
    "UI_TALLY_GRAIN_COST": "出征糧耗：%d 斛",
    "UI_TALLY_DEPLOY_LIMIT": "本營全場僅限調遣 1 隊"
  },
  "zh-CN": {
    "UI_TROOP_NAME_WHITE_FEATHER": "白毦兵",
    "UI_TROOP_DESC_WHITE_FEATHER": "蜀汉中军禁卫，陈到统率，以丹阳精锐为底，誓死卫主。",
    "UI_TROOP_TACTIC_WHITE_FEATHER": "白毦御阵",
    "UI_TALLY_GRAIN_COST": "出征粮耗：%d 斛",
    "UI_TALLY_DEPLOY_LIMIT": "本营全场仅限调遣 1 队"
  },
  "en": {
    "UI_TROOP_NAME_WHITE_FEATHER": "White Feather Guard",
    "UI_TROOP_DESC_WHITE_FEATHER": "Shu Han elite guard led by Chen Dao, famed for absolute loyalty.",
    "UI_TROOP_TACTIC_WHITE_FEATHER": "Feather Phalanx",
    "UI_TALLY_GRAIN_COST": "Grain Cost: %d",
    "UI_TALLY_DEPLOY_LIMIT": "Deployment limit: 1 unit per battle"
  },
  "ja": {
    "UI_TROOP_NAME_WHITE_FEATHER": "白毦兵",
    "UI_TROOP_DESC_WHITE_FEATHER": "蜀漢の中軍親衛隊。陳到が率い、主君を死守する精鋭。",
    "UI_TROOP_TACTIC_WHITE_FEATHER": "白毦の陣",
    "UI_TALLY_GRAIN_COST": "兵糧消費：%d 斛",
    "UI_TALLY_DEPLOY_LIMIT": "戦場出陣制限：1部隊のみ"
  }
}
```

---

## 4. 驗收標準與 CI 閘門（Acceptance Criteria）

1. **34 營完整性校驗**：
   - 字典內必須 100% 覆蓋已收錄之 34 營特殊兵種名稱、說明與專屬戰法鍵值。
2. **安全回退保障**：
   - 當缺少目標語系條目時，依 `TargetLang -> zh-TW -> zh-CN -> [KeyName]` 降級，禁止回傳 undefined。
3. **無未解引用**：
   - UI 面板靜態掃描中不包含任何裸露之硬編碼兵種中文。
