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
