/**
 * MentorSynergy — 師友羈絆（MENT-12，純邏輯，不依賴 cc）
 *
 * 規格（教官系統（支援卡）§K）：同一場培育同時放入指定 2 張支援卡（羈絆對），
 * 且其中一張的友情 ≥ Min_Friendship，且在回合上限內，觸發一次性羈絆事件。
 *
 * Unity 對照：像 ScriptableObject 的組合表 + 一個 Trigger 判定函式，
 * 判定只回傳「觸發了哪一組」，扣旗標與套效果由呼叫端負責。
 */

/** Trigger_Round_Limit（§K-4）。判定 round <= 此值。 */
export const SYNERGY_TRIGGER_ROUND_LIMIT = 12;
/** 範例 Min_Friendship（§K-4）；未指定的群組沿用此值（暫定）。 */
export const SYNERGY_DEFAULT_MIN_FRIENDSHIP = 30;

export type SynergyEffect =
    | { type: 'INSPIRATION_BONUS'; rate: number }
    | { type: 'TP_BONUS'; amount: number }
    | { type: 'DIALOG_UNLOCK' }
    | { type: 'SPECIAL_INSPIRATION'; eventId: string };

export interface SynergyGroup {
    id: string;
    name: string;
    /** 羈絆對（兩張支援卡的 template id） */
    partners: readonly [string, string];
    minFriendship: number;
    effects: readonly SynergyEffect[];
}

/** §K-3 預設羈絆對。卡牌 ID 只有 SUP_ZHAO_SSR_01 與 SUP_ZHUGE_SR_01 在 repo 內，其餘為暫定 ID。 */
export const DEFAULT_SYNERGY_GROUPS: readonly SynergyGroup[] = [
    {
        id: 'SYN_ZHAO_ZHUGE_01',
        name: '龍鳳之誼',
        partners: ['SUP_ZHUGE_SSR_01', 'SUP_PANG_SSR_01'],
        minFriendship: SYNERGY_DEFAULT_MIN_FRIENDSHIP,
        effects: [{ type: 'SPECIAL_INSPIRATION', eventId: 'SYN_EVT_ZHAO_ZHUGE_01' }, { type: 'DIALOG_UNLOCK' }],
    },
    {
        id: 'SYN_GUAN_ZHANG_01',
        name: '桃園遺烈',
        partners: ['SUP_GUAN_SSR_01', 'SUP_ZHANG_SSR_01'],
        minFriendship: SYNERGY_DEFAULT_MIN_FRIENDSHIP,
        effects: [{ type: 'TP_BONUS', amount: 50 }, { type: 'INSPIRATION_BONUS', rate: 0.15 }],
    },
    {
        id: 'SYN_ZHAO_LVBU_01',
        name: '赤兔共主',
        partners: ['SUP_ZHAO_SSR_01', 'SUP_LVBU_SSR_01'],
        minFriendship: SYNERGY_DEFAULT_MIN_FRIENDSHIP,
        effects: [{ type: 'INSPIRATION_BONUS', rate: 0.25 }, { type: 'DIALOG_UNLOCK' }],
    },
    {
        id: 'SYN_SUNCE_ZHOUYU_01',
        name: '江東雙璧',
        partners: ['SUP_SUNCE_SR_01', 'SUP_ZHOUYU_SR_01'],
        minFriendship: SYNERGY_DEFAULT_MIN_FRIENDSHIP,
        effects: [{ type: 'TP_BONUS', amount: 25 }, { type: 'INSPIRATION_BONUS', rate: 0.15 }],
    },
    {
        id: 'SYN_GUAN_ZHANGLIAO_01',
        name: '軍神武聖',
        partners: ['SUP_GUAN_SSR_01', 'SUP_ZHANGLIAO_SR_01'],
        minFriendship: SYNERGY_DEFAULT_MIN_FRIENDSHIP,
        effects: [{ type: 'TP_BONUS', amount: 20 }, { type: 'INSPIRATION_BONUS', rate: 0.1 }],
    },
];

export interface SynergyCheckInput {
    round: number;
    /** 本場培育中的教官（支援卡 template id） */
    mentorIds: readonly string[];
    /** 各教官的友情（曉蔭情誼） */
    friendship: Readonly<Record<string, number>>;
    /** 本場已觸發過的群組 id（一次性） */
    triggered: readonly string[];
    groups?: readonly SynergyGroup[];
}

/**
 * 判定本次是否觸發羈絆。回傳第一組符合的群組，沒有則 null。
 * 條件：回合在上限內、兩張卡都在場、其中一張友情 ≥ 門檻、此群組尚未觸發。
 */
export function findTriggeredSynergy(input: SynergyCheckInput): SynergyGroup | null {
    if (!Number.isFinite(input.round) || input.round > SYNERGY_TRIGGER_ROUND_LIMIT) return null;
    const groups = input.groups ?? DEFAULT_SYNERGY_GROUPS;
    for (const group of groups) {
        if (input.triggered.includes(group.id)) continue;
        const [a, b] = group.partners;
        if (!input.mentorIds.includes(a) || !input.mentorIds.includes(b)) continue;
        const best = Math.max(input.friendship[a] ?? 0, input.friendship[b] ?? 0);
        if (best >= group.minFriendship) return group;
    }
    return null;
}

/** 一次性 TP 加成總和（只計 TP_BONUS）。 */
export function synergyTpBonus(group: SynergyGroup): number {
    return group.effects.reduce((sum, effect) => (effect.type === 'TP_BONUS' ? sum + effect.amount : sum), 0);
}

/** 靈感率加成總和（只計 INSPIRATION_BONUS）。 */
export function synergyInspirationBonus(group: SynergyGroup): number {
    return group.effects.reduce((sum, effect) => (effect.type === 'INSPIRATION_BONUS' ? sum + effect.rate : sum), 0);
}
