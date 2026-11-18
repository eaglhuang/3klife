// @spec-source → 戰場適性系統.md (doc_spec_0041) §F；血統傳承G1初代開局_直覺相馬與開蒙修業規格書.md (doc_spec_0182) §E-5；PROG-2-9161 裁決 2
/**
 * ChildAptitudeInheritance — 子嗣適性繼承與天生分流推薦（純邏輯，不依賴 cc）
 *
 * 數值來源為 data/child-aptitude-rules.json；此處保留同內容預設值供 headless 測試使用。
 */
import type { GeneralGeneConfig, GeneralStatsConfig } from '../models/GeneralUnit';
import type { CanonicalRole } from '../models/GeneralRole';
import { normalizeAptitudeGrade, type AptitudeGrade } from './BattleAptitude';
import type { FactorDefinition, FactorDictionary } from './FactorInheritance';

export interface ChildAptitudeRulesConfig {
    aptitudeInheritance: {
        gradeOrder: readonly AptitudeGrade[];
        defaultParentGrade: AptitudeGrade;
        childStepDelta: number;
        birthMaxGrade: AptitudeGrade;
        birthMinGrade: AptitudeGrade;
        defaultTroopKeys: readonly string[];
    };
    careerRecommendation: {
        factorWeightPerLevel: number;
        warriorWeights: { str: number; lea: number };
        scholarWeights: { int: number; pol: number; cha: number };
        commanderWeights: { lea: number; cha: number; str: number };
    };
}

export const CHILD_APTITUDE_RULES_JSON = 'data/child-aptitude-rules';

const DEFAULT_RULES: ChildAptitudeRulesConfig = {
    aptitudeInheritance: {
        gradeOrder: ['D', 'C', 'B', 'A', 'S'],
        defaultParentGrade: 'B',
        childStepDelta: -1,
        birthMaxGrade: 'A',
        birthMinGrade: 'C',
        defaultTroopKeys: ['CAVALRY', 'INFANTRY', 'ARCHER', 'SIEGE'],
    },
    careerRecommendation: {
        factorWeightPerLevel: 3,
        warriorWeights: { str: 1.3, lea: 0.7 },
        scholarWeights: { int: 0.9, pol: 0.8, cha: 0.3 },
        commanderWeights: { lea: 1.2, cha: 0.5, str: 0.3 },
    },
};

let _rules: ChildAptitudeRulesConfig = DEFAULT_RULES;

export function defaultChildAptitudeRules(): ChildAptitudeRulesConfig {
    return DEFAULT_RULES;
}

export function configureChildAptitudeRules(raw: Partial<ChildAptitudeRulesConfig> | null | undefined): void {
    if (!raw) return;
    _rules = {
        aptitudeInheritance: raw.aptitudeInheritance ?? DEFAULT_RULES.aptitudeInheritance,
        careerRecommendation: raw.careerRecommendation ?? DEFAULT_RULES.careerRecommendation,
    };
}

export function resetChildAptitudeRules(): void {
    _rules = DEFAULT_RULES;
}

function gradeRank(grade: AptitudeGrade): number {
    const idx = _rules.aptitudeInheritance.gradeOrder.indexOf(grade);
    return idx >= 0 ? idx : _rules.aptitudeInheritance.gradeOrder.indexOf(_rules.aptitudeInheritance.defaultParentGrade);
}

function rankToGrade(rank: number): AptitudeGrade {
    const order = _rules.aptitudeInheritance.gradeOrder;
    const clamped = Math.max(0, Math.min(order.length - 1, Math.round(rank)));
    return order[clamped];
}

function inheritMap(
    fatherMap: Readonly<Record<string, string>> | undefined,
    motherMap: Readonly<Record<string, string>> | undefined,
    requiredKeys: readonly string[] = [],
): Record<string, AptitudeGrade> {
    const keys = new Set<string>(requiredKeys);
    for (const k of Object.keys(fatherMap ?? {})) keys.add(k);
    for (const k of Object.keys(motherMap ?? {})) keys.add(k);

    const defGrade = _rules.aptitudeInheritance.defaultParentGrade;
    const capRank = gradeRank(_rules.aptitudeInheritance.birthMaxGrade);
    const floorRank = gradeRank(_rules.aptitudeInheritance.birthMinGrade);
    const delta = _rules.aptitudeInheritance.childStepDelta;
    const out: Record<string, AptitudeGrade> = {};

    for (const key of keys) {
        const fRaw = fatherMap?.[key];
        const mRaw = motherMap?.[key];
        const fGrade = fRaw ? normalizeAptitudeGrade(fRaw) : defGrade;
        const mGrade = mRaw ? normalizeAptitudeGrade(mRaw) : defGrade;
        const fRank = gradeRank(fGrade);
        const mRank = gradeRank(mGrade);
        const bestRank = Math.max(fRank, mRank);

        // 僅當雙親皆明確為 D 時才保留 D，否則不低於 birthMinGrade (C)
        const bothExplicitlyZero = fRaw !== undefined && mRaw !== undefined && fRank === 0 && mRank === 0;
        const minAllowed = bothExplicitlyZero ? 0 : floorRank;
        const childRank = Math.max(minAllowed, Math.min(capRank, bestRank + delta));
        out[key] = rankToGrade(childRank);
    }
    return out;
}

export interface ParentAptitudeSource {
    troopAptitude?: Readonly<Record<string, string>>;
    terrainAptitude?: Readonly<Record<string, string>>;
    weatherAptitude?: Readonly<Record<string, string>>;
}

export interface InheritedAptitudes {
    troopAptitude: Record<string, AptitudeGrade>;
    terrainAptitude: Record<string, AptitudeGrade>;
    weatherAptitude: Record<string, AptitudeGrade>;
}

/** 依父母兵種/地形/天氣適性計算子嗣出生基底（較優親代降一階，上限 A、下限 C）。 */
export function inheritChildAptitudes(father: ParentAptitudeSource, mother: ParentAptitudeSource): InheritedAptitudes {
    return {
        troopAptitude: inheritMap(father.troopAptitude, mother.troopAptitude, _rules.aptitudeInheritance.defaultTroopKeys),
        terrainAptitude: inheritMap(father.terrainAptitude, mother.terrainAptitude),
        weatherAptitude: inheritMap(father.weatherAptitude, mother.weatherAptitude),
    };
}

/** 開蒙或加冠由紅（粉）因子覺醒升階：每次 +1 階，最高 S。 */
export function promoteAptitudeByPinkFactor(grade: string | undefined, steps = 1): AptitudeGrade {
    const current = grade ? normalizeAptitudeGrade(grade) : _rules.aptitudeInheritance.birthMinGrade;
    const nextRank = Math.min(_rules.aptitudeInheritance.gradeOrder.length - 1, gradeRank(current) + Math.max(0, Math.floor(steps)));
    return rankToGrade(nextRank);
}

const CIVIL_CATEGORIES = new Set(['social', 'attribute-int', 'attribute-pol', 'attribute-cha']);
const MARTIAL_CATEGORIES = new Set(['attribute-str', 'attribute-lea', 'special']);
const CIVIL_TAGS = new Set(['權謀', '仁德', '政治', '魅力', '智力', '內政', '外交', '文官']);

function classifyFactorLeaning(def?: FactorDefinition): 'martial' | 'civil' | null {
    if (!def) return null;
    if (def.category && CIVIL_CATEGORIES.has(def.category)) return 'civil';
    if (def.category === 'tactic-seed') {
        return (def.defaultTags ?? []).some((tag: string) => CIVIL_TAGS.has(tag)) ? 'civil' : 'martial';
    }
    if (def.category && MARTIAL_CATEGORIES.has(def.category)) return 'martial';
    return null;
}

export interface ChildCareerRecommendation {
    canonicalRole: CanonicalRole;
    recommendedTrack: 'Combat' | 'Commander' | 'Support';
    fateClass: 'Warrior' | 'Scholar';
    warriorScore: number;
    scholarScore: number;
    commanderScore: number;
}

/**
 * 依子嗣五維與顯性因子計算推薦天命分流（武官／文官／統帥）。
 * 因子僅提供微調權重，不再讓單顆 1★ 因子蓋過明顯的五維差距。
 */
export function recommendChildCareerRole(
    stats: GeneralStatsConfig | undefined,
    genes?: readonly GeneralGeneConfig[],
    dictionary?: FactorDictionary,
): ChildCareerRecommendation {
    let martialFactorLevels = 0;
    let civilFactorLevels = 0;
    for (const gene of genes ?? []) {
        if (!gene.id) continue;
        const leaning = classifyFactorLeaning(dictionary?.get(gene.id));
        const level = gene.level ?? 1;
        if (leaning === 'martial') martialFactorLevels += level;
        else if (leaning === 'civil') civilFactorLevels += level;
    }

    const str = stats?.str ?? 0;
    const int = stats?.int ?? 0;
    const lea = stats?.lea ?? 0;
    const pol = stats?.pol ?? 0;
    const cha = stats?.cha ?? 0;

    const cfg = _rules.careerRecommendation;
    const warriorScore = Number((cfg.warriorWeights.str * str + cfg.warriorWeights.lea * lea + cfg.factorWeightPerLevel * martialFactorLevels).toFixed(2));
    const scholarScore = Number((cfg.scholarWeights.int * int + cfg.scholarWeights.pol * pol + cfg.scholarWeights.cha * cha + cfg.factorWeightPerLevel * civilFactorLevels).toFixed(2));
    const commanderScore = Number((cfg.commanderWeights.lea * lea + cfg.commanderWeights.cha * cha + cfg.commanderWeights.str * str).toFixed(2));

    let canonicalRole: CanonicalRole = 'Mentor';
    let recommendedTrack: 'Combat' | 'Commander' | 'Support' = 'Support';
    if (commanderScore > warriorScore && commanderScore > scholarScore) {
        canonicalRole = 'Combat';
        recommendedTrack = 'Commander';
    } else if (warriorScore > scholarScore) {
        canonicalRole = 'Combat';
        recommendedTrack = 'Combat';
    }

    return {
        canonicalRole,
        recommendedTrack,
        fateClass: warriorScore > scholarScore ? 'Warrior' : 'Scholar',
        warriorScore,
        scholarScore,
        commanderScore,
    };
}
