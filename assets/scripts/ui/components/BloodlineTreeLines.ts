// @spec-source → 血統樹14人UI規格書 §2.3 連線機制、§4.2 視覺語言（連線依因子色）；WBS BUI-04 cc 接線；PROG-2-1353
/**
 * BloodlineTreeLines — 血統樹的樣式載入與父子連線重畫（共用 cc 模組，不綁定特定畫面）。
 *
 * - loadBloodlineTreeSkin()：載入 bloodline-tree-default 樣式，供建構版型時使用。
 * - redrawBloodlineTreeConnections(root, cards, childColorOf)：依卡片節點的實際位置重畫父子連線。
 *   卡片以 NodeCard_G{排}_{序號} 名稱在 root 底下尋找（名稱全樹唯一），子代取 TargetPortrait 的位置，
 *   座標換算到 LineGraphics 的本地座標。缺少任一必要節點時回傳 false，不拋例外。
 *
 * 命頁或其他畫面只要持有版型建出的根節點，呼叫這兩個函式即可，不依賴任何特定的畫面元件。
 *
 * Unity 對照：像一個共用的 Utility 靜態類，輸入一棵已生成的 Prefab 子樹，依節點名稱找到卡片與連線物件，
 * 再用 LineRenderer 的兩端 Transform 重畫線段。
 */
import { Graphics, Node, UITransform } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { UIBloodlineConnections } from './UIBloodlineConnections';
import { bindTreeCards } from '../../core/systems/BloodlineTreeBinding';
import { factorConnectionEdges, type ConnectionNode, type Point } from '../../core/systems/BloodlineConnections';
import type { NodeCardView } from '../../core/systems/BloodlineNodeCards';
import type { FactorColor } from '../../core/systems/FactorInheritance';
import type { PedigreeSlot } from '../../core/services/BloodlineGraph';

export const BLOODLINE_TREE_SKIN_ID = 'bloodline-tree-default';
const LINE_NODE_NAME = 'LineGraphics';
/** 子代（空字串位置）的節點，即目標人物頭像。 */
const CHILD_NODE_NAME = 'TargetPortrait';

/** 載入血統樹樣式；建構版型（buildScreen）時傳入。 */
export function loadBloodlineTreeSkin() {
    return services().specLoader.loadSkin(BLOODLINE_TREE_SKIN_ID);
}

/**
 * 依卡片實際位置重畫父子連線（需先把卡片文字填好）。
 * @returns 連線已重畫回 true；缺 LineGraphics、TargetPortrait 或 LineGraphics 沒有 UITransform 時回 false。
 */
export function redrawBloodlineTreeConnections(
    root: Node,
    cards: readonly NodeCardView[],
    childColorOf: (child: PedigreeSlot) => FactorColor | null,
): boolean {
    const lineNode = findChildByName(root, LINE_NODE_NAME);
    const lineTransform = lineNode?.getComponent(UITransform);
    const child = findChildByName(root, CHILD_NODE_NAME);
    if (!lineNode || !lineTransform || !child) return false;
    if (!lineNode.getComponent(Graphics)) lineNode.addComponent(Graphics);
    const lines = lineNode.getComponent(UIBloodlineConnections) ?? lineNode.addComponent(UIBloodlineConnections);

    const toLine = (node: Node): Point => {
        const local = lineTransform.convertToNodeSpaceAR(node.worldPosition);
        return { x: local.x, y: local.y };
    };
    const positions: Partial<Record<ConnectionNode, Point>> = { '': toLine(child) };
    for (const target of bindTreeCards(cards)) {
        const cardNode = findChildByName(root, target.nodeName);
        if (cardNode) positions[target.card.slot] = toLine(cardNode);
    }

    lines.drawFactorConnections(factorConnectionEdges(positions, childColorOf));
    return true;
}

function findChildByName(root: Node, name: string): Node | null {
    for (const child of root.children) {
        if (child.name === name) return child;
        const found = findChildByName(child, name);
        if (found) return found;
    }
    return null;
}
