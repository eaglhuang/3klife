// @spec-source → 裁決 2026-11-08 第二份 RET-10（PROG-2-2100）
/**
 * GeneralSalary — 武將每季薪資與欠薪結算（純邏輯，不依賴 cc）。
 *
 * - 每季薪資＝階級 × 50 金幣。
 * - 國庫不足的武將當季算欠薪，由呼叫端扣忠誠與親密各 15。
 * - 連續欠薪滿 2 季起，每季 30% 機率下野；鎖定忠誠的武將不下野。
 *
 * 暫定：「官職階級」採每位武將自己的 generalRank；金幣不夠時由高階往低階發，
 * 付不起的跳過，後面付得起的照發。
 * Unity 對照：像每回合跑一次的 Payroll Service，只算結果，不碰錢包或名冊。
 */

export const SALARY_PER_RANK = 50;
export const SALARY_ARREARS_PENALTY = 15;
export const SALARY_DESERT_AFTER_SEASONS = 2;
export const SALARY_DESERT_CHANCE = 0.3;

export interface SalaryPayee {
    id: string;
    rank: number;
    /** false：不會下野（鎖定忠誠的轉蛋名將、主將） */
    canDesert: boolean;
}

export interface SalaryLedger {
    /** 武將 id → 連續欠薪季數；沒有欠薪的不在表內 */
    arrears: Record<string, number>;
    /** 上次結算的季數，避免同一季重複發薪 */
    lastSettledSeason: number | null;
}

export interface SalarySettlement {
    totalPaid: number;
    paid: string[];
    unpaid: string[];
    departed: string[];
    ledger: SalaryLedger;
}

export function createSalaryLedger(): SalaryLedger {
    return { arrears: {}, lastSettledSeason: null };
}

export function salaryOfRank(rank: number): number {
    if (!Number.isFinite(rank) || rank <= 0) return 0;
    return Math.floor(rank) * SALARY_PER_RANK;
}

/** 結算一季薪資。不改輸入；回傳的 ledger 只保留這次名單裡仍欠薪的武將。 */
export function settleSalaries(
    payees: readonly SalaryPayee[],
    gold: number,
    ledger: Readonly<SalaryLedger>,
    season: number,
    rollOf: (id: string) => number,
): SalarySettlement {
    const order = payees
        .map((payee, index) => ({ payee, index, salary: salaryOfRank(payee.rank) }))
        .sort((a, b) => b.salary - a.salary || a.index - b.index);
    let remaining = Number.isFinite(gold) ? Math.max(0, Math.floor(gold)) : 0;
    let totalPaid = 0;
    const paid: string[] = [];
    const unpaid: string[] = [];
    const departed: string[] = [];
    const arrears: Record<string, number> = {};
    for (const { payee, salary } of order) {
        if (salary <= remaining) {
            remaining -= salary;
            totalPaid += salary;
            paid.push(payee.id);
            continue;
        }
        unpaid.push(payee.id);
        const seasons = (ledger.arrears[payee.id] ?? 0) + 1;
        if (payee.canDesert && seasons >= SALARY_DESERT_AFTER_SEASONS && rollOf(payee.id) < SALARY_DESERT_CHANCE) {
            departed.push(payee.id);
            continue;
        }
        arrears[payee.id] = seasons;
    }
    return { totalPaid, paid, unpaid, departed, ledger: { arrears, lastSettledSeason: season } };
}

/** 舊檔缺欄位或壞值時補成合法帳本。 */
export function normalizeSalaryLedger(value: unknown): SalaryLedger {
    if (typeof value !== 'object' || value === null) return createSalaryLedger();
    const raw = value as { arrears?: unknown; lastSettledSeason?: unknown };
    const arrears: Record<string, number> = {};
    if (typeof raw.arrears === 'object' && raw.arrears !== null) {
        for (const [id, seasons] of Object.entries(raw.arrears as Record<string, unknown>)) {
            if (typeof seasons === 'number' && Number.isFinite(seasons) && seasons >= 1) arrears[id] = Math.floor(seasons);
        }
    }
    const season = raw.lastSettledSeason;
    return { arrears, lastSettledSeason: typeof season === 'number' && Number.isFinite(season) ? season : null };
}
