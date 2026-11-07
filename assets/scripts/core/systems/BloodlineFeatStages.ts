// @spec-source → 五階血脈奧義解鎖與名聲事蹟點亮規格書 (doc_spec_0322) §1~§3（GDUI-07、GDUI-08，PROG-2-1948）
/**
 * BloodlineFeatStages — 五階奧義的「名聲 + 指定事蹟」點亮規則與升星素材消耗表（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - Stage_Current ≤ Stage_Cap；Cap 由升星擴展（★N → N 階），Current 0~5 逐階點亮。
 * - 各階名聲門檻 100／300／700／1500／3000，並需對應事蹟：首勝、斬將或破城、共鳴或頓悟、累計破敵 10,000、祠堂 Lv.4。
 * - 升星：史實名將 同名卡 1/2/3/5 張或魂石 20/50/100/200；世代子嗣 譜牒印記 1/2/4/8 枚。
 *
 * 既有 BloodlineTransmissionUltimate 用「事蹟次數」與 0/100/300/700/1500 門檻（1 階初始開放），
 * 與本規格不同；本檔先並存不改既有表，待裁決後再統一。
 * Unity 對照：像兩張靜態設定表 + 檢查函式。
 */

export type BloodlineFeat = 'FIRST_SORTIE_WIN' | 'SLAY_OR_CAPTURE' | 'RESONANCE_OR_EPIPHANY' | 'ROUT_10000' | 'SHRINE_LV4';

export interface FeatStageRule {
    stage: number;
    fame: number;
    feat: BloodlineFeat;
}

export const FEAT_STAGE_RULES: readonly FeatStageRule[] = [
    { stage: 1, fame: 100, feat: 'FIRST_SORTIE_WIN' },
    { stage: 2, fame: 300, feat: 'SLAY_OR_CAPTURE' },
    { stage: 3, fame: 700, feat: 'RESONANCE_OR_EPIPHANY' },
    { stage: 4, fame: 1500, feat: 'ROUT_10000' },
    { stage: 5, fame: 3000, feat: 'SHRINE_LV4' },
];

export const BLOODLINE_MAX_STAGE = 5;

/** Stage_Cap：★N → N 階（1~5）。 */
export function stageCapForStars(stars: number): number {
    return Math.min(BLOODLINE_MAX_STAGE, Math.max(1, Math.floor(stars)));
}

export type FeatStageCheck = { ok: true; stage: number } | { ok: false; reason: 'ALREADY_MAX' | 'CAP_LOCKED' | 'FAME_SHORT' | 'FEAT_MISSING' };

/** 下一階能否點亮。 */
export function checkFeatStage(
    stageCurrent: number, stageCap: number, clanFame: number, feats: ReadonlySet<BloodlineFeat>,
): FeatStageCheck {
    const next = stageCurrent + 1;
    if (next > BLOODLINE_MAX_STAGE) return { ok: false, reason: 'ALREADY_MAX' };
    if (next > stageCap) return { ok: false, reason: 'CAP_LOCKED' };
    const rule = FEAT_STAGE_RULES[next - 1];
    if (clanFame < rule.fame) return { ok: false, reason: 'FAME_SHORT' };
    if (!feats.has(rule.feat)) return { ok: false, reason: 'FEAT_MISSING' };
    return { ok: true, stage: next };
}

export type StarNodeState = 'lit' | 'capOpen' | 'locked';

/** 命盤節點顯示狀態：已點亮／已開上限未點亮／未開上限。 */
export function stageNodeState(stage: number, stageCurrent: number, stageCap: number): StarNodeState {
    if (stage <= stageCurrent) return 'lit';
    if (stage <= stageCap) return 'capOpen';
    return 'locked';
}

/** 史實名將升星（索引 = 目前星級 1~4）：同名卡張數或魂石數，二擇一。 */
export const HISTORICAL_STAR_UP_COST: Readonly<Record<number, { templateCards: number; soulStones: number }>> = {
    1: { templateCards: 1, soulStones: 20 },
    2: { templateCards: 2, soulStones: 50 },
    3: { templateCards: 3, soulStones: 100 },
    4: { templateCards: 5, soulStones: 200 },
};

/** 世代子嗣升星（索引 = 目前星級 1~4）：譜牒印記枚數。 */
export const DESCENDANT_STAR_UP_SEALS: Readonly<Record<number, number>> = { 1: 1, 2: 2, 3: 4, 4: 8 };

/** 升星消耗；已滿 ★5 或星級非法回 null。 */
export function starUpCost(currentStars: number, isHistorical: boolean):
    { kind: 'historical'; templateCards: number; soulStones: number } | { kind: 'descendant'; lineageSeals: number } | null {
    if (isHistorical) {
        const c = HISTORICAL_STAR_UP_COST[currentStars];
        return c ? { kind: 'historical', ...c } : null;
    }
    const seals = DESCENDANT_STAR_UP_SEALS[currentStars];
    return seals ? { kind: 'descendant', lineageSeals: seals } : null;
}
