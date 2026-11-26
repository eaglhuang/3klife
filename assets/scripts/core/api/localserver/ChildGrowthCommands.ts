// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.5 權威原則、§5.7 存檔即 API；PROG-2-10058 子嗣成長帳本；PROG-2-10059 成長事件結算
/**
 * ChildGrowthCommands — 子嗣成長（親子好感、天賦小名碎片、同窗好友、歲末成長事件）在本機 adapter 的處理器。
 *
 * 帳本與事件進度屬於重要存檔狀態：客戶端只能經命令讀取與「選擇」，不直接碰 GameSession 欄位，也不得自帶數值；
 * 效果由權威端（單機＝GameSession）依事件表入帳，扣銀兩走家族銀兩帳本。
 */
import type { FamilyChildLedgerResult, FamilyGrowthEventsResult, FamilyResolveGrowthEventResult, FamilyTalkToChildResult } from '../../../shared/api/ApiCommands';
import { ApiError, type ApiErrorKey } from '../../../shared/api/ApiErrors';
import type { LocalApiAdapter } from './LocalApiAdapter';

export type GrowthEventResolveFailure = 'not-pending' | 'unknown-event' | 'unknown-option' | 'already-triggered' | 'silver-low';

export type GrowthEventResolveOutcome =
    | { ok: true; result: FamilyResolveGrowthEventResult }
    | { ok: false; reason: GrowthEventResolveFailure };

export type ChildTalkOutcome =
    | { ok: true; result: FamilyTalkToChildResult }
    | { ok: false; reason: 'unknown-child' | 'already-talked' };

/** 權威端的子嗣成長宿主：單機由 GameSession 提供，連線時由伺服器取代 */
export interface ChildGrowthHost {
    childLedger(): FamilyChildLedgerResult;
    growthEvents(): FamilyGrowthEventsResult;
    resolveGrowthEvent(childId: string, eventId: string, optionId: string): GrowthEventResolveOutcome;
    talkToChild(childId: string): ChildTalkOutcome;
}

const RESOLVE_ARGS = ['childId', 'eventId', 'optionId'] as const;

const REASON_ERROR: Record<GrowthEventResolveFailure, [ApiErrorKey, string]> = {
    'not-pending': ['FAMILY_GROWTH_NOT_PENDING', '這件成長事件不在待決清單（已選過或還沒到時候）'],
    'unknown-event': ['FAMILY_GROWTH_NOT_PENDING', '查無這件成長事件'],
    'already-triggered': ['FAMILY_GROWTH_NOT_PENDING', '這件成長事件已經處理過了'],
    'unknown-option': ['FAMILY_GROWTH_OPTION_UNKNOWN', '沒有這個選項'],
    'silver-low': ['INSUFFICIENT_BALANCE', '家族銀兩不足，孩子的小心願先欠著'],
};

const TALK_ERROR: Record<'unknown-child' | 'already-talked', [ApiErrorKey, string]> = {
    'unknown-child': ['FAMILY_CHILD_UNKNOWN', '家裡沒有這個孩子'],
    'already-talked': ['FAMILY_CHILD_TALKED', '今年已經跟這個孩子談過了，明年再聊'],
};

export function registerChildGrowthCommands(adapter: LocalApiAdapter, getHost: () => ChildGrowthHost | null): void {
    const requireHost = (): ChildGrowthHost => {
        const host = getHost();
        if (!host) throw new ApiError('FAMILY_UNAVAILABLE', '家族服務尚未就緒');
        return host;
    };

    adapter.register('family.childLedger', () => ({ result: requireHost().childLedger() }));

    adapter.register('family.growthEvents', () => ({ result: requireHost().growthEvents() }));

    adapter.register('family.resolveGrowthEvent', (args) => {
        const extra = Object.keys(args).find((key) => !(RESOLVE_ARGS as readonly string[]).includes(key));
        if (extra) throw new ApiError('FORBIDDEN_FIELD', `命令不得帶欄位 ${extra}`);
        for (const key of RESOLVE_ARGS) {
            if (typeof args[key] !== 'string' || !args[key]) throw new ApiError('INVALID_SCHEMA', `${key} 必須是非空字串`);
        }
        const out = requireHost().resolveGrowthEvent(args.childId as string, args.eventId as string, args.optionId as string);
        if (!out.ok) {
            const [key, message] = REASON_ERROR[out.reason];
            throw new ApiError(key, message);
        }
        return { result: out.result };
    });

    adapter.register('family.talkToChild', (args) => {
        const extra = Object.keys(args).find((key) => key !== 'childId');
        if (extra) throw new ApiError('FORBIDDEN_FIELD', `命令不得帶欄位 ${extra}`);
        if (typeof args.childId !== 'string' || !args.childId) throw new ApiError('INVALID_SCHEMA', 'childId 必須是非空字串');
        const out = requireHost().talkToChild(args.childId);
        if (!out.ok) {
            const [key, message] = TALK_ERROR[out.reason];
            throw new ApiError(key, message);
        }
        return { result: out.result };
    });
}
