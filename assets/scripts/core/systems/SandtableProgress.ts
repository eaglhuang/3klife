// @spec-source → WBS v16.3 HALL-08（世界沙盤 S1/S2/S3 階段、遠征檔案、解鎖歷史保留）；系統規格書：大廳系統 §E-4、Data Schema World_Sandtable
/**
 * SandtableProgress — 世界沙盤的解鎖歷史與階段顯示（純邏輯，不依賴 cc）。
 *
 * - 解鎖歷史只增不減：天下大亂或世界重組後，已解鎖的階段與標記歷史不倒退（規格 §E-4 第 5 點）。
 * - 有效階段取「目前官職階段」與「解鎖歷史最高階段」的較高者，官職降級時沙盤不回退。
 * - S3 才顯示 Expedition Dossier 的輪廓，其餘階段隱藏（規格 §E-4 第 6 點）。
 * - 歷史資料來自存檔，讀進來先過濾未知值、去重、依階段順序排好。
 *
 * Unity 對照：像 PlayerPrefs 裡的成就旗標，只能 Set 不能 Clear；UI 只讀「目前最高旗標」決定顯示哪一塊。
 */

/** 規格 Data Schema 使用的階段代碼；對應關係見 SANDTABLE_STAGE_ORDER。 */
export const SANDTABLE_STAGE_IDS = ['S1_CENTRAL', 'S2_BORDER', 'S3_GLOBAL'] as const;
export type SandtableStageId = (typeof SANDTABLE_STAGE_IDS)[number];

/** 官職快照使用的短代碼（S1 / S2 / S3）對應到規格的階段代碼。 */
const SHORT_TO_ID: Readonly<Record<'S1' | 'S2' | 'S3', SandtableStageId>> = {
    S1: 'S1_CENTRAL',
    S2: 'S2_BORDER',
    S3: 'S3_GLOBAL',
};

/** 階段順序：索引越大階段越高。 */
const STAGE_RANK: Readonly<Record<SandtableStageId, number>> = {
    S1_CENTRAL: 1,
    S2_BORDER: 2,
    S3_GLOBAL: 3,
};

export function sandtableStageIdOf(short: 'S1' | 'S2' | 'S3'): SandtableStageId {
    return SHORT_TO_ID[short];
}

/** 階段代碼轉回官職快照的短代碼，供沙盤按鈕文字使用。 */
export function sandtableShortCodeOf(stage: SandtableStageId): 'S1' | 'S2' | 'S3' {
    return stage === 'S1_CENTRAL' ? 'S1' : stage === 'S2_BORDER' ? 'S2' : 'S3';
}

/** 過濾未知值與重複，依階段順序排好；不改輸入。 */
export function normalizeUnlockHistory(raw: unknown): SandtableStageId[] {
    if (!Array.isArray(raw)) return [];
    const known = new Set<SandtableStageId>();
    for (const entry of raw) {
        if (typeof entry === 'string' && (SANDTABLE_STAGE_IDS as readonly string[]).includes(entry)) {
            known.add(entry as SandtableStageId);
        }
    }
    return [...known].sort((a, b) => STAGE_RANK[a] - STAGE_RANK[b]);
}

/** 記錄一次解鎖：回傳新陣列；已存在則原樣回傳內容，絕不移除任何階段。 */
export function recordSandtableUnlock(history: readonly SandtableStageId[], stage: SandtableStageId): SandtableStageId[] {
    return normalizeUnlockHistory([...history, stage]);
}

/**
 * 有效階段：目前官職階段與解鎖歷史中較高者。
 * 兩者都沒有時回傳 null（沙盤尚未開放）。
 */
export function effectiveSandtableStage(
    current: SandtableStageId | null,
    history: readonly SandtableStageId[],
): SandtableStageId | null {
    let best: SandtableStageId | null = current;
    for (const stage of history) {
        if (best === null || STAGE_RANK[stage] > STAGE_RANK[best]) best = stage;
    }
    return best;
}

/** 遠征檔案輪廓只在 S3 顯示；未解鎖或較低階段一律隱藏。 */
export function showExpeditionDossierSilhouette(stage: SandtableStageId | null): boolean {
    return stage === 'S3_GLOBAL';
}
