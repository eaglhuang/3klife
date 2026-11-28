// @spec-source → QSOC-01 第 9.5 節（首訪任務進度提示）；PROG-2-10229、PROG-2-10256
/**
 * StreetFirstVisitHud — 市井大街首訪任務的最小畫面掛點
 *
 *  - 右上「已找到 n/3」進度文字（只在尋找中顯示），下面一行「要找：某某、某某」；
 *  - 中上方提示字：排隊顯示（每句 TOAST_SECONDS 秒），帶路台詞、找到台詞、完成與送禮解鎖都走這裡；
 *  - 帶路演出：家臣節點沿各站座標線性位移（tick 由呼叫端每幀餵 dt，不做逐幀動畫）。
 * 文字全走 i18n（t 由外部注入）；位置用畫面比例（layout 傳入目前畫面寬高），不寫死螢幕尺寸。
 */
import { Color, Node, Vec3 } from 'cc';
import type { StreetFirstVisit, StreetFirstVisitConfig } from '../StreetFirstVisit';
import { DEFAULT_STREET_FIRST_VISIT_CONFIG, escortProgress } from '../StreetFirstVisit';
import { fitLabel, makeBox, makeLabel, newUiNode, placeBox } from './LifeUiKit';
import type { Translate } from './LifePanelView';

const TOAST_SECONDS = 3;

export class StreetFirstVisitHud {
    private readonly _root: Node;
    private readonly _progress;
    private readonly _targets;
    private readonly _toast;
    private readonly _toastBack: Node;
    private readonly _queue: string[] = [];
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
        this._root = newUiNode('StreetFirstVisitHud', parent);
        this._progress = makeLabel(this._root, 'Progress', 30, new Color(255, 240, 200, 255), 'right');
        this._targets = makeLabel(this._root, 'Targets', 22, new Color(235, 225, 200, 255), 'right');
        this._toastBack = makeBox(this._root, 'ToastBack', new Color(30, 24, 16, 215));
        this._toast = makeLabel(this._toastBack, 'Toast', 30, new Color(255, 224, 140, 255), 'center');
        this._progress.node.active = false;
        this._targets.node.active = false;
        this._toastBack.active = false;
    }

    /** 版面變動時呼叫（以畫面中心為原點、寬高 w×h）：進度放右上、提示字放中上 */
    public layout(w: number, h: number): void {
        const pw = Math.min(w * 0.3, 420);
        const x = w / 2 - w * 0.02 - pw;
        placeBox(this._progress.node, x, h / 2 - h * 0.2, pw, 40);
        fitLabel(this._progress, pw, 40, 4);
        placeBox(this._targets.node, x, h / 2 - h * 0.2 - 34, pw, 30);
        fitLabel(this._targets, pw, 30, 4);
        const tw = Math.min(w * 0.7, 1100);
        const th = Math.max(56, h * 0.07);
        placeBox(this._toastBack, -tw / 2, h / 2 - h * 0.16, tw, th);
        placeBox(this._toast.node, 0, 0, tw, th);
        fitLabel(this._toast, tw, th, 16);
    }

    /** 進度文字與可見性依任務狀態刷新（找到一位就呼叫一次）；nameOf＝目標 id → 顯示名 */
    public refresh(nameOf: (id: string) => string = (id) => id): void {
        const searching = this._visit.phase === 'searching';
        this._progress.node.active = searching;
        this._targets.node.active = searching;
        if (!searching) return;
        const p = this._visit.progressText();
        this._progress.string = this._t(p.key, ...p.args);
        const s = this._visit.state;
        const left = s.targetIds.filter((id) => !s.foundIds.includes(id)).map(nameOf);
        this._targets.string = left.length > 0 ? this._t(this._config.i18n.targets, left.join('、')) : '';
    }

    /** 排隊顯示一句提示字（每句 TOAST_SECONDS 秒） */
    public showLine(text: string): void {
        this._queue.push(text);
        if (this._toastLeft <= 0) this._nextLine();
    }

    /** 完成提示（同時收起進度） */
    public showComplete(): void {
        this.showLine(this._t(this._config.i18n.complete));
        this._progress.node.active = false;
        this._targets.node.active = false;
    }

    /** 目前正在顯示的提示字（驗收用）；沒有回空字串 */
    public get toastText(): string { return this._toastBack.active ? this._toast.string : ''; }

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
            if (this._toastLeft <= 0) this._nextLine();
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

    private _nextLine(): void {
        const next = this._queue.shift();
        if (next === undefined) {
            this._toastBack.active = false;
            this._toastLeft = 0;
            return;
        }
        this._toast.string = next;
        this._toastBack.active = true;
        this._toastLeft = TOAST_SECONDS;
    }
}
