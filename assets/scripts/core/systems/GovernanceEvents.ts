// @spec-source → 領地治理系統.md §G 季度治理報告、治理事件；PROG-2-1773
/**
 * GovernanceEvents — 治理事件與季度治理報告句（純邏輯，不依賴 cc）。
 *
 * 暫定（可逆）：
 * - 規格只給蝗災一例，沒寫機率；暫定每季 10%，只影響發生那一季。
 * - 領地目前沒有城名資料，{City} 暫用「郡城」（與郡城縣令同一稱呼）。
 * - 報告列內政產出加上季結算自然恢復的糧草與城市兵源，掛零的資源不列。
 *
 * Unity 對照：像一張 ScriptableObject 事件表，加上每季結算呼叫一次的純函式。
 */
import { RESOURCE_LABEL, TASK_LABEL } from './DomesticPresenter';
import type { DomesticResource, DomesticTaskId } from './DomesticTasks';

export interface GovernanceEventDef {
    id: string;
    name: string;
    task: DomesticTaskId;
    /** 該任務本季的產出倍率 */
    multiplier: number;
}

export const GOVERNANCE_EVENTS: readonly GovernanceEventDef[] = Object.freeze([
    { id: 'locust', name: '蝗災', task: 'farming', multiplier: 0.5 },
]);

export const GOVERNANCE_EVENT_TUNING = Object.freeze({
    seasonChance: 0.1,
    cityLabel: '郡城',
});

export interface ActiveGovernanceEvent {
    id: string;
    season: number;
}

const REPORT_ORDER: readonly DomesticResource[] = ['food', 'gold', 'fame', 'cityTroops'];

function eventDef(id: string): GovernanceEventDef | undefined {
    return GOVERNANCE_EVENTS.find((def) => def.id === id);
}

/** 擲本季事件；沒發生回傳 null */
export function rollGovernanceEvent(season: number, random: () => number): ActiveGovernanceEvent | null {
    if (GOVERNANCE_EVENTS.length === 0 || random() >= GOVERNANCE_EVENT_TUNING.seasonChance) return null;
    const index = Math.min(GOVERNANCE_EVENTS.length - 1, Math.floor(random() * GOVERNANCE_EVENTS.length));
    return { id: GOVERNANCE_EVENTS[index].id, season };
}

/** 舊存檔沒有事件時回傳 null；壞掉或不認得的事件也視為沒有 */
export function normalizeGovernanceEvent(raw: unknown): ActiveGovernanceEvent | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== 'string' || !eventDef(r.id)) return null;
    if (typeof r.season !== 'number' || !Number.isInteger(r.season)) return null;
    return { id: r.id, season: r.season };
}

/** 事件只在發生那一季有效；其他情況倍率為 1 */
export function governanceOutputMultiplier(event: ActiveGovernanceEvent | null, taskId: string, season: number): number {
    if (!event || event.season !== season) return 1;
    const def = eventDef(event.id);
    return def && def.task === taskId ? def.multiplier : 1;
}

/** {City} 發生蝗災！農耕產出本季 -50% */
export function governanceEventLine(event: ActiveGovernanceEvent): string {
    const def = eventDef(event.id);
    if (!def) return '';
    const percent = Math.round((1 - def.multiplier) * 100);
    return `${GOVERNANCE_EVENT_TUNING.cityLabel} 發生${def.name}！${TASK_LABEL[def.task]}產出本季 -${percent}%`;
}

/** 本季治理成果：糧草 +{Food}，黃金 +{Gold}…；全部掛零回傳 null */
export function governanceReportLine(gains: Readonly<Partial<Record<DomesticResource, number>>>): string | null {
    const parts = REPORT_ORDER
        .filter((resource) => (gains[resource] ?? 0) > 0)
        .map((resource) => `${RESOURCE_LABEL[resource]} +${gains[resource]}`);
    return parts.length > 0 ? `本季治理成果：${parts.join('，')}` : null;
}
