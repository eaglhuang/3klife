/**
 * LegendaryMentoring — 名將傳道（MENT-15，純邏輯，不依賴 cc）
 *
 * 規格（教官系統（支援卡）§F-7）：名將死亡留下英靈卡後，玩家可在培育中指定子嗣、消耗傳道令 ×1，
 * 必定（Guarantee）傳授該名將的專屬奧義；每位名將一生只能傳道一次。
 *
 * Unity 對照：像一次性的 Consumable + 一次性旗標（Cooldown: one_time_per_general），
 * 判定與結果分開：check 只回傳能不能用，perform 才扣道具並寫入紀錄。
 */
import type { NurtureSession } from './NurtureSystem';

export const LEGENDARY_MENTORING_TICKET_COST = 1;

export type LegendaryMentoringBlock =
    | 'NO_TICKET'
    | 'NO_EXCLUSIVE_SKILL'
    | 'NOT_NURTURING'
    | 'SESSION_ENDED'
    | 'ALREADY_USED';

export interface LegendaryMentoringInput {
    /** 英靈卡所屬名將 uid（一生一次以此為準） */
    generalId: string;
    /** 名將的專屬奧義 id；缺值時不能傳道 */
    exclusiveSkillId?: string;
    /** 持有的傳道令數量 */
    tickets: number;
    /** 已傳道過的名將 uid（呼叫端保存） */
    usedGeneralIds: readonly string[];
    /** 目標子嗣的培育會話；沒有則不能傳道 */
    session: NurtureSession | undefined;
}

export interface LegendaryMentoringCheck {
    ok: boolean;
    blocked?: LegendaryMentoringBlock;
}

export interface LegendaryMentoringOutcome {
    session: NurtureSession;
    tickets: number;
    usedGeneralIds: string[];
    skillId: string;
    /** 傳道一律成功（規格 Guarantee: true） */
    guaranteed: true;
}

/** 能否傳道：依序檢查會話、奧義、一生一次、道具。 */
export function checkLegendaryMentoring(input: LegendaryMentoringInput): LegendaryMentoringCheck {
    if (!input.session) return { ok: false, blocked: 'NOT_NURTURING' };
    if (input.session.status !== 'active') return { ok: false, blocked: 'SESSION_ENDED' };
    if (!input.exclusiveSkillId) return { ok: false, blocked: 'NO_EXCLUSIVE_SKILL' };
    if (input.usedGeneralIds.includes(input.generalId)) return { ok: false, blocked: 'ALREADY_USED' };
    if (!Number.isFinite(input.tickets) || input.tickets < LEGENDARY_MENTORING_TICKET_COST) return { ok: false, blocked: 'NO_TICKET' };
    return { ok: true };
}

/**
 * 執行傳道（不改輸入）：通過判定才扣傳道令、記一生一次、寫入 mentoringModeLog。
 * 判定失敗時回傳 null，呼叫端據 checkLegendaryMentoring 顯示原因。
 */
export function performLegendaryMentoring(input: LegendaryMentoringInput): LegendaryMentoringOutcome | null {
    if (!checkLegendaryMentoring(input).ok || !input.session || !input.exclusiveSkillId) return null;
    const skillId = input.exclusiveSkillId;
    const round = input.session.round;
    const session: NurtureSession = {
        ...input.session,
        mentoringModeLog: [
            ...(input.session.mentoringModeLog ?? []),
            { round, mode: 'Legendary_Mentoring', sourceId: input.generalId, skillId },
        ],
    };
    return {
        session,
        tickets: input.tickets - LEGENDARY_MENTORING_TICKET_COST,
        usedGeneralIds: [...input.usedGeneralIds, input.generalId],
        skillId,
        guaranteed: true,
    };
}
