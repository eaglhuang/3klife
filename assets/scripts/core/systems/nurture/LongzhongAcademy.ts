// @spec-source → ACAD_05_隆中草廬_八陣羅盤與機巧工造規格書.md (doc_spec_0307) §2 八陣羅盤與機巧工造、§3 專屬產出（PROG-2-2013）
/**
 * LongzhongAcademy — 隆中草廬的八門羅盤流轉與當門加成、機巧部件與三項發明、結業產出（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 羅盤每回合順時針轉一門：生→景→傷→杜→休→死→驚→開→生。
 * - 開門 ×2.0；景門 ×1.8；傷門 ×1.9 且精力 +10；生門 ×1.0、精力回復 20 並治癒負傷；其餘 ×1.1。
 * - 杜門：規避隨機負面事件，訓練效率 -20%（×0.8）。
 * - 發明：木牛流馬（2 齒輪＋2 榫卯，統／政 +30）、諸葛連弩（2 機簧＋2 齒輪，武／統 +30）、八陣演武沙盤（各 2，五維 +25）。
 * - 結業：八陣玄機（統率 ≥ 85 且完成沙盤）、神機連弩（武力 ≥ 85 且完成連弩）、巧匠天工（五維皆 ≥ 70 且三項全完成）。
 *
 * 暫定：
 * - 杜門 §2.1 寫效率 -20%，§4 程式落到 default ×1.1；依 §2.1 改為 ×0.8 並標記規避負面事件。
 * - 死／驚／休門的意志考驗內容未定，先回 ×1.1 並標記 willTrial，由呼叫端處理。
 * - 景門部件掉落翻倍以 partDropMultiplier 回傳；每項發明只能完成一次。
 * - 未掛到 AcademyTrainingEngine 的 IAcademyGimmickHandler，接線另卡。
 */

export enum EightGate {
    LIFE = 'LIFE',
    OPEN = 'OPEN',
    BRIGHT = 'BRIGHT',
    HARM = 'HARM',
    CLOSE = 'CLOSE',
    REST = 'REST',
    DEATH = 'DEATH',
    SHOCK = 'SHOCK',
}

export const LONGZHONG_GATE_ORDER: readonly EightGate[] = [
    EightGate.LIFE, EightGate.BRIGHT, EightGate.HARM, EightGate.CLOSE,
    EightGate.REST, EightGate.DEATH, EightGate.SHOCK, EightGate.OPEN,
];

export type LongzhongPart = 'gears' | 'mortises' | 'springs';
export type LongzhongStat = 'str' | 'int' | 'lea' | 'pol' | 'cha';

export interface LongzhongInvention {
    id: string;
    name: string;
    cost: Partial<Record<LongzhongPart, number>>;
    rewards: Partial<Record<LongzhongStat, number>>;
}

export const LONGZHONG_INVENTIONS: readonly LongzhongInvention[] = [
    { id: 'WOODEN_OX', name: '木牛流馬', cost: { gears: 2, mortises: 2 }, rewards: { lea: 30, pol: 30 } },
    { id: 'REPEATING_CROSSBOW', name: '諸葛連弩', cost: { springs: 2, gears: 2 }, rewards: { str: 30, lea: 30 } },
    { id: 'EIGHT_FORMATION_TABLE', name: '八陣演武沙盤', cost: { gears: 2, mortises: 2, springs: 2 }, rewards: { str: 25, int: 25, lea: 25, pol: 25, cha: 25 } },
];

export interface LongzhongGimmickState {
    currentGate: EightGate;
    gears: number;
    mortises: number;
    springs: number;
    completedInventions: string[];
}

export interface LongzhongGateBonus {
    multiplier: number;
    extraEnergyCost: number;
    healsInjury: boolean;
    avoidsNegativeEvents: boolean;
    willTrial: boolean;
    partDropMultiplier: number;
    description: string;
}

export function createLongzhongState(): LongzhongGimmickState {
    return { currentGate: EightGate.LIFE, gears: 0, mortises: 0, springs: 0, completedInventions: [] };
}

export function nextLongzhongGate(current: EightGate): EightGate {
    const idx = LONGZHONG_GATE_ORDER.indexOf(current);
    return LONGZHONG_GATE_ORDER[(idx + 1) % LONGZHONG_GATE_ORDER.length];
}

export function evaluateLongzhongGate(gate: EightGate): LongzhongGateBonus {
    const base = { extraEnergyCost: 0, healsInjury: false, avoidsNegativeEvents: false, willTrial: false, partDropMultiplier: 1 };
    switch (gate) {
        case EightGate.OPEN:
            return { ...base, multiplier: 2.0, description: '【開門大吉】：八門通達，全屬性均衡大彩圈！' };
        case EightGate.BRIGHT:
            return { ...base, multiplier: 1.8, partDropMultiplier: 2, description: '【景門高懸】：文韜顯耀，智謀研習飛速！' };
        case EightGate.HARM:
            return { ...base, multiplier: 1.9, extraEnergyCost: 10, description: '【傷門肅殺】：武藝突破，但極耗體力！' };
        case EightGate.LIFE:
            return { ...base, multiplier: 1.0, extraEnergyCost: -20, healsInjury: true, description: '【生門休養】：精力充沛，神清氣爽！' };
        case EightGate.CLOSE:
            return { ...base, multiplier: 0.8, avoidsNegativeEvents: true, description: '【杜門閉關】：遁隱自省，諸邪不侵。' };
        default:
            return { ...base, multiplier: 1.1, willTrial: true, description: '【陣位轉移】：氣機流轉，平常演練。' };
    }
}

/** 回合結束羅盤轉一門。 */
export function advanceLongzhongCompass(state: LongzhongGimmickState): LongzhongGimmickState {
    return { ...state, currentGate: nextLongzhongGate(state.currentGate) };
}

export function addLongzhongParts(state: LongzhongGimmickState, part: LongzhongPart, count: number): LongzhongGimmickState {
    return { ...state, [part]: Math.max(0, state[part] + count) };
}

export function canCraftLongzhong(state: LongzhongGimmickState, inventionId: string): boolean {
    const inv = LONGZHONG_INVENTIONS.find(i => i.id === inventionId);
    if (!inv || state.completedInventions.includes(inventionId)) return false;
    return (Object.keys(inv.cost) as LongzhongPart[]).every(p => state[p] >= (inv.cost[p] ?? 0));
}

export function craftLongzhong(state: LongzhongGimmickState, inventionId: string): { state: LongzhongGimmickState; rewards: Partial<Record<LongzhongStat, number>> } | null {
    if (!canCraftLongzhong(state, inventionId)) return null;
    const inv = LONGZHONG_INVENTIONS.find(i => i.id === inventionId)!;
    const next = { ...state, completedInventions: [...state.completedInventions, inventionId] };
    for (const p of Object.keys(inv.cost) as LongzhongPart[]) next[p] -= inv.cost[p] ?? 0;
    return { state: next, rewards: { ...inv.rewards } };
}

export function longzhongGraduationRewards(stats: Record<LongzhongStat, number>, state: LongzhongGimmickState): string[] {
    const done = (id: string) => state.completedInventions.includes(id);
    const out: string[] = [];
    if (stats.lea >= 85 && done('EIGHT_FORMATION_TABLE')) out.push('TAC_BAZHEN_XUANJI');
    if (stats.str >= 85 && done('REPEATING_CROSSBOW')) out.push('TAC_SHENJI_LIANNU');
    if (Object.values(stats).every(v => v >= 70) && LONGZHONG_INVENTIONS.every(i => done(i.id))) out.push('TRT_QIAOJIANG_TIANGONG');
    return out;
}
