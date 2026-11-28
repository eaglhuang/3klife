// @spec-source → QSOC-01 第 9.5 節（首訪任務進度提示）；PROG-2-10229
/**
 * StreetFirstVisitHud — 市井大街首訪任務的最小畫面掛點
 *
 *  - 右上「已找到 n/3」進度文字（只在尋找中顯示）；
 *  - 完成提示一行字（顯示數秒後自動隱藏）；
 *  - 帶路演出：家臣節點沿各站座標線性位移（tick 由呼叫端每幀餵 dt，不做逐幀動畫）。
 * 文字全走 i18n（t 由外部注入）；位置用錨點＋相對偏移，不寫死螢幕尺寸。
 */
import { Color, Node, Vec3 } from 'cc';
import type { StreetFirstVisit, StreetFirstVisitConfig } from '../StreetFirstVisit';
import { DEFAULT_STREET_FIRST_VISIT_CONFIG, escortProgress } from '../StreetFirstVisit';
import { makeLabel, newUiNode } from './LifeUiKit';
import type { Translate } from './LifePanelView';

const TOAST_SECONDS = 3;

export class StreetFirstVisitHud {
    private readonly _progress;
    private readonly _toast;
    private _toastLeft = 0;
    private _escortNode: Node | null = null;
    private _escortPoints: Vec3[] = [];
    private _escortElapsed = 0;
    private _onEscortDone: (() => void) | null = null;

    public constructor(
        parent: Node,
        private readonly _visit: StreetFirstVisit,
        private readonly _t: Translate,
        private readonly _config: StreetFirstVisitConfig = DEFAULT_STREET_FIRST_VISIT_CONFIG,
    ) {
        const root = newUiNode('StreetFirstVisitHud', parent);
        this._progress = makeLabel(root, 'Progress', 24, new Color(255, 240, 200, 255), 'right');
        this._toast = makeLabel(root, 'Toast', 28, new Color(255, 224, 140, 255), 'center');
        this._progress.node.active = false;
        this._toast.node.active = false;
    }

    /** 版面變動時由呼叫端給右上角與畫面中上方的座標（錨點由呼叫端依螢幕算） */
    public place(progressPos: Vec3, toastPos: Vec3): void {
        this._progress.node.setPosition(progressPos);
        this._toast.node.setPosition(toastPos);
    }

    /** 進度文字與可見性依任務狀態刷新（找到一位就呼叫一次） */
    public refresh(): void {
        const searching = this._visit.phase === 'searching';
        this._progress.node.active = searching;
        if (searching) {
            const p = this._visit.progressText();
            this._progress.string = this._t(p.key, ...p.args);
        }
    }

    /** 完成提示：顯示 TOAST_SECONDS 秒 */
    public showComplete(): void {
        this._toast.string = this._t(this._config.i18n.complete);
        this._toast.node.active = true;
        this._toastLeft = TOAST_SECONDS;
        this.refresh();
    }

    /** 開始帶路：guide 沿 points（對應 config.escort.stops 的各站座標）移動，走完呼叫 onDone */
    public startEscort(guide: Node, points: Vec3[], onDone: () => void): void {
        this._escortNode = guide;
        this._escortPoints = points;
        this._escortElapsed = 0;
        this._onEscortDone = onDone;
        if (points.length > 0) guide.setPosition(points[0]);
    }

    public tick(dt: number): void {
        if (this._toastLeft > 0) {
            this._toastLeft -= dt;
            if (this._toastLeft <= 0) this._toast.node.active = false;
        }
        const guide = this._escortNode;
        if (!guide) return;
        this._escortElapsed += dt;
        const e = escortProgress(this._escortElapsed, this._config);
        const pts = this._escortPoints;
        if (pts.length > 0) {
            const a = pts[Math.min(e.stopIndex, pts.length - 1)];
            const b = pts[Math.min(e.stopIndex + 1, pts.length - 1)];
            guide.setPosition(a.x + (b.x - a.x) * e.t, a.y + (b.y - a.y) * e.t, a.z);
        }
        if (e.finished) {
            this._escortNode = null;
            const done = this._onEscortDone;
            this._onEscortDone = null;
            if (done) done();
        }
    }
}
