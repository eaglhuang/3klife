// @spec-source → 血統與家系漸進揭露里程碑總綱規格書.md §F M_stage 表「五維潛力 P」、血統與家系-R5 02_出生_血統與聯姻.md §能力量尺（PROG-2-1841）
/**
 * PotentialBar — 五維潛力條的比例與文字（純邏輯，不依賴 cc）
 *
 * P 是武將五維 × 20（與培育入學時鎖定的資質層同一尺度），A 是畢業時的實力層。
 * G2 只給每格 200 點的粗略條；G3 起才有 P、A 數字；G4 再加歷代均值。
 */
import type { MilestoneStage } from './FamilyMilestone';
import { PROWESS_PER_TALENT, TRAINING_KINDS, type TrainingKind } from './NurtureSystem';

export const POTENTIAL_MAX = 2000;
export const POTENTIAL_SEGMENT = 200;

export interface PotentialGeneral {
    id: string;
    fatherId?: string;
    motherId?: string;
    prowess?: Partial<Record<TrainingKind, number>>;
    str?: number;
    int?: number;
    lea?: number;
    pol?: number;
    cha?: number;
}

export function potentialOf(general: PotentialGeneral, kind: TrainingKind): number {
    return Math.max(0, Math.min(POTENTIAL_MAX, Math.round(general[kind] ?? 0) * PROWESS_PER_TALENT));
}

/** 沒走過培育的武將沒有 A，回傳 null；不拿 P 頂替 */
export function awakenedOf(general: PotentialGeneral, kind: TrainingKind): number | null {
    const prowess = general.prowess?.[kind];
    return typeof prowess === 'number' ? Math.max(0, Math.min(potentialOf(general, kind), prowess)) : null;
}

/** 走父母連結找名冊裡的祖先；虛擬祖位不在名冊，不算 */
export function rosterAncestorsOf<T extends PotentialGeneral>(general: T, roster: readonly T[]): T[] {
    const found: T[] = [];
    const seen: string[] = [general.id];
    const queue = [general.fatherId, general.motherId];
    while (queue.length > 0) {
        const id = queue.shift();
        if (!id || seen.indexOf(id) >= 0) continue;
        seen.push(id);
        const ancestor = roster.find((candidate) => candidate.id === id);
        if (!ancestor) continue;
        found.push(ancestor);
        queue.push(ancestor.fatherId, ancestor.motherId);
    }
    return found;
}

/** 歷代均值；名冊裡查不到祖先時回傳 null */
export function clanMeanPotential(ancestors: readonly PotentialGeneral[], kind: TrainingKind): number | null {
    if (ancestors.length === 0) return null;
    return Math.round(ancestors.reduce((sum, ancestor) => sum + potentialOf(ancestor, kind), 0) / ancestors.length);
}

/** 條長比例：G2 只到每格 200 點，看不出細數；G3 起是實值，沒有 A 時覺醒段為 0 */
export function potentialFill(general: PotentialGeneral, kind: TrainingKind, stage: MilestoneStage): { potential: number; awakened: number } {
    const potential = potentialOf(general, kind);
    if (stage < 3) return { potential: Math.floor(potential / POTENTIAL_SEGMENT) * POTENTIAL_SEGMENT / POTENTIAL_MAX, awakened: 0 };
    return { potential: potential / POTENTIAL_MAX, awakened: (awakenedOf(general, kind) ?? 0) / POTENTIAL_MAX };
}

export function potentialHeadLine(name: string, stage: MilestoneStage): string {
    return stage >= 3 ? `${name}　亮段覺醒 A／暗段先天上限 P` : `${name}　先天潛力，每格 ${POTENTIAL_SEGMENT} 點`;
}

/** 條右邊的數字；G2 沒有 */
export function potentialValueLine(
    general: PotentialGeneral,
    kind: TrainingKind,
    stage: MilestoneStage,
    ancestors: readonly PotentialGeneral[],
): string {
    if (stage < 3) return '';
    const line = `${awakenedOf(general, kind) ?? '未修業'}／${potentialOf(general, kind)}`;
    if (stage < 4) return line;
    return `${line}｜歷代 ${clanMeanPotential(ancestors, kind) ?? '無記'}`;
}

export const POTENTIAL_ROW_KINDS: readonly TrainingKind[] = TRAINING_KINDS;
