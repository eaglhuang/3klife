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
import type { HallCrowdReaction } from '../../core/systems/HallCrowdReaction';

const { ccclass } = _decorator;

const CONTENT_TAG = 'lobby-hall-crowd';
const TAG_COLOR = new Color(255, 233, 176, 255);
const MARK_COLOR = new Color(255, 224, 136, 255);

@ccclass('HallStageCrowd')
export class HallStageCrowd extends Component {
    private _decor: HallStageDecor | null = null;
    private _showToken = 0;
    /** 每位在場武將頭頂的位置（集體反應用）；clear 時清空 */
    private readonly _headPositions = new Map<string, Vec3>();

    /** 名牌顯示開關：大廳上層展開子選單時暫藏，避免選單壓住名牌（#2148-3） */
    private _tagsVisible = true;

    public setTagsVisible(visible: boolean): void {
        this._tagsVisible = visible;
        for (const child of this.node.children) if (child.name.startsWith('tag-')) child.active = visible;
    }

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

    /** 集體反應（大廳 §E-5，PROG-2-1740）：在場每位武將頭上短暫跳出字，時間到自動移除；人群為空時不動 */
    public react(reaction: Readonly<HallCrowdReaction>): void {
        let index = 0;
        for (const [generalId, head] of this._headPositions) {
            const node = this._makeLabel(`react-${generalId}`, reaction.text, 34, MARK_COLOR);
            node.setPosition(head.x, head.y, 0);
            node.setScale(0.2, 0.2, 1);
            tween(node)
                .delay(index * 0.05)
                .to(0.18, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'backOut' })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .delay(Math.max(0, reaction.durationSec - 0.28))
                .call(() => { if (node.isValid) node.destroy(); })
                .start();
            index++;
        }
    }

    public clear(): void {
        this._showToken++;
        this._headPositions.clear();
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

        const frame = await this._loadFirst(placement.spriteCandidates);
        if (token !== this._showToken || !body.isValid) return;
        if (frame) {
            sprite.spriteFrame = frame;
            const origW = frame.originalSize.width;
            const origH = frame.originalSize.height;
            const targetH = placement.height;
            // 3Q 小人最大寬度約束在 140px，防止橫向穿模與過度膨脹
            const targetW = Math.min(origW * (targetH / Math.max(1, origH)), 140);
            body.getComponent(UITransform)!.setContentSize(targetW, targetH);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }

        // 名牌等小人載完、站位算好才建立（#2107-3）：先建會停在原點，載入慢時幾張名牌疊在畫面中間
        const tag = this._makeLabel(`tag-${placement.generalId}`, placement.title ? `${placement.title}・${placement.name}` : placement.name, 16, TAG_COLOR);
        const mark = placement.hasTaskMark ? this._makeLabel(`mark-${placement.generalId}`, '!', 30, MARK_COLOR) : null;
        const pose = hallStageCrowdPose(placement, placement.height, decor, index);
        body.setPosition(pose.body.x, pose.body.y, 0);
        body.setScale(pose.body.scaleX, pose.body.scaleY, 1);
        tag.setPosition(pose.tag.x, pose.tag.y, 0);
        tag.active = this._tagsVisible;
        if (mark) mark.setPosition(pose.mark.x, pose.mark.y, 0);
        this._headPositions.set(placement.generalId, new Vec3(pose.mark.x, pose.mark.y, 0));

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
