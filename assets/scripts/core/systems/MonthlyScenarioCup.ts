// @spec-source → 名將挑戰賽系統.md (doc_spec_0007)「月度場景賽（特別賽制）」與 K 段「月度場景賽積分公式」（PROG-2-1609）
/**
 * MonthlyScenarioCup — 月度場景賽純邏輯（不依賴 cc）
 *
 * 每月一場指定地形／天氣條件的場景賽；不計入主賽 rank points，成績另存 Monthly_Scenario_History。
 * 積分公式與競技場相同（ArenaScore），場景克制係數由後台每月設定，預設 1.0。
 * 規格只列 1~4 月；5~12 月依使用者裁定（PROG-2-1616）按季節主題推算，皆暫定待審。月份不在 1~12 回 null。
 */
import { arenaScoreOfTeam, counterOf, survivalFactorOf, terrainMultiplierOf, type ArenaMember } from './ArenaScore';

export type MonthlyScenarioRule =
    | { kind: 'ban-tactic-tag'; tag: string }
    | { kind: 'require-aptitude'; aptitudes: readonly string[] }
    | { kind: 'tactic-power'; stat: string; multiplier: number }
    | { kind: 'aptitude-bonus'; troop: string; rank: string; multiplier: number };

export interface MonthlyScenario {
    month: number;
    name: string;
    rule: MonthlyScenarioRule;
}

/** 1~4 月照規格表；5~12 月為暫定推算；兵種碼照 generals troopAptitude（INFANTRY／ARCHER／CAVALRY／NAVY／SIEGE／ENGINEER） */
export const MONTHLY_SCENARIOS: readonly MonthlyScenario[] = [
    { month: 1, name: '冰天雪地', rule: { kind: 'ban-tactic-tag', tag: 'cavalry' } },
    { month: 2, name: '赤壁水戰', rule: { kind: 'require-aptitude', aptitudes: ['NAVY', 'ARCHER'] } },
    { month: 3, name: '春耕奇謀', rule: { kind: 'tactic-power', stat: 'int', multiplier: 1.5 } },
    { month: 4, name: '山地奇兵', rule: { kind: 'aptitude-bonus', troop: 'INFANTRY', rank: 'S', multiplier: 2 } },
    // 以下 5~12 月暫定（PROG-2-1616）
    { month: 5, name: '梅雨泥濘', rule: { kind: 'ban-tactic-tag', tag: 'fire' } },
    { month: 6, name: '長坂疾馳', rule: { kind: 'aptitude-bonus', troop: 'CAVALRY', rank: 'S', multiplier: 2 } },
    { month: 7, name: '酷暑烽火', rule: { kind: 'tactic-power', stat: 'str', multiplier: 1.5 } },
    { month: 8, name: '中秋月射', rule: { kind: 'aptitude-bonus', troop: 'ARCHER', rank: 'S', multiplier: 2 } },
    { month: 9, name: '秋高馬肥', rule: { kind: 'require-aptitude', aptitudes: ['CAVALRY'] } },
    { month: 10, name: '霜降攻城', rule: { kind: 'require-aptitude', aptitudes: ['SIEGE', 'ENGINEER'] } },
    { month: 11, name: '江霧伏弩', rule: { kind: 'require-aptitude', aptitudes: ['ARCHER', 'INFANTRY'] } },
    { month: 12, name: '歲末決戰', rule: { kind: 'tactic-power', stat: 'lea', multiplier: 1.5 } },
];

/** 月份（1~12）對應的場景賽；超出範圍回 null */
export function monthlyScenarioOf(month: number): MonthlyScenario | null {
    return MONTHLY_SCENARIOS.find((s) => s.month === month) ?? null;
}

/** 場景克制係數預設值（後台每月設定） */
export const DEFAULT_SCENE_COUNTER = 1.0;

/** Monthly_Score = Σ[(屬性總和 × 地形倍率) + (戰法點數 × 場景克制係數)] × 存活係數 */
export function monthlyScenarioScore(members: readonly ArenaMember[], sceneCounter = DEFAULT_SCENE_COUNTER): number {
    return arenaScoreOfTeam(members.map((m) => ({ ...m, counter: sceneCounter })));
}

export interface MonthlyScenarioHistoryEntry {
    /** YYYY-MM */
    monthKey: string;
    scenarioName: string;
    score: number;
}

/** 寫入 Monthly_Scenario_History：同月只留最高分；不影響主賽積分 */
export function recordMonthlyScenario(history: readonly MonthlyScenarioHistoryEntry[], entry: MonthlyScenarioHistoryEntry): MonthlyScenarioHistoryEntry[] {
    const existing = history.find((h) => h.monthKey === entry.monthKey);
    if (existing && existing.score >= entry.score) return [...history];
    return [...history.filter((h) => h.monthKey !== entry.monthKey), entry];
}

/** 參賽武將檢查需要的欄位：兵種適性（generals.json troopAptitude，大寫兵種碼）與已配戰法標籤 */
export interface MonthlyScenarioEntrant {
    troopAptitude?: Readonly<Record<string, string>>;
    tacticTags?: readonly string[];
}

/** 「只允許某適性武將」視為該兵種適性 A 以上（PROG-2-1610 暫定） */
export const MONTHLY_REQUIRED_APTITUDE_RANKS: readonly string[] = ['S', 'A'];

export type MonthlyScenarioViolation = 'banned-tactic' | 'missing-aptitude';

/** 參賽資格（PROG-2-1610）：禁用戰法標籤、必要適性；威力類規則不擋報名，回 null 表示可參賽 */
export function monthlyScenarioViolationOf(scenario: Readonly<MonthlyScenario>, entrant: Readonly<MonthlyScenarioEntrant>): MonthlyScenarioViolation | null {
    const rule = scenario.rule;
    if (rule.kind === 'ban-tactic-tag') {
        return (entrant.tacticTags ?? []).includes(rule.tag) ? 'banned-tactic' : null;
    }
    if (rule.kind === 'require-aptitude') {
        const ok = rule.aptitudes.some((troop) => MONTHLY_REQUIRED_APTITUDE_RANKS.includes(entrant.troopAptitude?.[troop] ?? ''));
        return ok ? null : 'missing-aptitude';
    }
    return null;
}

/** 整隊可參賽的成員索引；不合格者列在 rejected */
export function filterMonthlyScenarioTeam<T extends MonthlyScenarioEntrant>(scenario: Readonly<MonthlyScenario>, team: readonly T[]): { accepted: T[]; rejected: { entrant: T; reason: MonthlyScenarioViolation }[] } {
    const accepted: T[] = [];
    const rejected: { entrant: T; reason: MonthlyScenarioViolation }[] = [];
    for (const entrant of team) {
        const reason = monthlyScenarioViolationOf(scenario, entrant);
        if (reason) rejected.push({ entrant, reason });
        else accepted.push(entrant);
    }
    return { accepted, rejected };
}

/** 威力類規則需要的欄位：主戰法的主屬性（int / str …） */
export type MonthlyScenarioMember = ArenaMember & MonthlyScenarioEntrant & { tacticScalingStat?: string };

/**
 * 套用場景威力規則的單人積分（PROG-2-1611 暫定）：
 * - 春耕奇謀 tactic-power：主戰法主屬性符合時，戰法點數 × 倍率
 * - 山地奇兵 aptitude-bonus：該兵種適性等級符合時，地形倍率的加成部分 × 倍率（S 1.5 → 2.0）
 * 其餘規則同競技場公式。
 */
export function monthlyScenarioMemberScore(scenario: Readonly<MonthlyScenario> | null, member: Readonly<MonthlyScenarioMember>, sceneCounter = DEFAULT_SCENE_COUNTER): number {
    const rule = scenario?.rule;
    const attributeSum = (member.str || 0) + (member.int || 0) + (member.lea || 0) + (member.luk || 0);
    let terrain = terrainMultiplierOf(member.terrain);
    if (rule?.kind === 'aptitude-bonus' && member.troopAptitude?.[rule.troop] === rule.rank) {
        terrain = 1 + (terrain - 1) * rule.multiplier;
    }
    let tactic = (member.tacticPoints || 0) * counterOf(sceneCounter);
    if (rule?.kind === 'tactic-power' && member.tacticScalingStat === rule.stat) tactic *= rule.multiplier;
    return (attributeSum * terrain + tactic) * survivalFactorOf(member.hp, member.maxHp);
}

export function monthlyScenarioTeamScore(scenario: Readonly<MonthlyScenario> | null, members: readonly MonthlyScenarioMember[], sceneCounter = DEFAULT_SCENE_COUNTER): number {
    return members.reduce((sum, m) => sum + monthlyScenarioMemberScore(scenario, m, sceneCounter), 0);
}

/** 名冊武將轉場景賽成員需要的欄位（GeneralConfig 子集） */
export interface MonthlyScenarioGeneral extends MonthlyScenarioEntrant {
    id: string;
    str?: number;
    int?: number;
    lea?: number;
    luk?: number;
}

/** 場景賽出戰人數（與主賽同為 3，PROG-2-1754 暫定） */
export const MONTHLY_TEAM_SIZE = 3;
const RANK_ORDER: readonly string[] = ['S', 'A', 'B', 'C', 'D'];

/**
 * 名冊武將 → 場景賽成員（PROG-2-1754 暫定）：
 * - 地形倍率取「山地奇兵」類規則指定兵種的適性，其餘規則取該將最高兵種適性；無適性視為 B
 * - 名冊沒有戰法等級，戰法點數記 0；滿血出戰（存活係數 1）
 */
export function monthlyScenarioMemberOf(scenario: Readonly<MonthlyScenario>, general: Readonly<MonthlyScenarioGeneral>): MonthlyScenarioMember {
    const aptitude = general.troopAptitude ?? {};
    const rule = scenario.rule;
    const best = Object.values(aptitude).filter((r) => RANK_ORDER.includes(r)).sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b))[0];
    const terrain = rule.kind === 'aptitude-bonus' ? aptitude[rule.troop] ?? 'B' : best ?? 'B';
    return {
        str: general.str ?? 0, int: general.int ?? 0, lea: general.lea ?? 0, luk: general.luk ?? 0,
        tacticPoints: 0, terrain, hp: 1, maxHp: 1,
        troopAptitude: aptitude, tacticTags: general.tacticTags ?? [],
    };
}

/** 月份鍵 YYYY-MM（與 monthlyScenarioLine 同用本地月份） */
export function monthKeyOf(nowMs: number): string {
    const d = new Date(nowMs);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export type MonthlyScenarioPlayReason = 'no-scenario' | 'no-eligible';

export interface MonthlyScenarioPlayResult {
    ok: boolean;
    reason?: MonthlyScenarioPlayReason;
    scenarioName: string;
    /** 本次得分（四捨五入）與本月最佳 */
    score: number;
    best: number;
    memberIds: string[];
    /** 不合資格被排除的人數 */
    rejected: number;
    history: MonthlyScenarioHistoryEntry[];
}

/** 打一場當月場景賽：排除不合格者、取單人積分前 3 計隊伍分，寫入歷史（同月留最高分）；不動主賽積分 */
export function playMonthlyScenario(
    history: readonly MonthlyScenarioHistoryEntry[],
    generals: readonly MonthlyScenarioGeneral[],
    nowMs: number,
    sceneCounter = DEFAULT_SCENE_COUNTER,
): MonthlyScenarioPlayResult {
    const monthKey = monthKeyOf(nowMs);
    const prevBest = history.find((h) => h.monthKey === monthKey)?.score ?? 0;
    const scenario = monthlyScenarioOf(new Date(nowMs).getMonth() + 1);
    const fail = (reason: MonthlyScenarioPlayReason, rejected: number): MonthlyScenarioPlayResult => ({
        ok: false, reason, scenarioName: scenario?.name ?? '', score: 0, best: prevBest, memberIds: [], rejected, history: [...history],
    });
    if (!scenario) return fail('no-scenario', 0);
    const { accepted, rejected } = filterMonthlyScenarioTeam(scenario, generals);
    if (accepted.length === 0) return fail('no-eligible', rejected.length);
    const team = accepted
        .map((g) => ({ id: g.id, member: monthlyScenarioMemberOf(scenario, g) }))
        .map((m) => ({ ...m, score: monthlyScenarioMemberScore(scenario, m.member, sceneCounter) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MONTHLY_TEAM_SIZE);
    const score = Math.round(monthlyScenarioTeamScore(scenario, team.map((m) => m.member), sceneCounter));
    const next = recordMonthlyScenario(history, { monthKey, scenarioName: scenario.name, score });
    return {
        ok: true, scenarioName: scenario.name, score, best: Math.max(prevBest, score),
        memberIds: team.map((m) => m.id), rejected: rejected.length, history: next,
    };
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** 存檔正規化：丟掉缺欄位的紀錄 */
export function normalizeMonthlyScenarioHistory(raw: unknown): MonthlyScenarioHistoryEntry[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((h): h is MonthlyScenarioHistoryEntry => !!h && typeof h.monthKey === 'string' && typeof h.scenarioName === 'string' && isFiniteNum(h.score))
        .map((h) => ({ monthKey: h.monthKey, scenarioName: h.scenarioName, score: h.score }));
}
