// @spec-source → 任務系統 Base 框架規格書 (doc_spec_1185) §11 伺服器 API；共用框架總綱 (doc_spec_1182) §5.4 冪等、§12 QST-M；PROG-2-9209
/**
 * QuestCommands — 任務命令（task.query／accept／advance／clearGate／pause／resume／settle／abandon／tick）
 * 在本機 adapter 的處理器。
 *
 * 分工：任務框架只管接受、步驟、閘門、暫離、結算、紀錄；
 *   - 獎勵與懲罰一律走 reward.claim（成敗等級對應的套件寫在定義的 outcome，任務不自己加減資源）；
 *   - 執行者忙碌一律走 occupancy.acquire／release（接取時占用、結算／放棄／過期時釋放）。
 * 每個命令都冪等：同一筆重送不重複生效（accept 看 acceptKey、advance 看 fromStep、settle 看實例終局與 grantKey）。
 * 失敗整筆放棄：先在記憶體副本上算、跨框架呼叫都成功才把新狀態寫回權威端。純邏輯，不 import cc。
 */
import type {
    TaskAcceptResult, TaskAdvanceResult, TaskChangeResult, TaskQueryResult, TaskSettleResult, TaskTickResult,
} from '../../../shared/api/ApiCommands';
import { ApiError, type ApiErrorKey } from '../../../shared/api/ApiErrors';
import type { ApiDeltaOp } from '../../../shared/api/ApiProtocol';
import { findQuestDef } from '../../../shared/quest/QuestConfig';
import { QuestService, type QuestServiceDeps } from '../../../shared/quest/QuestService';
import { QuestError, type QuestErrorCode, type QuestStateV1 } from '../../../shared/quest/QuestTypes';
import type { HandlerOutcome, LocalApiAdapter } from './LocalApiAdapter';

/** 權威端的任務狀態存放 port：單機由 GameSession 實作（存檔欄位 questState）；連線時由伺服器取代 */
export interface QuestAuthority {
    state(): QuestStateV1;
    setState(state: QuestStateV1): void;
}

export interface QuestPorts extends QuestServiceDeps {
    authority: QuestAuthority | null;
}

const ERROR_KEY: Record<QuestErrorCode, ApiErrorKey> = {
    DEF_NOT_FOUND: 'QST_DEF_NOT_FOUND',
    NOT_FOUND: 'QST_NOT_FOUND',
    BAD_STATE: 'QST_BAD_STATE',
    GATE_PENDING: 'QST_GATE_PENDING',
    NOT_READY: 'QST_NOT_READY',
    STEP_MISMATCH: 'QST_STEP_MISMATCH',
    ACTOR_INVALID: 'QST_ACTOR_INVALID',
    CONDITION_UNMET: 'QST_CONDITION_UNMET',
    KEY_CONFLICT: 'QST_KEY_CONFLICT',
    INVALID: 'INVALID_SCHEMA',
};

const QUERY_ARGS = ['qid', 'actor', 'state', 'taskKind'];
const ACCEPT_ARGS = ['defId', 'actors', 'acceptKey'];
const ADVANCE_ARGS = ['qid', 'fromStep', 'steps'];
const CLEAR_ARGS = ['qid', 'gateId'];
const PAUSE_ARGS = ['qid', 'reason'];
const QID_ARGS = ['qid'];
const TICK_ARGS = ['nowIndex'];

function requireText(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.length === 0) throw new ApiError('INVALID_SCHEMA', `${field} 不可為空`);
    return value;
}

function optionalText(value: unknown, field: string): string | undefined {
    return value === undefined ? undefined : requireText(value, field);
}

function requireInt(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value)) throw new ApiError('INVALID_SCHEMA', `${field} 必須是整數`);
    return value;
}

/** 只收意圖欄位；多帶的一律當作想夾帶結果（規格 §11.3） */
function rejectExtra(args: Record<string, unknown>, allowed: readonly string[]): void {
    const extra = Object.keys(args).find((k) => allowed.indexOf(k) < 0);
    if (extra) throw new ApiError('FORBIDDEN_FIELD', `命令不得帶欄位 ${extra}`);
}

function changed(qid: string): ApiDeltaOp {
    return { path: `/questState/${qid}`, op: 'replace', value: null };
}

export function registerQuestCommands(adapter: LocalApiAdapter, getPorts: () => QuestPorts): void {
    const authorityOf = (): QuestAuthority => {
        const authority = getPorts().authority;
        if (!authority) throw new ApiError('QST_UNAVAILABLE', '任務系統尚未就緒');
        return authority;
    };
    const open = (): QuestService => {
        const { authority, ...deps } = getPorts();
        if (!authority) throw new ApiError('QST_UNAVAILABLE', '任務系統尚未就緒');
        return new QuestService(authority.state(), deps);
    };
    /** 領域例外轉對應錯誤碼；其餘例外（含 ApiError）照舊往上拋 */
    const guard = <T>(run: () => T): T => {
        try {
            return run();
        } catch (error) {
            if (error instanceof QuestError) throw new ApiError(ERROR_KEY[error.code], error.message);
            throw error;
        }
    };
    const commit = (service: QuestService): void => authorityOf().setState(service.snapshot());

    /** 登記執行者占用；任何一位失敗就把這次剛登記的撤回並往上丟（整筆不生效） */
    const acquireAll = async (occ: { kind: string; refId: string; actors: string[] }, since: number): Promise<void> => {
        const taken: string[] = [];
        try {
            for (const personId of occ.actors) {
                const out = await adapter.invoke('occupancy.acquire', { personId, kind: occ.kind, refId: occ.refId, since });
                if ((out.result as { acquired: boolean }).acquired) taken.push(personId);
            }
        } catch (error) {
            for (const personId of taken) await releaseOne(personId, occ);
            throw error;
        }
    };
    /** 釋放是盡力而為：任務狀態才是權威，占用殘留不應讓結算或放棄永遠卡住 */
    const releaseOne = async (personId: string, occ: { kind: string; refId: string }): Promise<void> => {
        try { await adapter.invoke('occupancy.release', { personId, kind: occ.kind, refId: occ.refId }); } catch { /* 盡力而為 */ }
    };
    const releaseAll = async (occ: { kind: string; refId: string; actors: string[] } | null): Promise<void> => {
        if (!occ) return;
        for (const personId of occ.actors) await releaseOne(personId, occ);
    };

    adapter.register('task.query', (args) => {
        rejectExtra(args, QUERY_ARGS);
        const service = open();
        const result: TaskQueryResult = {
            tasks: service.query({
                qid: optionalText(args.qid, 'qid'), actor: optionalText(args.actor, 'actor'),
                state: optionalText(args.state, 'state'), taskKind: optionalText(args.taskKind, 'taskKind'),
            }),
        };
        return { result };
    });

    adapter.register('task.accept', async (args) => {
        rejectExtra(args, ACCEPT_ARGS);
        const defId = requireText(args.defId, 'defId');
        const acceptKey = requireText(args.acceptKey, 'acceptKey');
        if (!Array.isArray(args.actors)) throw new ApiError('INVALID_SCHEMA', 'actors 必須是陣列');
        const actors = args.actors.map((a) => requireText(a, 'actors[]'));
        const service = open();
        const out = guard(() => service.accept({ defId, actors, acceptKey }));
        const result: TaskAcceptResult = { created: out.created, task: out.instance };
        if (!out.created) return { result };
        const occ = service.occupancyOf(out.instance.qid);
        if (occ) await acquireAll(occ, service.now());
        commit(service);
        return {
            result,
            delta: [changed(out.instance.qid)],
            events: [{ evt: 'task.changed', data: { qid: out.instance.qid, defId, change: 'accept' } }],
        };
    });

    adapter.register('task.advance', (args) => {
        rejectExtra(args, ADVANCE_ARGS);
        const qid = requireText(args.qid, 'qid');
        const fromStep = requireInt(args.fromStep, 'fromStep');
        const steps = args.steps === undefined ? undefined : requireInt(args.steps, 'steps');
        const service = open();
        const out = guard(() => service.advance({ qid, fromStep, steps }));
        const result: TaskAdvanceResult = { advanced: out.advanced, stepsDone: out.stepsDone, gateReached: out.gateReached, task: out.instance };
        if (!out.advanced) return { result };
        commit(service);
        return {
            result,
            delta: [changed(qid)],
            events: [
                { evt: 'task.progress', data: { qid, step: out.instance.step, total: out.instance.total } },
                ...(out.gateReached ? [{ evt: 'task.gate', data: { qid, gateId: out.gateReached, step: out.instance.step } }] : []),
            ],
        };
    });

    adapter.register('task.clearGate', (args) => {
        rejectExtra(args, CLEAR_ARGS);
        const qid = requireText(args.qid, 'qid');
        const gateId = requireText(args.gateId, 'gateId');
        const service = open();
        const out = guard(() => service.clearGate({ qid, gateId }));
        const result: TaskChangeResult = { changed: out.changed, task: out.instance };
        if (!out.changed) return { result };
        commit(service);
        return { result, delta: [changed(qid)], events: [{ evt: 'task.changed', data: { qid, change: 'clearGate', gateId } }] };
    });

    adapter.register('task.pause', async (args) => {
        rejectExtra(args, PAUSE_ARGS);
        const qid = requireText(args.qid, 'qid');
        const reason = optionalText(args.reason, 'reason');
        const service = open();
        const out = guard(() => service.pause({ qid, reason }));
        const result: TaskChangeResult = { changed: out.changed, task: out.instance };
        if (!out.changed) return { result };
        if (service.releasesOnPause(qid)) await releaseAll(service.occupancyOf(qid));
        commit(service);
        return { result, delta: [changed(qid)], events: [{ evt: 'task.changed', data: { qid, change: 'pause' } }] };
    });

    adapter.register('task.resume', async (args) => {
        rejectExtra(args, QID_ARGS);
        const qid = requireText(args.qid, 'qid');
        const service = open();
        const out = guard(() => service.resume({ qid }));
        const result: TaskChangeResult = { changed: out.changed, task: out.instance };
        if (!out.changed) return { result };
        if (service.releasesOnPause(qid)) {
            const occ = service.occupancyOf(qid);
            if (occ) await acquireAll(occ, service.now());
        }
        commit(service);
        return { result, delta: [changed(qid)], events: [{ evt: 'task.changed', data: { qid, change: 'resume' } }] };
    });

    adapter.register('task.settle', async (args) => {
        rejectExtra(args, QID_ARGS);
        const qid = requireText(args.qid, 'qid');
        const service = open();
        const plan = guard(() => service.beginSettle(qid));
        if (plan.replay) {
            const done = plan.instance.result;
            const result: TaskSettleResult = {
                tier: plan.tier, bundleId: plan.bundleId, grantId: done ? done.grantId : null, replayed: true, task: plan.instance,
            };
            return { result };
        }
        // 獎勵與懲罰一律交獎勵框架；grantKey 以實例 id 固定，重送或中途失敗後重試都不會重複入帳
        let grantId: string | null = null;
        let rewardOut: HandlerOutcome | null = null;
        if (plan.bundleId !== null) {
            const def = findQuestDef(getPorts().config, plan.instance.defId);
            rewardOut = await adapter.invoke('reward.claim', {
                bundleId: plan.bundleId,
                grantKey: `quest:${qid}:settle`,
                source: { kind: 'quest', ref: def ? def.id : plan.instance.defId },
            });
            grantId = (rewardOut.result as { grantId: string }).grantId;
        }
        const occ = service.occupancyOf(qid);
        const task = service.finishSettle({ qid, tier: plan.tier, bundleId: plan.bundleId, grantId });
        await releaseAll(occ);
        commit(service);
        const result: TaskSettleResult = { tier: plan.tier, bundleId: plan.bundleId, grantId, replayed: false, task };
        return {
            result,
            delta: [...(rewardOut && rewardOut.delta ? rewardOut.delta : []), changed(qid)],
            events: [
                ...(rewardOut && rewardOut.events ? rewardOut.events : []),
                { evt: 'task.settled', data: { qid, defId: task.defId, tier: plan.tier, grantId } },
            ],
        };
    });

    adapter.register('task.abandon', async (args) => {
        rejectExtra(args, QID_ARGS);
        const qid = requireText(args.qid, 'qid');
        const service = open();
        const occ = guard(() => service.occupancyOf(qid));
        const out = guard(() => service.abandon(qid));
        const result: TaskChangeResult = { changed: out.changed, task: out.instance };
        if (!out.changed) return { result };
        await releaseAll(occ);
        commit(service);
        return { result, delta: [changed(qid)], events: [{ evt: 'task.changed', data: { qid, change: 'abandon' } }] };
    });

    adapter.register('task.tick', async (args) => {
        rejectExtra(args, TICK_ARGS);
        const nowIndex = requireInt(args.nowIndex, 'nowIndex');
        const service = open();
        const out = guard(() => service.tick(nowIndex));
        for (const task of out.expired) await releaseAll(service.occupancyOf(task.qid));
        commit(service);
        const result: TaskTickResult = { delta: out.delta, expired: out.expired.map((t) => t.qid) };
        return {
            result,
            ...(out.expired.length > 0 ? { delta: out.expired.map((t) => changed(t.qid)) } : {}),
            events: out.expired.map((t) => ({ evt: 'task.changed', data: { qid: t.qid, change: 'expire' } })),
        };
    });
}
