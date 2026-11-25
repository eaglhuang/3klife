/** UI座標（左上原點）：只在沒有HUD的空位放教學；沒有空位便退成可展開頁籤。 */
export interface CoachRect { x: number; y: number; width: number; height: number }
export function coachRectsOverlap(a: CoachRect, b: CoachRect): boolean {
    return a.x < b.x + b.width + 8 && a.x + a.width + 8 > b.x
        && a.y < b.y + b.height + 8 && a.y + a.height + 8 > b.y;
}
/**
 * 收起後的「展開教學」頁籤（QA 11/25）：以前從 y=184 往下找空位，空位就在棋盤正上方，
 * 紅色頁籤蓋住單位血條。改成固定釘在標題列（回合數與戰場名稱之間），不佔棋盤。
 * 數值集中在這裡：COACH_TAB_*。
 */
export const COACH_TAB_WIDTH = 144;
export const COACH_TAB_HEIGHT = 60;
export const COACH_TAB_TOP = 12;
export const COACH_TAB_LEFT = 190;
/** 標題列高度（頁籤必須完整落在這個高度內）。頂端起算、寬度過半的整條 TopBar 區塊不算障礙，只避開上面的文字 */
export const COACH_TITLE_BAND = 96;
/** 視為「整條 TopBar」的最大高度；更高的寬幅區塊（例如整片遮罩）仍是障礙 */
export const COACH_TOPBAR_MAX_HEIGHT = 200;

/** 頁籤釘在標題列；該位置被標籤（非整條標題列）擋住或畫面太窄時回 null，由呼叫端退回掃描 */
export function coachTabPlacement(width: number, obstacles: readonly CoachRect[]): CoachRect | null {
    const r = { x: COACH_TAB_LEFT, y: COACH_TAB_TOP, width: COACH_TAB_WIDTH, height: COACH_TAB_HEIGHT };
    if (r.x + r.width > width - 16) return null;
    const blockers = obstacles.filter(o => !(o.width >= width * 0.5 && o.y <= COACH_TAB_TOP && o.height <= COACH_TOPBAR_MAX_HEIGHT));
    return blockers.some(o => coachRectsOverlap(r, o)) ? null : r;
}
export function battleCoachPlacement(width: number, height: number, obstacles: readonly CoachRect[], minimized = false): CoachRect | null {
    if (minimized) {
        const tab = coachTabPlacement(width, obstacles);
        if (tab) return tab;
    }
    const sizes = minimized ? [[COACH_TAB_WIDTH,COACH_TAB_HEIGHT]] : [[Math.min(720,width-32),248],[Math.min(480,width-32),308]];
    for (const [w,h] of sizes) {
        if (w < (minimized ? COACH_TAB_WIDTH : 360)) continue;
        for (let y = minimized ? 184 : Math.max(184, Math.ceil(height * 0.55)); y + h <= height - 16; y += 16) {
            const xs = [(width-w)/2, 16, width-w-16];
            for (const x of xs) {
                const r = { x, y, width:w, height:h };
                if (x >= 16 && !obstacles.some(o => coachRectsOverlap(r,o))) return r;
            }
        }
    }
    return null;
}

const HUD_REGIONS = new Set(['BattleHudScreen_div_1', 'TopBar', 'ProgressBars', 'FortressBarsPlate',
    'TigerTallyRoot', 'SidePanelRoot', 'ActionCommandRoot', 'BattleHudScreen_div_122',
    'BattleHudScreen_button_1', 'DeployRoot', 'DeployPanelRoot', 'SummaryBand', 'WisdomColumn']);
/** 保護場上所有可見標籤（含 TileBuff_ 的生命加成）；透明全畫布與裁切外文字不算整片遮擋。 */
export function battleCoachIsObstacle(name: string, r: CoachRect, width: number, height: number, isLabel = false): boolean {
    if (r.width >= width * 0.98 && r.height >= height * 0.98) return false;
    return HUD_REGIONS.has(name) || (isLabel && r.x < width && r.x + r.width > 0 && r.y < height && r.y + r.height > 0);
}
