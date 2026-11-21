<!-- doc_id: doc_spec_1244 -->
# 家族子嗣與血統總規格書（分片索引） — 10 共用框架對應、11 建議 JSON 欄位表、12 既有規格修訂清單、13 驗收、14 待決、15 實作卡切分

> 這是 `家族子嗣與血統總規格書.md` 的「10–15」分片。完整索引見 `docs/遊戲規格文件/系統規格書/家族子嗣與血統總規格書.md`。

## 10. 共用框架對應（只寫差異）

原則：同本質的系統用共用 base，玩法只寫差異欄位（doc_spec_1182 總綱；七套 = 商店、物品庫存、任務、獎勵、技能、劇情、人員占用）。

| 新玩法 | 繼承的 base | 只寫差異 |
| --- | --- | --- |
| 義子劇情來投 | **劇情** | 事件 `ADOPT_ARRIVAL_*`：選項接納／婉拒／延後；次數 `adoptStoryMax` |
| 義子候選抽選（招賢館、遺孤池） | **獎勵** | 池 `adopteePool`、保底「第 N 年必有一次」、固定種子 |
| 招賢館收義子 | **任務**（`taskKind=recruit`） | 候選刷新、年度額度 `recruitAdoptPerYear` |
| 歷史名將義子 | **劇情**＋**獎勵** | 觸發條件 `historicalAdoptees[].requires`；收義子儀式 |
| 媒人說親候選 | **獎勵**＋**商店**（延後） | 候選池、`matchmakerPerYear` |
| 聯姻外交、聯姻外嫁 | **劇情**＋**任務** | 外交事件、關係增量 `marriageRelation` |
| 加速食物、時光藥水 | **物品庫存**（`growthFood`、`timePotion`） | `growthBoostQuarter`、`stackCap`；使用命令寫入技能 modifier |
| 加速道具四種來源 | **物品庫存**＋**獎勵**＋**商店** | 產出、獎池、商品；付費商品價格待使用者 |
| 分家補貼、說親費用 | **物品庫存**（貨幣 `silver`） | 幣別銀兩 |
| 家門奇才 | **技能**（天賦） | `talentTag=geniusHouse`；效果由 modifier 結算 |
| 待產、哺乳、教官指派 | **人員占用** | 新狀態 `nursing`、`mentorAssign`；`until` 與互斥矩陣 |
| 家臣忠誠事件（請託、挽留、離開） | **劇情**＋**任務** | 忠誠欄 `loyalty`、離開判定 |
| 入學令（家臣子嗣） | **物品庫存**（`token`） | 排隊規則（親生、義子優先） |

硬規則：以上流程不得直接改名冊、庫存、存檔；一律走共通 API（`story.complete`、`reward.grant`、`task.advance`、`inventory.*`、`occupancy.*`、`rng.derive`），單機由本機 adapter 實作。

## 11. 建議 JSON 欄位表（企劃自決，放 `assets/resources/data/family-config.json`；數值可調）

| 欄位 | 暫定值 | 說明 |
| --- | --- | --- |
| `spouseCapByHallLevel` | `{1:2,2:2,3:3,4:3,5:4}` | 配偶上限 |
| `bondAffinityToMarry` | 70 | 結緣好感納配偶門檻 |
| `allianceMinRelation` | `friendly` | 聯姻外交門檻 |
| `matchmakerPerYear` | 2 | 媒人說親年度次數 |
| `matchmakerPrice` | 待使用者 | 銀兩價格 |
| `generatedSpouseEp` | `[50,70]` | 生成型配偶 EP 範圍（保底 FB：首子配偶固定 60） |
| 待產季數 | 見 `breeding-rules.json` `pregnancyLockSeasons`（2） | 唯一來源，本表不再存（PM 11/21 裁決） |
| `postpartumQuarters` | 1 | 非母乳的產後休養 |
| `breastfeedEndAge` | 5 | 母乳方式哺乳到孩子幾歲止（PROG-2-9485）；母親 `nursingMethod`：`breast`（預設）／`formula`／`wetNurse` |
| 哺乳／待產互斥規則 | 見 `occupancy-matrix.json` | 唯一來源（PM 11/21 裁決）；本表不再列 `nursingBlocks`／`nursingAllows`。待產擋出征、傭兵，放行家業與太守；哺乳放行太守與不離城的大廳任務 |
| `crowdThreshold` | 8 | 在養未成年子嗣觸發分家提示 |
| `childrenTypicalRange` | `[6,12]` | 設計目標，供平衡統計，不是硬上限 |
| `geniusChance` | 0.03 | 家門奇才基礎機率 |
| `geniusParentEpBonus` | `{one:0.01,both:0.02,cap:0.06}` | 親代 EP ≥ 85 加成 |
| `geniusPityEvery` | 12 | 家族累計保底 |
| `noAcademyStatPct` | 0.92 | 不入學者成年屬性乘數（相對潛力基準 1.0；結業乘數 C 1.00～S 1.12 見 doc_spec_1179 第 13.2 節） |
| `branchGrantSilver` | 待使用者 | 分家補貼 |
| `branchPrestige` | 40 | 分家一次性名聲 |
| `branchStartLoyalty` | 80 | 分家家主起始忠誠 |
| `marriageRelation` | 25 | 外嫁外交增量 |
| `marriagePerNation` | 2 | 同國外嫁上限 |
| `adoptStoryMax` | 3 | 劇情來投全局次數 |
| `recruitAdoptPerYear` | 1 | 招賢館年度收義子數 |
| `adopteeAgeRange` | `[8,14]` | 義子範本年齡 |
| `adopteeTemplates` | 企劃另列 24 組範本 | EP `[45,65]`，含男女各半 |
| `historicalAdoptees` | 關平、劉封、曹真、何晏、諸葛喬 | 含 `requires`（名望階或義父在名冊）、`age` |
| `fatherSonSynergyPct` | 5 | 名冊內義父義子同場出征加成（%） |
| `retainerChildInheritPct` | 0.6 | 家臣子嗣潛力繼承比例 |
| `retainerChildEveryQuarters` | 12 | 家臣再添子間隔 |
| `loyaltyOnEnroll` | 12 | 出入學令忠誠增量 |
| `loyaltyOnGraduate` | `{S:10,A:6,B:3,C:1}` | 結業忠誠增量 |
| `loyaltyOnRefuseEnroll` | -3 | 婉拒入學 |
| `leaveLoyalty` | 25 | 離開風險門檻 |
| `leaveChancePerQuarter` | 0.08 | 每季離開機率 |
| `growthItemPool` | 企劃另列 | 獎勵框架的加速道具獎池與保底 |

## 12. 既有規格修訂清單（本卡已加「依 11/21 裁決修訂」註記）

| 規格 | 修訂 |
| --- | --- |
| doc_spec_1233 | Q-3 改「配偶也能上場」；第 3.2 節第 3 點、第 10.2 節同步；配偶不再「不進出戰名冊」 |
| doc_spec_1179 | 第 12 章人源改寫（只收自家子嗣）；新增第 13、14 章；舊教官卡退場；下午新增 14.11 支援卡接線（教官池與支援卡由 doc_spec_1264 恢復並改寫） |
| doc_spec_0310 | 「世代功業傳承」中主公世代概念作廢（主角不死）；教官轉化改為「武將退居教官」 |
| doc_spec_1181 | 第 10.1 節矩陣新增 `nursing`、`mentorAssign`；第 10.3 節教官卡轉化說法作廢 |
| doc_spec_1180 | 第 15 章母乳哺育期與 OCC 對應補一句；第 18 章七套框架已更新（OCC） |

## 13. 驗收（供實作卡引用）

1. TC-FAM-01：配偶三來源各走一遍，名冊出現 `kind=spouse`，可出征、可派遣；超過 `spouseCapByHallLevel` 時第三種來源被婉拒。
2. TC-FAM-02：受孕後 2 季出生；待產期可任商店不可任傭兵團；出生後母乳方式進入 `nursing`，出征指令在指派當下被 OCC 擋、太守指派通過。
3. TC-FAM-03：非母乳方式 1 季後解除；乳母方式不產生 `nursing` 登記。
4. TC-FAM-04：家門奇才固定種子重現；累計第 12 位親生子嗣若仍無奇才必出；義子不判定。
5. TC-FAM-05：分家後成員從家譜移除、出現在家臣家；其後出生的孩子是家臣子嗣；不能重複領 `branchPrestige`。
6. TC-FAM-06：外嫁後家譜留灰色節點，外交關係 +25；同國超過 2 位被擋；近親被擋。
7. TC-FAM-07：義子三來源各一例；義子 id 出現在轉蛋池 JSON 時載入失敗。
8. TC-FAM-08：家臣忠誠 < 25 時每季可離開，離開時帶走未成年子嗣；出入學令忠誠 +12。
9. TC-FAM-09：靜態檢查：以上流程無直接寫名冊、庫存、存檔（lint 規則見總綱 5.10）。
10. TC-FAM-10：三種子嗣（親生、義子、家臣子嗣）的時間流速一致，沒有任何人專屬加速；加速只能由物品使用造成，且作用單一孩子。

## 14. 待決（大方向才問；數值企劃自決）

| # | 題目 | 建議 |
| --- | --- | --- |
| Q-F1 | 開局 14 歲少年（趙雲、關羽、諸葛亮）是否正式改為「歷史名將義子」 | **已決（2026-11-21 使用者）**：採 A，開局義子特例——標記義子（`adoptSource=starter`）、進家譜、可入學府、不遺傳血統；PROG-2-9441（F1）資料模型直接支援，既有 9194 開局少年改為此標記。（B 維持現狀、C 取消開局少年均不選） |
| Q-F2 | 付費商品的加速道具與說親、分家補貼價格 | 待使用者（商業化） |

## 15. 實作卡切分（只列，不開卡；卡號由總 PM 核發）

| # | 卡名 | 依賴 | 驗收 |
| --- | --- | --- | --- |
| F1 | 家族資料模型與存檔欄位（配偶 `kind=spouse`、義子、家臣子嗣、分家標記、`family-config.json` 載入與檢查） | B0 共通 API、PERSON-OCC（OCC-M） | 欄位走 `save.load`／`save` 讀寫；設定缺欄位 fail-fast；TC-FAM-09 |
| F2 | OCC 擴充 `nursing`、`mentorAssign` 與互斥矩陣 | OCC-M | TC-FAM-02、03；矩陣有契約測試 |
| F3 | 配偶三來源（結緣好感納配偶、聯姻外交提親、媒人說親） | F1、劇情 base、獎勵 base | TC-FAM-01；媒人候選固定種子 |
| F4 | 配偶上場（名冊 `kind=spouse`、生成型配偶範本、出征與派遣、太守） | F1、F2 | TC-FAM-01；生成型配偶重進不變 |
| F5 | 待產與哺乳接線（2 季待產、哺乳 OCC、乳母不占用） | F2、F4 | TC-FAM-02、03 |
| F6 | 義子三來源（劇情來投事件、招賢館「收義子」分頁、歷史名將義子、轉蛋排除檢查） | F1、劇情 base、獎勵 base、任務 base | TC-FAM-07 |
| F7 | 家臣子嗣與忠誠（逐將子嗣表、入學令請託、離開判定） | F1、A1 入學令（物品）、劇情 base | TC-FAM-08 |
| F8 | 家門奇才與繼承介面（`rollGenius`、保底計數、義子排除） | F1、血統公式介面 | TC-FAM-04 |
| F9 | 分家與聯姻外嫁（家譜操作、家臣家畫面、外交增量、近親檢查） | F1、F3、他國名冊 | TC-FAM-05、06 |
| F10 | 加速食物與道具接線（物品、獎池、商店、使用命令、單一孩子規則） | 物品 base、獎勵 base、商店 base（付費部分延後） | TC-FAM-10 |
| F11 | doc_spec_1233 首子流程同步：系統配偶入名冊 | F4 | 首子流程完成後配偶可出征、可當太守 |
| F12 | 家譜與家臣家畫面（家譜顯示成員類別、分家、外嫁節點、忠誠與離開預警） | F1、F9 | 手機記憶體：不建動態節點，重用列 |

### 待接清單（PM 11/21）

| 項目 | 目前做法 | 何時接 |
| --- | --- | --- |
| 幕府等級 | 遊戲內尚無幕府等級；配偶上限暫用 `hallLevel=1`（2 位） | 幕府升級系統做出來後接 |
| 銀兩錢包 | 乳母費、說親費、分家補貼只存設定 | 經濟統一卡 |
| 首子流程引擎 | 流程步驟機尚未實作；系統配偶入冊入口已備好：共通 API `family.enrollSpouse { source: 'first-child' }`（E360～E363），流程完成時呼叫即可 | 首子流程卡（開場流程規格書 #2） |
