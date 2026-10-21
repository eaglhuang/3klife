// @spec-source → 武將戰績系統.md (doc_spec_0019) §F 核心戰績欄位 / 勝率 / 退役戰績評分 / 里程碑、§H 字串
/**
 * BattleRecordStats — 武將戰績：單場表現統計、勝率、里程碑、退役評分、戰績面板資料（純邏輯，不依賴 cc）
 *
 * 單場表現由 BattlePerformanceTracker 從戰場事件累加（我方主將帶隊，麾下部隊的戰果都記在主將身上，暫定）：
 *   - 擊殺：敵方部隊陣亡數
 *   - 傷害：我方對敵方部隊 / 敵將造成的傷害
 *   - 守護力：我方部隊 / 主將承受的傷害 + 我方治療量
 * 戰後由 BattleRoster.settleBattle 把表現累加進名冊武將的 battleRecord。
 *
 * Unity 對照：像掛在戰場上的 StatsTracker（Observer 訂閱 OnDamage/OnKill/OnHeal），
 * 戰鬥結束把累計值交給 SaveData；面板只讀 BuildRecordPanel() 的 ViewModel。
 */

import type { SeasonStats } from './BattleSeasonStats';

export interface BattlePerformance {
    kills: number;
    damageDealt: number;
    damageTaken: number;
    healingDone: number;
}

export const EMPTY_PERFORMANCE: Readonly<BattlePerformance> = { kills: 0, damageDealt: 0, damageTaken: 0, healingDone: 0 };

/** 戰績欄位（與 BattleRoster.BattleRecord 同形的唯讀檢視；新欄位舊存檔可能沒有） */
export interface BattleRecordLike {
    wins: number;
    losses: number;
    draws?: number;
    merit?: number;
    kills?: number;
    totalDamage?: number;
    guardianPower?: number;
    milestones?: readonly string[];
    season?: SeasonStats | null;
}

function nonNeg(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/** 單場表現累加器；side 為「我方」陣營字串（與戰場 Faction 相同值） */
export class BattlePerformanceTracker {
    private stats: BattlePerformance = { ...EMPTY_PERFORMANCE };

    constructor(private readonly side: string) {}

    public reset(): void {
        this.stats = { ...EMPTY_PERFORMANCE };
    }

    /** 部隊受傷：攻方是我方 → 傷害；受傷的是我方 → 承傷 */
    public observeUnitDamaged(damage: number, attackerFaction: string | null | undefined, targetFaction: string | null | undefined): void {
        const amount = nonNeg(damage);
        if (amount === 0) return;
        if (targetFaction === this.side) this.stats.damageTaken += amount;
        else if (attackerFaction === this.side) this.stats.damageDealt += amount;
    }

    /** 武將本體受傷：受傷的是我方主將 → 承傷；是敵將 → 我方傷害 */
    public observeGeneralDamaged(damage: number, generalFaction: string | null | undefined): void {
        const amount = nonNeg(damage);
        if (amount === 0 || !generalFaction) return;
        if (generalFaction === this.side) this.stats.damageTaken += amount;
        else this.stats.damageDealt += amount;
    }

    /** 部隊陣亡：死的是敵方 → 擊殺 +1 */
    public observeUnitDied(deadFaction: string | null | undefined): void {
        if (deadFaction && deadFaction !== this.side) this.stats.kills += 1;
    }

    public observeHealed(amount: number, healedFaction: string | null | undefined): void {
        if (healedFaction === this.side) this.stats.healingDone += nonNeg(amount);
    }

    public snapshot(): BattlePerformance {
        return {
            kills: this.stats.kills,
            damageDealt: Math.round(this.stats.damageDealt),
            damageTaken: Math.round(this.stats.damageTaken),
            healingDone: Math.round(this.stats.healingDone),
        };
    }
}

/** 結算面板的本場戰績一行 */
export function formatPerformance(performance: BattlePerformance): string {
    return `本場戰績：斬敵 ${performance.kills}｜傷害 ${performance.damageDealt}｜守護 ${guardianPowerOf(performance)}`;
}

// ── 公式 ───────────────────────────────────────────────────────────────────

/** WinRate = Win / (Win + Lose) × 100%；沒打過回傳 0（分母為 0 保護） */
export function winRate(record: BattleRecordLike | null | undefined): number {
    const wins = nonNeg(record?.wins);
    const losses = nonNeg(record?.losses);
    const total = wins + losses;
    return total === 0 ? 0 : Math.round((wins / total) * 1000) / 10;
}

/** 守護力 = 承受傷害 + 治療量 */
export function guardianPowerOf(performance: BattlePerformance): number {
    return nonNeg(performance.damageTaken) + nonNeg(performance.healingDone);
}

export type RetireTallyGrade = 'SSR' | 'SR' | 'R' | 'N';

/** retire_score = 勝×3 + 擊殺×2 + 傷害/1000 + 守護力/1000 */
export function retireScore(record: BattleRecordLike | null | undefined): number {
    return nonNeg(record?.wins) * 3 + nonNeg(record?.kills) * 2 + nonNeg(record?.totalDamage) / 1000 + nonNeg(record?.guardianPower) / 1000;
}

export function retireTallyGrade(record: BattleRecordLike | null | undefined): RetireTallyGrade {
    const score = retireScore(record);
    if (score >= 10000) return 'SSR';
    if (score >= 5000) return 'SR';
    if (score >= 1000) return 'R';
    return 'N';
}

// ── 里程碑 ─────────────────────────────────────────────────────────────────

export interface BattleMilestoneDef {
    id: string;
    displayName: string;
    reached(record: BattleRecordLike): boolean;
}

export const BATTLE_MILESTONES: readonly BattleMilestoneDef[] = [
    { id: 'KILL_100', displayName: '百人斬', reached: (r) => nonNeg(r.kills) >= 100 },
    { id: 'KILL_1000', displayName: '千人斬', reached: (r) => nonNeg(r.kills) >= 1000 },
    { id: 'KILL_10000', displayName: '萬人斬', reached: (r) => nonNeg(r.kills) >= 10000 },
    { id: 'UNDEFEATED_50', displayName: '不敗神話', reached: (r) => nonNeg(r.wins) >= 50 && nonNeg(r.losses) === 0 },
    { id: 'GUARDIAN_WALL', displayName: '守護之壁', reached: (r) => nonNeg(r.guardianPower) >= 50000 },
    { id: 'ASURA', displayName: '修羅', reached: (r) => nonNeg(r.totalDamage) >= 100000 },
];

/** 依目前戰績回傳「這次新達成」的里程碑 id（已記錄的不重複回報）；里程碑一旦達成就保留（不敗神話不會因之後敗戰而移除） */
export function newlyReachedMilestones(record: BattleRecordLike): string[] {
    const have = new Set(record.milestones ?? []);
    return BATTLE_MILESTONES.filter((m) => !have.has(m.id) && m.reached(record)).map((m) => m.id);
}

export function milestoneDisplayName(id: string): string {
    return BATTLE_MILESTONES.find((m) => m.id === id)?.displayName ?? id;
}

/** 里程碑名稱的語系 key：record.milestone.<id>（REC-12，PROG-2-0445） */
export function milestoneTextKey(id: string): string {
    return `record.milestone.${id}`;
}

/** 里程碑名稱的 zh-TW 預設；與 resources/i18n/zh-TW.json 的 record.milestone.* 同步（測試會比對） */
export const MILESTONE_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = Object.fromEntries(
    BATTLE_MILESTONES.map((m) => [milestoneTextKey(m.id), m.displayName]),
);

/** 語系查詢里程碑名稱；語系表沒有該 key 時退回 zh-TW 預設，未知 id 回傳 id 本身 */
export function localizedMilestoneName(id: string, lookup: (key: string) => string): string {
    const key = milestoneTextKey(id);
    const localized = lookup(key);
    if (localized !== key) return localized;
    return MILESTONE_TEXT_FALLBACK_ZH_TW[key] ?? id;
}

// ── 戰績面板 ViewModel（武將詳情「戰績」分頁） ───────────────────────────────

export interface BattleRecordPanelRow {
    key: 'UI_STAT_WIN' | 'UI_STAT_LOSE' | 'UI_STAT_KILL' | 'UI_STAT_DAMAGE' | 'UI_STAT_GUARDIAN';
    label: string;
    value: number;
}

export interface BattleRecordPanel {
    rows: BattleRecordPanelRow[];
    winRate: number;
    winRateText: string;
    milestones: string[];
    retireGrade: RetireTallyGrade;
    /** 退役面板用：「生涯戰績：{Win}勝 {Lose}敗 斬{Kill}人」 */
    careerText: string;
    hasRecord: boolean;
}

export function buildBattleRecordPanel(record: BattleRecordLike | null | undefined): BattleRecordPanel {
    const r: BattleRecordLike = record ?? { wins: 0, losses: 0 };
    const wins = nonNeg(r.wins);
    const losses = nonNeg(r.losses);
    const kills = nonNeg(r.kills);
    const rate = winRate(r);
    return {
        rows: [
            { key: 'UI_STAT_WIN', label: '勝場', value: wins },
            { key: 'UI_STAT_LOSE', label: '敗場', value: losses },
            { key: 'UI_STAT_KILL', label: '擊殺數', value: kills },
            { key: 'UI_STAT_DAMAGE', label: '傷害總量', value: nonNeg(r.totalDamage) },
            { key: 'UI_STAT_GUARDIAN', label: '守護力', value: nonNeg(r.guardianPower) },
        ],
        winRate: rate,
        winRateText: `勝率 ${rate}%`,
        milestones: (r.milestones ?? []).map(milestoneDisplayName),
        retireGrade: retireTallyGrade(r),
        careerText: `生涯戰績：${wins}勝 ${losses}敗 斬${kills}人`,
        hasRecord: wins + losses + nonNeg(r.draws) > 0,
    };
}

// ── 戰績分頁文字（PROG-2-0081） ─────────────────────────────────────────────

export interface BattleRecordTabText {
    career: string;
    winRate: string;
    stats: string;
    milestones: string;
    retire: string;
    season: string;
}

/** 數字加千分位，傷害、守護力動輒上萬 */
function groupDigits(value: number): string {
    return String(Math.floor(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 本賽季戰績一行（PROG-2-0956）。
 * currentSeasonId 未知時顯示「—」；賽季 ID 對不上（上一季的殘留紀錄）或本季沒出征，都視為「尚未出征」。
 * Unity 對照：Presenter 先比對計分表的賽季 ID 再決定顯示，過期的表不顯示。
 */
export function buildSeasonRecordLine(season: SeasonStats | null | undefined, currentSeasonId: string | undefined): string {
    if (!currentSeasonId) return '本賽季：—';
    if (!season || season.seasonId !== currentSeasonId) return '本賽季：尚未出征';
    const wins = nonNeg(season.wins);
    const losses = nonNeg(season.losses);
    if (wins + losses === 0) return '本賽季：尚未出征';
    return `本賽季：${wins}勝 ${losses}敗 斬${nonNeg(season.kills)}人`;
}

/**
 * 武將詳情「戰績」分頁要顯示的文字（View 只負責塞進 Label）。
 * currentSeasonId 為目前 PvP 賽季 ID（由 pvpSeasonIdOf 換算）；不傳則本賽季行顯示「—」。
 * Unity 對照：Presenter 把 ViewModel 轉成字串，MonoBehaviour 只做 label.text = ...
 */
export function buildBattleRecordTabText(record: BattleRecordLike | null | undefined, currentSeasonId?: string): BattleRecordTabText {
    const panel = buildBattleRecordPanel(record);
    return {
        career: panel.hasRecord ? panel.careerText : '尚未出征',
        winRate: panel.hasRecord ? panel.winRateText : '勝率 —',
        stats: panel.rows.map((row) => `${row.label}：${groupDigits(row.value)}`).join('\n'),
        milestones: panel.milestones.length > 0 ? `里程碑：${panel.milestones.join('、')}` : '里程碑：尚未達成',
        retire: `退役評價：${panel.retireGrade}`,
        season: buildSeasonRecordLine(record?.season, currentSeasonId),
    };
}
