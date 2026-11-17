/**
 * MissionSpawn — 由定義產生任務實例（隱藏變體與初始情報由種子決定，不用 Date.now）
 */
import { DEFAULT_MISSION_BALANCE, MissionBalance } from './MissionBalance';
import { initialIntel, clampIntel } from './MissionIntel';
import { deriveRng, pickWeighted } from './MissionRng';
import type { MissionDefinition, MissionInstance } from './MissionTypes';

export interface SpawnInput {
    def: MissionDefinition;
    /** 實例 id：由宿主配發（需全域唯一，結算種子以它衍生） */
    id: string;
    saveSeed: number;
    season: number;
    /** 區分同季不同格的鍵（牆別/格位），納入種子衍生 */
    spawnKey?: string;
    /** 世界旗標等帶來的初始情報加成 */
    intelBonus?: number;
    /** 連鎖指定初始情報（覆寫 initial±jitter） */
    intelOverride?: number;
    /** 連鎖指定期限（季數，覆寫 timing.expireSeasons） */
    expireSeasons?: number;
    chainFrom?: string;
}

export function createMissionInstance(input: SpawnInput, _balance: MissionBalance = DEFAULT_MISSION_BALANCE): MissionInstance {
    const { def } = input;
    const rng = deriveRng(input.saveSeed, input.id, `spawn:${input.spawnKey ?? ''}:${input.season}`);
    const variant = pickWeighted(def.variants, v => v.weight, rng.next());
    const intel = input.intelOverride !== undefined
        ? clampIntel(input.intelOverride)
        : initialIntel(def, rng.next(), input.intelBonus ?? 0);
    const inst: MissionInstance = {
        id: input.id, defId: def.id, defVersion: def.version, theme: def.theme,
        variant: variant.id, spawnSeason: input.season,
        expireSeason: input.season + (input.expireSeasons ?? def.timing.expireSeasons),
        intel, reconCount: 0, waited: false, status: 'OPEN',
    };
    if (input.chainFrom) inst.chainFrom = input.chainFrom;
    return inst;
}

/** 未接取且已過期 */
export function isMissionExpired(inst: Pick<MissionInstance, 'status' | 'expireSeason'>, season: number): boolean {
    return inst.status === 'OPEN' && season > inst.expireSeason;
}

/** 進行中且到了回報季 */
export function isMissionDue(inst: Pick<MissionInstance, 'status' | 'dispatch'>, season: number): boolean {
    return inst.status === 'ACTIVE' && !!inst.dispatch && season >= inst.dispatch.returnSeason;
}
