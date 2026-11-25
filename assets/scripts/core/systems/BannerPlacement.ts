/**
 * BannerPlacement — 橫幅依「錨點＋比例」算位置（純邏輯，不依賴 cc；PROG-2-10025）。
 * 規則資料在 BattleBannerLayoutData；這裡只負責換算與保留區檢查。
 */
import type { BannerAlignRule, RatioRect } from '../data/BattleBannerLayoutData';

/** 橫幅中心相對容器中心的偏移（y 向上為正，與 Cocos 一致） */
export function bannerCenterOffset(rule: BannerAlignRule, containerW: number, containerH: number, bannerH: number): { x: number; y: number } {
    const x = rule.xOffsetRatio * containerW;
    const y = rule.anchor === 'top'
        ? containerH / 2 - rule.insetRatio * containerH - bannerH / 2
        : -containerH / 2 + rule.insetRatio * containerH + bannerH / 2;
    return { x, y };
}

/** 橫幅在容器中的比例矩形（左上原點），用來和保留區比對 */
export function bannerRatioRect(rule: BannerAlignRule, containerW: number, containerH: number, bannerW: number, bannerH: number): RatioRect {
    const c = bannerCenterOffset(rule, containerW, containerH, bannerH);
    const left = containerW / 2 + c.x - bannerW / 2;
    const top = containerH / 2 - c.y - bannerH / 2;
    return { x: left / containerW, y: top / containerH, width: bannerW / containerW, height: bannerH / containerH };
}

export function ratioRectsOverlap(a: RatioRect, b: RatioRect): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** 回傳橫幅壓到的保留區名稱（空陣列＝沒壓到） */
export function reservedHits(rect: RatioRect, reserved: Record<string, RatioRect>): string[] {
    return Object.keys(reserved).filter((k) => ratioRectsOverlap(rect, reserved[k]));
}
