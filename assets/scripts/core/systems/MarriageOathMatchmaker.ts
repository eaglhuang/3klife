// @spec-source → 結緣系統 shard-d「義兄／義姊作媒」（PROG-2-10223）
/**
 * MarriageOathMatchmaker — 提親對象與我方在籍武將已結義時，提親成功率額外加成（純邏輯，不依賴 cc）。
 * 數值在 data/master/marriage-oath-matchmaker-config.json；結義關係讀 SwornPact。
 */
import matchmakerJson from '../../../resources/data/master/marriage-oath-matchmaker-config.json';
import { swornBrothersOf, type SwornState } from './SwornPact';
import { genderKeyOf, namedText, type TextLookup } from './NamedParams';

export interface OathMatchmakerConfig {
    oathMatchmakerBonusPct: number;
    stackable: boolean;
}

export function normalizeOathMatchmakerConfig(raw: unknown): OathMatchmakerConfig {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
        oathMatchmakerBonusPct: typeof r.oathMatchmakerBonusPct === 'number' && Number.isFinite(r.oathMatchmakerBonusPct) ? r.oathMatchmakerBonusPct : 10,
        stackable: typeof r.stackable === 'boolean' ? r.stackable : false,
    };
}

export const OATH_MATCHMAKER_CONFIG: OathMatchmakerConfig = normalizeOathMatchmakerConfig(matchmakerJson);

export interface OathMatchmakerBonus {
    bonusPct: number;
    mediatorIds: string[];
}

/** 提親對象的結義兄弟姊妹中，屬於我方在籍名冊者即為作媒人。 */
export function oathMatchmakerBonus(state: SwornState, targetId: string, rosterIds: readonly string[], cfg: OathMatchmakerConfig = OATH_MATCHMAKER_CONFIG): OathMatchmakerBonus {
    const roster = new Set(rosterIds);
    const mediatorIds = swornBrothersOf(state, targetId).filter((id) => id !== targetId && roster.has(id));
    if (mediatorIds.length === 0) return { bonusPct: 0, mediatorIds: [] };
    return { bonusPct: cfg.stackable ? cfg.oathMatchmakerBonusPct * mediatorIds.length : cfg.oathMatchmakerBonusPct, mediatorIds };
}

/** 提親成功率（百分比，0～100）加上作媒加成。 */
export function applyOathMatchmakerBonus(ratePct: number, bonus: OathMatchmakerBonus): number {
    return Math.min(100, Math.max(0, ratePct + bonus.bonusPct));
}

export function oathMatchmakerLine(lookup: TextLookup | undefined, bonus: OathMatchmakerBonus, mediatorName: string, mediatorGender: string | undefined): string {
    if (bonus.bonusPct <= 0) return '';
    return namedText(lookup, 'ui.marriage.oath_matchmaker_bonus', {
        mediatorName,
        oathRole: namedText(lookup, `ui.marriage.oath_role.${genderKeyOf(mediatorGender)}`, {}),
        bonusPct: bonus.bonusPct,
    });
}
