// @spec-source → NPC人性化規格書 F-1（Utility AI 評分：eventWeight × personalityWeight × relationshipModifier × moodModifier × cooldownModifier）；PROG-2-1379（NPC-05）
/**
 * NpcUtilityAI — 離線互動候選的評分（純邏輯，不依賴 cc）。
 *
 * 本次只當排序依據：分數只決定候選的先後，不改登入窗的觸發條件，也不改日誌內容。
 * 各權重目前沒有企劃數值，預設全為 1，因此排序結果與未評分時相同；數值待企劃定版後填入 NPC_RELATION_WEIGHTS。
 *
 * Unity 對照：像 Utility AI 的 Score 函式，把各 Modifier 相乘後排出最高分的行為；
 * 這裡只把最高分那一群交給原本的亂數挑選，等同 Sort + 同分隨機。
 */
import type { DynamicRelationType } from './KinRelation';

export interface NpcActionScoreInput {
    /** 事件權重（正式事件來源）；離線互動沒有事件權重時為 1 */
    eventWeight: number;
    /** 性格權重（對應行為類型）；暫定，待企劃定數值 */
    personalityWeight: number;
    /** 關係修正；離線互動目前不讀好感，為 1 */
    relationshipModifier: number;
    /** 情緒修正；離線互動目前不讀情緒，為 1 */
    moodModifier: number;
    /** 冷卻修正；登入窗內已排過的組合不會進候選，為 1 */
    cooldownModifier: number;
}

/** 暫定：各關係類型的性格權重（離線互動的行為類型）；全為 1 時排序不改變結果。 */
export const NPC_RELATION_WEIGHTS: Readonly<Record<DynamicRelationType, number>> = {
    COMRADE: 1,
    DYNAMIC_SWORN: 1,
    SPOUSE: 1,
    PARENT_CHILD: 1,
};

/** F-1 的評分：各項相乘。 */
export function scoreNpcAction(input: NpcActionScoreInput): number {
    return input.eventWeight * input.personalityWeight * input.relationshipModifier * input.moodModifier * input.cooldownModifier;
}

/** 高權重門檻（PM 暫定 1）：分數嚴格大於門檻才算高權重互動，受登入窗限流；預設權重全為 1 時不會有任何互動被限流。 */
export const NPC_HIGH_WEIGHT_THRESHOLD = 1;

/**
 * 登入窗限流：同一武將在同一登入窗內只允許 1 則高權重互動（F-1 第 3 點）。
 * 低權重互動不計入也不受限；換登入窗就重新計算。
 */
export class NpcInteractionLimiter {
    private readonly _claimed = new Set<string>();

    constructor(private readonly _threshold: number = NPC_HIGH_WEIGHT_THRESHOLD) {}

    /** 不登記，只查這則互動此武將是否還能排；低權重永遠可以。 */
    canClaim(windowId: string, generalId: string, score: number): boolean {
        if (score <= this._threshold) return true;
        return !this._claimed.has(`${windowId}#${generalId}`);
    }

    /** 登記一則已決定要發生的互動；低權重不登記。 */
    claim(windowId: string, generalId: string, score: number): void {
        if (score <= this._threshold) return;
        this._claimed.add(`${windowId}#${generalId}`);
    }

    /** 查並登記；回傳 true 表示允許。 */
    tryClaim(windowId: string, generalId: string, score: number): boolean {
        if (!this.canClaim(windowId, generalId, score)) return false;
        this.claim(windowId, generalId, score);
        return true;
    }
}

/** 離線互動候選的分數：只帶性格權重，其餘修正為 1。 */
export function scoreOfflineRelation(type: DynamicRelationType, weights: Readonly<Record<DynamicRelationType, number>> = NPC_RELATION_WEIGHTS): number {
    return scoreNpcAction({
        eventWeight: 1,
        personalityWeight: weights[type],
        relationshipModifier: 1,
        moodModifier: 1,
        cooldownModifier: 1,
    });
}

// ───────────────────────── 武將主動請求的五因子（武將心智 MIND-2，PROG-2-9150）─────────────────────────
// 與離線互動同一條公式 scoreNpcAction，但五項都接真資料：事件急迫度、性格向量、忠誠、心情、冷卻。

/** 主動行為類型（與 MindRequestKind 同名，避免 systems 反向依賴 mind） */
export type NpcInitiativeKind = 'ASK_PROMOTE' | 'ASK_BATTLE' | 'REDEEM' | 'APOLOGIZE' | 'COMPLAIN_IDLE' | 'ADVISE';

/** 事件權重基準（提案 §2.6）：求封 3、請戰 3、雪恥 2、抱怨 1.5、請罪 1.5、進言 1 */
export const NPC_INITIATIVE_EVENT_WEIGHT: Readonly<Record<NpcInitiativeKind, number>> = {
    ASK_PROMOTE: 3, ASK_BATTLE: 3, REDEEM: 2, COMPLAIN_IDLE: 1.5, APOLOGIZE: 1.5, ADVISE: 1,
};

/** 性格向量（四軸 0~1）；與 MindRules.PersonalityVector 同形 */
export interface NpcPersonalityAxes { bold: number; prudent: number; warm: number; whim: number }

/** 性格對該行為的偏好：Brave→請戰／雪恥；Wise→進言；Loyal→請罪／低調求封；Playful→隨機互動（抱怨） */
export function npcPersonalityWeight(kind: NpcInitiativeKind, v: Readonly<NpcPersonalityAxes>): number {
    switch (kind) {
        case 'ASK_BATTLE': return 0.5 + v.bold;
        case 'REDEEM': return 0.5 + v.bold * 0.8 + v.whim * 0.3;
        case 'ADVISE': return 0.5 + v.prudent;
        case 'APOLOGIZE': return 0.5 + v.warm;
        case 'ASK_PROMOTE': return 0.6 + v.warm * 0.5 + v.prudent * 0.3;
        case 'COMPLAIN_IDLE': return 0.6 + v.bold * 0.5 + v.whim * 0.4;
    }
}

/** 忠誠／態度：忠誠低 → 抱怨 ↑、求封 ↓；忠誠高則相反。未知忠誠或鎖 100 的轉蛋名將不修正。 */
export function npcRelationshipModifier(kind: NpcInitiativeKind, loyalty: number | undefined, locked = false): number {
    if (loyalty === undefined || locked) return 1;
    const low = loyalty < 50;
    const high = loyalty >= 80;
    if (kind === 'COMPLAIN_IDLE') return low ? 1.3 : (high ? 0.7 : 1);
    if (kind === 'ASK_PROMOTE') return low ? 0.7 : (high ? 1.2 : 1);
    return 1;
}

/** 心情：EAGER／HIGH 更愛請纓與進言；LOW 更愛抱怨、較少求封 */
export function npcMoodModifier(kind: NpcInitiativeKind, mood: 'EAGER' | 'HIGH' | 'NORMAL' | 'LOW'): number {
    const up = mood === 'EAGER' || mood === 'HIGH';
    if (kind === 'ASK_BATTLE' || kind === 'ADVISE') return up ? 1.2 : (mood === 'LOW' ? 0.85 : 1);
    if (kind === 'COMPLAIN_IDLE') return mood === 'LOW' ? 1.3 : (up ? 0.8 : 1);
    if (kind === 'REDEEM') return mood === 'LOW' ? 1.1 : 1;
    if (kind === 'ASK_PROMOTE') return mood === 'LOW' ? 0.8 : (up ? 1.1 : 1);
    return 1;
}

/** 冷卻：還在冷卻中為 0（直接不入選），否則 1 */
export function npcCooldownModifier(nextAllowedSeason: number | undefined, season: number): number {
    return nextAllowedSeason !== undefined && season < nextAllowedSeason ? 0 : 1;
}

/** 一則主動請求的分數：事件急迫度（基準×urgency）× 性格 × 關係 × 心情 × 冷卻 */
export function scoreInitiative(args: {
    kind: NpcInitiativeKind;
    /** 事件本身的急迫倍率（連敗越多、名聲越近門檻越高）；1 為基準 */
    urgency: number;
    axes: Readonly<NpcPersonalityAxes>;
    loyalty?: number;
    loyaltyLocked?: boolean;
    mood: 'EAGER' | 'HIGH' | 'NORMAL' | 'LOW';
    nextAllowedSeason?: number;
    season: number;
}): number {
    return scoreNpcAction({
        eventWeight: NPC_INITIATIVE_EVENT_WEIGHT[args.kind] * Math.max(0, args.urgency),
        personalityWeight: npcPersonalityWeight(args.kind, args.axes),
        relationshipModifier: npcRelationshipModifier(args.kind, args.loyalty, args.loyaltyLocked),
        moodModifier: npcMoodModifier(args.kind, args.mood),
        cooldownModifier: npcCooldownModifier(args.nextAllowedSeason, args.season),
    });
}
