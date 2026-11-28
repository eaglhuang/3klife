/**
 * types.ts — Q 臉部表情系統共用型別（QFACE-01，PROG-2-10233）
 *
 * 引擎中立：核心不 import Cocos，輸出只是一包「臉部狀態」，由套用端（cocos/QFaceCocosView）寫到節點上。
 * 單位：時間＝秒；座標＝大頭圖寬度比例（左上為原點，0～1）。
 */
export type FaceHandle = number;
export const INVALID_FACE: FaceHandle = -1;

export type PlaceholderShape =
    | 'ring' | 'ring_side' | 'bar' | 'arc_up' | 'arc_down' | 'slash' | 'droop' | 'disc' | 'spiral' | 'half'
    | 'heart' | 'ellipse_s' | 'ellipse_m' | 'ellipse_l' | 'wave' | 'drop' | 'cross' | 'star';

/** 圖集部件：格位 id 固定，Codex 交圖時直接蓋掉對應格位 */
export interface FacePartDef {
    /** 套組內的格位（0～setStride-1） */
    cell: number;
    shape: PlaceholderShape;
    /** 顯示時的縮放（例如瞪大 1.15） */
    scale?: number;
}

export interface FaceAtlasDef {
    cellSize: number;
    columns: number;
    /** 每個 partSet 佔幾格 */
    setStride: number;
    partSets: string[];
    parts: Record<string, FacePartDef>;
}

export interface FacePresetDef {
    eye: string;
    mouth: string;
    blush?: number;
    marks?: string[];
}

export interface FaceMoodDef {
    tint: string;
    brightBoost: number;
    preset?: string;
}

export interface FaceBlinkDef {
    minSec: number;
    maxSec: number;
    durationSec: number;
    blinkableEyes: string[];
    blinkEye: string;
}

export interface FaceSpeakDef {
    beatMinSec: number;
    beatMaxSec: number;
    closedMouth: string;
    intensity: Record<'low' | 'mid' | 'high', string[]>;
}

export interface QFaceData {
    atlas: FaceAtlasDef;
    blink: FaceBlinkDef;
    speak: FaceSpeakDef;
    easing: { blushSec: number; tintSec: number; eyeScaleSec: number };
    presets: Record<string, FacePresetDef>;
    activityMap: Record<string, string>;
    moods: Record<string, FaceMoodDef>;
}

export type FaceIntensity = 'low' | 'mid' | 'high';
export type QLodLevel = 0 | 1 | 2;

/** 每次更新後給套用端的臉部狀態（單一物件重複使用，不逐幀配置） */
export interface QFaceState {
    eye: string;
    mouth: string;
    /** 眼嘴在圖集內的格位（已含 partSet 偏移） */
    eyeCell: number;
    mouthCell: number;
    blushCell: number;
    eyeScale: number;
    /** 暈眼旋轉（度） */
    eyeRot: number;
    mouthScaleY: number;
    /** 紅暈強度 0～1 */
    blush: number;
    /** 情緒標記（最多 2 個，格位已含 partSet 偏移；-1 = 無） */
    markCell0: number;
    markCell1: number;
    /** 頭圖乘色 0～255 */
    tintR: number;
    tintG: number;
    tintB: number;
    brightBoost: number;
}

/** 套用端：管理器只認這個介面 */
export interface IQFaceView {
    apply(state: Readonly<QFaceState>): void;
}

export function createFaceState(): QFaceState {
    return {
        eye: '', mouth: '', eyeCell: 0, mouthCell: 0, blushCell: 0, eyeScale: 1, eyeRot: 0, mouthScaleY: 1,
        blush: 0, markCell0: -1, markCell1: -1, tintR: 255, tintG: 255, tintB: 255, brightBoost: 0,
    };
}

/** 臉部錨點（大頭圖寬度比例） */
export interface FaceAnchor {
    x: number;
    y: number;
    scale?: number;
    disabled?: boolean;
}

export interface FaceAnchorSet {
    partSet: string;
    eyeL: FaceAnchor;
    eyeR: FaceAnchor;
    mouth: FaceAnchor;
    blushL: FaceAnchor;
    blushR: FaceAnchor;
    asymmetric: boolean;
}
