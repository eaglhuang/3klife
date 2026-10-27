// @spec-source → 血統樹14人UI規格書 §1、§2、§4.2（版型 bloodline-tree-main.json、連線依因子色）；WBS BUI-01 宿主接線、BUI-04 cc 接線；PROG-2-1215、PROG-2-1353
/**
 * BloodlineTreeScreen — 14 人版血統樹畫面（cc 元件）。
 *
 * - build()：自行載入 bloodline-tree-main 版型、bloodline-tree-default 樣式、語系與設計 token，建出節點樹。
 * - renderCards(cards)：依 BloodlineTreeBinding 的命名把 14 張卡配到 NodeCard_G{世代}_{序號}，填入卡片文字。
 * - renderConnections(cards, childColorOf)：依卡片實際位置重畫父子連線，顏色依子代因子色（null 為中性灰）。
 *
 * 與既有的 BloodlineTreePanel（FatherTree／MotherTree，G1_i/Txt 命名）互不影響。
 *
 * Unity 對照：像一個自己會載入 Prefab 的 Controller，Prefab 結構固定，腳本依節點名稱把資料填進去；
 * 連線像 LineRenderer，端點取自兩個卡片 Transform 換算到同一座標系後重畫。
 */
import { _decorator, Graphics, Label, Node, UITransform } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { UIPreviewBuilder } from '../core/UIPreviewBuilder';
import { UIBloodlineConnections } from '../components/UIBloodlineConnections';
import { bindTreeCards, treeCardText } from '../../core/systems/BloodlineTreeBinding';
import { factorConnectionEdges, type ConnectionNode, type Point } from '../../core/systems/BloodlineConnections';
import type { NodeCardView } from '../../core/systems/BloodlineNodeCards';
import type { FactorColor } from '../../core/systems/FactorInheritance';
import type { PedigreeSlot } from '../../core/services/BloodlineGraph';

const { ccclass } = _decorator;

const LAYOUT_ID = 'bloodline-tree-main';
const SKIN_ID = 'bloodline-tree-default';
const LINE_NODE_NAME = 'LineGraphics';
/** 子代（空字串位置）的節點，即目標人物頭像。 */
const CHILD_NODE_NAME = 'TargetPortrait';

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

    /** 首次呼叫時載入版型與樣式並建出節點樹；之後呼叫不重建。 */
    async build(): Promise<void> {
        if (this._isBuilt) return;
        const layout = await this._specLoader.loadLayout(LAYOUT_ID);
        const skin = await this._specLoader.loadSkin(SKIN_ID);
        const i18n = await this._specLoader.loadI18n(services().i18n.currentLocale);
        const tokens = await this._specLoader.loadDesignTokens();
        await this.buildScreen(layout, skin, i18n, tokens);
        this._isBuilt = true;
    }

    /** 把 14 張卡填入對應節點；找不到節點的卡略過，不拋例外。 */
    renderCards(cards: readonly NodeCardView[]): void {
        for (const target of bindTreeCards(cards)) {
            const cardNode = this._findCardNode(target.card.row, target.nodeName);
            if (!cardNode) continue;
            const label = cardNode.getComponent(Label) ?? cardNode.addComponent(Label);
            label.string = treeCardText(target.card);
        }
    }

    /**
     * 依卡片實際位置重畫父子連線（需先 renderCards）。
     * 位置換算到 LineGraphics 的本地座標；缺少 LineGraphics 或卡片節點時靜默略過。
     */
    renderConnections(cards: readonly NodeCardView[], childColorOf: (child: PedigreeSlot) => FactorColor | null): void {
        const lineNode = this._findChildByName(this.node, LINE_NODE_NAME);
        const lineTransform = lineNode?.getComponent(UITransform);
        if (!lineNode || !lineTransform) return;
        if (!lineNode.getComponent(Graphics)) lineNode.addComponent(Graphics);
        const lines = lineNode.getComponent(UIBloodlineConnections) ?? lineNode.addComponent(UIBloodlineConnections);

        const toLine = (node: Node): Point => {
            const local = lineTransform.convertToNodeSpaceAR(node.worldPosition);
            return { x: local.x, y: local.y };
        };
        const positions: Partial<Record<ConnectionNode, Point>> = {};
        for (const target of bindTreeCards(cards)) {
            const cardNode = this._findCardNode(target.card.row, target.nodeName);
            if (cardNode) positions[target.card.slot] = toLine(cardNode);
        }
        const child = this._findChildByName(this.node, CHILD_NODE_NAME);
        if (child) positions[''] = toLine(child);

        lines.drawFactorConnections(factorConnectionEdges(positions, childColorOf));
    }

    private _findCardNode(row: 1 | 2 | 3, nodeName: string): Node | null {
        const container = this._findChildByName(this.node, CONTAINER_BY_ROW[row]);
        return container ? this._findChildByName(container, nodeName) : null;
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
