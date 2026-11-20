// @spec-source → 血統EP綜合評級精算模型與天命波動規格書.md (doc_spec_1098) §2；血統與家系漸進揭露里程碑總綱規格書.md (doc_spec_0181) §E-11；PROG-2-9162
/**
 * FamilyCompatibility — 門風契合度 K ∈ [0, 15]（純邏輯，不依賴 cc）
 *
 * 數值來源為 data/family-compatibility-rules.json；此處保留同內容預設值供 headless 測試使用。
 */
import type { GeneralStatsConfig } from '../models/GeneralUnit';
import type { FamilyPairRecord } from './FamilySynergy';

export interface FamilyCompatibilityRulesConfig {
    maxTotalBonus: number;
    styleResonance: {
        complementaryBonus: number;
        sameEliteBonus: number;
        eliteAvgThreshold: number;
        martialLeanGap: number;
        civilLeanGap: number;
    };
    lineageWindow: {
        windowSize: number;
        bonusPerQualifiedMarriage: number;
        maxLineageBonus: number;
    };
}

export const FAMILY_COMPATIBILITY_RULES_JSON = 'data/family-compatibility-rules';

const DEFAULT_RULES: FamilyCompatibilityRulesConfig = {
    maxTotalBonus: 15,
    styleResonance: {
        complementaryBonus: 5,
        sameEliteBonus: 3,
        eliteAvgThreshold: 75,
        martialLeanGap: 8,
        civilLeanGap: 8,
    },
    lineageWindow: {
        windowSize: 6,
        bonusPerQualifiedMarriage: 2,
        maxLineageBonus: 10,
    },
};

let _rules: FamilyCompatibilityRulesConfig = DEFAULT_RULES;

export function defaultFamilyCompatibilityRules(): FamilyCompatibilityRulesConfig {
    return DEFAULT_RULES;
}

export function configureFamilyCompatibilityRules(raw: Partial<FamilyCompatibilityRulesConfig> | null | undefined): void {
    if (!raw) return;
    _rules = {
        maxTotalBonus: raw.maxTotalBonus ?? DEFAULT_RULES.maxTotalBonus,
        styleResonance: raw.styleResonance ?? DEFAULT_RULES.styleResonance,
        lineageWindow: raw.lineageWindow ?? DEFAULT_RULES.lineageWindow,
    };
}

export function resetFamilyCompatibilityRules(): void {
    _rules = DEFAULT_RULES;
}

export type FamilyStyleKind = 'martial' | 'civil' | 'balanced';

export function classifyParentStyle(stats?: GeneralStatsConfig): { kind: FamilyStyleKind; primaryAvg: number } {
    const martialAvg = ((stats?.str ?? 0) + (stats?.lea ?? 0)) / 2;
    const civilAvg = ((stats?.int ?? 0) + (stats?.pol ?? 0)) / 2;
    if (martialAvg - civilAvg >= _rules.styleResonance.martialLeanGap) {
        return { kind: 'martial', primaryAvg: martialAvg };
    }
    if (civilAvg - martialAvg >= _rules.styleResonance.civilLeanGap) {
        return { kind: 'civil', primaryAvg: civilAvg };
    }
    return { kind: 'balanced', primaryAvg: Math.max(martialAvg, civilAvg) };
}

export function computeStyleCompatibility(
    fatherStats?: GeneralStatsConfig,
    motherStats?: GeneralStatsConfig,
): { kStyle: number; label: string | null } {
    const father = classifyParentStyle(fatherStats);
    const mother = classifyParentStyle(motherStats);

    if (
        (father.kind === 'martial' && mother.kind === 'civil') ||
        (father.kind === 'civil' && mother.kind === 'martial')
    ) {
        return { kStyle: _rules.styleResonance.complementaryBonus, label: '文武雙修佳話' };
    }

    if (
        father.kind !== 'balanced' &&
        father.kind === mother.kind &&
        father.primaryAvg >= _rules.styleResonance.eliteAvgThreshold &&
        mother.primaryAvg >= _rules.styleResonance.eliteAvgThreshold
    ) {
        return { kStyle: _rules.styleResonance.sameEliteBonus, label: '同系精銳共鳴' };
    }

    return { kStyle: 0, label: null };
}

export function countQualifiedInRecentWindow(record?: FamilyPairRecord, windowSize = _rules.lineageWindow.windowSize): number {
    if (!record || record.recentCount <= 0) return 0;
    const limit = Math.min(record.recentCount, Math.max(0, windowSize));
    let count = 0;
    for (let bit = 0; bit < limit; bit++) {
        if ((record.recentBitmap >> bit) & 1) count++;
    }
    return count;
}

export function computeLineageCompatibility(qualifiedMarriagesInWindow = 0): number {
    const n = Math.max(0, Math.min(_rules.lineageWindow.windowSize, Math.floor(qualifiedMarriagesInWindow)));
    return Math.min(_rules.lineageWindow.maxLineageBonus, n * _rules.lineageWindow.bonusPerQualifiedMarriage);
}

export interface FamilyCompatibilityInput {
    fatherStats?: GeneralStatsConfig;
    motherStats?: GeneralStatsConfig;
    /** 兩族近 6 名已成材子代滑動窗內通婚次數（若有 pairRecord 可自動換算） */
    qualifiedMarriagesInWindow?: number;
    pairRecord?: FamilyPairRecord;
    /** 佳話聯姻（如「化干戈為玉帛」）帶來的額外相性加值（PROG-2-9184） */
    epithetSynergyBonus?: number;
}

export interface FamilyCompatibilityResult {
    kStyle: number;
    kLineage: number;
    kEpithet?: number;
    totalK: number;
    styleLabel: string | null;
}

/** 計算門風契合度 K ∈ [0, 15] */
export function computeFamilyCompatibilityK(input: FamilyCompatibilityInput): FamilyCompatibilityResult {
    const { kStyle, label } = computeStyleCompatibility(input.fatherStats, input.motherStats);
    const windowCount = input.qualifiedMarriagesInWindow ?? countQualifiedInRecentWindow(input.pairRecord);
    const kLineage = computeLineageCompatibility(windowCount);
    const kEpithet = Math.max(0, input.epithetSynergyBonus ?? 0);
    const totalK = Math.min(_rules.maxTotalBonus, kStyle + kLineage + kEpithet);
    return { kStyle, kLineage, kEpithet, totalK, styleLabel: label };
}
