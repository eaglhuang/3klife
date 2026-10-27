// @spec-source → 血統樹14人UI規格書 §1、§2（版型 bloodline-tree-main.json）；WBS BUI-01 宿主接線；PROG-2-1215
/**
 * BloodlineTreeScreen — 14 人版血統樹畫面（cc 元件）。
 *
 * - build()：自行載入 bloodline-tree-main 版型、語系與設計 token，建出節點樹。
 * - renderCards(cards)：依 BloodlineTreeBinding 的命名把 14 張卡配到 NodeCard_G{世代}_{序號}，填入卡片文字。
 *
 * 版型與命名以 bloodline-tree-main.json 為準；血統樹專用 skin 尚未建立，暫以 null skin 建構。
 * 與既有的 BloodlineTreePanel（FatherTree／MotherTree，G1_i/Txt 命名）互不影響。
 *
 * Unity 對照：像一個自己會載入 Prefab 的 Controller，Prefab 結構固定，腳本依節點名稱把資料填進去。
 */
import { _decorator, Label, Node } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { UIPreviewBuilder } from '../core/UIPreviewBuilder';
import { bindTreeCards, treeCardText } from '../../core/systems/BloodlineTreeBinding';
import type { NodeCardView } from '../../core/systems/BloodlineNodeCards';

const { ccclass } = _decorator;

const LAYOUT_ID = 'bloodline-tree-main';

/** 世代排數對應的容器節點名稱（與 bloodline-tree-main.json 一致）。 */
const CONTAINER_BY_ROW: Readonly<Record<1 | 2 | 3, string>> = {
    1: 'Gen1Container',
    2: 'Gen2Container',
    3: 'Gen3Container',
};

@ccclass('BloodlineTreeScreen')
export class BloodlineTreeScreen extends UIPreviewBuilder {

    private _isBuilt = false;

    private get _specLoader() { return services().specLoader; }

    /** 首次呼叫時載入版型並建出節點樹；之後呼叫不重建。 */
    async build(): Promise<void> {
        if (this._isBuilt) return;
        const layout = await this._specLoader.loadLayout(LAYOUT_ID);
        const i18n = await this._specLoader.loadI18n(services().i18n.currentLocale);
        const tokens = await this._specLoader.loadDesignTokens();
        await this.buildScreen(layout, null, i18n, tokens);
        this._isBuilt = true;
    }

    /** 把 14 張卡填入對應節點；找不到節點的卡略過，不拋例外。 */
    renderCards(cards: readonly NodeCardView[]): void {
        for (const target of bindTreeCards(cards)) {
            const row = target.card.row;
            const container = this._findChildByName(this.node, CONTAINER_BY_ROW[row]);
            const cardNode = container ? this._findChildByName(container, target.nodeName) : null;
            if (!cardNode) continue;
            const label = cardNode.getComponent(Label) ?? cardNode.addComponent(Label);
            label.string = treeCardText(target.card);
        }
    }

    private _findChildByName(root: Node, name: string): Node | null {
        for (const child of root.children) {
            if (child.name === name) return child;
            const found = this._findChildByName(child, name);
            if (found) return found;
        }
        return null;
    }
}
