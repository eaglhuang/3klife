// @spec-source → 武將人物介面規格書.md §6.7（升星、覺醒、名聲的分工）；WBS BML-06（PROG-2-2126）
/**
 * UIBloodlineMirrorStageResult — 五階奧義升星／覺醒成功時，命鏡結果頁要顯示的文字（純邏輯，不依賴 cc）。
 *
 * 鍵名對應 bloodline-mirror-loading-main 的節點名；內容模板的佔位文字（例如重鑄進度 76%、確認升星）
 * 不適用於「已經成功」的結果，所以這裡全部蓋掉。
 *
 * Unity 對照：像把 ViewModel 組成 Dictionary<nodeName, text>，再交給 Binder 套用。
 */
export const MIRROR_STAGE_RESULT_NODES = [
    'StateBadgeLabel', 'HeaderTitle', 'HeaderSubtitle', 'PhaseLabel', 'RarityLabel',
    'MirrorLabel', 'CrestLabel', 'ProgressLabel', 'PrimaryActionLabel',
] as const;

export type MirrorStageResultTexts = Record<(typeof MIRROR_STAGE_RESULT_NODES)[number], string>;

export type MirrorTextLookup = (key: string, ...args: string[]) => string;

const CONTINUE_KEY = 'ui.general.ultimate.result.continue';

/** 覺醒成功：點亮第 N 階 */
export function buildStageAwakenedTexts(t: MirrorTextLookup, name: string, stage: number): MirrorStageResultTexts {
    const n = String(stage);
    return {
        StateBadgeLabel: t('ui.general.ultimate.result.awaken.badge'),
        HeaderTitle: t('ui.general.ultimate.result.awaken.title', name),
        HeaderSubtitle: t('ui.general.ultimate.result.awaken.subtitle'),
        PhaseLabel: t('ui.general.ultimate.result.awaken.phase', n),
        RarityLabel: t('ui.general.ultimate.result.awaken.progress', n),
        MirrorLabel: t('ui.general.ultimate.result.awaken.mirror'),
        CrestLabel: t('ui.general.ultimate.result.awaken.crest'),
        ProgressLabel: t('ui.general.ultimate.result.awaken.done'),
        PrimaryActionLabel: t(CONTINUE_KEY),
    };
}

/** 升星成功：奧義上限 A 階 → B 階 */
export function buildStageCapRaisedTexts(t: MirrorTextLookup, name: string, capBefore: number, cap: number): MirrorStageResultTexts {
    const after = String(cap);
    return {
        StateBadgeLabel: t('ui.general.ultimate.result.raise.badge'),
        HeaderTitle: t('ui.general.ultimate.result.raise.title', name),
        HeaderSubtitle: t('ui.general.ultimate.result.raise.subtitle'),
        PhaseLabel: t('ui.general.ultimate.result.raise.phase', String(capBefore), after),
        RarityLabel: t('ui.general.ultimate.result.raise.reach', after),
        MirrorLabel: t('ui.general.ultimate.result.raise.mirror'),
        CrestLabel: t('ui.general.ultimate.result.raise.crest'),
        ProgressLabel: t('ui.general.ultimate.result.raise.done'),
        PrimaryActionLabel: t(CONTINUE_KEY),
    };
}
