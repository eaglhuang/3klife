// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §10 人員占用登記、§12 OCC-M；PROG-2-9207
/**
 * OccupancyCommands — 人員占用命令（occupancy.query／acquire／release）在本機 adapter 的處理器。
 *
 * 占用狀態屬於重要狀態，寫入只走這裡（互斥規則在 occupancy-matrix.json，不在這裡）：命令層以 idemKey 擋重送，登記表本身也冪等
 * （同一筆 acquire 重送回 acquired=false、release 已不存在回 released=false），沒有 idemKey 的重試也不會重複寫。
 * 登記表與六處轉接器都經 OccupancyHost（單機＝GameSession），這裡不碰存檔後端。
 */
import type {
    OccupancyAcquireResult, OccupancyQueryResult, OccupancyRecordResult, OccupancyReleaseResult,
} from '../../../shared/api/ApiCommands';
import { ApiError, type ApiErrorKey } from '../../../shared/api/ApiErrors';
import { OccupancyService } from '../../../shared/occupancy/OccupancyService';
import { OccupancyError, type OccupancyErrorCode, type OccupancyRecord } from '../../../shared/occupancy/OccupancyTypes';
import type { LocalApiAdapter } from './LocalApiAdapter';

/** 權威端的占用宿主：單機由 GameSession 提供，連線時由伺服器取代 */
export interface OccupancyHost {
    service: OccupancyService;
}

const ERROR_KEY: Record<OccupancyErrorCode, ApiErrorKey> = {
    CONFLICT: 'OCC_CONFLICT',
    KIND_UNKNOWN: 'OCC_KIND_UNKNOWN',
    REF_MISMATCH: 'OCC_REF_MISMATCH',
    READONLY_KIND: 'OCC_READONLY_KIND',
    INVALID: 'INVALID_SCHEMA',
};

function parseString(args: Record<string, unknown>, field: string): string {
    const value = args[field];
    if (typeof value !== 'string' || value === '') throw new ApiError('INVALID_SCHEMA', `${field} 必須是非空字串`);
    return value;
}

function parseOptionalNumber(args: Record<string, unknown>, field: string): number | undefined {
    const value = args[field];
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new ApiError('INVALID_SCHEMA', `${field} 必須是有限數字`);
    return value;
}

function toResult(record: OccupancyRecord): OccupancyRecordResult {
    return { personId: record.personId, kind: record.kind, refId: record.refId, since: record.since, until: record.until };
}

export function registerOccupancyCommands(adapter: LocalApiAdapter, getHost: () => OccupancyHost | null): void {
    const service = (): OccupancyService => {
        const host = getHost();
        if (!host) throw new ApiError('OCC_UNAVAILABLE', '人員占用服務尚未就緒');
        return host.service;
    };
    /** 領域例外轉對應錯誤碼；其餘例外照舊往上拋成 E199 */
    const guard = <T>(run: () => T): T => {
        try {
            return run();
        } catch (error) {
            if (error instanceof OccupancyError) throw new ApiError(ERROR_KEY[error.code], error.message);
            throw error;
        }
    };
    const changed = (personId: string) => ({ path: `/occupancy/${personId}`, op: 'replace' as const, value: null });

    adapter.register('occupancy.query', (args) => {
        const personId = args.personId === undefined ? undefined : parseString(args, 'personId');
        const records = personId === undefined ? service().listAll() : service().query(personId);
        const result: OccupancyQueryResult = {
            records: records.map(toResult),
            occupiedIds: Array.from(new Set(records.map((r) => r.personId))),
        };
        if (args.activity !== undefined) {
            // 活動指派檢查（PROG-2-9442）：在指派當下問，被擋的占用附在 blockedBy
            if (personId === undefined) throw new ApiError('INVALID_SCHEMA', 'activity 必須同時帶 personId');
            const activity = parseString(args, 'activity');
            const check = guard(() => service().checkAssign(personId, activity));
            result.assign = { activity, allowed: check.allowed, ...(check.blockedBy ? { blockedBy: toResult(check.blockedBy) } : {}) };
        }
        return { result };
    });

    adapter.register('occupancy.acquire', (args) => {
        const personId = parseString(args, 'personId');
        const kind = parseString(args, 'kind');
        const refId = parseString(args, 'refId');
        const since = parseOptionalNumber(args, 'since');
        const until = parseOptionalNumber(args, 'until');
        const out = guard(() => service().acquire({ personId, kind, refId, since, until }));
        const result: OccupancyAcquireResult = { acquired: out.acquired, record: toResult(out.record) };
        return out.acquired
            ? { result, delta: [changed(personId)], events: [{ evt: 'occupancy.changed', data: { personId, kind, refId, change: 'acquire' } }] }
            : { result };
    });

    adapter.register('occupancy.release', (args) => {
        const personId = parseString(args, 'personId');
        const kind = parseString(args, 'kind');
        const refId = parseString(args, 'refId');
        const released = guard(() => service().release({ personId, kind, refId }));
        const result: OccupancyReleaseResult = { released };
        return released
            ? { result, delta: [changed(personId)], events: [{ evt: 'occupancy.changed', data: { personId, kind, refId, change: 'release' } }] }
            : { result };
    });
}
