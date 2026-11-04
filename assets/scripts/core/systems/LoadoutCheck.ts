// @spec-source → 關卡設計系統.md (doc_spec_0049)；PROG-2-1429 依建檔紀錄補標出處
/**
 * LoadoutCheck — 推薦戰法三態檢核（WBS v7 LVL-04，PROG-2-0598）
 *
 * 規格（關卡設計系統 D-2／D-3）：
 * - 關卡指定「必備」與「高建議」戰法。
 * - 三態：已具備 / 缺少 / 高風險；不得只用二元鎖定。
 * - 任何一態都可挑戰，不鎖死進場。
 *
 * 本檔的三態解讀：
 * - 已具備：必備與高建議都涵蓋。
 * - 缺少：必備都涵蓋，只缺高建議。
 * - 高風險：缺任一必備。
 *
 * 關卡填的是對策標籤（例如破城、反隱）；武將戰法槽經 tactic-counter-tags.json 轉成標籤後再比對（PROG-2-1763）。
 */
import { toSpecTacticId } from './SortieDeploy';

export type LoadoutCheckState = 'ready' | 'missing' | 'high-risk';

export interface LoadoutCheckResult {
    state: LoadoutCheckState;
    /** 缺口 key（只列名稱，不給最佳答案） */
    gaps: string[];
    /** 規格要求：任何一態都可挑戰 */
    canChallenge: true;
}

export function checkRecommendedLoadout(
    loadout: readonly string[],
    required: readonly string[],
    highlyRecommended: readonly string[],
): LoadoutCheckResult {
    const owned = new Set(loadout);
    const missingRequired = required.filter((key) => !owned.has(key));
    const missingRecommended = highlyRecommended.filter((key) => !owned.has(key));

    if (missingRequired.length > 0) {
        return { state: 'high-risk', gaps: [...missingRequired, ...missingRecommended], canChallenge: true };
    }
    if (missingRecommended.length > 0) {
        return { state: 'missing', gaps: missingRecommended, canChallenge: true };
    }
    return { state: 'ready', gaps: [], canChallenge: true };
}

/** 戰法 → 對策標籤表（tactic-counter-tags.json 的 tags；鍵為規格 TAC_* id） */
export type TacticCounterTagTable = Readonly<Record<string, readonly string[]>>;

/** 戰法槽（戰法庫 id 或規格 id 皆可）→ 去重後的對策標籤 */
export function loadoutTagsOf(tacticIds: readonly string[], table: TacticCounterTagTable): string[] {
    const tags = new Set<string>();
    for (const id of tacticIds) for (const tag of table[toSpecTacticId(id)] ?? []) tags.add(tag);
    return Array.from(tags);
}

/** 戰場日誌一行：三態文案；高風險仍標示可挑戰（規格 D-3） */
export function loadoutCheckLogLine(result: LoadoutCheckResult): string {
    const gaps = result.gaps.join('、');
    if (result.state === 'high-risk') return `推薦戰法檢核：高風險，仍可挑戰（缺少${gaps}）`;
    if (result.state === 'missing') return `推薦戰法檢核：缺少${gaps}`;
    return '推薦戰法檢核：已具備';
}
