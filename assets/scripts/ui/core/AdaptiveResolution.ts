// @spec-source → 見 docs/cross-reference-index.md
import { ResolutionPolicy, view } from 'cc';

/**
 * 依視窗比例切換縮放策略（PROG-2-1626）。
 * 專案預設 FIXED_HEIGHT：視窗比設計比例（16:9）窄時左右會被裁掉，
 * 左上返回鍵與列表第一欄（武將姓名）就落在畫面外。
 * 窄視窗改用 FIXED_WIDTH 保住整個寬度；寬視窗維持 FIXED_HEIGHT。
 */
export function pickResolutionPolicy(frameWidth: number, frameHeight: number, designWidth: number, designHeight: number): number {
    if (frameWidth <= 0 || frameHeight <= 0 || designWidth <= 0 || designHeight <= 0) return ResolutionPolicy.FIXED_HEIGHT;
    return frameWidth / frameHeight < designWidth / designHeight
        ? ResolutionPolicy.FIXED_WIDTH
        : ResolutionPolicy.FIXED_HEIGHT;
}

let installed = false;
let currentPolicy: number | null = null;

/** 安裝一次即可；之後視窗縮放時自動重選策略（只在策略真的改變時才重設，避免 resize 迴圈） */
export function installAdaptiveResolution(): void {
    if (installed || !view?.getFrameSize) return;
    installed = true;
    const apply = (): void => {
        const frame = view.getFrameSize();
        const design = view.getDesignResolutionSize();
        const next = pickResolutionPolicy(frame.width, frame.height, design.width, design.height);
        if (next === currentPolicy) return;
        currentPolicy = next;
        view.setResolutionPolicy(next);
    };
    apply();
    view.on('canvas-resize', apply);
}
