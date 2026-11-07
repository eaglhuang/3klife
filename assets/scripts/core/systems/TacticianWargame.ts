// @spec-source → 軍師演武沙盤推演與釋放敵將頓悟捷徑規格書.md（doc_spec_0356）；PROG-2-2042
/**
 * TacticianWargame — 軍師演武零消耗推演與釋放敵將頓悟捷徑（純邏輯，不依賴 cc）
 *
 * - §1 演武：開局拍下兵糧／精力快照，戰中任意變動，退出一律以快照還原；只帶出演武筆記。
 * - §2 釋放敵將（Q50=D）：狼性反覆 −10 好感、不頓悟；其餘 +20，主將 CHA ≥75 或有仁義傳家家風即得靈感筆記。
 * 與 PowExtendedBranches.rollReleaseEnlightenment（機率版）並存：本檔是門檻確定版。
 */

export const RELEASE_AFFINITY_GAIN = 20;
export const RELEASE_WOLF_AFFINITY_PENALTY = -10;
export const RELEASE_EPIPHANY_CHA_MIN = 75;
export const TREACHEROUS_WOLF_PERSONALITY = 'Treacherous_Wolf';

export interface ReleaseCaptiveContext {
    playerGeneralCha: number;
    playerHasBenevolenceTrait: boolean;
    enemyGeneralTemplateId: string;
    enemyGeneralPersonality: string;
    enemySignatureTacticId: string;
}

export interface ReleaseCaptiveResult {
    affinityGain: number;
    epiphanyTriggered: boolean;
    grantedTacticNoteId?: string;
}

export function tacticNoteIdOf(tacticId: string): string {
    return `NOTE_${tacticId}`;
}

export function handleReleaseCaptive(ctx: ReleaseCaptiveContext): ReleaseCaptiveResult {
    if (ctx.enemyGeneralPersonality === TREACHEROUS_WOLF_PERSONALITY) {
        return { affinityGain: RELEASE_WOLF_AFFINITY_PENALTY, epiphanyTriggered: false };
    }
    const qualified = ctx.playerGeneralCha >= RELEASE_EPIPHANY_CHA_MIN || ctx.playerHasBenevolenceTrait;
    return qualified && ctx.enemySignatureTacticId
        ? { affinityGain: RELEASE_AFFINITY_GAIN, epiphanyTriggered: true, grantedTacticNoteId: tacticNoteIdOf(ctx.enemySignatureTacticId) }
        : { affinityGain: RELEASE_AFFINITY_GAIN, epiphanyTriggered: false };
}

export interface WargameResources {
    troops: number;
    grain: number;
    /** generalId → 精力 */
    vitality: Record<string, number>;
}

export interface WargameExitResult {
    /** 還原後的真實資源（與進場時相同） */
    resources: WargameResources;
    warNotes: string[];
}

function cloneResources(r: WargameResources): WargameResources {
    return { troops: r.troops, grain: r.grain, vitality: { ...r.vitality } };
}

/** §1 演武場：sandbox 是可隨意消耗的複本，exit 時真實資源取回快照 */
export class WargameSession {
    private readonly _snapshot: WargameResources;
    public readonly sandbox: WargameResources;
    private readonly _notes: string[] = [];

    public constructor(real: WargameResources) {
        this._snapshot = cloneResources(real);
        this.sandbox = cloneResources(real);
    }

    /** 通過殘局取得演武筆記（同一場同一張只記一次） */
    public earnWarNote(noteId: string): void {
        if (noteId && this._notes.indexOf(noteId) < 0) this._notes.push(noteId);
    }

    public exit(): WargameExitResult {
        return { resources: cloneResources(this._snapshot), warNotes: Array.from(this._notes) };
    }
}

/** §4-3 筆記入庫：回傳新背包（itemId → 數量），不改原物件 */
export function addNotesToInventory(inventory: Readonly<Record<string, number>>, noteIds: readonly string[]): Record<string, number> {
    const next = { ...inventory };
    for (const id of noteIds) {
        if (id) next[id] = (next[id] ?? 0) + 1;
    }
    return next;
}
