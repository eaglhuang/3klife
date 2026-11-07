// @spec-source → 地形適性飄字反饋與戰況台詞管線規格書 (doc_spec_0327) §1、§3（APT-14b、APT-14，PROG-2-2002）
/**
 * TerrainFloatFeedback — 踏入地形的適性飄字規格、錯峰排程、浮動軌跡與台詞戰報條目（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - S【地利優勢】#48C774 帶光塵；A【適應良好】#3273DC；B/C 不飄字；D【寸步難行】#F14668 帶震顫。
 * - 軌跡：向上 35px、0.85 秒；前 0.25 秒線性加速，後 0.6 秒二次緩動並淡出。
 * - 同一秒多支部隊移動時依行動順序每支間隔 120ms。
 * - 台詞寫入戰鬥日誌加標籤 [適性機略]，音效 sfx_bamboo_scroll 0.4 秒，Toast 停留 1.6 秒。
 *
 * 台詞六級優先序沿用 AptitudeDialogue（PROG-2-1308）。
 * 暫定：既有 APTITUDE_TOAST_DURATION_S 為 2.5 秒，與本規格 1.6 秒不一致，先另立常數不改舊值，待裁決統一。
 * 「前 0.25 秒線性加速」解讀為 0~0.25 秒速度由 0 線性增加（位移 t²），之後 ease-out 二次曲線到頂。
 * Unity 對照：像 DOTween 的自訂 Ease 與 Sequence 延遲，畫面層只拿數值去播。
 */
import type { AptitudeGrade } from './BattleAptitude';

export interface TerrainFloatSpec {
    text: string;
    color: string;
    effect: 'dustUp' | 'none' | 'shake';
}

const FLOAT_SPECS: Readonly<Partial<Record<AptitudeGrade, TerrainFloatSpec>>> = {
    S: { text: '【地利優勢】', color: '#48C774', effect: 'dustUp' },
    A: { text: '【適應良好】', color: '#3273DC', effect: 'none' },
    D: { text: '【寸步難行】', color: '#F14668', effect: 'shake' },
};

export const FLOAT_RISE_PX = 35;
export const FLOAT_DURATION_SEC = 0.85;
export const FLOAT_ACCEL_SEC = 0.25;
export const FLOAT_STAGGER_MS = 120;
export const APTITUDE_LOG_TAG = '[適性機略]';
export const APTITUDE_LINE_SFX = 'sfx_bamboo_scroll';
export const APTITUDE_LINE_SFX_SEC = 0.4;
export const APTITUDE_LINE_TOAST_SEC = 1.6;

/** 依適性等級回傳飄字規格；B/C 不飄字回 null。 */
export function terrainFloatSpecOf(grade: AptitudeGrade): TerrainFloatSpec | null {
    return FLOAT_SPECS[grade] ?? null;
}

/**
 * 時間 t 秒時的上浮位移（px）與透明度。
 * 加速段位移 a·t²，緩動段以 ease-out 二次曲線接續，起點速度連續。
 */
export function floatOffsetAt(t: number): { y: number; opacity: number } {
    if (t <= 0) return { y: 0, opacity: 1 };
    if (t >= FLOAT_DURATION_SEC) return { y: FLOAT_RISE_PX, opacity: 0 };
    const t1 = FLOAT_ACCEL_SEC;
    const t2 = FLOAT_DURATION_SEC - t1;
    // 加速段末速度 v = 2·a·t1；緩動段位移 v·t2/2（ease-out 二次曲線）。兩段總和 = 35。
    const a = FLOAT_RISE_PX / (t1 * t1 + t1 * t2);
    const y1 = a * t1 * t1;
    if (t <= t1) return { y: a * t * t, opacity: 1 };
    const u = (t - t1) / t2;
    const y = y1 + (FLOAT_RISE_PX - y1) * (1 - (1 - u) * (1 - u));
    return { y: Math.round(y * 1e6) / 1e6, opacity: Math.round((1 - u) * 1e6) / 1e6 };
}

export interface FloatMoveEvent {
    unitId: string;
    grade: AptitudeGrade;
}

export interface ScheduledFloat {
    unitId: string;
    delayMs: number;
    spec: TerrainFloatSpec;
}

/** 依行動順序排出飄字錯峰時間；不飄字的部隊不佔間隔。 */
export function scheduleTerrainFloats(moves: readonly FloatMoveEvent[]): ScheduledFloat[] {
    const out: ScheduledFloat[] = [];
    for (const m of moves) {
        const spec = terrainFloatSpecOf(m.grade);
        if (spec) out.push({ unitId: m.unitId, delayMs: out.length * FLOAT_STAGGER_MS, spec });
    }
    return out;
}

/** 適性台詞寫入戰鬥日誌的條目文字。 */
export function aptitudeLogEntry(line: string): string {
    return `${APTITUDE_LOG_TAG} ${line}`;
}
