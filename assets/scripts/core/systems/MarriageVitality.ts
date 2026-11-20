// @spec-source → 結緣系統（配種）.md、PROG-2-9181 寒門新血 × 佳話聯姻
/**
 * MarriageVitality — 寒門新血（零細血統）與佳話聯姻（純邏輯，不依賴 cc）
 *
 * 數值與門檻對應 assets/resources/data/marriage-vitality-rules.json：
 * 1. 寒門新血：無共祖外婚 + 客方為寒門（knownAncestors <= 2 或姓氏佔比 < 10%）+ 奇才（ep >= 65 或有 3★+ 因子）。
 *    活力階級 V ∈ [1, 3]，提供前 6 回合訓練加成 +4%~+12% 與額外疲勞復壯 -1。
 * 2. 佳話聯姻（3 種稱號）：
 *    - 文武並濟：一方 STR/LEA >= 80 且另一方 INT/POL >= 80 → 子嗣初始 TP +20
 *    - 化干戈為玉帛：雙親不同勢力 → 相性 K 額外 +2（上限 15）
 *    - 雙星輝映：雙親各自持有 >= 3★ 且不同類型的藍/紅因子 → 前 12 回合覺醒率 +5%
 */
import type { GeneralConfig, GeneralGeneConfig } from '../models/GeneralUnit';

export type EpithetId = 'civil_martial' | 'foes_to_allies' | 'twin_stars';

export interface MarriageVitalityRulesConfig {
    vitalityRules: {
        maxKnownAncestors: number;
        rareSurnameMaxShare: number;
        minGuestEp: number;
        minFactorStars: number;
        highEpThreshold: number;
        earlyBonusPerLevel: number;
        earlyBonusMin: number;
        earlyBonusMax: number;
        extraFatigueRecovery: number;
        earlyTrainingTurns: number;
    };
    epithets: {
        civil_martial: { id: 'civil_martial'; titleKey: string; minStat: number; bonusTp: number };
        foes_to_allies: { id: 'foes_to_allies'; titleKey: string; synergyBonus: number; maxSynergy: number };
        twin_stars: { id: 'twin_stars'; titleKey: string; minFactorStars: number; awakenRateBonus: number; earlyAwakenTurns: number };
    };
}

export const MARRIAGE_VITALITY_RULES_JSON = 'data/marriage-vitality-rules';

export const DEFAULT_MARRIAGE_VITALITY_RULES: Readonly<MarriageVitalityRulesConfig> = {
    vitalityRules: {
        maxKnownAncestors: 2,
        rareSurnameMaxShare: 0.1,
        minGuestEp: 65,
        minFactorStars: 3,
        highEpThreshold: 75,
        earlyBonusPerLevel: 0.04,
        earlyBonusMin: 0.04,
        earlyBonusMax: 0.12,
        extraFatigueRecovery: 1,
        earlyTrainingTurns: 6,
    },
    epithets: {
        civil_martial: { id: 'civil_martial', titleKey: 'ui.breed.epithet.civil_martial', minStat: 80, bonusTp: 20 },
        foes_to_allies: { id: 'foes_to_allies', titleKey: 'ui.breed.epithet.foes_to_allies', synergyBonus: 2, maxSynergy: 15 },
        twin_stars: { id: 'twin_stars', titleKey: 'ui.breed.epithet.twin_stars', minFactorStars: 3, awakenRateBonus: 0.05, earlyAwakenTurns: 12 },
    },
};

let _rules: MarriageVitalityRulesConfig = DEFAULT_MARRIAGE_VITALITY_RULES;

export function getMarriageVitalityRules(): MarriageVitalityRulesConfig {
    return _rules;
}

export function configureMarriageVitalityRules(raw: Partial<MarriageVitalityRulesConfig> | null | undefined): void {
    if (!raw) return;
    _rules = {
        vitalityRules: { ...DEFAULT_MARRIAGE_VITALITY_RULES.vitalityRules, ...(raw.vitalityRules ?? {}) },
        epithets: {
            civil_martial: { ...DEFAULT_MARRIAGE_VITALITY_RULES.epithets.civil_martial, ...(raw.epithets?.civil_martial ?? {}) },
            foes_to_allies: { ...DEFAULT_MARRIAGE_VITALITY_RULES.epithets.foes_to_allies, ...(raw.epithets?.foes_to_allies ?? {}) },
            twin_stars: { ...DEFAULT_MARRIAGE_VITALITY_RULES.epithets.twin_stars, ...(raw.epithets?.twin_stars ?? {}) },
        },
    };
}

export function resetMarriageVitalityRules(): void {
    _rules = DEFAULT_MARRIAGE_VITALITY_RULES;
}

export interface FreshBloodOutcome {
    active: boolean;
    level: 0 | 1 | 2 | 3;
    earlyTrainingBonus: number;
    extraFatigueRecovery: number;
    guestId: string | null;
}

export interface EpithetOutcome {
    id: EpithetId;
    title: string;
    titleKey: string;
    summary: string;
    summaryKey?: string;
    summaryArgs?: string[];
}

export interface MarriageVitalityResult {
    freshBlood: FreshBloodOutcome;
    epithets: EpithetOutcome[];
    bonusTp: number;
    synergyBonus: number;
    awakenRateBonus: number;
}

export interface MarriageVitalityInput {
    father: GeneralConfig & { ancestor_chain?: string[] };
    mother: GeneralConfig & { ancestor_chain?: string[] };
    hasCommonAncestor: boolean;
    roster?: readonly GeneralConfig[];
    rules?: MarriageVitalityRulesConfig;
}

const EPITHET_TITLES: Readonly<Record<EpithetId, string>> = {
    civil_martial: '文武並濟',
    foes_to_allies: '化干戈為玉帛',
    twin_stars: '雙星輝映',
};

const RED_OR_PINK_GENE_PREFIXES = ['gene_cav', 'gene_inf', 'gene_arc', 'gene_pik', 'gene_sie', 'gene_navy', 'gene_apt_', 'gene_terrain_'];
const BLUE_GENE_IDS = new Set(['gene_str', 'gene_int', 'gene_lea', 'gene_pol', 'gene_cha', 'gene_luk', 'gene_vit', 'gene_res']);

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function surnameOf(name: string | undefined): string {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed.charAt(0) : '';
}

function knownAncestorsCount(general: GeneralConfig & { ancestor_chain?: string[] }): number {
    return (general.ancestor_chain ?? []).filter((uid) => !!uid).length;
}

function countStarsAtLeast(genes: readonly GeneralGeneConfig[] | undefined, minStars: number): number {
    return (genes ?? []).filter((g) => (g.level ?? 0) >= minStars).length;
}

function isRareSurname(guest: GeneralConfig, roster: readonly GeneralConfig[] | undefined, maxShare: number): boolean {
    if (!roster || roster.length === 0) return false;
    const surname = surnameOf(guest.name);
    if (!surname) return false;
    const sameCount = roster.filter((g) => surnameOf(g.name) === surname).length;
    return sameCount / roster.length < maxShare;
}

function statValue(general: GeneralConfig, key: 'str' | 'int' | 'lea' | 'pol'): number {
    const nested = general.stats?.[key];
    const direct = (general as unknown as Record<string, number | undefined>)[key];
    return typeof nested === 'number' ? nested : (typeof direct === 'number' ? direct : 0);
}

function isMartialPeak(general: GeneralConfig, minStat: number): boolean {
    return Math.max(statValue(general, 'str'), statValue(general, 'lea')) >= minStat;
}

function isCivilPeak(general: GeneralConfig, minStat: number): boolean {
    return Math.max(statValue(general, 'int'), statValue(general, 'pol')) >= minStat;
}

function highStarFactorKinds(genes: readonly GeneralGeneConfig[] | undefined, minStars: number): Set<'blue' | 'red'> {
    const kinds = new Set<'blue' | 'red'>();
    for (const gene of genes ?? []) {
        if ((gene.level ?? 0) < minStars || !gene.id) continue;
        if (BLUE_GENE_IDS.has(gene.id)) {
            kinds.add('blue');
        } else if (RED_OR_PINK_GENE_PREFIXES.some((prefix) => gene.id!.startsWith(prefix))) {
            kinds.add('red');
        } else {
            // 未列明者若有色標屬性或視為泛用高星藍因子
            kinds.add('blue');
        }
    }
    return kinds;
}

export function evaluateMarriageVitality(input: MarriageVitalityInput): MarriageVitalityResult {
    const rules = input.rules ?? _rules;
    const vr = rules.vitalityRules;
    const { father, mother, hasCommonAncestor, roster } = input;

    // 1. 寒門新血（零細血統）：需無共祖外婚
    let freshBlood: FreshBloodOutcome = {
        active: false,
        level: 0,
        earlyTrainingBonus: 0,
        extraFatigueRecovery: 0,
        guestId: null,
    };

    if (!hasCommonAncestor) {
        const candidates = [mother, father];
        for (const guest of candidates) {
            const isHumbleOrigin =
                knownAncestorsCount(guest) <= vr.maxKnownAncestors
                || isRareSurname(guest, roster, vr.rareSurnameMaxShare);
            const guestEp = guest.ep ?? 50;
            const star3Count = countStarsAtLeast(guest.genes, vr.minFactorStars);
            const isProdigy = guestEp >= vr.minGuestEp || star3Count >= 1;
            if (isHumbleOrigin && isProdigy) {
                const rawLevel = 1 + (guestEp >= vr.highEpThreshold ? 1 : 0) + (star3Count >= 1 ? 1 : 0);
                const level = clamp(rawLevel, 1, 3) as 1 | 2 | 3;
                const earlyTrainingBonus = Number(
                    clamp(vr.earlyBonusPerLevel * level, vr.earlyBonusMin, vr.earlyBonusMax).toFixed(4),
                );
                if (!freshBlood.active || level > freshBlood.level) {
                    freshBlood = {
                        active: true,
                        level,
                        earlyTrainingBonus,
                        extraFatigueRecovery: vr.extraFatigueRecovery,
                        guestId: guest.id,
                    };
                }
            }
        }
    }

    // 2. 佳話聯姻（3 種稱號）
    const epithets: EpithetOutcome[] = [];
    let bonusTp = 0;
    let synergyBonus = 0;
    let awakenRateBonus = 0;

    // (a) 文武並濟
    const cm = rules.epithets.civil_martial;
    if (
        (isMartialPeak(father, cm.minStat) && isCivilPeak(mother, cm.minStat))
        || (isMartialPeak(mother, cm.minStat) && isCivilPeak(father, cm.minStat))
    ) {
        bonusTp += cm.bonusTp;
        epithets.push({
            id: 'civil_martial',
            title: EPITHET_TITLES.civil_martial,
            titleKey: cm.titleKey,
            summary: `初始 TP +${cm.bonusTp}`,
            summaryKey: 'ui.breed.epithet.summary.civil_martial',
            summaryArgs: [String(cm.bonusTp)],
        });
    }

    // (b) 化干戈為玉帛
    const fa = rules.epithets.foes_to_allies;
    if (father.faction && mother.faction && String(father.faction) !== String(mother.faction)) {
        synergyBonus += fa.synergyBonus;
        epithets.push({
            id: 'foes_to_allies',
            title: EPITHET_TITLES.foes_to_allies,
            titleKey: fa.titleKey,
            summary: `相性 +${fa.synergyBonus}`,
            summaryKey: 'ui.breed.epithet.summary.foes_to_allies',
            summaryArgs: [String(fa.synergyBonus)],
        });
    }

    // (c) 雙星輝映
    const ts = rules.epithets.twin_stars;
    const fatherKinds = highStarFactorKinds(father.genes, ts.minFactorStars);
    const motherKinds = highStarFactorKinds(mother.genes, ts.minFactorStars);
    const hasCrossPair =
        (fatherKinds.has('blue') && motherKinds.has('red'))
        || (fatherKinds.has('red') && motherKinds.has('blue'));
    if (hasCrossPair) {
        awakenRateBonus += ts.awakenRateBonus;
        const pct = String(Math.round(ts.awakenRateBonus * 100));
        epithets.push({
            id: 'twin_stars',
            title: EPITHET_TITLES.twin_stars,
            titleKey: ts.titleKey,
            summary: `覺醒率 +${pct}%`,
            summaryKey: 'ui.breed.epithet.summary.twin_stars',
            summaryArgs: [pct],
        });
    }

    return { freshBlood, epithets, bonusTp, synergyBonus, awakenRateBonus };
}

/**
 * 結緣預覽標籤；傳入 t（i18n 取字）時走四語系字串，未傳則用內建繁中（單元測試與無 i18n 環境）。
 */
export function marriageVitalityBadgeLine(
    result: MarriageVitalityResult,
    t?: (key: string, ...args: string[]) => string,
): string {
    const badges: string[] = [];
    if (result.freshBlood.active) {
        const pct = Math.round(result.freshBlood.earlyTrainingBonus * 100);
        badges.push(t
            ? t('ui.breed.fresh_blood', String(result.freshBlood.level), String(pct))
            : `寒門新血 V${result.freshBlood.level}（前6季訓練+${pct}%）`);
    }
    for (const ep of result.epithets) {
        const title = t ? t(ep.titleKey) : ep.title;
        const summary = t && ep.summaryKey ? t(ep.summaryKey, ...(ep.summaryArgs ?? [])) : ep.summary;
        badges.push(`${title}（${summary}）`);
    }
    return badges.join(' · ');
}
