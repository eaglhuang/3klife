// @spec-source: docs/cross-reference-index.md
import { _decorator, Camera, Component, Node } from 'cc';

const { ccclass } = _decorator;

/**
 * UnderlayOcclusion — 全螢幕畫面打開時，停用它底下的畫面（PROG-2-9802）。
 *
 * 量測：人物介紹頁打開時，大廳主畫面、城池、季節 HUD 等六個底層 host 仍啟用，
 * 底下整套大廳每幀照樣組批次（人物頁 draw call 348，大廳單獨約 190），
 * 而且大廳文字會從人物頁背景（半透明修飾層）淡淡透出來。
 *
 * 做法：蓋板節點啟用時，把同一父節點下「排在它下面、目前啟用」的兄弟節點先停用並記住；
 * 蓋板停用或銷毀時只還原「這次由我們停用」的節點。純 active 切換，節點樹不動，
 * 大廳其他流程本來就會對這些 host 做 active 切換（停放、換畫面），onEnable／onDisable 都是既有路徑。
 */

/** 這些節點是場景共用底層（背景、彈窗遮罩、副標），不屬於「畫面」，不停用 */
export const OCCLUSION_KEEP_NAMES: ReadonlyArray<string> = ['Background', '__ui-backdrop', 'SubLabel'];

export interface OcclusionTarget {
    readonly name: string;
    active: boolean;
    readonly isValid?: boolean;
}

/**
 * 從依兄弟順序排列的節點清單中，挑出蓋板（coverIndex）底下、啟用中、且不是共用底層的節點。
 * isBase 回傳 true 的（例如攝影機）一律略過。
 */
export function pickOccludable<T extends OcclusionTarget>(
    siblings: ReadonlyArray<T>,
    coverIndex: number,
    isBase: (node: T) => boolean = () => false,
    keepNames: ReadonlyArray<string> = OCCLUSION_KEEP_NAMES,
): T[] {
    const picked: T[] = [];
    for (let i = 0; i < coverIndex && i < siblings.length; i++) {
        const node = siblings[i];
        if (!node.active || keepNames.includes(node.name) || isBase(node)) continue;
        picked.push(node);
    }
    return picked;
}

export class UnderlayOcclusionState {
    private _hidden: OcclusionTarget[] = [];

    get hiddenCount(): number { return this._hidden.length; }

    /** 停用 targets；已經在遮蔽中就不重複記錄 */
    hide(targets: ReadonlyArray<OcclusionTarget>): void {
        if (this._hidden.length > 0) return;
        for (const node of targets) {
            node.active = false;
            this._hidden.push(node);
        }
    }

    /** 還原這次停用的節點（已銷毀的略過、已被別人重新啟用的不動） */
    restore(): void {
        const hidden = this._hidden;
        this._hidden = [];
        for (const node of hidden) {
            if (node.isValid === false) continue;
            if (!node.active) node.active = true;
        }
    }
}

@ccclass('UnderlayOcclusion')
export class UnderlayOcclusion extends Component {
    private readonly _state = new UnderlayOcclusionState();

    onEnable(): void {
        const parent = this.node.parent;
        if (!parent) return;
        const siblings = parent.children;
        const coverIndex = siblings.indexOf(this.node);
        if (coverIndex <= 0) return;
        this._state.hide(pickOccludable(siblings, coverIndex, node => !!node.getComponent(Camera) || !!node.getComponentInChildren(Camera)));
    }

    onDisable(): void {
        this._state.restore();
    }

    onDestroy(): void {
        this._state.restore();
    }
}

/** 掛上（已掛則忽略）；由會建立全螢幕畫面的建構流程呼叫 */
export function enableUnderlayOcclusion(node: Node): void {
    if (!node.getComponent(UnderlayOcclusion)) node.addComponent(UnderlayOcclusion);
}
