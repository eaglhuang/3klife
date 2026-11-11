/** UI座標（左上原點）：只在沒有HUD的空位放教學；沒有空位便退成可展開頁籤。 */
export interface CoachRect { x: number; y: number; width: number; height: number }
export function coachRectsOverlap(a: CoachRect, b: CoachRect): boolean {
    return a.x < b.x + b.width + 8 && a.x + a.width + 8 > b.x
        && a.y < b.y + b.height + 8 && a.y + a.height + 8 > b.y;
}
export function battleCoachPlacement(width: number, height: number, obstacles: readonly CoachRect[], minimized = false): CoachRect | null {
    const sizes = minimized ? [[144,72]] : [[Math.min(720,width-32),248],[Math.min(480,width-32),308]];
    for (const [w,h] of sizes) {
        if (w < (minimized ? 144 : 360)) continue;
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
