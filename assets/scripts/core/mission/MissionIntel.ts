/**
 * MissionIntel — 情報度來源（初始／再探／等待／連鎖）與分層
 *
 * 使用者裁決：再探遞增 +35／+25／+15，單靠再探最高 90；等待每任務一次（期限 +1 季、情報 +20～25）。
 * 全部是純函式，回傳新值，不改傳入物件。
 */
import { DEFAULT_MISSION_BALANCE, MissionBalance, clampNumber } from './MissionBalance';
import type { MissionDefinition, MissionGeneralFacts, MissionInstance, MissionIntelBand } from './MissionTypes';

export function clampIntel(v: number): number {
    return clampNumber(Math.round(v), 0, 100);
}

export function intelBandOf(intel: number, balance: MissionBalance = DEFAULT_MISSION_BALANCE): MissionIntelBand {
    if (intel >= balance.intelBands.full) return 'full';
    if (intel >= balance.intelBands.clear) return 'clear';
    if (intel >= balance.intelBands.vague) return 'vague';
    return 'blind';
}

/** 初始情報：initial ± jitter（u 為 [0,1) 種子值）＋外部加成（世界旗標等） */
export function initialIntel(def: Pick<MissionDefinition, 'intel'>, u: number, bonus = 0): number {
    const jitter = Math.round((u * 2 - 1) * def.intel.jitter);
    return clampIntel(def.intel.initial + jitter + bonus);
}

/** 斥候加成：依斥候屬性與特質，上限與係數全在 balance */
export function scoutIntelBonus(scout: Pick<MissionGeneralFacts, 'stats' | 'tags'> | null, balance: MissionBalance = DEFAULT_MISSION_BALANCE): number {
    if (!scout) return 0;
    const r = balance.recon;
    const stat = (scout.stats as Record<string, number | undefined>)[r.scoutStatKey];
    let bonus = typeof stat === 'number' ? Math.max(0, (stat - r.scoutStatBaseline) * r.scoutStatPerPoint) : 0;
    if (scout.tags.some(t => r.scoutTags.indexOf(t) >= 0)) bonus += r.scoutTagBonus;
    return Math.min(r.scoutBonusMax, Math.round(bonus));
}

/** 第 n 次（0 起算）再探的基本增量；定義可用 recon.base 覆寫第一步，其餘依比例縮放 */
export function reconStepValue(def: Pick<MissionDefinition, 'intel'>, reconCount: number, balance: MissionBalance = DEFAULT_MISSION_BALANCE): number {
    const steps = balance.recon.steps;
    const first = steps[0];
    const step = steps[Math.min(Math.max(0, reconCount), steps.length - 1)];
    const base = def.intel.sources?.recon?.base ?? first;
    return Math.round(base * (step / first));
}

export type IntelChangeResult =
    | { ok: true; intel: number; gained: number; reconCount: number; waited: boolean; expireSeason: number }
    | { ok: false; code: 'NOT_OPEN' | 'INTEL_FULL' | 'ALREADY_WAITED' };

type IntelState = Pick<MissionInstance, 'intel' | 'reconCount' | 'waited' | 'status' | 'expireSeason'>;

/** 再探：增量遞減，單靠再探封頂 recon.cap；已達或超過封頂（例如連鎖給到 100）則無增量 */
export function applyRecon(def: Pick<MissionDefinition, 'intel'>, inst: Readonly<IntelState>, scoutBonus = 0, balance: MissionBalance = DEFAULT_MISSION_BALANCE): IntelChangeResult {
    if (inst.status !== 'OPEN') return { ok: false, code: 'NOT_OPEN' };
    const cap = balance.recon.cap;
    if (inst.intel >= cap) return { ok: false, code: 'INTEL_FULL' };
    const step = reconStepValue(def, inst.reconCount, balance) + Math.max(0, scoutBonus);
    const next = Math.min(cap, inst.intel + step);
    return { ok: true, intel: next, gained: next - inst.intel, reconCount: inst.reconCount + 1, waited: inst.waited, expireSeason: inst.expireSeason };
}

/** 等待：每任務一次，期限 +expireBonusSeasons、情報 +delta（定義可覆寫） */
export function applyWait(def: Pick<MissionDefinition, 'intel'>, inst: Readonly<IntelState>, balance: MissionBalance = DEFAULT_MISSION_BALANCE): IntelChangeResult {
    if (inst.status !== 'OPEN') return { ok: false, code: 'NOT_OPEN' };
    if (inst.waited) return { ok: false, code: 'ALREADY_WAITED' };
    const delta = def.intel.sources?.wait?.delta ?? balance.wait.delta;
    const next = Math.max(inst.intel, Math.min(balance.wait.cap, inst.intel + delta));
    return { ok: true, intel: next, gained: next - inst.intel, reconCount: inst.reconCount, waited: true, expireSeason: inst.expireSeason + balance.wait.expireBonusSeasons };
}

/** 連鎖／被動等其他來源直接改情報（上限 100） */
export function applyIntelDelta(intel: number, delta: number): number {
    return clampIntel(intel + delta);
}
