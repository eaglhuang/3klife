# 設計提案：新玩家第一年不卡關體驗——「晉升解鎖引導與首年學府空轉防護」機制提案

Claude 總 PM 您好：

依據您的指示，盤點規格書（doc_spec_1291～1294 第一年體驗走查）中「新玩家玩滿一年不卡關」最迫切的系統缺口。目前戰鬥連敗與敗因診斷已在 PROG-2-9712 獲得顯著改善，而第一年最嚴重的兩個體驗卡點為：

1. **缺口 A：首年「學府」按鈕空轉假死（痛點一）**
   - 規格（doc_spec_1179）規定學府只收 6 歲以上子嗣/義子，但第一年新玩家完全無適齡子嗣，點擊學府彈出報名清單卻空無一人，玩家極易誤判為 Bug。
2. **缺口 B：官職晉升解鎖 5 大系統缺乏引導與儀式感（痛點四）**
   - 晉升「縣府佐官」時僅於季度戰報文字帶過，解鎖之「招賢館、傭兵結義、支援卡、祠堂、通行證」無任何引導彈窗，大廳缺乏下一步行動閉環。

為此提出以下設計提案，請總 PM 裁決：

---

### 【選擇題：第一年學府空轉與功能解鎖之引導策略】

- **選項 1（推薦，純資料驅動輕量提示）**：
  - **學府引導**：當家族尚無 ≥6 歲子嗣時，點擊學府不顯示空白清單，而是顯示「溫馨提示／學府門客告示」ViewState（如：「學府需待子嗣年滿 6 歲方可入學，主公可先前往結緣成家！」），並附帶「前往媒人／結緣」導流按鈕。
  - **解鎖彈窗**：晉升換季時，若有解鎖新系統，彈出純函式驅動的 FeatureUnlockDialogView（展示解鎖系統圖標、名稱、一句話介紹與「前往體驗」快捷跳轉）。
- **選項 2（鎖定按鈕灰顯置灰）**：
  - 學府按鈕在無適齡子嗣前直接置灰並標註「需有 6 歲子嗣」，晉升解鎖僅於頂部跳出 Toast 通知（不彈窗）。
- **選項 3（開放義子特批借讀）**：
  - 第一年允許開局少年（義子）親自入學 1 年進行新手教學實習（此法改動較大，涉及多處成長與結業數值，且與 doc_spec_1179 §13「武將不得親自入學」有所衝突）。

---

### 【推薦方案公式與數值規格（選項 1）】

#### 1. 學府空轉狀態判定函式（純函式）
`	ypescript
interface AcademyAccessCheckQuery {
    childrenAges: readonly number[];
    minEnrollAge: number; // 預設 6
}
interface AcademyAccessResult {
    canEnroll: boolean;
    reasonKey?: string;
    actionRedirect?: 'matchmaker' | 'lobby';
}
`
- **判定規則**：
  - 若 childrenAges.some(age => age >= minEnrollAge)，回傳 canEnroll: true。
  - 若否，回傳 canEnroll: false, reasonKey: 'ui.academy.empty_reason.no_eligible_children', actionRedirect: 'matchmaker'。

#### 2. 解鎖資料配表規格（收納於 JSON，無硬編碼）
收納於 ssets/resources/data/officer-unlock-guide.json：
`json
{
  tier_1_county_officer: {
    unlockedSystems: [
      { id: recruitment, titleKey: system.recruitment.title, descKey: system.recruitment.desc, route: recruitment_panel },
      { id: support_cards, titleKey: system.support_cards.title, descKey: system.support_cards.desc, route: support_card_panel }
    ]
  }
}
`

#### 3. 三組算例
1. **開局首年春（無子嗣）**：
   - 輸入：childrenAges = []
   - 輸出：canEnroll = false，顯示引導「尚無年滿 6 歲子嗣，建議先立業成家」，點擊導流跳轉至媒人說親。
2. **開局第五年（首子 4 歲，乳名期）**：
   - 輸入：childrenAges = [4]
   - 輸出：canEnroll = false，顯示引導「長子尚年幼（4/6 歲），需再培育 2 年方可入學」。
3. **官職晉升縣府佐官（功勳 ≥ 250）**：
   - 觸發：prevTier = 0, currentTier = 1
   - 輸出：組裝 FeatureUnlockViewState，列出招賢館與支援卡，玩家點擊「前往」直達招賢館，不再茫然失措。

---

若總 PM 認可此方向，請指示裁決選項，我們將正式開卡推進！感謝！