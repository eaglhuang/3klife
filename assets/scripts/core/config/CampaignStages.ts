// @spec-source → MVP遊戲驗證規格書.md 長線願景「全球征途」三階段表；WBS v8 MVP-13
/**
 * CampaignStages — 全球征途三階段的列舉預留（純資料，不依賴 cc）
 *
 * 規格：MVP 只驗證第一階段（中原統一），第二、三階段僅預留掛點，不影響 MVP。
 * 暫定（可逆）：第二、三階段 enabled 皆為 false；畫面與流程不讀取這份表。
 *
 * Unity 對照：像一張 ScriptableObject 清單，只把 enabled 關掉的項目先放進專案，執行時不載入。
 */

export const CAMPAIGN_STAGE_IDS = ['central-unification', 'border-campaign', 'global-expedition'] as const;

export type CampaignStageId = (typeof CAMPAIGN_STAGE_IDS)[number];

export interface CampaignStageDef {
    readonly id: CampaignStageId;
    /** 規格的階段名稱（zh-TW） */
    readonly name: string;
    /** 規格的對手描述（zh-TW） */
    readonly opponents: string;
    /** MVP 是否啟用；只有第一階段為 true */
    readonly enabled: boolean;
}

export const CAMPAIGN_STAGES: readonly CampaignStageDef[] = [
    { id: 'central-unification', name: '中原統一', opponents: '三國群雄 AI', enabled: true },
    { id: 'border-campaign', name: '邊境征伐', opponents: '蠻族/南蠻/北狄', enabled: false },
    { id: 'global-expedition', name: '全球遠征', opponents: '蒙古帝國/十字軍/大和武士', enabled: false },
];

export function getCampaignStage(id: string): CampaignStageDef | undefined {
    return CAMPAIGN_STAGES.find(stage => stage.id === id);
}

/** MVP 可玩的階段（目前只有第一階段） */
export function enabledCampaignStages(): CampaignStageDef[] {
    return CAMPAIGN_STAGES.filter(stage => stage.enabled);
}

/** 依規格順序取下一個階段；已是最後一階段或未知 id 回傳 null */
export function nextCampaignStage(id: string): CampaignStageDef | null {
    const index = CAMPAIGN_STAGES.findIndex(stage => stage.id === id);
    if (index < 0 || index >= CAMPAIGN_STAGES.length - 1) return null;
    return CAMPAIGN_STAGES[index + 1];
}
