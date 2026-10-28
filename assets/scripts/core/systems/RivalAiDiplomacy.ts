// @spec-source → 治理模式他國AI系統.md (doc_spec_0020) E-5 邦交值變動、AI 外交決策（PROG-2-1476）
/**
 * RivalAiDiplomacy — 他國之間的邦交事件變動，以及 AI 每季對另一國的外交意圖（純邏輯，不依賴 cc）
 *
 * 規格：
 * - 事件變動：結盟 +30、貿易 +5、送禮 +10~+30、共同擊敗宿敵 +20、攻擊 -50、背叛 -80、拒絕貿易 -5、入侵 -30。
 * - 史實宿敵初始 -30、史實盟友初始 +20；邦交範圍 -100~100。
 * - 外交決策：DIPLOMAT 主動結盟、金多換糧、WARLORD 背叛弱盟友、合縱連橫對抗強國。
 *
 * 暫定（可逆）：
 * - 送禮以 1000 黃金 +10、3000 以上 +30 線性內插（取整）。
 * - 擲骰只在條件成立時才消耗，順序與規格虛擬碼一致。
 *
 * Unity 對照：像行為樹的 Selector 以外的平行 Decorator，每條規則獨立檢查、各自產生意圖。
 */
import type { NationProfile } from './RivalNations';

export type RelationEvent =
    | 'ALLIANCE' | 'TRADE' | 'DEFEAT_NEMESIS_TOGETHER'
    | 'ATTACK' | 'BETRAY_ALLIANCE' | 'REFUSE_TRADE' | 'INVADE';

export const RELATION_EVENT_DELTA: Readonly<Record<RelationEvent, number>> = Object.freeze({
    ALLIANCE: 30,
    TRADE: 5,
    DEFEAT_NEMESIS_TOGETHER: 20,
    ATTACK: -50,
    BETRAY_ALLIANCE: -80,
    REFUSE_TRADE: -5,
    INVADE: -30,
});

export const HISTORICAL_RIVAL_INITIAL = -30;
export const HISTORICAL_ALLY_INITIAL = 20;
export const RELATION_MIN = -100;
export const RELATION_MAX = 100;

export const GIFT_RELATION_RANGE = Object.freeze({
    minGain: 10,
    maxGain: 30,
    minValue: 1000,
    maxValue: 3000,
});

export function clampRelation(value: number): number {
    return Math.max(RELATION_MIN, Math.min(RELATION_MAX, value));
}

export function applyRelationEvent(value: number, event: RelationEvent): number {
    return clampRelation(value + RELATION_EVENT_DELTA[event]);
}

/** 送禮邦交增量（禮物價值以黃金計）；低於最低價值仍給最低增量 */
export function giftRelationGain(giftValue: number): number {
    const r = GIFT_RELATION_RANGE;
    const t = Math.max(0, Math.min(1, (giftValue - r.minValue) / (r.maxValue - r.minValue)));
    return Math.round(r.minGain + (r.maxGain - r.minGain) * t);
}

export const AI_DIPLOMACY_RULES = Object.freeze({
    allianceMinRelation: 30,
    allianceChance: 0.3,
    tradeMinRelation: 0,
    tradeSelfGoldOver: 3000,
    tradeOtherFoodUnder: 3000,
    betrayWeakRatio: 0.5,
    betrayChance: 0.4,
    antiHegemonyTroopRatio: 2,
    antiHegemonyMinRelation: -20,
});

export interface DiplomacySelf {
    readonly profile: NationProfile;
    readonly troops: number;
    readonly gold: number;
}

export interface DiplomacyOther {
    readonly id: string;
    readonly troops: number;
    readonly food: number;
}

export interface DiplomacyRelation {
    readonly value: number;
    readonly allied: boolean;
}

export interface StrongestNation {
    readonly id: string;
    readonly troops: number;
    /** 最強國是否就是自己 */
    readonly isSelf: boolean;
}

export type DiplomacyIntent =
    | { readonly kind: 'PROPOSE_ALLIANCE'; readonly targetId: string }
    | { readonly kind: 'PROPOSE_TRADE'; readonly targetId: string; readonly give: 'gold'; readonly receive: 'food' }
    | { readonly kind: 'BETRAY_ALLIANCE'; readonly targetId: string }
    | { readonly kind: 'PROPOSE_ANTI_HEGEMONY'; readonly targetId: string; readonly againstId: string };

/** E-5：自己對另一國本季的外交意圖；random 回傳 0~1，由呼叫端注入 */
export function aiDiplomacyIntents(
    self: DiplomacySelf,
    other: DiplomacyOther,
    relation: DiplomacyRelation,
    strongest: StrongestNation,
    random: () => number,
): DiplomacyIntent[] {
    const r = AI_DIPLOMACY_RULES;
    const intents: DiplomacyIntent[] = [];

    if (relation.value > r.allianceMinRelation && self.profile === 'DIPLOMAT'
        && !relation.allied && random() < r.allianceChance) {
        intents.push({ kind: 'PROPOSE_ALLIANCE', targetId: other.id });
    }

    if (relation.value > r.tradeMinRelation && self.gold > r.tradeSelfGoldOver && other.food < r.tradeOtherFoodUnder) {
        intents.push({ kind: 'PROPOSE_TRADE', targetId: other.id, give: 'gold', receive: 'food' });
    }

    if (relation.allied && self.profile === 'WARLORD'
        && other.troops < self.troops * r.betrayWeakRatio && random() < r.betrayChance) {
        intents.push({ kind: 'BETRAY_ALLIANCE', targetId: other.id });
    }

    if (!strongest.isSelf && strongest.id !== other.id
        && strongest.troops > self.troops * r.antiHegemonyTroopRatio
        && relation.value > r.antiHegemonyMinRelation && !relation.allied) {
        intents.push({ kind: 'PROPOSE_ANTI_HEGEMONY', targetId: other.id, againstId: strongest.id });
    }

    return intents;
}
