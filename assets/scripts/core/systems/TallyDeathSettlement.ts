// @spec-source → 兵種（虎符）系統.md：陣亡產出虎符、陣亡退回君主（PROG-2-0236，WBS TRP-08）；分數權重為暫定（PM 2026-10-13）
/**
 * TallyDeathSettlement — 陣亡事件的虎符結算（純邏輯，不依賴 cc）
 *
 * 比較前後兩份名冊，只對「這次才變成陣亡」的武將處理：
 * 1. 手上的虎符退回君主；
 * 2. 符合產出條件者產一張陣亡虎符（君主持有）。
 *
 * Unity 對照：像 OnDeath 事件，只在 alive → dead 的那一幀觸發一次，
 * 而不是每次 Update 都檢查，避免同一個人死兩次、產兩張卡。
 */
import type { TigerTallyCard } from '../models/TigerTallyCard';
import type { BattleRecord } from './BattleRoster';
import { produceDeathTally, type TigerTallyGeneral } from './TigerTally';
import { onGeneralDeath, type TallyHoldings } from './TigerTallyHoldings';
import { GENERAL_STATUS_DEAD } from './GeneralAging';

/**
 * 陣亡虎符分數的暫定設定（PM 2026-10-13 決定：規格未定前以既有戰績欄位加權，可調整）。
 * 調整時只改這裡；定案後記錄到待辦文件並更新此註解。
 */
export const TALLY_DEATH_SCORE_TUNING = {
    /** 每勝 +4 */
    perWin: 4,
    /** 每殺 +3 */
    perKill: 3,
    /** 每點功勳 +0.5 */
    perMerit: 0.5,
    /** 每點守護力 +0.02 */
    perGuardianPower: 0.02,
    /** 「舊品質分數」尚無來源欄位，暫時固定為 0 */
    legacyQualityFallback: 0,
} as const;

/** 戰鬥死亡分數（0~100）：依戰績欄位加權，缺欄位視為 0 */
export function computeDeathBattleScore(record: BattleRecord | undefined): number {
    if (!record) return 0;
    const t = TALLY_DEATH_SCORE_TUNING;
    const raw = record.wins * t.perWin
        + (record.kills ?? 0) * t.perKill
        + record.merit * t.perMerit
        + (record.guardianPower ?? 0) * t.perGuardianPower;
    return Math.min(100, Math.max(0, Math.round(raw)));
}

export interface TallyDeathState {
    readonly holdings: TallyHoldings;
    readonly cards: Readonly<Record<string, TigerTallyCard>>;
}

export interface TallyDeathSettlementResult extends TallyDeathState {
    /** 這次新產出的陣亡虎符 uid */
    readonly produced: string[];
    /** 這次從陣亡武將手上退回君主的虎符 uid */
    readonly returned: string[];
}

interface DeathCandidate extends TigerTallyGeneral {
    status?: string;
    battleRecord?: BattleRecord;
}

function isDead(general: DeathCandidate): boolean {
    return (general.status ?? '').toLowerCase() === GENERAL_STATUS_DEAD;
}

/**
 * 只處理 alive → dead 的轉變。同一武將重複呼叫不會重複產卡（before 已是陣亡就略過）。
 * 產卡 uid 由 produceDeathTally 決定（武將 + 季），已存在的 uid 不覆蓋。
 */
export function settleDeathTallies(
    state: TallyDeathState,
    before: readonly DeathCandidate[],
    after: readonly DeathCandidate[],
    season: number,
): TallyDeathSettlementResult {
    const wasDead = new Set(before.filter(isDead).map((g) => g.id));
    let holdings = state.holdings;
    const cards = { ...state.cards };
    const produced: string[] = [];
    const returned: string[] = [];

    for (const general of after) {
        if (!isDead(general) || wasDead.has(general.id)) continue;

        const back = onGeneralDeath(holdings, general.id);
        holdings = back.state;
        returned.push(...back.returned);

        const card = produceDeathTally(
            general,
            computeDeathBattleScore(general.battleRecord),
            TALLY_DEATH_SCORE_TUNING.legacyQualityFallback,
            season,
        );
        if (!card || card.uid in cards || card.uid in holdings.holders) continue;
        cards[card.uid] = card;
        holdings = { holders: { ...holdings.holders, [card.uid]: null } };
        produced.push(card.uid);
    }

    return { holdings, cards, produced, returned };
}
