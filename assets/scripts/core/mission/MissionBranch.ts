/**
 * MissionBranch — 依情報度（與隱藏變體、旗標、武將特質）選分支
 * 規則：在 when 全部成立的分支中取 minIntel 最高者；同分取列表較前。
 * 派遣時以「鎖定的情報度」判定。
 */
import type { MissionBranch, MissionDefinition } from './MissionTypes';

export interface BranchContext {
    variant: string;
    intel: number;
    flags: Readonly<Record<string, number | boolean>>;
    /** 執行者特質；未指定執行者時給空陣列（需要 generalTagsAny 的分支就不會成立） */
    generalTags: readonly string[];
}

export function branchMatches(branch: MissionBranch, ctx: BranchContext): boolean {
    const w = branch.when;
    if (w.variant && w.variant.length > 0 && w.variant.indexOf(ctx.variant) < 0) return false;
    if (ctx.intel < w.minIntel) return false;
    if (w.maxIntel !== undefined && ctx.intel > w.maxIntel) return false;
    if (w.flagsAll) {
        for (const f of w.flagsAll) if (!ctx.flags[f]) return false;
    }
    if (w.generalTagsAny && w.generalTagsAny.length > 0) {
        if (!w.generalTagsAny.some(t => ctx.generalTags.indexOf(t) >= 0)) return false;
    }
    return true;
}

export function selectBranch(def: Pick<MissionDefinition, 'branches'>, ctx: BranchContext): MissionBranch | null {
    let best: MissionBranch | null = null;
    for (const b of def.branches) {
        if (!branchMatches(b, ctx)) continue;
        if (best === null || b.when.minIntel > best.when.minIntel) best = b;
    }
    return best;
}

export function findBranch(def: Pick<MissionDefinition, 'branches'>, branchId: string): MissionBranch | null {
    for (const b of def.branches) if (b.id === branchId) return b;
    return null;
}
