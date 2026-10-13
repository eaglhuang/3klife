// @spec-source → 武將壽命系統.md (doc_spec_0018) §F、§K；WBS v3 LIFE-09 接線（PROG-2-0221）
/**
 * LifespanWiring — 主動指令的壽命消耗接線與超齡隨機死亡（純邏輯，不依賴 cc）
 *
 * 設計重點：
 * - 剩餘壽命不另存欄位，由既有 age 與 maxLifespan 推導：remaining = (maxLifespan − age) × 12 月。
 * - 主動指令（培育／攻城／結緣）扣除 LifespanCost 的月數後，age 前進 consumed ÷ 12，age 仍是唯一權威。
 * - 剩餘歸零即死亡（與 LifespanCost 一致）；指令本身仍會完成，死亡在當次結算。
 * - 超齡（age > maxLifespan）的武將，主動指令前先擲一次 deathChancePerSeason；存活才執行，且不再扣剩餘壽命。
 * - 被動季度推進仍由 GeneralAging 負責，本檔不改它。
 *
 * Unity 對照：像一個掛在指令按鈕上的 Service，按下時先檢查角色狀態，
 * 回傳新的角色資料與事件；不直接碰 UI。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import {
    AgingGeneral,
    deathChancePerSeason,
    GENERAL_STATUS_DEAD,
    isGeneralDead,
    RandomSource,
    resolveMaxLifespan,
} from './GeneralAging';
import { applyLifespanCost, LifespanCommand } from './LifespanCost';

export const MONTHS_PER_YEAR = 12;

export type LifespanWiringEvent =
    | { type: 'died'; generalId: string; age: number; cause: 'lifespan-cost' | 'over-age' }
    | { type: 'unknown-command'; generalId: string; command: string };

export interface ActiveLifespanResult {
    /** 新的武將資料（不改寫輸入） */
    general: AgingGeneral;
    /** false 代表指令未執行：武將已死亡，或超齡判定中死亡 */
    allowed: boolean;
    /** 本次實際扣除的月數（超齡路徑與無年齡資料時為 0） */
    consumedMonths: number;
    events: LifespanWiringEvent[];
}

/** 由 age 與 maxLifespan 推導剩餘月數；超過上限時夾到 0，不猜測負值 */
export function remainingLifespanMonths(general: AgingGeneral): number {
    const maxLifespan = resolveMaxLifespan(general);
    return Math.max(0, Math.round((maxLifespan - (general.age ?? 0)) * MONTHS_PER_YEAR));
}

/**
 * 對單一武將執行一次主動指令。
 * 缺少 age 的資料不足以計算壽命，回傳原資料且不扣、不判死（不猜測）。
 */
export function applyActiveLifespanCommand(
    source: AgingGeneral,
    command: LifespanCommand,
    random: RandomSource = Math.random,
): ActiveLifespanResult {
    const general: AgingGeneral = { ...source };
    const events: LifespanWiringEvent[] = [];

    if (isGeneralDead(general)) {
        return { general, allowed: false, consumedMonths: 0, events };
    }
    if (typeof general.age !== 'number') {
        return { general, allowed: true, consumedMonths: 0, events };
    }

    const maxLifespan = resolveMaxLifespan(general);
    general.maxLifespan = maxLifespan;

    if (general.age > maxLifespan) {
        const chance = deathChancePerSeason(general.age, maxLifespan);
        if (chance > 0 && random() < chance) {
            general.status = GENERAL_STATUS_DEAD;
            events.push({ type: 'died', generalId: general.id, age: general.age, cause: 'over-age' });
            return { general, allowed: false, consumedMonths: 0, events };
        }
        return { general, allowed: true, consumedMonths: 0, events };
    }

    const ledger = applyLifespanCost(
        { id: general.id, remainingMonths: remainingLifespanMonths(general) },
        command,
    );
    if (ledger.events.some((event) => event.type === 'unknown-command')) {
        events.push({ type: 'unknown-command', generalId: general.id, command });
        return { general, allowed: false, consumedMonths: 0, events };
    }

    general.age = ledger.deathTriggered
        ? maxLifespan
        : general.age + ledger.consumedMonths / MONTHS_PER_YEAR;

    if (ledger.deathTriggered) {
        general.status = GENERAL_STATUS_DEAD;
        events.push({ type: 'died', generalId: general.id, age: general.age, cause: 'lifespan-cost' });
    }
    return { general, allowed: true, consumedMonths: ledger.consumedMonths, events };
}

/**
 * 替換名冊中指定 id 的武將並回傳新名冊（不改寫輸入陣列）。找不到時回傳 null。
 */
export function applyActiveLifespanToRoster(
    roster: readonly GeneralConfig[],
    generalId: string,
    command: LifespanCommand,
    random: RandomSource = Math.random,
): { roster: GeneralConfig[]; result: ActiveLifespanResult } | null {
    const index = roster.findIndex((general) => general.id === generalId);
    if (index < 0) return null;
    const result = applyActiveLifespanCommand(roster[index] as AgingGeneral, command, random);
    const next = roster.slice();
    next[index] = result.general;
    return { roster: next, result };
}

/**
 * 讀檔後主動指令死亡的「季結前名冊」基準：把這些武將還原為非陣亡，
 * 讓虎符結算能認出「這次季結才死」。沒有待季結死亡時回傳 null。
 */
export function preLifespanBaseline(
    roster: readonly GeneralConfig[],
    generalIds: readonly string[],
): GeneralConfig[] | null {
    if (generalIds.length === 0) return null;
    const ids = new Set(generalIds);
    return roster.map((general) =>
        ids.has(general.id) && isGeneralDead(general) ? { ...general, status: undefined } : { ...general });
}
