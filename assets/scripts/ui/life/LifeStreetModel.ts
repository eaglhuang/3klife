// @spec-source → 武將生活系統 QLIFE-01／QSOC-01；PROG-2-10214（生活層第一個看得到的原型）
/**
 * LifeStreetModel — 佔位市井大街的純邏輯（不依賴 cc，可直接在 tests 跑）
 *
 * 職責：
 *  1. 把 WP3 作息引擎的資料縮成「市井大街」16 個場景（原型只放這一條街的人）；
 *  2. 場景＋時段 → 頭上活動（對應 WP2 符號組的 activity id）；
 *  3. 依畫面尺寸排出每個場景的格子（建築＋門前空地），橫式 8 欄、直式 4 欄；
 *  4. 武將在門前空地走動的狀態機：走到目標、發呆、再挑新目標（走／待機由畫面層對應 WP1 片段）。
 * 座標：原點在畫面中心、x 向右、y 向上（和 Cocos 預設錨點同向）。
 */
import { hash01 } from '../../shared/presentation/symbol/QSymbolSystem';
import type { LifeData } from '../../core/life/types';

export interface StreetConfig {
    venues: string[];
    activityByScene: Record<string, string>;
    sleepScenes: string[];
    sleepSlots: number[];
    defaultActivity: string;
    pairKind: string;
    buildingColors: string[];
    headColors: string[];
    ground: Record<string, string>;
    roadColor: string;
    layout: {
        landscapeCols: number;
        portraitCols: number;
        marginXRel: number;
        marginTopRel: number;
        marginBottomRel: number;
        buildingHeightRel: number;
        yardHeightRel: number;
        headRelCell: number;
        headMaxPx: number;
        headMinPx: number;
    };
    walk: { speedPxPerSec: number; transitSpeedPxPerSec: number; idleMinSec: number; idleMaxSec: number; wanderRel: number };
    names: Record<string, string>;
    intel: number;
    clock: { startQuarter: number; startSlotSeq: number; autoAdvance: boolean };
    tier: 'low' | 'mid' | 'high';
}

export interface Rect { x: number; y: number; w: number; h: number }

/** 只留市井大街場景的作息資料：武將只會在這條街上挑地點（其餘欄位原樣沿用） */
export function filterStreetData(data: LifeData, venues: readonly string[]): LifeData {
    const set = new Set(venues);
    return { ...data, scenes: { ...data.scenes, scenes: data.scenes.scenes.filter((s) => set.has(s.id)) } };
}

/** 場景＋時段（1～7）→ WP2 符號系統的 activity id */
export function activityOf(cfg: StreetConfig, sceneId: string, slot: number): string {
    if (cfg.sleepScenes.includes(sceneId) && cfg.sleepSlots.includes(slot)) return 'sleep';
    return cfg.activityByScene[sceneId] ?? cfg.defaultActivity;
}

/** 睡覺中的人原地不動，其餘會在門前走動 */
export function isStationary(activity: string): boolean {
    return activity === 'sleep';
}

export interface VenueCell {
    sceneId: string;
    index: number;
    /** 整格 */
    cell: Rect;
    /** 建築（格子上半） */
    building: Rect;
    /** 門前空地（格子下半）：武將在這裡走動 */
    yard: Rect;
}

export interface StreetLayout {
    portrait: boolean;
    cols: number;
    rows: number;
    cells: VenueCell[];
    headH: number;
    /** 整條街的地面（含道路） */
    ground: Rect;
}

/** 依畫面尺寸排版；直式欄數減半、列數加倍 */
export function layoutStreet(viewW: number, viewH: number, cfg: StreetConfig): StreetLayout {
    const L = cfg.layout;
    const portrait = viewH > viewW;
    const cols = portrait ? L.portraitCols : L.landscapeCols;
    const n = cfg.venues.length;
    const rows = Math.ceil(n / cols);
    const left = -viewW / 2 + viewW * L.marginXRel;
    const areaW = viewW * (1 - 2 * L.marginXRel);
    const top = viewH / 2 - viewH * L.marginTopRel;
    const bottom = -viewH / 2 + viewH * L.marginBottomRel;
    const areaH = top - bottom;
    const cw = areaW / cols;
    const ch = areaH / rows;
    const cells: VenueCell[] = [];
    for (let i = 0; i < n; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const cell: Rect = { x: left + c * cw, y: top - (r + 1) * ch, w: cw, h: ch };
        const pad = cw * 0.06;
        const building: Rect = {
            x: cell.x + pad,
            y: cell.y + ch * (1 - L.buildingHeightRel) - pad * 0.5,
            w: cw - pad * 2,
            h: ch * L.buildingHeightRel,
        };
        const yard: Rect = { x: cell.x + pad, y: cell.y + pad * 0.5, w: cw - pad * 2, h: ch * L.yardHeightRel };
        cells.push({ sceneId: cfg.venues[i], index: i, cell, building, yard });
    }
    const headH = Math.max(L.headMinPx, Math.min(L.headMaxPx, cw * L.headRelCell, ch * 0.2));
    return {
        portrait, cols, rows, cells, headH,
        ground: { x: left, y: bottom, w: areaW, h: areaH },
    };
}

export function cellOf(layout: StreetLayout, sceneId: string): VenueCell | undefined {
    return layout.cells.find((c) => c.sceneId === sceneId);
}

/** 同一場景多人時，第 i 位的站位：橫向均分、縱向由 id 雜湊決定 */
export function standPoint(yard: Rect, headH: number, index: number, count: number, seed: string): { x: number; y: number } {
    const slotW = yard.w / Math.max(1, count);
    const x = yard.x + slotW * (index + 0.5);
    const yMin = yard.y + headH * 0.2;
    const yMax = yard.y + Math.max(headH * 0.2, yard.h - headH * 0.9);
    return { x, y: yMin + (yMax - yMin) * hash01(`${seed}:y`) };
}

export type WalkPhase = 'walk' | 'idle';

/** 一位武將在畫面上的走動狀態 */
export interface WalkerState {
    x: number;
    y: number;
    tx: number;
    ty: number;
    /** 面向：1 向右、-1 向左 */
    dir: 1 | -1;
    phase: WalkPhase;
    /** 發呆剩餘秒數（phase=idle 時有效） */
    idleLeft: number;
    /** 抽到第幾次，用來讓每次的亂數不同又可重現 */
    pick: number;
}

export function createWalker(x: number, y: number): WalkerState {
    return { x, y, tx: x, ty: y, dir: 1, phase: 'idle', idleLeft: 0, pick: 0 };
}

/** 設定新的目標（換場景時走去新場景門前） */
export function setWalkTarget(w: WalkerState, tx: number, ty: number): void {
    w.tx = tx;
    w.ty = ty;
    w.phase = 'walk';
    if (tx !== w.x) w.dir = tx > w.x ? 1 : -1;
}

/** 在門前空地挑下一個閒逛目標（以 yard 為界、以 wanderRel 倍格寬為半徑） */
export function pickWanderTarget(w: WalkerState, yard: Rect, headH: number, wanderPx: number, seed: string): { x: number; y: number } {
    const rx = hash01(`${seed}:wx:${w.pick}`) * 2 - 1;
    const ry = hash01(`${seed}:wy:${w.pick}`);
    const minX = yard.x + headH * 0.5;
    const maxX = yard.x + yard.w - headH * 0.5;
    const minY = yard.y + headH * 0.2;
    const maxY = yard.y + Math.max(headH * 0.2, yard.h - headH * 0.9);
    const x = Math.max(minX, Math.min(maxX, w.x + rx * wanderPx));
    const y = minY + (maxY - minY) * ry;
    return { x, y };
}

export interface StepOptions {
    speed: number;
    idleMinSec: number;
    idleMaxSec: number;
    stationary: boolean;
    yard: Rect;
    headH: number;
    wanderPx: number;
    seed: string;
}

/**
 * 推進一幀。回傳這一幀的實際動作：走（walk）還是站著（idle）。
 * 走到目標就進入發呆；發呆結束且不是靜止活動，再挑新的閒逛目標。
 */
export function stepWalker(w: WalkerState, dt: number, o: StepOptions): WalkPhase {
    if (w.phase === 'walk') {
        const dx = w.tx - w.x;
        const dy = w.ty - w.y;
        const dist = Math.hypot(dx, dy);
        const step = o.speed * dt;
        if (dist <= step || dist < 0.5) {
            w.x = w.tx;
            w.y = w.ty;
            w.phase = 'idle';
            const u = hash01(`${o.seed}:idle:${w.pick}`);
            w.idleLeft = o.idleMinSec + (o.idleMaxSec - o.idleMinSec) * u;
            w.pick++;
        } else {
            w.x += (dx / dist) * step;
            w.y += (dy / dist) * step;
            if (Math.abs(dx) > 0.5) w.dir = dx > 0 ? 1 : -1;
        }
        return w.phase;
    }
    if (o.stationary) return 'idle';
    w.idleLeft -= dt;
    if (w.idleLeft <= 0) {
        const t = pickWanderTarget(w, o.yard, o.headH, o.wanderPx, o.seed);
        setWalkTarget(w, t.x, t.y);
        return 'walk';
    }
    return 'idle';
}

/** 各場景的人數（找「有兩人以上」的場景放互動符號用） */
export function countByScene(sceneOf: Record<string, string>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const id of Object.keys(sceneOf)) out[sceneOf[id]] = (out[sceneOf[id]] ?? 0) + 1;
    return out;
}
