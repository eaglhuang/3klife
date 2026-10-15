// 數值常數集中化（NUM-04）：對應 assets/resources/data/numerical-config.json。
// 純 TS，不依賴 cc；解析只做結構與有限數字檢查，不改寫輸入。

export interface AptitudeStatMod {
    atk_def: number;
    move: number;
    acc: number;
}

export interface NumericalConfig {
    _comment?: string;
    Counter_Table: Record<string, number>;
    Aptitude_Efficiency: Record<string, number>;
    Aptitude_Stat_Mod: Record<string, AptitudeStatMod>;
    Age_Modifier: Record<string, number>;
    Reincarnation_Cap: Record<string, number>;
    Ult_Base_Power: Record<string, number>;
    Ult_Vitality_Cost_Pct: Record<string, number>;
    Vitality_Cost: Record<string, number>;
    SP_Per_Kill: number;
    SP_Max: number;
    Crit_Multiplier: number;
    Tally_Quality_Threshold: Record<string, number>;
    Tally_Quality_Mod: Record<string, number>;
    Tally_Star_Cap: Record<string, number>;
    Tally_Star_Exp: Record<string, number>;
    Tally_Breakthrough_Gold: Record<string, number>;
    Tally_Breakthrough_Essence: Record<string, number>;
    Tally_Terrain_Affinity_Mod: Record<string, number>;
    Tally_Clan_Resonance_Mod: number;
    Tally_Clan_Bond_Mod: number;
    Tally_Gender_Match_Mod: number;
    Tally_Remove_Loyalty: Record<string, number>;
    Tally_Equip_Loyalty: Record<string, number>;
    Resource_Cap: Record<string, number>;
}

export interface FormulaEntry {
    ID: string;
    Name: string;
    Category: string;
}

export interface FormulaRegistry {
    _comment?: string;
    Formulas: FormulaEntry[];
}

export interface NumericalConfigFile {
    NumericalConfig: NumericalConfig;
    FormulaRegistry: FormulaRegistry;
}

export type ParseNumericalConfigResult =
    | { ok: true; config: NumericalConfigFile }
    | { ok: false; errors: string[] };

const SCALAR_KEYS = [
    'SP_Per_Kill',
    'SP_Max',
    'Crit_Multiplier',
    'Tally_Clan_Resonance_Mod',
    'Tally_Clan_Bond_Mod',
    'Tally_Gender_Match_Mod',
] as const;

const NUMBER_MAP_KEYS = [
    'Counter_Table',
    'Aptitude_Efficiency',
    'Age_Modifier',
    'Reincarnation_Cap',
    'Ult_Base_Power',
    'Ult_Vitality_Cost_Pct',
    'Vitality_Cost',
    'Tally_Quality_Threshold',
    'Tally_Quality_Mod',
    'Tally_Star_Cap',
    'Tally_Star_Exp',
    'Tally_Breakthrough_Gold',
    'Tally_Breakthrough_Essence',
    'Tally_Terrain_Affinity_Mod',
    'Tally_Remove_Loyalty',
    'Tally_Equip_Loyalty',
    'Resource_Cap',
] as const;

const STAT_MOD_FIELDS = ['atk_def', 'move', 'acc'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function checkScalar(source: Record<string, unknown>, key: string, errors: string[]): void {
    if (!isFiniteNumber(source[key])) {
        errors.push(`NumericalConfig.${key} 必須是有限數字`);
    }
}

function checkNumberMap(source: Record<string, unknown>, key: string, errors: string[]): void {
    const map = source[key];
    if (!isRecord(map)) {
        errors.push(`NumericalConfig.${key} 必須是物件`);
        return;
    }
    for (const entry of Object.keys(map)) {
        if (!isFiniteNumber(map[entry])) {
            errors.push(`NumericalConfig.${key}.${entry} 必須是有限數字`);
        }
    }
}

function checkStatMod(source: Record<string, unknown>, errors: string[]): void {
    const table = source.Aptitude_Stat_Mod;
    if (!isRecord(table)) {
        errors.push('NumericalConfig.Aptitude_Stat_Mod 必須是物件');
        return;
    }
    for (const grade of Object.keys(table)) {
        const mod = table[grade];
        if (!isRecord(mod)) {
            errors.push(`NumericalConfig.Aptitude_Stat_Mod.${grade} 必須是物件`);
            continue;
        }
        for (const field of STAT_MOD_FIELDS) {
            if (!isFiniteNumber(mod[field])) {
                errors.push(`NumericalConfig.Aptitude_Stat_Mod.${grade}.${field} 必須是有限數字`);
            }
        }
    }
}

function checkFormulas(registry: Record<string, unknown>, errors: string[]): void {
    const formulas = registry.Formulas;
    if (!Array.isArray(formulas)) {
        errors.push('FormulaRegistry.Formulas 必須是陣列');
        return;
    }
    const seen = new Set<string>();
    formulas.forEach((entry, index) => {
        if (!isRecord(entry)) {
            errors.push(`FormulaRegistry.Formulas[${index}] 必須是物件`);
            return;
        }
        for (const field of ['ID', 'Name', 'Category'] as const) {
            if (typeof entry[field] !== 'string' || entry[field] === '') {
                errors.push(`FormulaRegistry.Formulas[${index}].${field} 必須是非空字串`);
            }
        }
        const id = entry.ID;
        if (typeof id === 'string') {
            if (seen.has(id)) errors.push(`FormulaRegistry 公式 ID 重複：${id}`);
            seen.add(id);
        }
    });
}

// 解析並驗證數值設定。通過時回傳同一份物件（不複製、不改寫）；失敗時列出所有違規，不丟例外。
export function parseNumericalConfig(raw: unknown): ParseNumericalConfigResult {
    if (!isRecord(raw)) {
        return { ok: false, errors: ['根節點必須是物件'] };
    }
    const errors: string[] = [];

    const config = raw.NumericalConfig;
    if (!isRecord(config)) {
        errors.push('缺少 NumericalConfig 區段');
    } else {
        for (const key of SCALAR_KEYS) checkScalar(config, key, errors);
        for (const key of NUMBER_MAP_KEYS) checkNumberMap(config, key, errors);
        checkStatMod(config, errors);
    }

    const registry = raw.FormulaRegistry;
    if (!isRecord(registry)) {
        errors.push('缺少 FormulaRegistry 區段');
    } else {
        checkFormulas(registry, errors);
    }

    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return { ok: true, config: raw as unknown as NumericalConfigFile };
}
