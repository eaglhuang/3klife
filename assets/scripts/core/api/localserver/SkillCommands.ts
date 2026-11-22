// @spec-source → 技能系統 Base 框架規格書 (doc_spec_1187) §11 伺服器 API；共用框架總綱 (doc_spec_1182) §5 共通 API、§12 SKL-M；PROG-2-9204
/**
 * SkillCommands — 技能命令（skill.list／canLearn／learn／grant／upgrade／applyModifier／removeModifier）在本機 adapter 的處理器。
 *
 * 權威欄位（等級、花費、結果）只在權威端算：客戶端帶 level／spent／result → E103。
 * 冪等：命令層以 idemKey 擋重送；grant／applyModifier 本身也對已存在項目略過，沒有 idemKey 的重試不會重複寫。
 * 持有與 TP 都經 SkillHost（單機＝GameSession 的名冊與培育 TP），這裡不碰存檔後端。
 */
import type {
    SkillApplyModifierArgs, SkillCanLearnResult, SkillGrantResult, SkillHolderArg, SkillLearnResult, SkillListResult,
    SkillModifierChangeResult, SkillRecordResult, SkillUpgradeResult,
} from '../../../shared/api/ApiCommands';
import { ApiError, type ApiErrorKey } from '../../../shared/api/ApiErrors';
import { SkillHolderMissing, type SkillService } from '../../../shared/skill/SkillService';
import type { HolderRef, SkillBlock, SkillRecord } from '../../../shared/skill/SkillTypes';
import type { LocalApiAdapter } from './LocalApiAdapter';

/** 權威端的技能宿主：單機由 GameSession 提供，連線時由伺服器取代 */
export interface SkillHost {
    service: SkillService;
}

/** 客戶端不得帶入的結果類欄位（技能規格 §11.3） */
const FORBIDDEN_SKILL_ARGS: readonly string[] = ['level', 'spent', 'xp', 'learned', 'granted'];

const BLOCK_TO_ERROR: Record<SkillBlock, ApiErrorKey> = {
    INVALID_SKILL: 'INVALID_SKILL',
    ALREADY_LEARNED: 'ALREADY_LEARNED',
    TP_SHORT: 'TP_SHORT',
    NO_SLOT: 'NO_SLOT',
    APTITUDE_UNMET: 'APTITUDE_UNMET',
    NOT_INSPIRED: 'NOT_INSPIRED',
    MAX_LEVEL: 'SKILL_MAX_LEVEL',
    NOT_LEARNED: 'SKILL_NOT_LEARNED',
};

function parseHolder(args: Record<string, unknown>): HolderRef {
    const holder = args.holder as SkillHolderArg | undefined;
    if (!holder || typeof holder !== 'object' || holder.kind !== 'general' || typeof holder.id !== 'string' || holder.id === '') {
        throw new ApiError('INVALID_SCHEMA', 'holder 必須是 { kind: "general", id }');
    }
    return { kind: 'general', id: holder.id };
}

function parseString(args: Record<string, unknown>, field: string): string {
    const value = args[field];
    if (typeof value !== 'string' || value === '') throw new ApiError('INVALID_SCHEMA', `${field} 必須是非空字串`);
    return value;
}

function rejectForbidden(args: Record<string, unknown>): void {
    const hit = FORBIDDEN_SKILL_ARGS.find((k) => Object.prototype.hasOwnProperty.call(args, k));
    if (hit) throw new ApiError('FORBIDDEN_FIELD', `技能命令不得帶權威欄位 ${hit}`);
}

function toRecordResult(record: SkillRecord): SkillRecordResult {
    return { skillId: record.skillId, level: record.level, xp: record.xp, learnedFrom: record.learnedFrom, learnedAt: record.learnedAt };
}

export function registerSkillCommands(adapter: LocalApiAdapter, getHost: () => SkillHost | null): void {
    const service = (): SkillService => {
        const host = getHost();
        if (!host) throw new ApiError('SKILL_UNAVAILABLE', '技能服務尚未就緒');
        return host.service;
    };
    /** 持有者不存在轉 E612；其餘例外照舊往上拋成 E199 */
    const guard = <T>(run: () => T): T => {
        try {
            return run();
        } catch (error) {
            if (error instanceof SkillHolderMissing) throw new ApiError('SKILL_HOLDER_NOT_FOUND', error.message);
            throw error;
        }
    };
    const changed = (holder: HolderRef) => ({ path: `/generals/${holder.id}/skills`, op: 'replace' as const, value: null });

    adapter.register('skill.list', (args) => {
        const holder = parseHolder(args);
        const domain = typeof args.domain === 'string' ? args.domain : undefined;
        const holding = guard(() => service().list(holder, domain));
        const result: SkillListResult = {
            holder: { ...holder },
            skills: holding.skills.map(toRecordResult),
            modifiers: holding.modifiers.map((m) => ({ ...m })),
        };
        return { result };
    });

    adapter.register('skill.canLearn', (args) => {
        const holder = parseHolder(args);
        const skillId = parseString(args, 'skillId');
        const check = guard(() => service().canLearn(holder, skillId));
        if (!check) throw new ApiError('SKILL_UNAVAILABLE', '學習權威尚未就緒');
        const result: SkillCanLearnResult = { ok: check.ok, blocked: check.blocked, tpThreshold: check.tpThreshold, tpCost: check.tpCost };
        return { result };
    });

    adapter.register('skill.learn', (args) => {
        rejectForbidden(args);
        const holder = parseHolder(args);
        const skillId = parseString(args, 'skillId');
        const source = parseString(args, 'source');
        if (args.choiceOf !== undefined) {
            const choices = args.choiceOf;
            if (!Array.isArray(choices) || choices.indexOf(skillId) < 0) throw new ApiError('INVALID_SCHEMA', 'skillId 不在 choiceOf 候選中');
        }
        const learned = guard(() => service().learn(holder, skillId, source));
        if (!learned) throw new ApiError('SKILL_UNAVAILABLE', '學習權威尚未就緒');
        if (!learned.ok) throw new ApiError(BLOCK_TO_ERROR[learned.blocked ?? 'INVALID_SKILL'], `無法學習 ${skillId}：${learned.blocked}`);
        const result: SkillLearnResult = { learned: true, skill: toRecordResult(learned.skill!), spent: { tp: learned.spent?.tp ?? 0 } };
        return { result, delta: [changed(holder)], events: [{ evt: 'skill.changed', data: { holder, skillId, change: 'learn' } }] };
    });

    adapter.register('skill.grant', (args) => {
        rejectForbidden(args);
        const holder = parseHolder(args);
        const source = parseString(args, 'source');
        const ids = args.skillIds;
        if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) throw new ApiError('INVALID_SCHEMA', 'skillIds 必須是字串陣列');
        const granted = guard(() => service().grant(holder, ids as string[], source));
        const result: SkillGrantResult = granted;
        const events = granted.granted.length > 0 ? [{ evt: 'skill.changed', data: { holder, skillIds: granted.granted, change: 'grant' } }] : [];
        return { result, delta: granted.granted.length > 0 ? [changed(holder)] : [], events };
    });

    adapter.register('skill.upgrade', (args) => {
        rejectForbidden(args);
        const holder = parseHolder(args);
        const skillId = parseString(args, 'skillId');
        const upgraded = guard(() => service().upgrade(holder, skillId));
        if (!upgraded.ok) throw new ApiError(BLOCK_TO_ERROR[upgraded.blocked ?? 'INVALID_SKILL'], `無法升級 ${skillId}：${upgraded.blocked}`);
        const result: SkillUpgradeResult = { skill: toRecordResult(upgraded.skill!) };
        return { result, delta: [changed(holder)], events: [{ evt: 'skill.changed', data: { holder, skillId, change: 'upgrade' } }] };
    });

    adapter.register('skill.applyModifier', (args) => {
        rejectForbidden(args);
        const a = args as unknown as Partial<SkillApplyModifierArgs>;
        const holder = parseHolder(args);
        const modifierId = parseString(args, 'modifierId');
        const source = parseString(args, 'source');
        if (a.until !== 'graduation' && a.until !== 'manual') throw new ApiError('INVALID_SCHEMA', 'until 必須是 graduation 或 manual');
        const out = guard(() => service().applyModifier(holder, { id: modifierId, source, until: a.until! }));
        const result: SkillModifierChangeResult = { changed: out.applied, modifiers: out.modifiers.map((m) => ({ ...m })) };
        return { result, delta: [changed(holder)], events: [{ evt: 'skill.changed', data: { holder, modifierId, change: 'modifier' } }] };
    });

    adapter.register('skill.removeModifier', (args) => {
        rejectForbidden(args);
        const holder = parseHolder(args);
        const modifierId = parseString(args, 'modifierId');
        const out = guard(() => service().removeModifier(holder, modifierId));
        const result: SkillModifierChangeResult = { changed: out.removed, modifiers: out.modifiers.map((m) => ({ ...m })) };
        return { result, delta: out.removed ? [changed(holder)] : [], events: out.removed ? [{ evt: 'skill.changed', data: { holder, modifierId, change: 'modifier' } }] : [] };
    });
}
