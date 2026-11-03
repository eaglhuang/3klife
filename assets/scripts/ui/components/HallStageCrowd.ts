// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（原地 Idle、頭頂姓名與官職）；UI-2-0137（UI-2-0123 子項）
/**
 * HallStageCrowd — 幕府大廳 Q 版武將的畫面元件（薄殼）。
 *
 * 誰在場由 HallCharacterPresenter 決定、站哪由 HallStagePlanner 決定、節點姿態由 HallStageCrowdPose 換算，
 * 這裡只負責建節點、依候選路徑載圖（Q 版失敗就退頭像）、套姿態與播 idle / 標記擺動。
 *
 * 節點結構（掛在大廳畫布下、中心錨點的容器）：
 *   每位武將一組：body（Sprite，錨點腳底中心）、tag（名牌 Label）、mark（「!」Label，可無）
 *   依 placements 的順序加入，後排先加、前排後加，自然形成前後遮擋。
 *
 * Unity 對照：像一個 Spawner，把 spawn 資料逐筆 Instantiate 成 SpriteRenderer＋名牌，動畫用 DOTween 迴圈。
 */
import { _decorator, Color, Component, Label, Node, Sprite, SpriteFrame, Tween, tween, UITransform, Vec3 } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import type { HallStagePlacement } from '../../core/systems/HallStagePlanner';
import { HallStageDecor, hallStageCrowdPose } from '../../core/systems/HallStageCrowdPose';

const { ccclass } = _decorator;

const CONTENT_TAG = 'lobby-hall-crowd';
const TAG_COLOR = new Color(255, 233, 176, 255);
const MARK_COLOR = new Color(255, 224, 136, 255);

@ccclass('HallStageCrowd')
export class HallStageCrowd extends Component {
    private _decor: HallStageDecor | null = null;
    private _showToken = 0;

    public configure(decor: HallStageDecor): void {
        this._decor = decor;
    }

    /** 依站位重建全部武將；再次呼叫會先清掉上一批（含進行中的載入結果）。 */
    public show(placements: readonly HallStagePlacement[]): void {
        this.clear();
        const token = ++this._showToken;
        placements.forEach((placement, index) => {
            void this._spawn(placement, index, token);
        });
    }

    public clear(): void {
        this._showToken++;
        for (const child of [...this.node.children]) {
            Tween.stopAllByTarget(child);
            child.destroy();
        }
    }

    protected onDestroy(): void {
        this.clear();
    }

    private async _spawn(placement: HallStagePlacement, index: number, token: number): Promise<void> {
        const decor = this._decor;
        if (!decor) return;

        const body = new Node(`crowd-${placement.generalId}`);
        body.layer = this.node.layer;
        body.addComponent(UITransform).setAnchorPoint(0.5, 0);
        const sprite = body.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.RAW;
        this.node.addChild(body);

        const tag = this._makeLabel(`tag-${placement.generalId}`, placement.title ? `${placement.title}・${placement.name}` : placement.name, 18, TAG_COLOR);
        const mark = placement.hasTaskMark ? this._makeLabel(`mark-${placement.generalId}`, '!', 30, MARK_COLOR) : null;

        const frame = await this._loadFirst(placement.spriteCandidates);
        if (token !== this._showToken || !body.isValid) return;
        if (frame) sprite.spriteFrame = frame;

        const pose = hallStageCrowdPose(placement, frame ? frame.originalSize.height : placement.height, decor, index);
        body.setPosition(pose.body.x, pose.body.y, 0);
        body.setScale(pose.body.scaleX, pose.body.scaleY, 1);
        tag.setPosition(pose.tag.x, pose.tag.y, 0);
        if (mark) mark.setPosition(pose.mark.x, pose.mark.y, 0);

        this._playIdle(body, pose.body.scaleX, pose.body.scaleY, pose.idleDelaySec, decor);
        if (mark) this._playBob(mark, decor);
    }

    private _makeLabel(name: string, text: string, fontSize: number, color: Color): Node {
        const node = new Node(name);
        node.layer = this.node.layer;
        node.addComponent(UITransform);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.isBold = true;
        label.color = color;
        this.node.addChild(node);
        return node;
    }

    private async _loadFirst(paths: readonly string[]): Promise<SpriteFrame | null> {
        for (const path of paths) {
            const frame = await services().resource.loadSpriteFrame(path, {
                tags: [CONTENT_TAG],
                preferTextureFallback: true,
            }).catch(() => null);
            if (frame) return frame;
        }
        return null;
    }

    private _playIdle(body: Node, scaleX: number, scaleY: number, delaySec: number, decor: HallStageDecor): void {
        const base = body.position.clone();
        const half = decor.idle.periodSec / 2;
        const up = new Vec3(base.x, base.y + decor.idle.risePx, 0);
        const stretched = new Vec3(scaleX, scaleY * (1 + decor.idle.stretchY), 1);
        const rest = new Vec3(scaleX, scaleY, 1);
        tween(body)
            .delay(delaySec)
            .call(() => {
                tween(body)
                    .to(half, { position: up, scale: stretched }, { easing: 'sineInOut' })
                    .to(half, { position: base, scale: rest }, { easing: 'sineInOut' })
                    .union()
                    .repeatForever()
                    .start();
            })
            .start();
    }

    private _playBob(mark: Node, decor: HallStageDecor): void {
        const base = mark.position.clone();
        const half = decor.markBob.periodSec / 2;
        tween(mark)
            .to(half, { position: new Vec3(base.x, base.y + decor.markBob.risePx, 0) }, { easing: 'sineInOut' })
            .to(half, { position: base }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }
}
