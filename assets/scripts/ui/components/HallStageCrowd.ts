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
import { _decorator, Color, Component, Label, Node, resources, Sprite, SpriteFrame, sp, Tween, tween, UITransform, Vec3 } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import type { HallStagePlacement } from '../../core/systems/HallStagePlanner';
import { HallStageDecor, hallStageCrowdPose } from '../../core/systems/HallStageCrowdPose';
import type { HallCrowdReaction } from '../../core/systems/HallCrowdReaction';
import { HallWander, WANDER_ANIMS, type WanderActorState } from '../../shared/lobby/wanderCore';
import {
    CanvasSize,
    HallWanderData,
    buildWanderConfig,
    clampWanderDt,
    spinePathFor,
    wanderToStage,
} from '../../shared/lobby/wanderSupport';

const { ccclass } = _decorator;

const CONTENT_TAG = 'lobby-hall-crowd';
const TAG_COLOR = new Color(255, 233, 176, 255);
const MARK_COLOR = new Color(255, 224, 136, 255);
/** Spine 骨架高度（單位）：點擊判定框與名牌高度用，與 SpineGeneralOverlay 的 1300px 骨架一致 */
const SKELETON_BOX = { width: 420, height: 1300 };

/** 走動中的 Spine 武將（Issue #2135）：節點、骨架與最近一次的動畫／狀態 */
interface SpineActor {
    placement: HallStagePlacement;
    node: Node;
    skeleton: sp.Skeleton;
    tag: Node;
    mark: Node | null;
    anim: string;
    state: WanderActorState | null;
}

@ccclass('HallStageCrowd')
export class HallStageCrowd extends Component {
    private _decor: HallStageDecor | null = null;
    private _showToken = 0;
    /** 每位在場武將頭頂的位置（集體反應用）；clear 時清空 */
    private readonly _headPositions = new Map<string, Vec3>();
    private _wanderData: HallWanderData | null = null;
    private _canvas: CanvasSize = { width: 1920, height: 1080 };
    private _onActorTap: ((generalId: string) => void) | null = null;
    private _wander: HallWander | null = null;
    private readonly _spineActors = new Map<string, SpineActor>();

    public configure(decor: HallStageDecor): void {
        this._decor = decor;
    }

    /**
     * 啟用走動（Issue #2135）：對照表裡有 Spine 路徑的武將改播骨架並隨機走動，沒有的維持靜態小人。
     * 不呼叫或資料為 null 時整個大廳維持原本行為。onTap 在玩家點到發呆中的武將時呼叫（該武將已原地停住）。
     */
    public configureWander(data: HallWanderData | null, canvas: Readonly<CanvasSize>, onTap: (generalId: string) => void): void {
        this._wanderData = data;
        this._canvas = { width: canvas.width, height: canvas.height };
        this._onActorTap = onTap;
    }

    /** 依站位重建全部武將；再次呼叫會先清掉上一批（含進行中的載入結果）。 */
    public show(placements: readonly HallStagePlacement[]): void {
        this.clear();
        const token = ++this._showToken;
        void Promise.all(placements.map((placement, index) => this._spawn(placement, index, token))).then(() => {
            if (token === this._showToken) this._startWander();
        });
    }

    /** 對話結束後讓武將繼續走（泡泡收起時呼叫） */
    public releaseActor(generalId: string): void {
        this._wander?.unlock(generalId);
    }

    protected update(dt: number): void {
        const wander = this._wander;
        const data = this._wanderData;
        if (!wander || !data) return;
        // 從大廳停放回來時 dt 可能很大；截斷後角色從原地接著走
        const states = wander.step(clampWanderDt(dt, data.maxStepSec));
        states.forEach((state, order) => this._applyState(state, order, data));
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
        this._wander = null;
        this._spineActors.clear();
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
        if (await this._spawnSpine(placement, token, decor)) return;

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
        if (mark) mark.setPosition(pose.mark.x, pose.mark.y, 0);
        this._headPositions.set(placement.generalId, new Vec3(pose.mark.x, pose.mark.y, 0));

        this._playIdle(body, pose.body.scaleX, pose.body.scaleY, pose.idleDelaySec, decor);
        if (mark) this._playBob(mark, decor);
    }

    /**
     * 有 Spine 骨架就建走動武將並回傳 true；沒列在對照表、骨架載不到（美術只在私有倉庫）回傳 false，由呼叫端退回靜態小人。
     * 被新一輪 show 取代時回傳 true（本輪結果作廢，不再往下建靜態小人）。
     */
    private async _spawnSpine(placement: HallStagePlacement, token: number, decor: HallStageDecor): Promise<boolean> {
        const data = this._wanderData;
        const path = data ? spinePathFor(data, placement.generalId) : null;
        if (!data || !path) return false;
        const skeletonData = await new Promise<sp.SkeletonData | null>((resolve) => {
            resources.load(path, sp.SkeletonData, (err, asset) => resolve(err || !asset ? null : asset));
        });
        if (token !== this._showToken) return true;
        if (!skeletonData) return false;

        const body = new Node(`crowd-${placement.generalId}`);
        body.layer = this.node.layer;
        const transform = body.addComponent(UITransform);
        transform.setAnchorPoint(0.5, 0);
        transform.setContentSize(SKELETON_BOX.width, SKELETON_BOX.height);
        const skeleton = body.addComponent(sp.Skeleton);
        skeleton.premultipliedAlpha = false;
        skeleton.skeletonData = skeletonData;
        const anims = WANDER_ANIMS.general;
        const runtime = skeletonData.getRuntimeData();
        // 舊版骨架可能還沒有新步態；缺動作就不播，避免踩空報錯
        const hasIdle = !!runtime?.findAnimation(anims.idle);
        const hasWalk = !!runtime?.findAnimation(anims.walk);
        if (hasIdle) skeleton.setAnimation(0, anims.idle, true);
        if (hasIdle && hasWalk) {
            skeleton.setMix(anims.idle, anims.walk, data.animMix);
            skeleton.setMix(anims.walk, anims.idle, data.animMix);
        }
        this.node.addChild(body);

        const tag = this._makeLabel(`tag-${placement.generalId}`, placement.title ? `${placement.title}・${placement.name}` : placement.name, 16, TAG_COLOR);
        const mark = placement.hasTaskMark ? this._makeLabel(`mark-${placement.generalId}`, '!', 30, MARK_COLOR) : null;
        this._spineActors.set(placement.generalId, { placement, node: body, skeleton, tag, mark, anim: anims.idle, state: null });
        // 先放在站位上，走動模擬接手前不會停在原點
        const headY = placement.stageY + placement.height + decor.markAboveHeadPx;
        body.setScale(data.generalScale, data.generalScale, 1);
        body.setPosition(placement.stageX, placement.stageY, 0);
        tag.setPosition(placement.stageX, placement.stageY - decor.tagBelowFootPx, 0);
        mark?.setPosition(placement.stageX, headY, 0);
        this._headPositions.set(placement.generalId, new Vec3(placement.stageX, headY, 0));
        body.on(Node.EventType.TOUCH_END, () => this._onBodyTap(placement.generalId));
        return true;
    }

    /** 所有武將建完才起算走動；沒有任何 Spine 武將就不建模擬 */
    private _startWander(): void {
        const data = this._wanderData;
        if (!data || this._spineActors.size === 0) return;
        const roster = Array.from(this._spineActors.values()).map(a => ({ id: a.placement.generalId, stageX: a.placement.stageX, stageY: a.placement.stageY }));
        this._wander = new HallWander(buildWanderConfig(data, roster, this._canvas));
    }

    private _applyState(state: WanderActorState, order: number, data: HallWanderData): void {
        const actor = this._spineActors.get(state.id);
        const decor = this._decor;
        if (!actor || !actor.node.isValid || !decor) return;
        const stage = wanderToStage({ x: state.x, y: state.y }, this._canvas);
        const headY = stage.y + actor.placement.height + decor.markAboveHeadPx;
        actor.state = state;
        actor.node.setPosition(stage.x, stage.y, 0);
        // 往哪邊走就翻哪邊：scaleX 正負，不另做鏡像動畫
        actor.node.setScale(data.generalScale * state.facing, data.generalScale, 1);
        // states 已是由遠到近，越靠下越在前面
        actor.node.setSiblingIndex(order);
        actor.tag.setPosition(stage.x, stage.y - decor.tagBelowFootPx, 0);
        actor.mark?.setPosition(stage.x, headY, 0);
        this._headPositions.set(state.id, new Vec3(stage.x, headY, 0));
        if (actor.anim !== state.anim && actor.skeleton.skeletonData?.getRuntimeData()?.findAnimation(state.anim)) {
            actor.anim = state.anim;
            actor.skeleton.setAnimation(0, state.anim, true);
        }
    }

    /** 只有發呆中的武將接點擊：停在原地、通知外面開對話，過一陣子自動放行繼續走 */
    private _onBodyTap(generalId: string): void {
        const wander = this._wander;
        const data = this._wanderData;
        const actor = this._spineActors.get(generalId);
        if (!wander || !data || !actor?.state) return;
        const hit = wander.pickIdleAt(actor.state.x, actor.state.y, 1);
        if (!hit || hit.id !== generalId) return;
        wander.lockIdle(generalId);
        this._onActorTap?.(generalId);
        this.scheduleOnce(() => this.releaseActor(generalId), data.bubbleSeconds);
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
