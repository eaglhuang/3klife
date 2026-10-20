// 地形修正值（REV-02）：對應 assets/resources/data/terrain.json。
// runtime 仍以 Constants.ts 的 TERRAIN_ATTACK_MOD / TERRAIN_DEFENSE_MOD 為準，
// 本檔只負責驗證資料檔結構，並由 tests/TerrainConfig.test.ts 與 Constants.ts 交叉比對。
// 純 TS，不依賴 cc；不修改傳入的 raw 物件。

import { TerrainType } from '../../shared/CommonEnums';

export type TerrainModTable = Record<TerrainType, number>;

export interface TerrainConfig {
    attackMod: TerrainModTable;
    defenseMod: TerrainModTable;
}

export type TerrainConfigResult =
    | { ok: true; config: TerrainConfig }
    | { ok: false; errors: string[] };

const TERRAIN_KEYS = Object.values(TerrainType) as TerrainType[];

function readTable(raw: unknown, field: string, errors: string[]): TerrainModTable | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        errors.push(`${field} 必須是物件`);
        return null;
    }
    const source = raw as Record<string, unknown>;
    const table = {} as TerrainModTable;
    for (const key of TERRAIN_KEYS) {
        const value = source[key];
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            errors.push(`${field}.${key} 必須是有限數字`);
            continue;
        }
        table[key] = value;
    }
    return table;
}

/** 驗證 terrain.json 的結構；不做數值範圍判斷以外的推論 */
export function parseTerrainConfig(raw: unknown): TerrainConfigResult {
    if (typeof raw !== 'object' || raw === null) {
        return { ok: false, errors: ['根節點必須是物件'] };
    }
    const root = raw as Record<string, unknown>;
    const errors: string[] = [];
    const attackMod = readTable(root.attackMod, 'attackMod', errors);
    const defenseMod = readTable(root.defenseMod, 'defenseMod', errors);
    if (errors.length > 0 || !attackMod || !defenseMod) {
        return { ok: false, errors };
    }
    return { ok: true, config: { attackMod, defenseMod } };
}
