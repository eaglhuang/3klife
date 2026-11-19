// @spec-source → sanguo_bloodline_wp10_umamusume_mapping.md §1-4 §3-3；PROG-2-9170
/**
 * BloodlineResonance — 培育中段血脈共鳴事件（Rounds 12 & 24，純邏輯，不依賴 cc）
 *
 * 規格重點（2026-11-20 總 PM 核准暫定）：
 * - 觸發節點：第 12 回合與第 24 回合（與 EnrollmentRites 開蒙禮 / 加冠禮同回合結算）。
 * - 觸發率 P_res = clamp(0.35 + 0.03 * K + 0.02 * R_tag, 0.35, 0.95)。
 * - 黃金升格率 P_gold = clamp(0.05 + 0.02 * K + 0.03 * S_elite, 0.05, 0.50)。
 * - 一般共鳴：單維屬性 +4~+8（round(4 + 0.25*K)）+ 先祖藍/白/粉因子共鳴繼承或升星（上限 3★）。
 * - 黃金共鳴：雙維屬性 +6~+12（round(6 + 0.40*K)）+ 因子共鳴 + 兵種適性突破（上限 S）。
 * - 防刷與上限：每位子嗣最多觸發 2 次，已檢定回合記錄在 session 與武將資料上，讀檔或重修不重複觸發。
 *
 * Unity 對照：類似一個純靜態 ResonanceEvaluator，讀取 ScriptableObject/JSON 規則後回傳不可變的結算結果與新武將快照。
 */
import type { GeneralConfig, GeneralGeneConfig, GeneralStatsConfig } from '../models/GeneralUnit';
import { APTITUDE_GRADES, TROOP_APTITUDE_LABEL_ZH, aptitudeGradeOf } from './AptitudeView';
import { riteAncestorsOf, type AncestorRelation, type RiteAncestor } from './EnrollmentRites';
import { resolveFactorColor, type FactorDictionary } from './FactorInheritance';

export const BLOODLINE_RESONANCE_RULES_JSON = 'data/bloodline-resonance-rules';

export type ResonanceStatKey = 'str' | 'int' | 'lea' | 'pol' | 'cha';
const RESONANCE_STAT_KEYS: readonly ResonanceStatKey[] = ['str', 'int', 'lea', 'pol', 'cha'];
const STAT_LABEL_ZH: Readonly<Record<ResonanceStatKey, string>> = {
    str: '武力',
    int: '智力',
    lea: '統率',
    pol: '政治',
    cha: '魅力',
};

export interface BloodlineResonanceRulesConfig {
    triggerRounds: number[];
    maxTriggersPerChild: number;
    resonanceRate: {
        base: number;
        compatibilitySlope: number;
        tagSlope: number;
        min: number;
        max: number;
        maxTagCount: number;
    };
    goldUpgradeRate: {
        base: number;
        compatibilitySlope: number;
        eliteSlope: number;
        min: number;
        max: number;
        maxEliteCount: number;
    };
    statBonus: {
        normalBase: number;
        normalSlope: number;
        normalMin: number;
        normalMax: number;
        goldBase: number;
        goldSlope: number;
        goldMin: number;
        goldMax: number;
    };
    factorMaxLevel: number;
    aptitudeCapGrade: string;
}

const DEFAULT_RULES: BloodlineResonanceRulesConfig = {
    triggerRounds: [12, 24],
    maxTriggersPerChild: 2,
    resonanceRate: {
        base: 0.35,
        compatibilitySlope: 0.03,
        tagSlope: 0.02,
        min: 0.35,
        max: 0.95,
        maxTagCount: 5,
    },
    goldUpgradeRate: {
        base: 0.05,
        compatibilitySlope: 0.02,
        eliteSlope: 0.03,
        min: 0.05,
        max: 0.50,
        maxEliteCount: 5,
    },
    statBonus: {
        normalBase: 4,
        normalSlope: 0.25,
        normalMin: 4,
        normalMax: 8,
        goldBase: 6,
        goldSlope: 0.40,
        goldMin: 6,
        goldMax: 12,
    },
    factorMaxLevel: 3,
    aptitudeCapGrade: 'S',
};

let _rules: BloodlineResonanceRulesConfig = DEFAULT_RULES;

export function defaultBloodlineResonanceRules(): BloodlineResonanceRulesConfig {
    return DEFAULT_RULES;
}

export function configureBloodlineResonanceRules(raw: Partial<BloodlineResonanceRulesConfig> | null | undefined): void {
    if (!raw) return;
    _rules = {
        triggerRounds: Array.isArray(raw.triggerRounds) && raw.triggerRounds.length > 0 ? [...raw.triggerRounds] : DEFAULT_RULES.triggerRounds,
        maxTriggersPerChild: raw.maxTriggersPerChild ?? DEFAULT_RULES.maxTriggersPerChild,
        resonanceRate: { ...DEFAULT_RULES.resonanceRate, ...(raw.resonanceRate ?? {}) },
        goldUpgradeRate: { ...DEFAULT_RULES.goldUpgradeRate, ...(raw.goldUpgradeRate ?? {}) },
        statBonus: { ...DEFAULT_RULES.statBonus, ...(raw.statBonus ?? {}) },
        factorMaxLevel: raw.factorMaxLevel ?? DEFAULT_RULES.factorMaxLevel,
        aptitudeCapGrade: raw.aptitudeCapGrade ?? DEFAULT_RULES.aptitudeCapGrade,
    };
}

export function resetBloodlineResonanceRules(): void {
    _rules = DEFAULT_RULES;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/** 統計直系先祖（最多 6 位）中與子嗣共有因子 id/type 或同色 3★ 以上的共鳴組數 R_tag ∈ [0, maxTagCount] */
export function countResonanceTagMatches(
    child: GeneralConfig,
    ancestors: readonly RiteAncestor[],
    dictionary?: FactorDictionary,
): number {
    const childGenes = (child.genes ?? []).filter((g) => !!g.id);
    const childIds = new Set(childGenes.map((g) => g.id as string));
    const childTypes = new Set(childGenes.map((g) => g.type).filter((t): t is string => !!t));
    const matchedKeys = new Set<string>();

    for (const ancestor of ancestors) {
        for (const gene of ancestor.general.genes ?? []) {
            if (!gene.id) continue;
            if (childIds.has(gene.id)) {
                matchedKeys.add(`id:${gene.id}`);
                continue;
            }
            if (gene.type && childTypes.has(gene.type)) {
                matchedKeys.add(`type:${gene.type}`);
                continue;
            }
            if ((gene.level ?? 0) >= 3) {
                const color = resolveFactorColor(gene.id, dictionary, gene);
                if (color) matchedKeys.add(`star3:${color}`);
            }
        }
    }
    return clamp(matchedKeys.size, 0, _rules.resonanceRate.maxTagCount);
}

/** 統計直系先祖已解鎖 3★ 以上或稀有金/紅因子數 S_elite ∈ [0, maxEliteCount] */
export function countEliteAncestorFactors(
    ancestors: readonly RiteAncestor[],
    dictionary?: FactorDictionary,
): number {
    const eliteKeys = new Set<string>();
    for (const ancestor of ancestors) {
        for (const gene of ancestor.general.genes ?? []) {
            if (!gene.id || gene.isLocked) continue;
            const color = resolveFactorColor(gene.id, dictionary, gene);
            if ((gene.level ?? 0) >= 3 || color === 'red' || color === 'purple') {
                eliteKeys.add(`${ancestor.general.id}:${gene.id}`);
            }
        }
    }
    return clamp(eliteKeys.size, 0, _rules.goldUpgradeRate.maxEliteCount);
}

/** 計算觸發機率 P_res 與黃金升格機率 P_gold */
export function computeBloodlineResonanceRates(
    compatibilityK: number,
    tagMatchCount: number,
    eliteFactorCount: number,
): { triggerRate: number; goldRate: number } {
    const k = Math.max(0, compatibilityK);
    const r = clamp(tagMatchCount, 0, _rules.resonanceRate.maxTagCount);
    const s = clamp(eliteFactorCount, 0, _rules.goldUpgradeRate.maxEliteCount);

    const triggerRate = clamp(
        _rules.resonanceRate.base + _rules.resonanceRate.compatibilitySlope * k + _rules.resonanceRate.tagSlope * r,
        _rules.resonanceRate.min,
        _rules.resonanceRate.max,
    );
    const goldRate = clamp(
        _rules.goldUpgradeRate.base + _rules.goldUpgradeRate.compatibilitySlope * k + _rules.goldUpgradeRate.eliteSlope * s,
        _rules.goldUpgradeRate.min,
        _rules.goldUpgradeRate.max,
    );
    return { triggerRate, goldRate };
}

/** 計算屬性跳升點數：一般 +4~+8，黃金 +6~+12 */
export function computeResonanceStatBonus(compatibilityK: number, isGold: boolean): number {
    const k = Math.max(0, compatibilityK);
    if (isGold) {
        return clamp(
            Math.round(_rules.statBonus.goldBase + _rules.statBonus.goldSlope * k),
            _rules.statBonus.goldMin,
            _rules.statBonus.goldMax,
        );
    }
    return clamp(
        Math.round(_rules.statBonus.normalBase + _rules.statBonus.normalSlope * k),
        _rules.statBonus.normalMin,
        _rules.statBonus.normalMax,
    );
}

/** 判定當前回合是否應進行血脈共鳴檢定；不重複檢定或超出上限回傳 null */
export function dueResonanceRound(
    round: number,
    sessionRoundsDone: readonly number[] | undefined,
    childRoundsDone: readonly number[] | undefined,
): number | null {
    if (!_rules.triggerRounds.includes(round)) return null;
    const merged = new Set<number>([...(sessionRoundsDone ?? []), ...(childRoundsDone ?? [])]);
    if (merged.has(round)) return null;
    if (merged.size >= _rules.maxTriggersPerChild) return null;
    return round;
}

function statOfGeneral(general: GeneralConfig, key: ResonanceStatKey): number {
    const top = (general as unknown as Record<string, unknown>)[key];
    if (typeof top === 'number') return top;
    return general.stats?.[key] ?? 0;
}

function rankedStatKeysOf(general: GeneralConfig): ResonanceStatKey[] {
    return [...RESONANCE_STAT_KEYS].sort((a, b) => statOfGeneral(general, b) - statOfGeneral(general, a));
}

function applyStatGains(
    general: GeneralConfig,
    keys: readonly ResonanceStatKey[],
    delta: number,
): { general: GeneralConfig; statGains: Partial<Record<ResonanceStatKey, number>> } {
    const nextStats: GeneralStatsConfig = { ...(general.stats ?? {}) };
    const topUpdates: Partial<Record<ResonanceStatKey, number>> = {};
    const statGains: Partial<Record<ResonanceStatKey, number>> = {};

    for (const key of keys) {
        const current = statOfGeneral(general, key);
        const updated = current + delta;
        nextStats[key] = updated;
        topUpdates[key] = updated;
        statGains[key] = delta;
    }

    return {
        general: {
            ...general,
            ...topUpdates,
            stats: nextStats,
        },
        statGains,
    };
}

function pickResonanceFactor(
    child: GeneralConfig,
    ancestors: readonly RiteAncestor[],
    dictionary?: FactorDictionary,
): { gene: GeneralGeneConfig; upgraded: boolean; origin?: { relation: AncestorRelation; ancestorName: string } } | null {
    const existingById = new Map<string, GeneralGeneConfig>();
    for (const g of child.genes ?? []) {
        if (g.id) existingById.set(g.id, g);
    }

    for (const ancestor of ancestors) {
        for (const gene of ancestor.general.genes ?? []) {
            if (!gene.id || gene.isLocked) continue;
            const color = resolveFactorColor(gene.id, dictionary, gene);
            if (color !== 'blue' && color !== 'white' && color !== 'pink') continue;

            const owned = existingById.get(gene.id);
            if (owned) {
                const currentLevel = owned.level ?? 1;
                if (currentLevel < _rules.factorMaxLevel) {
                    return {
                        gene: { ...owned, level: currentLevel + 1 },
                        upgraded: true,
                        origin: { relation: ancestor.relation, ancestorName: ancestor.general.name },
                    };
                }
                continue;
            }

            return {
                gene: {
                    ...gene,
                    level: 1,
                    isLocked: false,
                },
                upgraded: false,
                origin: { relation: ancestor.relation, ancestorName: ancestor.general.name },
            };
        }
    }
    return null;
}

function pickAptitudeBreakthrough(
    child: GeneralConfig,
    ancestors: readonly RiteAncestor[],
): { troop: string; label: string; from: string; to: string } | undefined {
    const capIndex = Math.max(0, APTITUDE_GRADES.indexOf(_rules.aptitudeCapGrade as typeof APTITUDE_GRADES[number]));
    const rankOf = (raw: unknown): number => {
        const grade = aptitudeGradeOf(raw);
        return grade ? APTITUDE_GRADES.indexOf(grade) : APTITUDE_GRADES.length;
    };

    let bestTroop: string | undefined;
    let bestGap = 0;

    for (const ancestor of ancestors) {
        const row = ancestor.general.troopAptitude ?? {};
        for (const troop of Object.keys(row)) {
            const ancestorRank = rankOf(row[troop]);
            const childRank = rankOf(child.troopAptitude?.[troop] ?? 'C');
            const gap = childRank - ancestorRank;
            // 上限不得超過 aptitudeCapGrade（預設 'S'，index 0）
            if (childRank > capIndex && ancestorRank < childRank && gap > bestGap) {
                bestGap = gap;
                bestTroop = troop;
            }
        }
    }

    if (!bestTroop) return undefined;
    const from = String(child.troopAptitude?.[bestTroop] ?? 'C');
    const fromRank = rankOf(from);
    const toRank = Math.max(capIndex, fromRank - 1);
    return {
        troop: bestTroop,
        label: TROOP_APTITUDE_LABEL_ZH[bestTroop] ?? bestTroop,
        from,
        to: APTITUDE_GRADES[toRank],
    };
}

export type BloodlineResonanceTier = 'normal' | 'gold';

export interface BloodlineResonanceFactorOutcome {
    factorId: string;
    displayName: string;
    level: number;
    upgraded: boolean;
}

export interface BloodlineResonanceBreakthrough {
    troop: string;
    label: string;
    from: string;
    to: string;
}

export interface BloodlineResonanceResult {
    round: number;
    triggered: boolean;
    tier?: BloodlineResonanceTier;
    triggerRate: number;
    goldRate: number;
    compatibilityK: number;
    general: GeneralConfig;
    origin?: { relation: AncestorRelation; ancestorName: string };
    statGains?: Partial<Record<ResonanceStatKey, number>>;
    factorOutcome?: BloodlineResonanceFactorOutcome;
    aptitudeBreakthrough?: BloodlineResonanceBreakthrough;
}

export interface BloodlineResonanceContext {
    lookup: (id: string) => GeneralConfig | undefined;
    compatibilityK: number;
    dictionary?: FactorDictionary;
    random: () => number;
    sessionRoundsDone?: readonly number[];
}

export const RESONANCE_TOAST_LINE: Readonly<Record<BloodlineResonanceTier, string>> = {
    normal: '【血脈共鳴】先祖遺澤呼應，資質潛能悄然甦醒！',
    gold: '【祖脈黃金共鳴】先祖英靈降臨，血脈徹底沸騰！',
};

export function resonanceNoticeLine(result: BloodlineResonanceResult): string {
    if (!result.triggered) return '';
    const prefix = result.tier === 'gold' ? '【黃金共鳴】' : '【血脈共鳴】';
    const ancestorText = result.origin ? `承${result.origin.relation}「${result.origin.ancestorName}」遺澤：` : '先祖遺澤湧動：';
    const statParts = Object.entries(result.statGains ?? {}).map(
        ([k, v]) => `${STAT_LABEL_ZH[k as ResonanceStatKey] ?? k}+${v}`,
    );
    const parts = [...statParts];
    if (result.factorOutcome) {
        parts.push(
            result.factorOutcome.upgraded
                ? `因子「${result.factorOutcome.displayName}」升至 ${result.factorOutcome.level}★`
                : `共鳴繼承因子「${result.factorOutcome.displayName}」${result.factorOutcome.level}★`,
        );
    }
    if (result.aptitudeBreakthrough) {
        const b = result.aptitudeBreakthrough;
        parts.push(`${b.label}適性 ${b.from}→${b.to}`);
    }
    return `${prefix}${ancestorText}${parts.join('、')}`;
}

/** 執行單一節點之血脈共鳴檢定；非觸發回合或已檢定過回傳 null */
export function performBloodlineResonance(
    child: GeneralConfig,
    round: number,
    context: BloodlineResonanceContext,
): BloodlineResonanceResult | null {
    const due = dueResonanceRound(round, context.sessionRoundsDone, child.bloodlineResonanceRoundsDone);
    if (due === null) return null;

    const ancestors = riteAncestorsOf(child, context.lookup);
    const tagMatches = countResonanceTagMatches(child, ancestors, context.dictionary);
    const eliteCount = countEliteAncestorFactors(ancestors, context.dictionary);
    const { triggerRate, goldRate } = computeBloodlineResonanceRates(context.compatibilityK, tagMatches, eliteCount);

    const nextRoundsDone = Array.from(new Set([...(child.bloodlineResonanceRoundsDone ?? []), due]));
    let nextGeneral: GeneralConfig = {
        ...child,
        bloodlineResonanceRoundsDone: nextRoundsDone,
    };

    if (context.random() >= triggerRate) {
        return {
            round: due,
            triggered: false,
            triggerRate,
            goldRate,
            compatibilityK: context.compatibilityK,
            general: nextGeneral,
        };
    }

    const isGold = context.random() < goldRate;
    const tier: BloodlineResonanceTier = isGold ? 'gold' : 'normal';
    const leadAncestor = ancestors[0];
    const statSource = leadAncestor?.general ?? nextGeneral;
    const rankedStats = rankedStatKeysOf(statSource);
    const statKeys = isGold ? rankedStats.slice(0, 2) : rankedStats.slice(0, 1);
    const bonus = computeResonanceStatBonus(context.compatibilityK, isGold);

    const appliedStats = applyStatGains(nextGeneral, statKeys, bonus);
    nextGeneral = appliedStats.general;

    let origin: { relation: AncestorRelation; ancestorName: string } | undefined = leadAncestor
        ? { relation: leadAncestor.relation, ancestorName: leadAncestor.general.name }
        : undefined;

    let factorOutcome: BloodlineResonanceFactorOutcome | undefined;
    const pickedFactor = pickResonanceFactor(nextGeneral, ancestors, context.dictionary);
    if (pickedFactor) {
        const genes = [...(nextGeneral.genes ?? [])];
        if (pickedFactor.upgraded) {
            nextGeneral = {
                ...nextGeneral,
                genes: genes.map((g) => (g.id === pickedFactor.gene.id ? pickedFactor.gene : g)),
            };
        } else {
            nextGeneral = {
                ...nextGeneral,
                genes: [...genes, pickedFactor.gene],
            };
        }
        factorOutcome = {
            factorId: pickedFactor.gene.id ?? '',
            displayName: pickedFactor.gene.displayName ?? pickedFactor.gene.id ?? '',
            level: pickedFactor.gene.level ?? 1,
            upgraded: pickedFactor.upgraded,
        };
        if (pickedFactor.origin) origin = pickedFactor.origin;
    }

    let aptitudeBreakthrough: BloodlineResonanceBreakthrough | undefined;
    if (isGold) {
        aptitudeBreakthrough = pickAptitudeBreakthrough(nextGeneral, ancestors);
        if (aptitudeBreakthrough) {
            nextGeneral = {
                ...nextGeneral,
                troopAptitude: {
                    ...(nextGeneral.troopAptitude ?? {}),
                    [aptitudeBreakthrough.troop]: aptitudeBreakthrough.to,
                },
            };
        }
    }

    return {
        round: due,
        triggered: true,
        tier,
        triggerRate,
        goldRate,
        compatibilityK: context.compatibilityK,
        general: nextGeneral,
        origin,
        statGains: appliedStats.statGains,
        factorOutcome,
        aptitudeBreakthrough,
    };
}
