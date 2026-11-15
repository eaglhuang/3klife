// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（原地 Idle、頭頂姓名與官職）；UI-2-0137（UI-2-0123 子項）；Issue #2135
/**
 * HallStageCrowd — 幕府大廳 Q 版武將的畫面元件（薄殼）。
 *
 * 誰在場由 HallCharacterPresenter／HallWalkerPlan 決定、站哪由 HallStagePlanner 決定、節點姿態由 HallStageCrowdPose 換算，
 * 這裡只負責建節點、依候選路徑載圖（Q 版失敗就退頭像）、套姿態、播 idle／標記擺動，並接上走動模擬。
 *
 * show() 是「差異更新」：新名單裡沒有的人退場（Spine 武將走出畫面、靜態小人直接消失），
 * 新來的人從地板帶外側走進來，名單裡本來就在的人原地保留（只更新頭上標記）。
 *
 * 節點結構（掛在大廳畫布下、中心錨點的容器）：
 *   每位武將一組：body（Sprite 或 sp.Skeleton，錨點腳底中心）、tag（名牌 Label）、mark（「!」Label，可無）
 *
 * Unity 對照：像一個 Spawner＋Despawner，依「目標名單」與「現場名單」的差異生成與回收。
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
    buildWanderActor,
    buildWanderConfig,
    clampWanderDt,
    spinePathFor,
    staticBobOffset,
    wanderEntryPoint,
    wanderToStage,
} from '../../shared/lobby/wanderSupport';

const { ccclass } = _decorator;

const CONTENT_TAG = 'lobby-hall-crowd';
const TAG_COLOR = new Color(255, 233, 176, 255);
const MARK_COLOR = new Color(255, 224, 136, 255);
/** Spine 骨架高度（單位）：點擊判定框與名牌高度用，與 SpineGeneralOverlay 的 1300px 骨架一致 */
const SKELETON_BOX = { width: 420, height: 1300 };

/** 場上的一位武將：Spine 武將會走動（skeleton 非 null），靜態小人固定站著當障礙物 */
interface CrowdActor {
    id: string;
    placement: HallStagePlacement;
    node: Node;
    skeleton: sp.Skeleton | null;
    tag: Node;
    mark: Node | null;
    anim: string;
    state: WanderActorState | null;
    /** 站位（舞台座標）：靜態小人固定在這；Spine 武將是第一次進場的位置 */
    stageX: number;
    stageY: number;
    /** 正在走出畫面：不能再點、不再接受名單更新 */
    leaving: boolean;
    /** 靜態小人的通用步態用：站位姿態的縮放（正值，翻面由走動方向決定）與兩個累計時鐘 */
    baseScaleX: number;
    baseScaleY: number;
    /** 站立呼吸的相位時鐘（秒） */
    breathSec: number;
    /** 這一段連續走動已走了幾秒（落腳節奏的相位），停下就歸零 */
    walkSec: number;
}

@ccclass('HallStageCrowd')
export class HallStageCrowd extends Component {
    private _decor: HallStageDecor | null = null;
    private _showToken = 0;
    private _ticket = 0;
    /** 第一批已經上場：之後新來的人才從場外走進來，第一批直接站在站位上 */
    private _shown = false;
    /** 每位在場武將頭頂的位置（集體反應用）；clear 時清空 */
    private readonly _headPositions = new Map<string, Vec3>();
    private _wanderData: HallWanderData | null = null;
    private _canvas: CanvasSize = { width: 1920, height: 1080 };
    private _onActorTap: ((generalId: string) => number | void) | null = null;
    private _wander: HallWander | null = null;
    private readonly _actors = new Map<string, CrowdActor>();
    /** 正在載入的人（id → 票號）；載完時票號對不上就丟棄，避免重複生成 */
    private readonly _pending = new Map<string, number>();

    /** 名牌顯示開關：大廳上層展開子選單時暫藏，避免選單壓住名牌（#2148-3） */
    private _tagsVisible = true;

    public setTagsVisible(visible: boolean): void {
        this._tagsVisible = visible;
        for (const child of this.node.children) if (child.name.startsWith('tag-')) child.active = visible;
    }

    public configure(decor: HallStageDecor): void {
        this._decor = decor;
    }

    /**
     * 啟用走動（Issue #2135）：對照表裡有 Spine 路徑的武將改播骨架並隨機走動，沒有的維持靜態小人。
     * 不呼叫或資料為 null 時整個大廳維持原本行為。onTap 在玩家點到武將時呼叫（Spine 武將會先原地停住）。
     */
    public configureWander(data: HallWanderData | null, canvas: Readonly<CanvasSize>, onTap: (generalId: string) => number | void): void {
        this._wanderData = data;
        this._canvas = { width: canvas.width, height: canvas.height };
        this._onActorTap = onTap;
    }

    /** 目前在場（含正在退場）的武將 id，測試與外部查詢用 */
    public actorIds(): string[] {
        return Array.from(this._actors.keys());
    }

    /** 某位武將的頭頂位置（舞台座標）；不在場回傳 null，對話泡泡定位用 */
    public headPositionOf(generalId: string): { x: number; y: number } | null {
        const head = this._headPositions.get(generalId);
        return head ? { x: head.x, y: head.y } : null;
    }

    /**
     * 依名單做差異更新：不在名單的退場、新來的進場、本來就在的保留。
     * 同一批新來的人全部載完才一起加入走動模擬（依 id 排序，固定種子的路線不受載入先後影響）。
     */
    public show(placements: readonly HallStagePlacement[]): void {
        const want = new Map<string, HallStagePlacement>();
        placements.forEach(p => want.set(p.generalId, p));

        Array.from(this._actors.keys()).forEach(id => { if (!want.has(id)) this._retire(id); });
        Array.from(this._pending.keys()).forEach(id => { if (!want.has(id)) this._pending.delete(id); });

        const arrive = this._shown;
        const token = this._showToken;
        const batch: Array<Promise<CrowdActor | null>> = [];
        placements.forEach((placement, index) => {
            const id = placement.generalId;
            const existing = this._actors.get(id);
            if (existing) {
                if (existing.leaving) {
                    // 退場途中又被點名：叫回來繼續走
                    existing.leaving = false;
                    this._wander?.stay(id);
                }
                this._refresh(existing, placement);
                return;
            }
            if (this._pending.has(id)) return;
            const ticket = ++this._ticket;
            this._pending.set(id, ticket);
            batch.push(this._spawn(placement, index, arrive).then((actor) => {
                const valid = token === this._showToken && this._pending.get(id) === ticket;
                if (valid) this._pending.delete(id);
                if (!actor) return null;
                if (!valid) {
                    this._destroyNodes(actor);
                    return null;
                }
                return actor;
            }));
        });
        this._shown = true;
        if (batch.length === 0) return;
        void Promise.all(batch).then((loaded) => {
            if (token !== this._showToken) return;
            const ready = loaded.filter((a): a is CrowdActor => a !== null && a.node.isValid);
            ready.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
            ready.forEach(actor => this._register(actor));
        });
    }

    /** 對話結束後讓武將繼續走（泡泡收起時呼叫） */
    public releaseActor(generalId: string): void {
        if (this._actors.has(generalId)) this._wander?.unlock(generalId);
    }

    protected update(dt: number): void {
        const wander = this._wander;
        const data = this._wanderData;
        if (!wander || !data) return;
        // 從大廳停放回來時 dt 可能很大；截斷後角色從原地接著走
        const step = clampWanderDt(dt, data.maxStepSec);
        const states = wander.step(step);
        states.forEach((state, order) => this._applyState(state, order, data, step));
        wander.drainRemoved().forEach(id => this._dispose(id));
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
        this._shown = false;
        this._headPositions.clear();
        this._wander = null;
        this._actors.clear();
        this._pending.clear();
        for (const child of [...this.node.children]) {
            Tween.stopAllByTarget(child);
            child.destroy();
        }
    }

    protected onDestroy(): void {
        this.clear();
    }

    // ─────────────────────────── 生成 ───────────────────────────

    private async _spawn(placement: HallStagePlacement, index: number, arrive: boolean): Promise<CrowdActor | null> {
        const decor = this._decor;
        if (!decor) return null;
        const token = this._showToken;
        const spine = await this._spawnSpine(placement, token, decor, arrive);
        if (spine || token !== this._showToken) return spine;

        const body = new Node(`crowd-${placement.generalId}`);
        body.layer = this.node.layer;
        body.addComponent(UITransform).setAnchorPoint(0.5, 0);
        const sprite = body.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.RAW;
        this.node.addChild(body);

        const frame = await this._loadFirst(placement.spriteCandidates);
        if (token !== this._showToken || !body.isValid) {
            if (body.isValid) body.destroy();
            return null;
        }
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
        const tag = this._makeLabel(`tag-${placement.generalId}`, this._tagText(placement), 16, TAG_COLOR);
        const mark = placement.hasTaskMark ? this._makeLabel(`mark-${placement.generalId}`, '!', 30, MARK_COLOR) : null;
        const pose = hallStageCrowdPose(placement, placement.height, decor, index);
        const data = this._wanderData;
        // 啟用走動時沒有骨架的武將也走（通用步態）：輪替進場的從場外走進來，位置與晃動由走動模擬每幀決定
        const walks = !!data;
        const at = data && arrive
            ? wanderToStage(wanderEntryPoint(data, pose.body.x, pose.body.y, this._canvas), this._canvas)
            : { x: pose.body.x, y: pose.body.y };
        body.setPosition(at.x, at.y, 0);
        body.setScale(pose.body.scaleX, pose.body.scaleY, 1);
        tag.setPosition(at.x, at.y - decor.tagBelowFootPx, 0);
        tag.active = this._tagsVisible;
        const headY = at.y + placement.height + decor.markAboveHeadPx;
        if (mark) mark.setPosition(at.x, headY, 0);
        this._headPositions.set(placement.generalId, new Vec3(at.x, headY, 0));

        if (!walks) {
            this._playIdle(body, pose.body.scaleX, pose.body.scaleY, pose.idleDelaySec, decor);
            if (mark) this._playBob(mark, decor);
        }
        const actor: CrowdActor = {
            id: placement.generalId, placement, node: body, skeleton: null, tag, mark,
            anim: '', state: null, stageX: at.x, stageY: at.y, leaving: false,
            baseScaleX: Math.abs(pose.body.scaleX), baseScaleY: pose.body.scaleY,
            breathSec: pose.idleDelaySec, walkSec: 0,
        };
        this._bindTap(actor);
        return actor;
    }

    /**
     * 有 Spine 骨架就建走動武將；沒列在對照表、骨架載不到（美術只在私有倉庫）回傳 null，由呼叫端退回靜態小人。
     * 被新一輪 clear 取代時同樣回傳 null（呼叫端會再檢查 token，不會往下建靜態小人）。
     */
    private async _spawnSpine(placement: HallStagePlacement, token: number, decor: HallStageDecor, arrive: boolean): Promise<CrowdActor | null> {
        const data = this._wanderData;
        const path = data ? spinePathFor(data, placement.generalId) : null;
        if (!data || !path) return null;
        const skeletonData = await new Promise<sp.SkeletonData | null>((resolve) => {
            resources.load(path, sp.SkeletonData, (err, asset) => resolve(err || !asset ? null : asset));
        });
        if (token !== this._showToken || !skeletonData) return null;

        const body = new Node(`crowd-${placement.generalId}`);
        body.layer = this.node.layer;
        const transform = body.addComponent(UITransform);
        const skeleton = body.addComponent(sp.Skeleton);
        skeleton.premultipliedAlpha = false;
        skeleton.skeletonData = skeletonData;
        // 指定骨架資料時 Skeleton 會把 UITransform 改成骨架原始邊界（900×1300、錨點 0.4），
        // 點擊判定框要在這之後才設，否則會落在錯的位置與大小
        transform.setAnchorPoint(0.5, 0);
        transform.setContentSize(SKELETON_BOX.width, SKELETON_BOX.height);
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

        const tag = this._makeLabel(`tag-${placement.generalId}`, this._tagText(placement), 16, TAG_COLOR);
        const mark = placement.hasTaskMark ? this._makeLabel(`mark-${placement.generalId}`, '!', 30, MARK_COLOR) : null;
        // 輪替進場的人先放在場外，走動模擬接手後自己走進來；第一批直接站在站位上
        const at = arrive
            ? wanderToStage(wanderEntryPoint(data, placement.stageX, placement.stageY, this._canvas), this._canvas)
            : { x: placement.stageX, y: placement.stageY };
        const headY = at.y + placement.height + decor.markAboveHeadPx;
        body.setScale(data.generalScale, data.generalScale, 1);
        body.setPosition(at.x, at.y, 0);
        tag.setPosition(at.x, at.y - decor.tagBelowFootPx, 0);
        mark?.setPosition(at.x, headY, 0);
        this._headPositions.set(placement.generalId, new Vec3(at.x, headY, 0));
        const actor: CrowdActor = {
            id: placement.generalId, placement, node: body, skeleton, tag, mark,
            anim: anims.idle, state: null, stageX: at.x, stageY: at.y, leaving: false,
            baseScaleX: data.generalScale, baseScaleY: data.generalScale, breathSec: 0, walkSec: 0,
        };
        this._bindTap(actor);
        return actor;
    }

    /** 加入走動模擬；沒有啟用走動（設定檔缺）時只留在場上。靜態小人鎖在原地當障礙物 */
    private _register(actor: CrowdActor): void {
        const data = this._wanderData;
        this._actors.set(actor.id, actor);
        if (!data) return;
        if (!this._wander) this._wander = new HallWander(buildWanderConfig(data, [], this._canvas));
        // 起點就是節點當下的位置：輪替進場的 Spine 武將在場外，其餘在站位上
        this._wander.addActor(buildWanderActor(data, { id: actor.id, stageX: actor.stageX, stageY: actor.stageY }, this._canvas));
    }

    // ─────────────────────────── 退場／更新 ───────────────────────────

    private _retire(id: string): void {
        const actor = this._actors.get(id);
        if (!actor || actor.leaving) return;
        if (this._wander) {
            actor.leaving = true;
            this._wander.leave(id);
            return;
        }
        this._wander?.remove(id);
        this._dispose(id);
    }

    /** 已經離場（或直接消失）：拆節點、清登記 */
    private _dispose(id: string): void {
        const actor = this._actors.get(id);
        if (!actor) return;
        this._actors.delete(id);
        this._headPositions.delete(id);
        this._destroyNodes(actor);
    }

    private _destroyNodes(actor: CrowdActor): void {
        [actor.node, actor.tag, actor.mark].forEach((node) => {
            if (!node || !node.isValid) return;
            Tween.stopAllByTarget(node);
            node.destroy();
        });
    }

    /** 本來就在場上的人：只同步頭上的「!」標記，位置與走動照舊 */
    private _refresh(actor: CrowdActor, placement: HallStagePlacement): void {
        const decor = this._decor;
        actor.placement = placement;
        if (!decor) return;
        if (placement.hasTaskMark && !actor.mark) {
            const head = this._headPositions.get(actor.id);
            actor.mark = this._makeLabel(`mark-${actor.id}`, '!', 30, MARK_COLOR);
            if (head) actor.mark.setPosition(head.x, head.y, 0);
            // 靜態小人走動時標記由走動模擬每幀定位，不能再疊上下彈的動畫
            if (!actor.skeleton && !this._wanderData) this._playBob(actor.mark, decor);
        } else if (!placement.hasTaskMark && actor.mark) {
            Tween.stopAllByTarget(actor.mark);
            if (actor.mark.isValid) actor.mark.destroy();
            actor.mark = null;
        }
    }

    /**
     * 沒有骨架的靜態小人走動：位置跟走動模擬、依方向左右翻面（scaleX 正負）、
     * 走動時依落腳節奏上下彈、站著時沿用原本的呼吸起伏。日後骨架量產後會被 Spine 武將取代。
     */
    private _applyStaticState(actor: CrowdActor, state: WanderActorState, order: number, data: HallWanderData, dt: number): void {
        const decor = this._decor;
        if (!decor) return;
        const stage = wanderToStage({ x: state.x, y: state.y }, this._canvas);
        const walking = state.anim === WANDER_ANIMS.general.walk;
        actor.state = state;
        actor.walkSec = walking ? actor.walkSec + dt : 0;
        actor.breathSec += dt;
        let lift: number;
        let stretch = 1;
        if (walking) {
            lift = staticBobOffset(data.staticGait, actor.walkSec, true);
        } else {
            const k = (1 - Math.cos((2 * Math.PI * actor.breathSec) / decor.idle.periodSec)) / 2;
            lift = decor.idle.risePx * k;
            stretch = 1 + decor.idle.stretchY * k;
        }
        actor.node.setPosition(stage.x, stage.y + lift, 0);
        actor.node.setScale(actor.baseScaleX * state.facing, actor.baseScaleY * stretch, 1);
        actor.node.setSiblingIndex(order);
        const headY = stage.y + actor.placement.height + decor.markAboveHeadPx;
        actor.tag.setPosition(stage.x, stage.y - decor.tagBelowFootPx, 0);
        actor.mark?.setPosition(stage.x, headY, 0);
        this._headPositions.set(state.id, new Vec3(stage.x, headY, 0));
    }

    private _applyState(state: WanderActorState, order: number, data: HallWanderData, dt: number): void {
        const actor = this._actors.get(state.id);
        const decor = this._decor;
        if (!actor || !actor.node.isValid) return;
        if (!actor.skeleton) {
            this._applyStaticState(actor, state, order, data, dt);
            return;
        }
        if (!decor) return;
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

    // ─────────────────────────── 點擊 ───────────────────────────

    private _bindTap(actor: CrowdActor): void {
        actor.node.on(Node.EventType.TOUCH_END, () => this._onBodyTap(actor.id));
    }

    /**
     * Spine 武將只有發呆中才接點擊（走動中的骨架判定框跟不上腳步）；靜態小人（通用步態）走動中也能點。
     * 點到都是：停在原地、通知外面開對話，過一陣子自動放行繼續走。退場中的不接。
     */
    private _onBodyTap(generalId: string): void {
        const actor = this._actors.get(generalId);
        if (!actor || actor.leaving) return;
        const wander = this._wander;
        const data = this._wanderData;
        if (!wander || !data || !actor.state) {
            // 沒啟用走動：靜態小人本來就站著，點了直接通知外面
            if (!actor.skeleton) this._onActorTap?.(generalId);
            return;
        }
        if (actor.skeleton) {
            const hit = wander.pickIdleAt(actor.state.x, actor.state.y, 1);
            if (!hit || hit.id !== generalId) return;
        }
        wander.lockIdle(generalId);
        // 外面可回傳要停多久（自薦任務的對話框要開比較久）；沒回傳就用設定檔的泡泡秒數
        const holdSec = this._onActorTap?.(generalId);
        this.scheduleOnce(() => this.releaseActor(generalId), typeof holdSec === 'number' && holdSec > 0 ? holdSec : data.bubbleSeconds);
    }

    // ─────────────────────────── 小工具 ───────────────────────────

    private _tagText(placement: HallStagePlacement): string {
        return placement.title ? `${placement.title}・${placement.name}` : placement.name;
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
