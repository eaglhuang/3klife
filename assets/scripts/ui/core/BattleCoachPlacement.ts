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
/**
 * 教學浮窗的擺放資料（assets/resources/data/battle-coach-placement.json，PROG-2-10061）。
 * 位置只用「錨點＋相對比例區域」表達，不寫死座標，日後改直式或手機橫式只換資料：
 *   anchor     浮窗貼哪個角；掃描由該角往外找第一個沒被擋住的位置
 *   region     允許放置的區域（畫面寬高的比例）；右下拇指區與下緣操作鈕留在區域之外
 *   forbidden  區域內另外禁放的矩形（比例），例如接戰區核心
 *   cards      展開卡的尺寸候選（寬度比例夾在 min／max；高度為設計像素），依序嘗試
 * 解析失敗或缺欄位時退回 DEFAULT_COACH_PLACEMENT（兩者由單元測試鎖定一致）。
 */
export type CoachAnchor = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
export interface CoachRatioRect { x: number; y: number; width: number; height: number }
export interface CoachCardSize { widthRatio: number; minWidth: number; maxWidth: number; height: number }
export interface CoachPlacementConfig {
    anchor: CoachAnchor;
    margin: number;
    step: number;
    region: CoachRatioRect;
    forbidden: CoachRatioRect[];
    cards: CoachCardSize[];
}
export const DEFAULT_COACH_PLACEMENT: CoachPlacementConfig = {
    anchor: 'bottom-left',
    margin: 16,
    step: 16,
    region: { x: 0, y: 0.6, width: 0.56, height: 0.4 },
    forbidden: [{ x: 0.3, y: 0.3, width: 0.45, height: 0.3 }],
    cards: [
        { widthRatio: 0.34, minWidth: 360, maxWidth: 720, height: 248 },
        { widthRatio: 0.26, minWidth: 360, maxWidth: 480, height: 308 },
    ],
};
const COACH_ANCHORS: readonly CoachAnchor[] = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
function parseRatioRect(raw: unknown): CoachRatioRect | null {
    const r = raw as Partial<CoachRatioRect> | null;
    if (!r || !finite(r.x) || !finite(r.y) || !finite(r.width) || !finite(r.height)) return null;
    if (r.width <= 0 || r.height <= 0 || r.x < 0 || r.y < 0 || r.x + r.width > 1.0001 || r.y + r.height > 1.0001) return null;
    return { x: r.x, y: r.y, width: r.width, height: r.height };
}
/** 把載入的 JSON 轉成設定；任何一項不合法就整份退回預設（寧可用已驗證的預設，也不半套套用） */
export function parseCoachPlacementConfig(raw: unknown): CoachPlacementConfig {
    const c = raw as Partial<CoachPlacementConfig> | null;
    if (!c || !COACH_ANCHORS.includes(c.anchor as CoachAnchor) || !finite(c.margin) || !finite(c.step) || c.step < 4) return DEFAULT_COACH_PLACEMENT;
    const region = parseRatioRect(c.region);
    if (!region || !Array.isArray(c.forbidden) || !Array.isArray(c.cards) || !c.cards.length) return DEFAULT_COACH_PLACEMENT;
    const forbidden = c.forbidden.map(parseRatioRect);
    if (forbidden.some(f => !f)) return DEFAULT_COACH_PLACEMENT;
    const cards = c.cards as CoachCardSize[];
    if (cards.some(k => !k || !finite(k.widthRatio) || !finite(k.minWidth) || !finite(k.maxWidth) || !finite(k.height) || k.widthRatio <= 0 || k.height <= 0)) return DEFAULT_COACH_PLACEMENT;
    return { anchor: c.anchor as CoachAnchor, margin: c.margin, step: c.step, region, forbidden: forbidden as CoachRatioRect[], cards };
}
const toRect = (r: CoachRatioRect, width: number, height: number): CoachRect =>
    ({ x: r.x * width, y: r.y * height, width: r.width * width, height: r.height * height });
const inside = (r: CoachRect, area: CoachRect): boolean =>
    r.x >= area.x - 0.5 && r.y >= area.y - 0.5 && r.x + r.width <= area.x + area.width + 0.5 && r.y + r.height <= area.y + area.height + 0.5;

/** 展開卡：由錨點角往外掃描，第一個完整落在允許區域、避開禁放區與 HUD 障礙物的位置；沒有則 null */
function scanAnchored(width: number, height: number, obstacles: readonly CoachRect[], cfg: CoachPlacementConfig): CoachRect | null {
    const area = toRect(cfg.region, width, height);
    const blocked = [...obstacles, ...cfg.forbidden.map(f => toRect(f, width, height))];
    const fromBottom = cfg.anchor.startsWith('bottom');
    const fromLeft = cfg.anchor.endsWith('left');
    for (const card of cfg.cards) {
        const w = Math.min(card.maxWidth, Math.max(card.minWidth, width * card.widthRatio));
        const h = card.height;
        if (w + 2 * cfg.margin > area.width || h + 2 * cfg.margin > area.height) continue;
        const left = area.x + cfg.margin, right = area.x + area.width - cfg.margin - w;
        const top = area.y + cfg.margin, bottom = area.y + area.height - cfg.margin - h;
        for (let y = fromBottom ? bottom : top; fromBottom ? y >= top - 0.5 : y <= bottom + 0.5; y += fromBottom ? -cfg.step : cfg.step) {
            for (let x = fromLeft ? left : right; fromLeft ? x <= right + 0.5 : x >= left - 0.5; x += fromLeft ? cfg.step : -cfg.step) {
                const r = { x, y, width: w, height: h };
                if (inside(r, area) && !blocked.some(o => coachRectsOverlap(r, o))) return r;
            }
        }
    }
    return null;
}
export function battleCoachPlacement(width: number, height: number, obstacles: readonly CoachRect[], minimized = false,
    config: CoachPlacementConfig = DEFAULT_COACH_PLACEMENT): CoachRect | null {
    if (minimized) {
        const tab = coachTabPlacement(width, obstacles);
        if (tab) return tab;
        // 收起頁籤釘不上標題列時，退回同一個錨點角找小空位（不再獨立寫死位置）
        return scanAnchored(width, height, obstacles, {
            ...config, region: { x: 0, y: 0, width: 1, height: 1 }, forbidden: [],
            cards: [{ widthRatio: COACH_TAB_WIDTH / Math.max(1, width), minWidth: COACH_TAB_WIDTH, maxWidth: COACH_TAB_WIDTH, height: COACH_TAB_HEIGHT }],
        });
    }
    return scanAnchored(width, height, obstacles, config);
}

const HUD_REGIONS = new Set(['BattleHudScreen_div_1', 'TopBar', 'ProgressBars', 'FortressBarsPlate',
    'TigerTallyRoot', 'SidePanelRoot', 'ActionCommandRoot', 'BattleHudScreen_div_122',
    'BattleHudScreen_button_1', 'DeployRoot', 'DeployPanelRoot', 'SummaryBand', 'WisdomColumn']);
/** 保護場上所有可見標籤（含 TileBuff_ 的生命加成）；透明全畫布與裁切外文字不算整片遮擋。 */
export function battleCoachIsObstacle(name: string, r: CoachRect, width: number, height: number, isLabel = false): boolean {
    if (r.width >= width * 0.98 && r.height >= height * 0.98) return false;
    return HUD_REGIONS.has(name) || (isLabel && r.x < width && r.x + r.width > 0 && r.y < height && r.y + r.height > 0);
}
