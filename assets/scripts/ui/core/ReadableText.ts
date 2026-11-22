// @spec-source → 見 docs/cross-reference-index.md（PROG-2-9433）
import { view } from 'cc';
import { readableFontSize, readableLineHeight, screenCssScale } from '../../shared/ReadableFontSize';

/**
 * ReadableText — 引擎端取目前畫面縮放，套用小螢幕最小可讀字級（PROG-2-9433）。
 * 純計算在 shared/ReadableFontSize.ts；這裡只負責讀 Cocos view。
 */

/** 目前畫面的設計 px → CSS px 縮放比例；取不到 view 時當 1（不放大） */
export function currentScreenCssScale(): number {
    const frame = view?.getFrameSize?.();
    const design = view?.getDesignResolutionSize?.();
    if (!frame || !design) return 1;
    return screenCssScale(frame.width, frame.height, design.width, design.height);
}

/** 依目前畫面把一組字級／行高換成可讀版本 */
export function readableText(fontSize: number, lineHeight: number, cssScale: number = currentScreenCssScale()): { fontSize: number; lineHeight: number } {
    const size = readableFontSize(fontSize, cssScale);
    return { fontSize: size, lineHeight: readableLineHeight(fontSize, lineHeight, size) };
}
