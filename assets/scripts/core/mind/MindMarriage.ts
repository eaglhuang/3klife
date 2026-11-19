// @spec-source → 武將心智提案 MIND-1（PROG-2-9146）；PROG-2-9165 武將心智接結緣（裁決 66：只影響心情與記憶，不扣忠誠與資源）
/**
 * MindMarriage — 結緣與未婚事件對武將心智、雙親心情與子嗣開蒙初期幹勁之純邏輯（不依賴 cc）
 *
 * 數值來源為 data/mind-marriage-rules.json；此處保留同內容預設值供 headless 測試使用。
 */
import type { IGeneralMindService } from './IGeneralMindService';
import type { MindMood, MindValence, MindWeight } from './MindTypes';
import type { GeneralConfig } from '../models/GeneralUnit';

export interface MindMarriageRulesConfig {
    unwedReminder: {
        minAge: number;
        cooldownSeasons: number;
        valence: number;
        weight: number;
        rejectedWeight: number;
    };
    bondFormed: {
        standardValence: number;
        standardWeight: number;
        auspiciousMinK: number;
        auspiciousValence: number;
        auspiciousWeight: number;
    };
    childEarlyEnthusiasm: {
        earlyRoundsLimit: number;
        moodBonuses: Record<MindMood, number>;
        minMultiplier: number;
        maxMultiplier: number;
    };
}

export const MIND_MARRIAGE_RULES_JSON = 'data/mind-marriage-rules';

const DEFAULT_RULES: MindMarriageRulesConfig = {
    unwedReminder: {
        minAge: 24,
        cooldownSeasons: 4,
        valence: -1,
        weight: 2,
        rejectedWeight: 3,
    },
    bondFormed: {
        standardValence: 2,
        standardWeight: 4,
        auspiciousMinK: 5,
        auspiciousValence: 3,
        auspiciousWeight: 5,
    },
    childEarlyEnthusiasm: {
        earlyRoundsLimit: 4,
        moodBonuses: {
            EAGER: 0.075,
            HIGH: 0.05,
            NORMAL: 0,
            LOW: 0,
        },
        minMultiplier: 1.0,
        maxMultiplier: 1.15,
    },
};

let _rules: MindMarriageRulesConfig = DEFAULT_RULES;

export function defaultMindMarriageRules(): MindMarriageRulesConfig {
    return DEFAULT_RULES;
}

export function configureMindMarriageRules(raw: Partial<MindMarriageRulesConfig> | null | undefined): void {
    if (!raw) return;
    _rules = {
        unwedReminder: raw.unwedReminder ?? DEFAULT_RULES.unwedReminder,
        bondFormed: raw.bondFormed ?? DEFAULT_RULES.bondFormed,
        childEarlyEnthusiasm: raw.childEarlyEnthusiasm ?? DEFAULT_RULES.childEarlyEnthusiasm,
    };
}

export function resetMindMarriageRules(): void {
    _rules = DEFAULT_RULES;
}

/** 判斷是否為佳話或門當戶對聯姻 */
export function isAuspiciousBond(compatibilityK = 0, isHistoricalPair = false): boolean {
    return isHistoricalPair || compatibilityK >= _rules.bondFormed.auspiciousMinK;
}

/**
 * 計算雙親結緣當下心情帶動的子嗣開蒙初期幹勁倍率 ∈ [1.0, 1.15]
 * 低落心情保底 1.0，不倒扣。
 */
export function computeEarlyEnthusiasmMultiplier(fatherMood: MindMood, motherMood: MindMood): number {
    const cfg = _rules.childEarlyEnthusiasm;
    const fBonus = cfg.moodBonuses[fatherMood] ?? 0;
    const mBonus = cfg.moodBonuses[motherMood] ?? 0;
    const raw = 1.0 + fBonus + mBonus;
    return Number(Math.max(cfg.minMultiplier, Math.min(cfg.maxMultiplier, raw)).toFixed(4));
}

export function earlyEnthusiasmRoundsLimit(): number {
    return _rules.childEarlyEnthusiasm.earlyRoundsLimit;
}

export interface BondMindOutcome {
    auspicious: boolean;
    valence: MindValence;
    weight: MindWeight;
}

/** 結緣成功時寫入雙親心智記憶，不扣忠誠、不扣資源 */
export function recordBondFormedMindEvents(params: {
    mind: IGeneralMindService;
    fatherId: string;
    motherId: string;
    season: number;
    compatibilityK?: number;
    isHistoricalPair?: boolean;
    childId?: string;
}): BondMindOutcome {
    const auspicious = isAuspiciousBond(params.compatibilityK ?? 0, params.isHistoricalPair ?? false);
    const valence = (auspicious ? _rules.bondFormed.auspiciousValence : _rules.bondFormed.standardValence) as MindValence;
    const weight = (auspicious ? _rules.bondFormed.auspiciousWeight : _rules.bondFormed.standardWeight) as MindWeight;
    const label = auspicious ? '佳話聯姻' : '結緣成親';
    const suffix = params.childId ?? String(params.season);

    params.mind.record({
        generalId: params.fatherId,
        season: params.season,
        kind: 'BOND_FORMED',
        outcome: 'SUCCESS',
        partnerId: params.motherId,
        tags: ['marriage', auspicious ? 'auspicious' : 'standard'],
        label,
        id: `bond-marriage:${params.fatherId}:${params.motherId}:${suffix}:f`,
    });
    params.mind.record({
        generalId: params.motherId,
        season: params.season,
        kind: 'BOND_FORMED',
        outcome: 'SUCCESS',
        partnerId: params.fatherId,
        tags: ['marriage', auspicious ? 'auspicious' : 'standard'],
        label,
        id: `bond-marriage:${params.fatherId}:${params.motherId}:${suffix}:m`,
    });

    return { auspicious, valence, weight };
}

/** 拒婚／求親受挫時寫入心智記憶（只影響心情與台詞，不扣忠誠與資源） */
export function recordMarriageRejectedMindEvent(params: {
    mind: IGeneralMindService;
    generalId: string;
    partnerId?: string;
    season: number;
    eventId?: string;
}): void {
    params.mind.record({
        generalId: params.generalId,
        season: params.season,
        kind: 'REQUEST_DENIED',
        outcome: 'FAIL',
        partnerId: params.partnerId,
        tags: ['marriage', 'rejected'],
        label: '求親遭拒',
        reason: 'BOND_REJECTED',
        id: params.eventId ?? `bond-rejected:${params.generalId}:${params.partnerId ?? 'none'}:${params.season}`,
    });
}

/**
 * 適婚名將久未結緣提醒（24 歲起、每 4 季一次）；
 * 僅寫入心智記憶（PASSED_OVER, V=-1, W=2），不扣忠誠或資源。
 */
export function processUnwedMarriageReminders(params: {
    mind: IGeneralMindService;
    roster: readonly GeneralConfig[];
    season: number;
}): string[] {
    const { minAge, cooldownSeasons } = _rules.unwedReminder;
    if (params.season <= 0) return [];
    const triggered: string[] = [];

    for (const general of params.roster) {
        if (!general.id) continue;
        if (general.status === 'dead' || general.role === 'Mentor') continue;
        const age = Math.floor(general.age ?? 0);
        if (age < minAge) continue;
        const breedingCount = (general as { breedingCount?: number }).breedingCount ?? 0;
        const pregnant = ((general as { pregnancySeasonsLeft?: number }).pregnancySeasonsLeft ?? 0) > 0;
        if (breedingCount > 0 || pregnant) continue;

        const bucket = Math.floor((params.season - 1) / Math.max(1, cooldownSeasons));
        const res = params.mind.record({
            generalId: general.id,
            season: params.season,
            kind: 'PASSED_OVER',
            outcome: 'FAIL',
            tags: ['marriage', 'unwed'],
            label: '適婚未結緣',
            reason: 'UNWED_LONG',
            id: `unwed-reminder:${general.id}:${bucket}`,
        });
        if (res.events.length > 0) triggered.push(general.id);
    }
    return triggered;
}

export function marriageMoodEventOverride(kind: string, tags: readonly string[]): { valence: MindValence; weight: MindWeight } | null {
    if (kind === 'BOND_FORMED' && tags.includes('marriage')) {
        const auspicious = tags.includes('auspicious');
        return {
            valence: (auspicious ? _rules.bondFormed.auspiciousValence : _rules.bondFormed.standardValence) as MindValence,
            weight: (auspicious ? _rules.bondFormed.auspiciousWeight : _rules.bondFormed.standardWeight) as MindWeight,
        };
    }
    if (kind === 'PASSED_OVER' && tags.includes('marriage') && tags.includes('unwed')) {
        return {
            valence: _rules.unwedReminder.valence as MindValence,
            weight: _rules.unwedReminder.weight as MindWeight,
        };
    }
    if (kind === 'REQUEST_DENIED' && tags.includes('marriage') && tags.includes('rejected')) {
        return {
            valence: _rules.unwedReminder.valence as MindValence,
            weight: _rules.unwedReminder.rejectedWeight as MindWeight,
        };
    }
    return null;
}
