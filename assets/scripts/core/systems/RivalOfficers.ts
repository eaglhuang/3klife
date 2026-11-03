// @spec-source → AI武將強度系統.md (doc_data_0002) §E-5、§E-9 前置：他國武將與虎符名冊（PROG-2-1712）
/**
 * RivalOfficers — 他國的逐將名冊與虎符（純邏輯，不依賴 cc）
 *
 * 名冊由 rival-rosters.json 指定武將 id，年齡、精力上限、五維取自 generals.json；
 * 玩家已擁有、或資料裡不存在的武將略過（同一位武將不能同時在玩家與他國陣中）。
 * 這張只建資料；季推進逐將重算（E-9 Phase 1~3）另卡處理。
 *
 * Unity 對照：像開局時依 ScriptableObject 表把每個 AI 陣營的 Unit 清單實例化出來。
 */
import type { TigerTallyQuality } from '../models/TigerTallyCard';

export interface RivalTallyConfig {
    readonly id: string;
    readonly quality: TigerTallyQuality;
    readonly troopType: string;
    readonly star: number;
}

export interface RivalRostersConfig {
    readonly nations: Readonly<Record<string, { readonly generals: readonly string[]; readonly tallies: readonly RivalTallyConfig[] }>>;
}

/** generals.json 中名冊需要的欄位 */
export interface RivalGeneralSource {
    readonly id: string;
    readonly age?: number;
    readonly maxVitality?: number;
    readonly str?: number;
    readonly int?: number;
    readonly lea?: number;
    readonly pol?: number;
    readonly cha?: number;
}

export interface RivalOfficer {
    readonly generalId: string;
    readonly age: number;
    readonly vitality: number;
    readonly baseStats: { readonly str: number; readonly int: number; readonly lea: number; readonly pol: number; readonly cha: number };
}

export interface RivalTally {
    readonly id: string;
    readonly quality: TigerTallyQuality;
    readonly troopType: string;
    readonly star: number;
    readonly starExp: number;
    readonly equippedGeneralId: string | null;
}

export interface RivalNationRoster {
    readonly officers: readonly RivalOfficer[];
    readonly tallies: readonly RivalTally[];
}

/** 武將資料缺年齡時的預設年齡、缺精力上限時的預設精力 */
export const RIVAL_DEFAULT_AGE = 30;
export const RIVAL_DEFAULT_VITALITY = 100;

function officerOf(source: RivalGeneralSource): RivalOfficer {
    return {
        generalId: source.id,
        age: source.age ?? RIVAL_DEFAULT_AGE,
        vitality: source.maxVitality ?? RIVAL_DEFAULT_VITALITY,
        baseStats: {
            str: source.str ?? 0,
            int: source.int ?? 0,
            lea: source.lea ?? 0,
            pol: source.pol ?? 0,
            cha: source.cha ?? 0,
        },
    };
}

/**
 * 依設定建出各國名冊。一位武將只會出現在一國（設定重複時先列者優先）。
 * 虎符初始未裝備，裝備由季推進的換裝步驟（E-9 Phase 2b）決定。
 */
export function buildRivalOfficers(
    config: Readonly<RivalRostersConfig>,
    generals: readonly RivalGeneralSource[],
    playerOwnedIds: ReadonlySet<string> = new Set(),
): Record<string, RivalNationRoster> {
    const byId = new Map(generals.map((g) => [g.id, g]));
    const taken = new Set<string>(playerOwnedIds);
    const out: Record<string, RivalNationRoster> = {};
    for (const [nationId, entry] of Object.entries(config.nations)) {
        const officers: RivalOfficer[] = [];
        for (const id of entry.generals) {
            const source = byId.get(id);
            if (!source || taken.has(id)) continue;
            taken.add(id);
            officers.push(officerOf(source));
        }
        const tallies = entry.tallies.map((t): RivalTally => ({
            id: t.id,
            quality: t.quality,
            troopType: t.troopType,
            star: Math.max(1, Math.floor(t.star)),
            starExp: 0,
            equippedGeneralId: null,
        }));
        out[nationId] = { officers, tallies };
    }
    return out;
}
