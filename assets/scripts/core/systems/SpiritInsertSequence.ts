// @spec-source → 兵種（虎符）系統 §血脈卡與英靈插卡演出（四段順序）、§特種軍隊血脈紋樣原則（同一 Sigil_Pattern_ID）（PROG-2-1306，TRP-18）
/**
 * SpiritInsertSequence — 英靈插卡四段演出的時間軸（純邏輯，不依賴 cc）
 *
 * 四段順序（規格建議）：祖紋命篆亮起 → 命紋靈獸虛影 → 英靈面疊影 → 特種軍勢進場。
 * 每段時長為暫定值；畫面層依 stageAt 取得目前段落來播放動畫。
 * sameSigilFamily 用來檢查卡面、旗紋、英靈面、特種軍隊是否共用同一個 Sigil_Pattern_ID。
 *
 * Unity 對照：像 Timeline 軌道上的四個 Clip，播放頭每幀問「現在是哪一段」，段落本身不播動畫。
 */

export const SPIRIT_INSERT_STAGE_IDS = ['sigil-ignite', 'beast-shadow', 'spirit-face', 'army-enter'] as const;
export type SpiritInsertStageId = (typeof SPIRIT_INSERT_STAGE_IDS)[number];

/** 各段時長（毫秒），暫定值，待美術與策劃定稿 */
export const SPIRIT_INSERT_STAGE_DURATION_MS: Readonly<Record<SpiritInsertStageId, number>> = Object.freeze({
    'sigil-ignite': 600,
    'beast-shadow': 800,
    'spirit-face': 900,
    'army-enter': 700,
});

const SIGIL_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export interface SpiritInsertStage {
    id: SpiritInsertStageId;
    startMs: number;
    durationMs: number;
}

export interface SpiritInsertPlan {
    sigilPatternId: string;
    stages: readonly SpiritInsertStage[];
    totalMs: number;
}

/** 組出插卡時間軸；Sigil_Pattern_ID 不合規時回傳 null。 */
export function buildSpiritInsertPlan(sigilPatternId: string): SpiritInsertPlan | null {
    if (!SIGIL_ID_PATTERN.test(sigilPatternId)) return null;
    let cursor = 0;
    const stages: SpiritInsertStage[] = SPIRIT_INSERT_STAGE_IDS.map((id) => {
        const durationMs = SPIRIT_INSERT_STAGE_DURATION_MS[id];
        const stage = { id, startMs: cursor, durationMs };
        cursor += durationMs;
        return stage;
    });
    return { sigilPatternId, stages, totalMs: cursor };
}

/**
 * elapsedMs 時正在播的段落。
 * 尚未開始（小於 0）回傳 null；播完回傳 'done'。
 */
export function spiritInsertStageAt(plan: SpiritInsertPlan, elapsedMs: number): SpiritInsertStageId | 'done' | null {
    if (elapsedMs < 0) return null;
    if (elapsedMs >= plan.totalMs) return 'done';
    const stage = plan.stages.find((s) => elapsedMs >= s.startMs && elapsedMs < s.startMs + s.durationMs);
    return stage ? stage.id : 'done';
}

/** 卡面、旗紋、英靈面、特種軍隊是否共用同一個 Sigil_Pattern_ID；任一為空或不合規即 false。 */
export function sameSigilFamily(sigilIds: readonly string[]): boolean {
    if (sigilIds.length === 0) return false;
    const first = sigilIds[0];
    if (!SIGIL_ID_PATTERN.test(first)) return false;
    return sigilIds.every((id) => id === first);
}
