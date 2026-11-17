// 任務核心測試共用工具（非 .test.ts，不會被自動掃描）
import { parseMissionDefinition } from '../../assets/scripts/core/mission/MissionDefinitionParser';
import { lockDispatch } from '../../assets/scripts/core/mission/MissionResolver';
import type { MissionDefinition, MissionGeneralFacts, MissionInstance } from '../../assets/scripts/core/mission/MissionTypes';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

export function loadFixtureRaw(name: string): unknown {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'));
}

export function loadFixture(name: string): MissionDefinition {
    const r = parseMissionDefinition(loadFixtureRaw(name));
    if (!r.ok) throw new Error(`fixture ${name} 解析失敗：${JSON.stringify(r.issues)}`);
    return r.def;
}

export function mkGeneral(over: Partial<MissionGeneralFacts> = {}): MissionGeneralFacts {
    return {
        id: 'G1', name: '測試將', stats: { str: 70, int: 70, lea: 70, pol: 70, cha: 70 },
        power: 180, vitality: 100, tags: [], block: [], ...over,
    };
}

export function mkInstance(def: MissionDefinition, variant: string, intel: number, id = 'M1'): MissionInstance {
    return {
        id, defId: def.id, defVersion: def.version, theme: def.theme, variant, spawnSeason: 1,
        expireSeason: 1 + def.timing.expireSeasons, intel, reconCount: 0, waited: false, status: 'OPEN',
    };
}

/** 依派遣流程鎖定後回傳進行中的實例 */
export function dispatched(def: MissionDefinition, inst: MissionInstance, general: MissionGeneralFacts,
    flags: Record<string, number | boolean> = {}, season = 1, affinity = 0): MissionInstance {
    const { lock } = lockDispatch({ def, instance: inst, general, flags, season, executorAffinity: affinity });
    return { ...inst, status: 'ACTIVE', dispatch: lock };
}
