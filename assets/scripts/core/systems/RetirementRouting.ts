// @spec-source → 轉職與宿命系統.md；PROG-2-0105 PM 2026-10-14 教官路由裁定
import type { JobClass } from './JobChange';

export interface RetirementCandidate {
    primaryClass?: JobClass | string | null;
    subClass?: JobClass | string | null;
}

export interface RetirementRoute {
    destination: 'tactic_mentor' | 'wisdom_mentor' | 'all_round_mentor';
    reason: 'WARRIOR' | 'SCHOLAR' | 'DUAL_CLASS' | 'UNKNOWN_CLASS';
}

/**
 * 只讀已選定職能，不從屬性猜宿命、不呼叫退役、不產卡。
 * 主職不明或非空副職不明時，暫以智識教官為安全提示並標 UNKNOWN_CLASS；
 * 呼叫端必須檢查 reason，不能視此提示為已完成退役或合法卡片。
 */
export function routeRetirement(general: RetirementCandidate): RetirementRoute {
    const primary = general.primaryClass;
    const sub = general.subClass;
    const known = (value: unknown): value is JobClass => value === 'Warrior' || value === 'Scholar';
    if (!known(primary) || (sub != null && !known(sub))) {
        return { destination: 'wisdom_mentor', reason: 'UNKNOWN_CLASS' };
    }
    if (known(sub) && sub !== primary) return { destination: 'all_round_mentor', reason: 'DUAL_CLASS' };
    return primary === 'Warrior'
        ? { destination: 'tactic_mentor', reason: 'WARRIOR' }
        : { destination: 'wisdom_mentor', reason: 'SCHOLAR' };
}
