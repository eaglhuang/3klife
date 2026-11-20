# 學府修業畫面與接線設計（分片索引） — 2–3 引擎 API 速查、畫面總覽與記憶體限制

> 這是 `學府修業畫面與接線設計.md` 的「2–3 引擎 API 速查、畫面總覽與記憶體限制」分片。完整索引見 `docs/遊戲規格文件/系統規格書/學府修業畫面與接線設計.md`。

## 2. 引擎 API 速查（接線依據）

| 用途 | API | 備註 |
| --- | --- | --- |
| 建快照 | `createAcademySnapshot(admission, gimmick?)`；`AcademyAdmission`：`worldSeed`、`clanUuid`、`childId`、`academyId`、`admissionTurn`、`initialStats`、`controlMode?`、`initialEnergy?` | `initialStats` 取子嗣抓周後五維；`admissionTurn` 取目前總季數 |
| 潁川指派教官 | `assignYingchuanMentors(state, mentors)` | 入學後立即呼叫；教官插槽 3（祠堂 Lv.4 起 +1，`mentorSlots`） |
| 先祖傳承 | `AcademyStateSnapshot.legacySupport`（`statBonusPct`、`traitSeeds`、`weightedBlueStars`、`primaryStat`、`pinkStars`、`pinkAptitudeTarget`） | 選先祖教官時由宿主組出，入學前寫進快照 |
| 推進一步 | `AcademyAntiSLManager.commit(action)`（內部呼叫 `resolveAcademyAction`）；`actionType`：`TRAIN`（`targetStat`）、`REST`、`GIMMICK_INTERACT`（`selectedOptionId`）、`RESOLVE_INTERRUPT`（`selectedOptionId`） | 先落盤再回傳；寫失敗丟 `AcademyStorageError` |
| 確認結算 | `acknowledge()` | 結算畫面播完或玩家按確認後呼叫，歸零異常計數；未確認時下一次 `commit` 會丟錯 |
| 讀檔還原 | `recover()` 回傳 `AcademyRecoveryResult`（`snapshot`、`recovered`、`warning`、`penalized`） | 重開機時呼叫；`recovered` 為真時略過動畫直接顯示結果 |
| 開局寫入 | `begin(snapshot)` | 入學時呼叫一次 |
| 打斷判斷 | `snapshot.pendingInterrupt`（`MIDTERM`／`COMING_OF_AGE`／`RESONANCE`／`GRADUATION`）與 `snapshot.interruptOptions` | 有值時引擎只接受 `RESOLVE_INTERRUPT` |
| 專屬互動阻擋 | `gimmick.blockingInteraction(state)`（潁川：`DEBATE`／`EVENT`） | 非 null 時不可訓練或休息，須先 `GIMMICK_INTERACT` |
| 結業寫回 | `GameSession.graduateFromAcademy(generalId, snapshot)` | 內部 `applyAcademyGraduation`，已含自動存檔 |
| 開獎演出 | `LobbyScene.showAcademyInheritDraw(before, after, ancestorName?)` | 第 12／24 回合打斷結算後呼叫 |
| 結業彈窗 | `LobbyScene.showAcademyGraduation(generalId, snapshot)` | 結業後呼叫 |

資料契約補充：存檔紀錄 `AcademySaveRecord` 含 `committed`／`before`／`action`／`acknowledged`。`IAcademySaveStore` 的正式實作 `GameAcademySaveStore`（9189 新增）讀寫 `GameSession` 內的 `_academyRecord`，隨 `PlayerSaveSnapshot.academy` 欄位落盤（缺值代表無進行中修業，舊存檔相容）。

---

## 3. 畫面總覽與狀態流

```
抓周完成（nurture-flow fatePanel）
        │ 「送入學府」
        ▼
[A 入學] academy-enroll：學府卡（潁川可選、其餘「即將開放」）、教官、控制模式
        │ 「入學」→ createAcademySnapshot → begin         「返回」→ 回大廳，子嗣仍待入學
        ▼
[B 修業主畫面] academy-session  ◄──────────────┐
   TRAIN / REST / GIMMICK_INTERACT → commit ───┤ pendingInterrupt 為 null 且未結業
        │ pendingInterrupt 非 null              │
        ▼                                      │
[C 打斷宿主] academy-interrupt → RESOLVE_INTERRUPT ─┘
   MIDTERM 方針三選一 / COMING_OF_AGE 戰法三選一 / RESONANCE 見證 / GRADUATION 確認
        │ GRADUATION 確認 → snapshot.graduated 為 true
        ▼
[D 結業] showAcademyGraduation → graduateFromAcademy → 外界推進 1 季 → 回大廳
```

### 3.1 手機記憶體限制（全案共用，硬規則）

- 不新增圖集。新 layout 全部引用既有 skin，新增的只有 layout／screen／content JSON 與 i18n 文字。
- B 與 C 各用單一宿主節點，打斷彈窗四種共用同一組節點（標題、本文、三個選項鈕、確認鈕），以 `setTexts`／`setActives` 切內容，不做四棵節點樹。
- 修業主畫面不建動態節點；五個訓練列、教官列、紀錄列都是固定節點，切換用 active 與文字。
- 不顯示時 `node.active = false`，不 `destroy` 重建（沿用 `NurtureFlowHost` 做法）。
- 驗收要求：進出學府一次後，playtest 回報的節點數回到進入前正負 5% 內。

---
