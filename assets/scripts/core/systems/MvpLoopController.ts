// @spec-source → MVP核心循環貫通與遊玩動線功能規格書.md (doc_spec_0308) §2 五階段狀態機；世代功業傳承規格書 (doc_spec_0310) §3；PROG-2-1911
/**
 * MvpLoopController — MVP 五階段核心循環總控（純邏輯，不依賴 cc）。
 *
 * 只管「現在在哪個階段、能不能往下走、世代交接時帶走什麼」；
 * 各階段實際內容（結緣、學府、戰場、退役）仍由各自系統負責，這裡串起來並記錄軌跡。
 * 祠堂聲望五階的子嗣福祉也放這裡，交接時套到二代身上。
 *
 * Unity 對照：像 GameFlow 的 StateMachine ScriptableObject，轉移表是資料、不寫死在 if 裡。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { calculatePrestigeGain, clanPrestigeTierOf, type PrestigeCareer } from './GenerationalLegacy';

export enum MvpPhase {
    LOBBY_SETUP = 'LOBBY_SETUP',
    BONDING = 'BONDING',
    CHILD_BIRTH = 'CHILD_BIRTH',
    ACADEMY = 'ACADEMY',
    GRADUATION = 'GRADUATION',
    BATTLE_DEPLOY = 'BATTLE_DEPLOY',
    COMBAT_ASCEND = 'COMBAT_ASCEND',
    LEGACY_HANDOFF = 'LEGACY_HANDOFF',
}

/** §2 狀態圖的合法轉移 */
export const MVP_PHASE_TRANSITIONS: Readonly<Record<MvpPhase, readonly MvpPhase[]>> = {
    [MvpPhase.LOBBY_SETUP]: [MvpPhase.BONDING],
    [MvpPhase.BONDING]: [MvpPhase.CHILD_BIRTH],
    [MvpPhase.CHILD_BIRTH]: [MvpPhase.ACADEMY],
    [MvpPhase.ACADEMY]: [MvpPhase.GRADUATION],
    [MvpPhase.GRADUATION]: [MvpPhase.BATTLE_DEPLOY],
    [MvpPhase.BATTLE_DEPLOY]: [MvpPhase.COMBAT_ASCEND],
    [MvpPhase.COMBAT_ASCEND]: [MvpPhase.BATTLE_DEPLOY, MvpPhase.LEGACY_HANDOFF],
    [MvpPhase.LEGACY_HANDOFF]: [MvpPhase.BONDING],
};

/** Phase 0 初始資源包 */
export const MVP_STARTER_PACK = { gold: 1000, food: 2000, troopTokens: { infantry: 1, cavalry: 1 }, troopCap: 500 } as const;

export interface ClanPrestigeBenefit {
    statBonusPct: number;
    startRank: number;
    academyVitalityMax: number | null;
    guaranteedPurpleFactor: boolean;
    extraMentorSlot: boolean;
    dailyShrinePill: boolean;
}

/** doc_spec_0310 §3 表格；索引 0 = Lv.1。高階含低階的起點與精力上限 */
export const CLAN_PRESTIGE_BENEFITS: readonly ClanPrestigeBenefit[] = [
    { statBonusPct: 0, startRank: 0, academyVitalityMax: null, guaranteedPurpleFactor: false, extraMentorSlot: false, dailyShrinePill: false },
    { statBonusPct: 5, startRank: 1, academyVitalityMax: null, guaranteedPurpleFactor: false, extraMentorSlot: false, dailyShrinePill: false },
    { statBonusPct: 10, startRank: 1, academyVitalityMax: 110, guaranteedPurpleFactor: false, extraMentorSlot: false, dailyShrinePill: false },
    { statBonusPct: 15, startRank: 1, academyVitalityMax: 110, guaranteedPurpleFactor: true, extraMentorSlot: true, dailyShrinePill: false },
    { statBonusPct: 20, startRank: 2, academyVitalityMax: 110, guaranteedPurpleFactor: true, extraMentorSlot: true, dailyShrinePill: true },
];

export function clanPrestigeBenefitOf(tier: number): ClanPrestigeBenefit {
    const i = Math.min(CLAN_PRESTIGE_BENEFITS.length, Math.max(1, Math.floor(tier))) - 1;
    return CLAN_PRESTIGE_BENEFITS[i];
}

const BIRTH_STATS = ['str', 'int', 'lea', 'pol', 'cha'] as const;

/** 子嗣出生套用祠堂福祉：五維乘加成（無條件捨去）、將階不低於起點；不改輸入 */
export function applyChildBirthBenefit(child: Readonly<GeneralConfig>, tier: number): GeneralConfig {
    const b = clanPrestigeBenefitOf(tier);
    const next = { ...child } as GeneralConfig;
    const rec = next as unknown as Record<string, unknown>;
    for (const key of BIRTH_STATS) {
        const v = rec[key];
        if (typeof v === 'number' && Number.isFinite(v)) rec[key] = Math.floor(v * (100 + b.statBonusPct) / 100);
    }
    const rank = (rec.generalRank as number | undefined) ?? 0;
    rec.generalRank = Math.max(rank, b.startRank);
    return next;
}

export interface MvpLoopState {
    phase: MvpPhase;
    generation: number;
    clanPrestige: number;
    gold: number;
    food: number;
    /** 走過的階段（含起點），供驗收與除錯 */
    trail: MvpPhase[];
}

export class MvpLoopError extends Error {}

export function startMvpLoop(): MvpLoopState {
    return { phase: MvpPhase.LOBBY_SETUP, generation: 1, clanPrestige: 0, gold: MVP_STARTER_PACK.gold, food: MVP_STARTER_PACK.food, trail: [MvpPhase.LOBBY_SETUP] };
}

export function canAdvanceMvp(state: Readonly<MvpLoopState>, to: MvpPhase): boolean {
    return MVP_PHASE_TRANSITIONS[state.phase].indexOf(to) >= 0;
}

/** 往下一階段；非法轉移拋錯。世代交接請用 completeLegacyHandoff */
export function advanceMvpPhase(state: Readonly<MvpLoopState>, to: MvpPhase): MvpLoopState {
    if (!canAdvanceMvp(state, to)) throw new MvpLoopError(`不能從 ${state.phase} 走到 ${to}`);
    if (state.phase === MvpPhase.LEGACY_HANDOFF) throw new MvpLoopError('世代交接請用 completeLegacyHandoff');
    return { ...state, phase: to, trail: [...state.trail, to] };
}

export interface LegacyHandoffResult {
    state: MvpLoopState;
    prestigeGain: number;
    tier: number;
    tierUp: boolean;
    benefit: ClanPrestigeBenefit;
}

/** Phase 4 → Phase 1：一代功業換聲望、世代 +1，回傳二代可享的福祉 */
export function completeLegacyHandoff(state: Readonly<MvpLoopState>, career: Readonly<PrestigeCareer>): LegacyHandoffResult {
    if (state.phase !== MvpPhase.LEGACY_HANDOFF) throw new MvpLoopError(`目前在 ${state.phase}，不是世代交接`);
    const before = clanPrestigeTierOf(state.clanPrestige);
    const prestigeGain = calculatePrestigeGain(career);
    const clanPrestige = state.clanPrestige + prestigeGain;
    const tier = clanPrestigeTierOf(clanPrestige);
    return {
        state: { ...state, phase: MvpPhase.BONDING, generation: state.generation + 1, clanPrestige, trail: [...state.trail, MvpPhase.BONDING] },
        prestigeGain, tier, tierUp: tier > before, benefit: clanPrestigeBenefitOf(tier),
    };
}
