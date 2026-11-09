// @spec-source → 家族血統關係圖鑑節點與視覺佈局規格書 (doc_spec_0330) §1~§3（KIN-07，PROG-2-2123）
/**
 * RelationGraphRenderer — 關係圖鑑的擺位、畫線與頭像（cc 端）。
 *
 * 文字與顯示隱藏由 applyFlowView 處理，這裡只做 JSON 表達不了的動態部分：
 * 節點座標、Graphics 連線、頭像載入，以及重新置中的 0.4 秒補間。
 *
 * Unity 對照：像掛在 Canvas 上的 View，依 Presenter 的資料擺 RectTransform 與 LineRenderer。
 */
import { Color, Graphics, Node, Sprite, tween, Tween, UITransform, Vec3 } from 'cc';
import { RECENTER_TWEEN_SEC } from '../../core/systems/RelationGraphStyle';
import { offsetRelationEdge, relationEdgeOffset, relationEdgeSegments, type RelationPoint } from '../../core/systems/RelationGraphView';
import { loadGeneralAvatar } from './GeneralAvatarLoader';
import type { UITemplateBinder } from './UITemplateBinder';
import { RELATION_GRAPH_SLOTS, type RelationGraphController } from './RelationGraphController';

const ORIGIN: RelationPoint = { x: 0, y: 0 };
const EDGE_LAYER_NAME = 'RelationEdgeLayer';

export class RelationGraphRenderer {
    private _avatarSeq = 0;

    constructor(private readonly _binder: UITemplateBinder) {}

    /** animate：重新置中時節點從中央展開，連線等節點就位才畫。 */
    public render(controller: RelationGraphController, animate: boolean): void {
        const graphics = this._edgeGraphics();
        graphics?.clear();
        this._placeNodes(controller, animate, () => { if (graphics) this._drawEdges(graphics, controller); });
        this._placePeek(controller);
        this._loadAvatars(controller);
    }

    /** 只有簡卡變動時用，不重排節點。 */
    public renderPeek(controller: RelationGraphController): void {
        this._placePeek(controller);
    }

    private _edgeGraphics(): Graphics | null {
        const stage = this._binder.getNode('relationStage');
        if (!stage) return null;
        let layer = stage.getChildByName(EDGE_LAYER_NAME);
        if (!layer) {
            layer = new Node(EDGE_LAYER_NAME);
            layer.layer = stage.layer;
            layer.addComponent(UITransform);
            // 放最底層，線才不會蓋住頭像
            stage.insertChild(layer, 0);
        }
        return layer.getComponent(Graphics) ?? layer.addComponent(Graphics);
    }

    private _placeNodes(controller: RelationGraphController, animate: boolean, onPlaced: () => void): void {
        const moving: Array<{ node: Node; target: Vec3 }> = [];
        for (let i = 0; i < RELATION_GRAPH_SLOTS; i += 1) {
            const node = this._binder.getNode(`relationNode${i}`);
            const view = controller.nodes[i];
            if (!node) continue;
            Tween.stopAllByTarget(node);
            if (view) moving.push({ node, target: new Vec3(view.x, -view.y, 0) });
        }
        if (!animate || moving.length === 0) {
            for (const { node, target } of moving) node.setPosition(target);
            onPlaced();
            return;
        }
        moving.forEach(({ node, target }, i) => {
            node.setPosition(0, 0, 0);
            const move = tween(node).to(RECENTER_TWEEN_SEC, { position: target }, { easing: 'quadOut' });
            (i === moving.length - 1 ? move.call(onPlaced) : move).start();
        });
    }

    private _placePeek(controller: RelationGraphController): void {
        const peek = this._binder.getNode('relationPeek');
        const position = controller.peekPosition();
        if (peek && position) peek.setPosition(position.x, -position.y, 0);
    }

    private _drawEdges(graphics: Graphics, controller: RelationGraphController): void {
        graphics.clear();
        for (const view of controller.nodes) {
            const to: RelationPoint = { x: view.x, y: -view.y };
            view.styles.forEach((style, i) => {
                const line = offsetRelationEdge(ORIGIN, to, relationEdgeOffset(i, view.styles.length));
                const color = new Color(style.color);
                color.a = Math.round(style.alpha * 255);
                graphics.lineWidth = style.width;
                graphics.strokeColor = color;
                for (const segment of relationEdgeSegments(line.from, line.to, style.line)) {
                    graphics.moveTo(segment.from.x, segment.from.y);
                    graphics.lineTo(segment.to.x, segment.to.y);
                }
                graphics.stroke();
            });
        }
    }

    private _loadAvatars(controller: RelationGraphController): void {
        this._avatarSeq += 1;
        const seq = this._avatarSeq;
        const apply = (spriteId: string, generalId: string): void => {
            const sprite = this._binder.getSprite(spriteId);
            if (!sprite) return;
            sprite.spriteFrame = null;
            void loadGeneralAvatar(generalId).then((frame) => {
                if (!frame || seq !== this._avatarSeq || !sprite.isValid) return;
                sprite.trim = false;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.color = Color.WHITE;
                sprite.spriteFrame = frame;
            });
        };
        if (controller.centerId) apply('relationCenterAvatar', controller.centerId);
        controller.nodes.forEach((view, i) => apply(`relationNodeAvatar${i}`, view.id));
    }
}
