<!-- doc_id: doc_spec_1283 -->
# 武將私塾補習班系統規格書（分片索引） — 10–17 共用框架對應與占用衝突規則、伺服器 API、存檔、JSON 草案、驗收、待決選擇題、建議實作卡

> 這是 `武將私塾補習班系統規格書.md` 的「10–17」分片。完整索引見 `docs/遊戲規格文件/系統規格書/武將私塾補習班系統規格書.md`。

## 10. 共用框架對應（只寫差異，不另起一套）

### 10.1 繼承的 base

| 本書玩法 | 繼承的 base | 只寫差異 |
| --- | --- | --- |
| 私塾榜（可報名班級列表） | **商店 SHP**（doc_spec_1183）`shop.list／shop.shelf／shop.rotated` | `shopId=tutor:board`；每個 SKU＝一個班級，庫存＝剩餘名額；每季換期；貨架內容由 7.5 節確定性函式產生（`dynamic=true`，第 16 章 PS-4 需確認 SHP 是否支援動態貨架） |
| 學費、開班費、退費 | **商店 SHP**＋錢包（貨幣：**銀兩**，家族） | `shop.buy`、`shopId=tutor:<schoolId>`；託管（escrow）只是私塾包裝層的簡單狀態（金額、付款人、收款人），**扣款與撥款仍走商店／獎勵命令，不自己改錢包**。若 SHP 之後原生提供「託管／預收款」，改接之 |
| 推薦卡、發放與到期 | **物品庫存 ITM**（doc_spec_1184） | `category=tutorReferral`、`bind=household`、`teacherId`、`expiresInSeasons=4`；與 `supportCard`、`mentorCard` 互不相通 |
| 推薦卡來源、友誼 Lv3 禮、專長經驗發放 | **獎勵 RWD**（doc_spec_1186）`reward.grant` | 獎池 `tutor.referral`；`attrExp` 類獎勵（與內政實習同一路徑）；不新增獎勵種類 |
| 學戰法、家傳奧義外傳版 | **技能 SKL**（doc_spec_1187）`skill.canLearn／skill.learn` | `source=tutorClass`；`tutorSkillLvCap=3`；外傳版奧義旗標 `outsiderArt`（威力表引用 doc_spec_0448，不另定） |
| 一期上課進度、戰法跨期學習進度 | **任務 QST**（doc_spec_1185） | `taskKind=tutorTerm`（每位學生每期一筆，步驟＝6 堂到課）、`taskKind=tutorCourse`（戰法／奧義跨期進度）；結算交 RWD 與 escrow |
| 同學小事件、教室演出 | **劇情 STY**（doc_spec_1188） | `kind=tutorClassmate`、`TUTEVT_*`；不新增播放層 |
| 在期間占用老師與學生 | **占用 OCC**（doc_spec_1248） | 新增兩種可寫占用 `tutorTeach`、`tutorLearn`，見 10.2；矩陣新增 `yield` 欄位 |
| 友誼 | **本書新增服務**（8.2 節建議升為第 8 框架 REL） | `friendship.*` API；稀疏偏移量存檔；公式純函式 |
| 存檔與 API | **共通 API 層**（總綱第 5 章） | 全部命令走 `IApiClient`；本機由 adapter 實作；`check-api-bypass` 納入新模組 |

不新增：獨立背包、獨立錢包、獨立抽獎、獨立事件引擎、獨立技能系統。

### 10.2 OCC 新增種類與衝突規則

私塾是**下班後的副業**，所以占用 OCC 但**優先序最低**：能與日班工作共存；遇到更優先的占用，**私塾讓位（休課／休學）**，而不是擋住對方。

新增兩種占用（`occupancy-kind.v1`）：

```json
{ "id": "tutorTeach", "writable": true, "owner": "tutor", "labelKey": "occ.tutorTeach", "yield": true },
{ "id": "tutorLearn", "writable": true, "owner": "tutor", "labelKey": "occ.tutorLearn", "yield": true }
```

占用紀錄：`{ personId, kind:"tutorTeach"|"tutorLearn", refId:"ts:<schoolId>:<term>", since:<開學季>, until:<期末季> }`，一期一季，**季末自動釋放**，沒有 `sub`。AI 武將私塾**不登記**占用（虛擬）。

**與既有占用的共存與衝突表**（列的是 `tutorTeach`；`tutorLearn` 欄位完全相同，另註兩者互相共存）：

| 對方占用 | 能否共存 | 說明 |
| --- | --- | --- |
| `governance`（太守） | **共存** | 白天治理，晚上開班 |
| `hallMission`（大廳任務、內政實習） | **共存**（全類別） | 下班後；與 9198 的待產＋內政限制無關 |
| `estate`（家業，預留） | **共存** | 任何崗位 |
| `mentorAssign`（教官指派） | **共存** | 退居幕後的老將可同時當教官與開私塾；注意兩者**不同槽、不同收入、不同系統**（第 2 章） |
| `medical(pregnant／nursing)` | **共存** | 待產、哺乳可在家開班或上課（延續 11/21 裁決 #19 低風險原則） |
| `campaign(defense)`（守城） | **共存** | 守城在本城，晚上照常 |
| `campaign(sortie)`（出征） | **私塾讓位** | 出征登記成功；私塾進 `paused`（老師）或該生本期缺課（學生）；出征確認視窗加一行提示「該武將的私塾將休課，學費退回」 |
| `mercenary`、`dispatch`、`expedition` | **私塾讓位** | 同上 |
| `academy`（學府入學） | **私塾讓位，且自動退學** | `academy` 與一切互斥（既有規則，入學即卸任其他職務）：老師開班中入學 → 私塾結業；學生入學 → 退學並退還未上堂數學費 |
| `medical(injured)` | **私塾讓位** | 重傷不可派（既有規則） |
| `tutorTeach` 與 `tutorLearn`（同一人） | **共存** | 老師可去上別人的班；**不得上自己的班**（`E_TUTOR_SELF`） |

**`yield` 欄位語意（新增，向後相容）**：`occupancy-matrix.v1` 的預設仍是 `exclusive`；`yield:true` 的種類在「對方要登記而互斥」時**不阻擋對方**，而是：① 先發 `tutor.suspend` 事件讓私塾休課（退費與缺課在包裝層處理）；② 再讓對方登記成功。反過來，**開班或報名時若遇到既有的互斥占用，仍然是被擋**（`E_OCC_CONFLICT`），因為你不能在忙的時候新開副業。除 `tutorTeach／tutorLearn` 外，目前沒有第三種 `yield` 種類。

**每人每種占用一筆**：一人同時只有一個 `tutorTeach`（一間私塾）與一個 `tutorLearn`（一期只報一個班，`maxEnrollPerTerm=1`），避免變成「全天補習」。

### 10.3 其他既有規則對照

| 既有裁決／規格 | 在本書的落實 |
| --- | --- |
| 時間流速人人相同（11/21 裁決 16） | 私塾**不提供**加速孩子成長或縮短年齡的任何效果；成長量只有專長經驗、友誼、戰法 |
| 子嗣含親生、義子、家臣子（裁決 17） | 三者皆可上私塾；家臣及其子嗣同樣可報名（家臣視為同家族，上自家私塾免學費；上他人私塾照付） |
| 學府入學是加分選項（裁決 24） | 私塾不是學府替代；不入學者也可上私塾補強，但受 `annualExpCap`；學府專屬戰法不外傳 |
| 教官就是武將、不設教官卡（裁決 4，後由 doc_spec_1264 恢復教官池） | 私塾老師是武將本人；支援卡不可開班、不計入（第 2 章） |
| 主角不死不老（裁決 21） | 主角可開班、可報名；「老師身故」規則對主角不生效 |
| 金＝國家、銀兩＝家族（裁決 14、doc_spec_1241 4.4） | 學費、開班費、推薦卡商店價一律銀兩；連線券、靈玉**不能**付學費 |
| 手機記憶體優先 | 教室用小頭像圖集與節點重用；友誼索引只在記憶體建，不存檔；`friendship` 預算 ≤ 140 KB |

## 11. 伺服器 API（單機由本機 adapter 實作；命令名遵循總綱 5.3 封包格式）

### 11.1 私塾命令

| 命令 | 輸入 | 說明 | 主要錯誤碼 |
| --- | --- | --- | --- |
| `tutor.canOpen` | `teacherId` | 回傳可否開班與缺項（3.1 節） | — |
| `tutor.open` | `teacherId, name?, curriculum[], tuitionMul, openToOutsiders?, kgEnabled?, idemKey` | 開班（扣開班費、登記 `tutorTeach`、建立 `tutor-school.v1`） | `E_TUTOR_NOT_ALIVE`、`E_TUTOR_NO_SUBJECT`、`E_OCC_CONFLICT`、`E_SHOP_INSUFFICIENT` |
| `tutor.update` | `schoolId, curriculum?, tuitionMul?, openToOutsiders?` | 下期生效 | `E_TUTOR_LOCKED`（本期已開學） |
| `tutor.close` | `schoolId` | 結業；本期學生退費 | — |
| `tutor.board` | `filters?, page` | 私塾榜（SHP 貨架包裝） | — |
| `tutor.enroll` | `studentId, schoolId, classType, payWith:{silver\|referralItemId}, idemKey` | 報名（`shop.buy`＋ITM 消耗＋登記 `tutorLearn`＋建立 `taskKind=tutorTerm`） | `E_TUTOR_FULL`、`E_TUTOR_AGE`、`E_TUTOR_HOSTILE`、`E_OCC_CONFLICT`、`E_TUTOR_SELF`、`E_TUTOR_ONE_PER_TERM` |
| `tutor.withdraw` | `studentId, schoolId` | 退學：未開學全退；已開學按未上堂數退 | — |
| `tutor.classroom` | `schoolId` | 本期名單（含友誼等級批次查詢）、同桌 | — |
| `tutor.pickDeskmate` | `schoolId, studentId, partnerId` | 玩家指定同桌（可略） | — |
| `tutor.issueReferral` | `schoolId, toPersonId` | 老師發推薦卡（每期 `referralPerTerm`） | `E_TUTOR_REFERRAL_LIMIT` |
| `tutor.settleTerm` | （由季結算呼叫，**不給客戶端**） | 模擬 6 堂、成長、友誼、escrow、占用釋放、休課判斷 | — |
| `tutor.suspend` | （OCC `yield` 觸發，內部事件） | 休課／休學處理 | — |

### 11.2 友誼命令

| 命令 | 輸入 | 說明 |
| --- | --- | --- |
| `friendship.get` | `a, b` | 回 `{fs, lv, prior, delta, parts:{H,Rt,Sm,Cl,Kd,Fa,Bl,Te,Sx,Jt}}`（`parts` 供 UI 顯示三條主要來源） |
| `friendship.list` | `personId, minLv?, limit` | 7.8 節 `friendsOf` |
| `friendship.batch` | `pairs[]` | 教室名牌批次查詢（一次最多 64 對） |
| `friendship.add` | `a, b, amount, reason, observed?, idemKey` | **權威寫入**：套每季上限、更新偏移量、必要時升 C；回新等級與 `levelChanged` |
| `friendship.touch` | `personId, reason` | 升為接觸者 C |
| `friendship.setFlag` | `a, b, flag` | 旗標（結義、同窗、同門…），只由伺服器內部流程呼叫 |

事件：`tutor.changed`、`tutor.suspended`、`friendship.changed`、`friendship.levelChanged`（含 `a,b,lvOld,lvNew`，供 STY 與 RWD 訂閱）。

### 11.3 冪等與防作弊

沿用總綱 5.4、5.11：所有寫入命令帶 `idemKey`；`friendship.add` 的上限與衰退在伺服器算，客戶端送的 `amount` 只是請求；`friendship` 為 `critical` 欄位，`save.commit` 補丁寫入一律 `E002 PATCH_PATH_FORBIDDEN`。

## 12. 存檔

新增（只增不改，舊檔缺值補預設）：

```json
{
  "tutor": {
    "v": 1,
    "schools": { "ts:g_zhaoyun": { "...見 3.5 節 tutor-school.v1": 0 } },
    "enrollments": [
      { "studentId": "c_0007", "schoolId": "ts:g_zhaoyun", "term": 11, "classType": "kg", "paid": 20, "payWith": "silver", "lessonsAttended": 0, "state": "enrolled" }
    ],
    "history": { "c_0007": ["g_zhaoyun@11"] },
    "escrow": { "esc:ts:g_zhaoyun:11": { "payer": "hh:player", "payee": "hh:player", "total": 20, "released": 0 } },
    "annual": { "2087": { "c_0007": 6.0 } },
    "aiIncome": { "2087": 340 }
  },
  "friendship": { "...見 7.7 節": 0 }
}
```

- `history[personId]`：師事過的老師（`老師id@期`），提供 `Sm` 同門輸入（`masterIds`）。
- `annual`：每人每年私塾經驗，限 `annualExpCap`。
- `aiIncome`：本年度從 AI 學生收入的銀兩，限 `aiTuitionAnnualCapPerHousehold`（7.5 節招生與 Q-T7）。
- 進行中的期不中斷；`tutor.settleTerm` 失敗時以 `saveRev` 對帳重試（總綱 5.6）。

## 13. JSON 草案（企劃自決，數值可調）

### 13.1 檔案

| 檔案 | 位置 | 內容 |
| --- | --- | --- |
| `tutor-config.json` | `assets/resources/data/tutor/` | 學費、容量、級別、成長、上限 |
| `friendship-prior.json` | `assets/resources/data/friendship/` | 推算公式權重、史實配對、性格向量表引用 |
| `friendship-levels.json` | 同上 | 等級門檻、緩衝、效益 |
| `tutor-referral-item.json` | `assets/resources/data/items/` | 推薦卡 ItemDef |
| `occupancy-kind.json`（既有，加 2 列）／`occupancy-matrix.json`（既有，加 allow 與 `yield`） | `assets/resources/data/occupancy/` | 第 10.2 節 |

### 13.2 `tutor-config.json`

```json
{
  "schema": "tutor-config.v1",
  "open": { "minAge": 20, "minTeachStat": 60, "minSkillLv": 3, "openFeeSilver": 30, "maxSchoolsPerGeneral": 1, "retainerLoyaltyMin": 40 },
  "student": { "kgMinAge": 5, "kgMaxAge": 9, "stdMinAge": 10, "maxEnrollPerTerm": 1 },
  "term": { "quarters": 1, "lessons": 6 },
  "tuition": {
    "base": { "kg": 20, "std": 40 },
    "gradeMul": { "D": 0.5, "C": 1.0, "B": 1.5, "A": 2.5, "S": 4.0 },
    "gradeCut": { "C": 60, "B": 75, "A": 90, "S": 100 },
    "bandMin": 0.5,
    "freeWithinHousehold": true,
    "aiPayRatio": 0.6,
    "aiTuitionAnnualCapPerHousehold": 1200
  },
  "tiers": [
    { "name": "私塾",     "repMin": 0,  "capacity": 6, "tuitionMulMax": 1.5 },
    { "name": "書塾",     "repMin": 30, "capacity": 7, "tuitionMulMax": 2.0 },
    { "name": "講堂",     "repMin": 60, "capacity": 8, "tuitionMulMax": 2.5 },
    { "name": "名門學苑", "repMin": 90, "capacity": 8, "tuitionMulMax": 3.0 }
  ],
  "rep": { "perTerm": 2, "perClassmatePair": 1 },
  "growth": {
    "expPerLesson": { "std": 1.0, "kg": 0.5 },
    "specialtyMatchMul": 1.5,
    "gradeAUpMul": 1.2,
    "teacherLearnExpPerLesson": 0.5,
    "annualExpCap": 24,
    "skillLessons": { "common": 6, "rare": 12, "epic": 18 },
    "tutorSkillLvCap": 3,
    "clanArt": { "insightPerTerm": 2, "awakenBonusPctPerTerm": 2, "awakenBonusPctMax": 10, "outsiderLessons": 24, "outsiderFriendLvMin": 3, "outsiderLifetimeLimit": 1, "outsiderTeacherClanFameCost": 1 },
    "blockedSkillSources": ["academy", "hybrid", "ultimate"]
  },
  "referral": { "perTermPerTeacher": 2, "expiresInSeasons": 4, "teacherFriendGain": 5, "teacherRepGain": 1 },
  "ai": { "openRateBase": 15, "openRatePerStatOver60": 0.5, "openRateMax": 40, "fill": 0.7, "demandBase": 0.45, "demandPerTier": 0.1, "demandPricePenalty": 0.3 }
}
```

### 13.3 `friendship-prior.json`

```json
{
  "schema": "friendship-prior.v1",
  "historical": { "sworn": 90, "spouse": 70, "mentor": 55, "lordVassal": 45, "comrade": 35, "rival": -60, "enemy": -80 },
  "relationType": { "COMRADE": 40, "SPOUSE": 60, "PARENT_CHILD": 80, "SWORN_BROTHER": 90 },
  "sameMaster": { "perMaster": 12, "maxMasters": 2, "minTerms": 2 },
  "classmate": 10,
  "childhoodFriend": 8,
  "faction": { "same": 8, "allied": 3, "hostile": -8 },
  "blood": { "degree1": 30, "degree2": 15, "degree3": 8, "sameSurname": 3 },
  "temperament": { "scale": 10, "dims": ["剛毅", "謀略", "仁厚", "豪爽", "多疑"] },
  "sharedExperience": { "perItem": 2, "cap": 10 },
  "jitter": { "min": -3, "max": 3 },
  "noHistoryCap": 55,
  "cache": { "max": 2048, "clearOnSeason": true },
  "store": { "maxEdges": 4000, "maxTouched": 1500, "decayPerSeason": 1, "relationDecayPerSeason": 2 },
  "change": {
    "lesson": 2, "deskmate": 3, "compatMul": 1.25, "clashMul": 0.5, "compatMin": 3, "clashMax": -5,
    "teacherLesson": 2, "interact": 10, "sortie": 3,
    "capPerPairPerSeason": { "lesson": 16, "teacher": 12, "interact": 20, "sortie": 9, "negative": -20 }
  }
}
```

### 13.4 `friendship-levels.json`

```json
{
  "schema": "friendship-levels.v1",
  "downgradeBuffer": 3,
  "levels": [
    { "lv": -2, "name": "宿敵",     "max": -60 },
    { "lv": -1, "name": "對手",     "min": -59, "max": -30 },
    { "lv":  0, "name": "陌生",     "min": -29, "max": 19 },
    { "lv":  1, "name": "點頭之交", "min": 20,  "max": 39 },
    { "lv":  2, "name": "熟識",     "min": 40,  "max": 59 },
    { "lv":  3, "name": "好友",     "min": 60,  "max": 79 },
    { "lv":  4, "name": "摯友",     "min": 80,  "max": 94 },
    { "lv":  5, "name": "至交",     "min": 95,  "max": 100 }
  ],
  "effects": {
    "3": { "synergyPct": 3, "referralGift": 1, "foreignDiplomacy": 2 },
    "4": { "escortChancePct": 15, "escortShare": 0.2, "unlockEvent": "TUTEVT_EXCEPTION_TEACH" },
    "5": { "annualReunionEvent": "TUTEVT_REUNION" }
  },
  "stack": "max"
}
```

### 13.5 推薦卡 `ItemDef`

```json
{ "id": "ITEM_TUTOR_REFERRAL", "category": "tutorReferral", "bind": "household", "stackable": true,
  "props": { "teacherId": null, "expiresInSeasons": 4, "freeTerms": 1 }, "labelKey": "item.tutorReferral" }
```

## 14. 驗收（供實作卡直接引用）

1. **TC-TUT-01 開班資格**：已故武將、支援卡、15 歲少年、重傷武將開班皆被拒；65 歲退役在世的趙雲可開班；扣 30 銀兩並登記 `tutorTeach`。
2. **TC-TUT-02 下班後共存**：同時是太守的武將開班成功；`occupancy.check` 回共存；同一人第二間私塾被拒（`maxSchoolsPerGeneral`）。
3. **TC-TUT-03 出征讓位**：開班老師被指派 `campaign(sortie)` → 出征成功、私塾 `paused`、全班學費退回；反向：已出征者開班被 `E_OCC_CONFLICT` 擋。
4. **TC-TUT-04 入學讓位**：學生 15 歲入學學府 → 自動退學、退未上堂數學費；老師入學 → 私塾結業。
5. **TC-TUT-05 幼幼班年齡**：4.75 歲孩子報幼幼班被拒；開蒙後 5.0 歲通過；10.0 歲只能報一般班；孩子報名不產生戰法學習。
6. **TC-TUT-06 學費與託管**：A 級老師一般班建議價 100；玩家報名先扣 100 進 escrow；缺 2 堂結算 → 付老師 67（四捨五入）、退 33；同家族學費為 0。
7. **TC-TUT-07 推薦卡**：持通用推薦卡報名免學費並消耗卡；指定他人老師的卡不能用；老師端得友誼 +5、`schoolRep` +1；過期卡被 `inventory.expired` 清除。
8. **TC-TUT-08 教室看得到同學**：進教室顯示名牌列、容量上限 8；玩家家族成員金邊；點名牌看到友誼三條來源。
9. **TC-TUT-09 友誼增長與上限**：兩人同班 6 堂（含同桌 2 堂）→ 偏移量增加但不超過每季 +16；整季未互動 → 偏移量回歸 1；同窗旗標成立後 `Cl +10`。
10. **TC-TUT-10 AI–AI 不存**：兩位 AI 武將（X–X）互動前後存檔 `friendship.edges` 不新增；`friendship.get` 結果為純 `prior`；同一世界種子重開結果相同。
11. **TC-TUT-11 推算上限**：無史實／動態關係的兩人 `prior` 不超過 55；歷史義兄弟（劉備、關羽）`prior ≥ 90`。
12. **TC-TUT-12 稀疏儲存**：1,000 人名冊壓力測試，邊數 ≤ `maxEdges`；超過時按 7.6 節規則修剪且不刪旗標邊；存檔大小 ≤ 預算。
13. **TC-TUT-13 家傳奧義**：本姓子嗣上 4 期後覺醒機率加成 +8%（≤ +10%）；外姓無友誼 Lv3 不顯示該課；外傳版威力為 50%、無質變；一生只能學一個。
14. **TC-TUT-14 不混用**：支援卡不可報名私塾；私塾不產生支援卡經驗；學府專屬戰法不在私塾課程選單中。
15. **TC-TUT-15 年度上限**：同一人一年內私塾專長經驗累積到 24 後，當年後續堂數不再加經驗，友誼仍增長。
16. **TC-TUT-16 API 旁路**：玩法／UI 程式直接改 `friendship` 或 `tutor` 欄位被 `check-api-bypass` 擋下。

## 15. 待決選擇題（推薦項放第一個；數值已由企劃自決，不列題）

| # | 題目 | 選項（第一個為建議） | 影響 |
| --- | --- | --- | --- |
| **Q-T1** | 幼幼班的入班門檻？使用者口述「5 歲抓周後」，但現行是 1 歲抓周、5 歲開蒙 | **A 開蒙後（滿 5 歲）**；B 抓周後（滿 1 歲）；C 滿 3 歲 | 3.2 節；B 會讓 1 歲嬰兒上課，不合理 |
| **Q-T2** | 退役在世的老將可否開班？ | **A 可以（在世即可）**；B 只限現役；C 65 歲前才可 | 3.1 節；A 與「老將退居幕後」一致 |
| **Q-T3** | 友誼是否升格為第 8 個共用框架「關係 REL」？ | **A 升為候選框架，第一版只做「配對分數＋稀疏偏移量＋等級」，API 先用 `friendship.*`**；B 只在私塾內部使用，其他系統維持各自好感；C 先不決定 | 8.2 節；A 能收斂四套好感，減少日後重複寫 |
| **Q-T4** | 學費要不要接付費商品？ | **A 第一版不接付費：學費只用銀兩，推薦卡只靠贈與、友誼獎勵與活動（與家業第一版不接付費一致）**；B 賣推薦卡禮包（付費）；C 付費加席位／加速（**不建議**，破壞「時間人人相同」精神） | 4.1、4.3 節；商業化價格另問 |
| **Q-T5** | 友誼對稱還是不對稱？ | **A 對稱：一個值代表雙方**；B 不對稱：每人對對方各一個值 | 7.1 節；B 儲存加倍、UI 複雜，劇情上「單戀」可用事件旗標表達 |
| **Q-T6** | 宿敵（Lv −2）是否要有戰場懲罰？ | **A 只觸發事件，不扣戰力**；B 同編制士氣 −5 | 8.1 節；A 避免玩家被迫拆陣容 |
| **Q-T7** | 玩家私塾向 AI 學生收的學費要不要設年度收入上限？ | **A 設上限（每家每年 1,200 銀兩，`aiTuitionAnnualCapPerHousehold`）**；B 不設，靠容量自然限制 | 13.2；若 20 位家臣各開班，無上限會變無限印鈔機 |
| **Q-T8** | 家傳奧義外傳：外姓學生一生可學幾個？ | **A 一個**；B 不限（每次要老師同意與友誼門檻） | 6.3 節；A 保護「非本姓絕學弱化」的稀缺性 |
| **Q-T9** | 第一版教室做到什麼程度？ | **A 簡版教室：名牌列＋每堂一句結算文字＋友誼面板，不做動畫**；B 完整教室（立繪、動作、同桌互動動畫）；C 只做文字清單 | PS-7；B 可後補 |
| **Q-T10** | 私塾榜是否包含他國私塾？ | **A 包含（非交戰國），報名他國私塾有機會認識他國人才**；B 只含本國與自家 | 3.2 節；A 對外交與友誼有趣，也符合「任何人都能上」 |

## 16. 建議實作卡（只列建議，不開卡；卡號由總 PM 核發；順序依依賴）

> 依總綱第 9 章：實作卡第一張一律是 API 層。本書各卡都依賴「共通 API 層＋本機 adapter＋存檔走 API」（PROG-2-9200 系列）與 OCC-M（PROG-2-9207）。

| 卡 | 內容 | 依賴 | 驗收（對應第 14 章） |
| --- | --- | --- | --- |
| **PS-1** | 友誼核心：`friendship-prior/levels.json`、`computePrior` 純函式、稀疏邊表存檔、`friendship.*` API、記憶體索引、修剪與衰退、單元測試 | API 層 | TC-TUT-09～12、16 |
| **PS-2** | OCC：新增 `tutorTeach／tutorLearn`、矩陣 allow 與 `yield` 欄位、讓位事件、出征確認視窗提示、測試 | OCC-M、PS-1 不依賴 | TC-TUT-02～04 |
| **PS-3** | 私塾資料與開班：`tutor-config.json`、`tutor-school.v1`、`tutor.canOpen／open／update／close`、資格檢查、家臣命令開班 | PS-2 | TC-TUT-01、02 |
| **PS-4** | 私塾榜與報名：SHP 動態貨架（確認 SHP 支援）、`tutor.board／enroll／withdraw`、escrow、推薦卡 ItemDef 與發放、AI 學生收入上限 | PS-3、SHP、ITM | TC-TUT-05～07 |
| **PS-5** | 季結算與成長：`taskKind=tutorTerm／tutorCourse`、`tutor.settleTerm`、專長經驗、技能課（`source=tutorClass`）、家傳奧義課與外傳版、年度上限 | PS-1、PS-4、QST、SKL | TC-TUT-06、13、15 |
| **PS-6** | AI 私塾確定性生成：`opens／roster／sharedClassTerms`、招生模型、鄰近學校索引、快取 | PS-1 | TC-TUT-10 |
| **PS-7** | UI：私塾榜、教室畫面（簡版）、友誼面板、武將詳情【開班】入口、手機記憶體檢查 | PS-4、PS-5、UCUF 流程 | TC-TUT-08 |
| **PS-8** | 劇情：同學小事件 12 則（`TUTEVT_*`）、事件條件、選項效果、文案審稿（世界觀與時事梗規範） | PS-5、STY | 玩家視角驗收 |
| **PS-9** | 既有系統接線：學府同窗結業換算、`DynamicRelationRecord.intimacy` 唯讀投影、戰場援護 Lv4 取 max、`classmateSynergyPct` 取 max、外交 +2 | PS-1 | 相關既有測試不退化 |
| **PS-10** | 玩家視角 QA：一年循環中開班、報名、休課、友誼升級、教室畫面逐項實點截圖 | PS-1～9 | 截圖證據 |

關聯：總綱第 11 章「候選新框架」可新增 REL 一項（待決 Q-T3）；學府支援卡實作卡 SUP-* 與本書互不相依。

## 17. 一頁版世界觀與文案範例（供 STY 與商店文案直接取用）

1. 私塾榜標題：「**下班後補習班**：名師全天上班，晚上才有空教你。」
2. 開班按鈕：「申請開直播間」；成功：「認證通過！記得別在課堂上喝酒（對，說的就是你，張飛）。」
3. 報名成功：「已報名。學費已託管，老師遲到時我們會幫你要回來。」
4. 休課公告（出征）：「老師臨時出差，本期停課。學費原路退回，作業照寫。」
5. 友誼升級 Lv3：「你與 {name} 的友誼升級為**好友**！對方已將你設為『特別關注』。」
6. 友誼降級：「你與 {name} 的友誼降到**熟識**。對方開始已讀不回。」
7. 推薦卡說明：「憑卡免學費，老師說這叫人情。人情用完了，就要靠真本事。」
8. 家傳奧義課說明：「本班不外傳。老師說：『家傳的，哪能亂傳？』（舉牌：本班不外傳，除非你請他吃飯三次。）」
9. 幼幼班公告：「學前班，主修午睡與背三字經。家長請勿在窗外揮手，孩子會分心。」
10. 同學事件示例（呂布同桌）：「你好，我是呂布。」（空氣凝結）選項：「我知道，你不用每次自我介紹」／「我是你新同桌，請多指教」。
