<!-- doc_id: doc_spec_0685 -->
# 3KLife 名將PersonaCard多維性格設定檔與證據包解析消費契約規格書

> **規格代碼**：SPEC-DATA-BRAIN06  
> **關聯 WBS**：BRAIN-06（M10 Persona Card 生成與審核標記）、BRAIN-08（M11 Evidence Resolver 與 ResolvedEvidencePack）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：數值、架構與底層支援（Formula, Architecture & Backend）

---

## 1. 核心宗旨與設計哲學

名將性格設定檔（`NpcPersonaCard`）與歷史證據解析包（`ResolvedEvidencePack`）為支撐遊戲人物深度與敘事真實性之靈魂資料。為避免 AI 生成之未查核荒謬敘事侵蝕三國史實嚴肅性，並確保前端介面在任何異常下皆有保底輸出，本規格書制定客戶端消費這兩類資料之**型別結構**、**證據置信度分級門檻**與**人工審核標記（Manual Review）強制防呆規則**。

---

## 2. NpcPersonaCard 資料結構契約 (BRAIN-06)

前端於遊戲初始化或選取武將時讀取本地或中台下發之 Persona 設定：

```typescript
export interface NpcPersonaCard {
  generalId: string;                  // 武將 ID (如 GEN_GUANYU)
  characterCategory: 'civil' | 'martial' | 'balanced' | 'eccentric';
  coreTraits: {
    righteousness: number;            // 義 (0.0 ~ 1.0)
    heroism: number;                  // 豪 (0.0 ~ 1.0)
    wisdom: number;                   // 睿 (0.0 ~ 1.0)
    pragmatism: number;               // 貪/務實 (0.0 ~ 1.0)
  };
  voiceStyle: {
    toneKeywords: string[];           // 如 ["傲岸", "沉雄", "忠義"]
    prohibitedKeywords: string[];     // 嚴格禁止字詞 (如現代科技語彙)
  };
  relationshipAnchors: Array<{
    targetGeneralId: string;
    relationshipType: 'sworn_brother' | 'monarch_subject' | 'rival' | 'kin';
    sentimentBias: number;            // -1.0 (敵視) 至 +1.0 (至死不渝)
  }>;
  safeFallbackLine: string;           // 安全保底金句 (必填，不可為空或模板通用句)
  manualReviewRequired: boolean;      // 是否需要人工審核
  reviewedBy?: string;                // 審查人簽名 (如 "historian_lead_01")
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}
```

- **發佈防呆約束**：在正式發佈環境（Release）中，若 `reviewStatus !== 'APPROVED'`，客戶端**嚴格禁止**載入動態生成台詞，強制回退至 `safeFallbackLine`。

---

## 3. ResolvedEvidencePack 消費與置信度分級 (BRAIN-08)

中台檢索歷史證據並下發至前端生平長卷時，前端依置信度執行三級過濾：

```typescript
export interface HistoricalEvidenceItem {
  evidenceId: string;
  sourceBook: 'SANGUO_ZHI' | 'SANGUO_YANYI' | 'SHI_SHUO_XIN_YU';
  chapterOrScroll: string;            // 如 "蜀書·關張馬黃趙傳"
  eventSnippet: string;               // 史料原文摘要 (不超過 120 字)
  confidenceScore: number;            // 0.0 ~ 1.0 置信度
}

export interface ResolvedEvidencePack {
  generalId: string;
  topicKey: string;
  evidences: HistoricalEvidenceItem[];
  resolutionTrace: string;            // 檢索鏈條追蹤碼
}
```

### 3.1 置信度分級呈現規則

| 置信度區間 (Score) | 前端呈現標籤 (UI Badge) | 顯示方式與權限 |
|---|---|---|
| **$\ge 0.75$** | `[正史確證 · 三國志]` | 全彩顯示，納入生平實錄時間軸主條目。 |
| **$0.50 \sim 0.74$** | `[演義奇譚 / 野史傳聞]` | 淡墨斜體顯示，標註為民間流傳軼事。 |
| **$< 0.50$** | 無 (隱藏) | 前端自動過濾拋棄，不予呈現，避免誤導玩家。 |

---

## 4. 驗收測試案例 (Test Cases)

- **TC-BRAIN-06-01【未審核資料保底回退檢驗】**：載入一筆 `reviewStatus = 'PENDING'` 之曹操資料，前端劇情介面自動拒絕動態台詞，完整呈現 `safeFallbackLine`「寧教我負天下人，休教天下人負我」。
- **TC-BRAIN-06-02【空保底金句攔截】**：輸入 `safeFallbackLine` 為空字串之惡意 PersonaCard，前端資料驗證器立即拋出 `INVALID_PERSONA_PAYLOAD` 錯誤。
- **TC-BRAIN-08-01【低置信度證據自動剔除】**：傳入置信度為 0.42 之「張飛穿針」軼事，生平實錄長卷自動隱藏該項目，無空白殘留。
