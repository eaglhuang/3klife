// @spec-source → 使用者裁定 2026-10-26（每張立繪比例相同、頭高一致，左右與下身可被框切掉）；PROG-2-1126
/**
 * PortraitFrameFit — 把全身立繪擺進瘦長框：臉高統一、眼睛同高、臉中心對齊框中線（純數學，不依賴 cc）
 *
 * 臉部標記來自 data/general-avatar-crops.json 的 crops[id].face（已人工審過，原圖像素、y 向下）。
 * 沒有標記的立繪退回「以圖高估臉」：眼睛約在 12% 高、臉高約 6.5% 圖高、水平置中。
 *
 * 回傳的是立繪節點的尺寸與中心位置（Cocos 座標：原點在框中心、y 向上）。
 */

export interface FaceMarks {
    top: number;
    chin: number;
    eyeY: number;
    cx: number;
}

export interface PortraitFrameSpec {
    frameWidth: number;
    frameHeight: number;
    /** 臉（頭頂到下巴）在框內的像素高 */
    faceHeight: number;
    /** 眼睛距框頂的像素 */
    eyeFromTop: number;
}

export interface PortraitPlacement {
    width: number;
    height: number;
    x: number;
    y: number;
}

/** 示意圖定案的六框規格（設計解析度 1920×1080） */
export const PORTRAIT_FRAME_SPEC: Readonly<PortraitFrameSpec> = {
    frameWidth: 250,
    frameHeight: 560,
    faceHeight: 58,
    eyeFromTop: 118,
};

/** 宿命轉蛋十連的小框：兩排五格，只露上半身 */
export const DESTINY_PORTRAIT_SPEC: Readonly<PortraitFrameSpec> = {
    frameWidth: 240,
    frameHeight: 300,
    faceHeight: 58,
    eyeFromTop: 76,
};

/** 開場名將登場卡右側半身立繪框（UI-2-0160）：框比六框寬，臉放大到約 1.5 倍 */
export const SHOWCASE_PORTRAIT_SPEC: Readonly<PortraitFrameSpec> = {
    frameWidth: 360,
    frameHeight: 560,
    faceHeight: 90,
    eyeFromTop: 150,
};

/** 開場六名將一頁橫排的立繪框（PROG-2-10064）：六欄並排，露上半身 */
export const SHOWCASE_ROW_PORTRAIT_SPEC: Readonly<PortraitFrameSpec> = {
    frameWidth: 280,
    frameHeight: 380,
    faceHeight: 70,
    eyeFromTop: 100,
};

export function estimateFaceMarks(imageWidth: number, imageHeight: number): FaceMarks {
    const eyeY = imageHeight * 0.12;
    const half = imageHeight * 0.0325;
    return { top: eyeY - half, chin: eyeY + half, eyeY, cx: imageWidth / 2 };
}

export function fitPortraitInFrame(
    imageWidth: number,
    imageHeight: number,
    face: Readonly<FaceMarks> | null | undefined,
    spec: Readonly<PortraitFrameSpec> = PORTRAIT_FRAME_SPEC,
): PortraitPlacement {
    // 標記超出圖框代表是舊版原圖量的（立繪已換圖），不可信，退回估算
    const usable = !!face && face.chin > face.top && face.top >= 0 && face.chin <= imageHeight && face.cx >= 0 && face.cx <= imageWidth;
    const marks = usable ? face! : estimateFaceMarks(imageWidth, imageHeight);
    const scale = spec.faceHeight / (marks.chin - marks.top);
    return {
        width: imageWidth * scale,
        height: imageHeight * scale,
        x: (imageWidth / 2 - marks.cx) * scale,
        y: spec.frameHeight / 2 - spec.eyeFromTop - (imageHeight / 2 - marks.eyeY) * scale,
    };
}

/** 立繪量測（data/general-portrait-bounds.json，原圖像素、y 向下）；headTop／headCx 由 measure-gacha-portrait-bounds.js 產出 */
export interface PortraitHeadBounds {
    w: number;
    h: number;
    bottom: number;
    headTop?: number;
    headCx?: number;
    top: number;
    cx: number;
}

/**
 * 頭頂齊平基準（PROG-2-9156）：以「標準人物」（曹操、劉備）在框內的頭頂位置與頭頂到腳底的身高當標準，
 * 其他武將一律縮放到同樣身高、頭頂放在同一個 y。標準人物自己的擺位沿用 estimateFaceMarks（使用者認可的樣子）。
 */
export const PORTRAIT_REFERENCE_IDS: readonly string[] = ['cao-cao', 'liu-bei'];

export interface PortraitHeadReference {
    /** 頭頂距框頂的像素 */
    headTopFromFrameTop: number;
    /** 頭頂到腳底在框內的像素高 */
    bodyHeight: number;
}

function headTopOf(b: Readonly<PortraitHeadBounds>): number {
    return b.headTop ?? b.top;
}

/** 由標準人物算出基準；量測資料缺任何一位標準人物就回傳 null（呼叫端退回臉部標記擺位） */
export function buildPortraitHeadReference(
    bounds: Readonly<Record<string, PortraitHeadBounds>>,
    spec: Readonly<PortraitFrameSpec> = PORTRAIT_FRAME_SPEC,
): PortraitHeadReference | null {
    let top = 0;
    let body = 0;
    for (const id of PORTRAIT_REFERENCE_IDS) {
        const b = bounds[id];
        if (!b || !(b.bottom > headTopOf(b))) return null;
        const marks = estimateFaceMarks(b.w, b.h);
        const scale = spec.faceHeight / (marks.chin - marks.top);
        top += spec.eyeFromTop - (marks.eyeY - headTopOf(b)) * scale;
        body += (b.bottom - headTopOf(b)) * scale;
    }
    const n = PORTRAIT_REFERENCE_IDS.length;
    return { headTopFromFrameTop: top / n, bodyHeight: body / n };
}

/** 頭頂齊平擺位：身高統一、頭頂同高、頭中線對齊框中線；回傳格式同 fitPortraitInFrame */
export function fitPortraitByHead(
    b: Readonly<PortraitHeadBounds>,
    ref: Readonly<PortraitHeadReference>,
    spec: Readonly<PortraitFrameSpec> = PORTRAIT_FRAME_SPEC,
): PortraitPlacement | null {
    const headTop = headTopOf(b);
    if (!(b.bottom > headTop) || !(b.w > 0) || !(b.h > 0)) return null;
    const scale = ref.bodyHeight / (b.bottom - headTop);
    const cx = b.headCx ?? b.cx;
    return {
        width: b.w * scale,
        height: b.h * scale,
        x: (b.w / 2 - cx) * scale,
        y: spec.frameHeight / 2 - ref.headTopFromFrameTop + (headTop - b.h / 2) * scale,
    };
}

/**
 * 沒有立繪時的剪影頭像：等比放大到蓋滿立繪框（cover），底邊對齊框底（＝名牌上緣），左右置中裁切。
 * 座標以框中心為原點、Y 向上（與 fitPortraitInFrame 相同）。
 */
export function fitSilhouetteToFrame(srcWidth: number, srcHeight: number, frameWidth: number, frameHeight: number): { width: number; height: number; x: number; y: number } {
    if (srcWidth <= 0 || srcHeight <= 0) return { width: frameWidth, height: frameHeight, x: 0, y: 0 };
    const scale = Math.max(frameWidth / srcWidth, frameHeight / srcHeight);
    const width = srcWidth * scale;
    const height = srcHeight * scale;
    return { width, height, x: 0, y: -frameHeight / 2 + height / 2 };
}
