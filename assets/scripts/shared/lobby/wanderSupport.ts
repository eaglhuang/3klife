// @spec-source → Issue #2135（幕府大廳 Q 版人物隨機走動、發呆、點擊對話）；PROG-2-2251
/**
 * wanderSupport — 大廳走動的周邊純邏輯，不依賴 cc。
 *
 * 走動核心（wanderCore）用「1920×1080 左上原點、y 向下」的腳底座標；大廳舞台（HallStagePlanner）用
 * 「中心原點、y 向上」。這裡負責兩邊座標互換、從設定檔組出核心設定、以及 Spine 對照表查詢。
 * 速度一律由核心的 WALK_GROUND_SPEED（骨架單位／秒）乘上顯示縮放得到，不另外手調，腳才不會在地上滑。
 */
import { WALK_GROUND_SPEED, WANDER_EXIT_MARGIN, WanderActorConfig, WanderConfig, WanderTier, Rect, Vec2 } from './wanderCore';

export interface HallWanderData {
    seed: number;
    floor: Rect;
    floorPolygon?: Vec2[];
    idleSeconds: [number, number];
    minDistance: number;
    /** 骨架套在畫面上的均勻縮放（武將骨架約 1300 單位高，0.22 ≈ 286px）。 */
    generalScale: number;
    animMix: number;
    /** 點擊判定半徑（設計像素，以腳底為圓心）。 */
    clickRadius: number;
    bubbleSeconds: number;
    /** 單次更新最長秒數；從停放回大廳時 dt 可能很大，截斷避免角色瞬間跳走。 */
    maxStepSec: number;
    /** 武將 id → resources 底下的 SkeletonData 路徑；沒列的武將是靜態小人，改走通用步態。 */
    spine: Record<string, string>;
    /** 通用步態（沒有骨架的靜態小人）：走動時上下晃的高度（舞台像素）與每秒晃幾次。 */
    staticGait: { bobPx: number; bobHz: number };
}

/** 通用步態的預設值：設定檔缺欄位時使用 */
export const DEFAULT_STATIC_GAIT = { bobPx: 7, bobHz: 2.4 } as const;

/**
 * 靜態小人（沒有骨架）走動中的垂直偏移：以「落腳」節奏取絕對值的正弦，每步彈起一次、落地回到 0。
 * phaseSec 是該角色走動累計秒數；站著（walking=false）不晃，回傳 0。
 */
export function staticBobOffset(gait: Readonly<{ bobPx: number; bobHz: number }>, phaseSec: number, walking: boolean): number {
    if (!walking) return 0;
    return Math.abs(Math.sin(Math.PI * gait.bobHz * phaseSec)) * gait.bobPx;
}

export interface CanvasSize {
    width: number;
    height: number;
}

/** 舞台座標（中心原點、y 向上）→ 走動核心座標（左上原點、y 向下）。 */
export function stageToWander(stageX: number, stageY: number, canvas: Readonly<CanvasSize>): Vec2 {
    return { x: stageX + canvas.width / 2, y: canvas.height / 2 - stageY };
}

/** 走動核心座標 → 舞台座標。 */
export function wanderToStage(p: Readonly<Vec2>, canvas: Readonly<CanvasSize>): Vec2 {
    return { x: p.x - canvas.width / 2, y: canvas.height / 2 - p.y };
}

/** 腳不滑的地面速度：核心常數（骨架單位／秒）乘顯示縮放。 */
export function actorSpeed(tier: WanderTier, displayScale: number): number {
    return WALK_GROUND_SPEED[tier] * Math.abs(displayScale);
}

export function spinePathFor(data: Readonly<HallWanderData>, generalId: string): string | null {
    const path = data.spine[generalId];
    return typeof path === 'string' && path.length > 0 ? path : null;
}

export interface WanderRosterEntry {
    id: string;
    /** 舞台座標的起點（中心原點、y 向上）。 */
    stageX: number;
    stageY: number;
}

/** 單一武將的核心設定；start 不給就用名冊的舞台座標。 */
export function buildWanderActor(data: Readonly<HallWanderData>, entry: WanderRosterEntry, canvas: Readonly<CanvasSize>, start?: Readonly<Vec2>): WanderActorConfig {
    return {
        id: entry.id,
        tier: 'general',
        speed: actorSpeed('general', data.generalScale),
        start: start ? { x: start.x, y: start.y } : stageToWander(entry.stageX, entry.stageY, canvas),
    };
}

/**
 * 輪替進場的起點：從離站位較遠的那一側、地板帶外面走進來（左牆／右牆面板會蓋住，看起來像從門口走進來）。
 * y 沿用站位的腳底 y。
 */
export function wanderEntryPoint(data: Readonly<HallWanderData>, stageX: number, stageY: number, canvas: Readonly<CanvasSize>): Vec2 {
    const spot = stageToWander(stageX, stageY, canvas);
    const mid = (data.floor.x0 + data.floor.x1) / 2;
    const x = spot.x < mid ? data.floor.x0 - WANDER_EXIT_MARGIN : data.floor.x1 + WANDER_EXIT_MARGIN;
    return { x, y: spot.y };
}

export function buildWanderConfig(data: Readonly<HallWanderData>, roster: readonly WanderRosterEntry[], canvas: Readonly<CanvasSize>): WanderConfig {
    const actors: WanderActorConfig[] = roster.map((entry) => buildWanderActor(data, entry, canvas));
    return {
        seed: data.seed,
        floor: data.floor,
        floorPolygon: data.floorPolygon,
        idleSeconds: data.idleSeconds,
        minDistance: data.minDistance,
        actors,
    };
}

/** 單次更新的 dt：負值或非數字視為 0，過大截到 maxStepSec。 */
export function clampWanderDt(dt: number, maxStepSec: number): number {
    if (!Number.isFinite(dt) || dt <= 0) return 0;
    return Math.min(dt, maxStepSec);
}

function parseStaticGait(raw: unknown): { bobPx: number; bobHz: number } {
    const g = (raw && typeof raw === 'object' ? raw : {}) as { bobPx?: unknown; bobHz?: unknown };
    return {
        bobPx: typeof g.bobPx === 'number' && Number.isFinite(g.bobPx) && g.bobPx >= 0 ? g.bobPx : DEFAULT_STATIC_GAIT.bobPx,
        bobHz: typeof g.bobHz === 'number' && Number.isFinite(g.bobHz) && g.bobHz > 0 ? g.bobHz : DEFAULT_STATIC_GAIT.bobHz,
    };
}

/** 設定檔最低限度檢查；缺欄位就回傳 null，大廳整個退回靜態小人。 */
export function parseHallWanderData(raw: unknown): HallWanderData | null {
    if (!raw || typeof raw !== 'object') return null;
    const d = raw as Partial<HallWanderData>;
    const f = d.floor;
    if (!f || ![f.x0, f.y0, f.x1, f.y1].every(Number.isFinite) || f.x1 <= f.x0 || f.y1 <= f.y0) return null;
    if (!Number.isFinite(d.seed) || !Number.isFinite(d.generalScale) || (d.generalScale as number) <= 0) return null;
    const idle = d.idleSeconds;
    if (!Array.isArray(idle) || idle.length !== 2 || !(idle[0] > 0) || idle[1] < idle[0]) return null;
    return {
        seed: d.seed as number,
        floor: f,
        floorPolygon: Array.isArray(d.floorPolygon) ? d.floorPolygon : undefined,
        idleSeconds: [idle[0], idle[1]],
        minDistance: Number.isFinite(d.minDistance) ? (d.minDistance as number) : 150,
        generalScale: d.generalScale as number,
        animMix: Number.isFinite(d.animMix) ? (d.animMix as number) : 0.18,
        clickRadius: Number.isFinite(d.clickRadius) ? (d.clickRadius as number) : 90,
        bubbleSeconds: Number.isFinite(d.bubbleSeconds) ? (d.bubbleSeconds as number) : 2,
        maxStepSec: Number.isFinite(d.maxStepSec) && (d.maxStepSec as number) > 0 ? (d.maxStepSec as number) : 0.1,
        spine: d.spine && typeof d.spine === 'object' ? { ...d.spine } : {},
        staticGait: parseStaticGait(d.staticGait),
    };
}
