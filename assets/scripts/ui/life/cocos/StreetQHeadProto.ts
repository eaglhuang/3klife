// @spec-source → 武將生活系統 QLIFE-01／QSOC-01 第 4 章；PROG-2-10258（市井大街 Q 頭生活雛形）
/**
 * StreetQHeadProto — 市井大街 Q 頭生活雛形（單獨可開的預覽疊層，不動正式大廳流程）
 *
 * 把已合併的底層接成「看得到、會動、會講話」的一條街：
 *  - 底圖：Codex 市井大街全景（左右兩張 2048×1536 拼成 4096×1536），左右拖曳瀏覽；
 *  - 武將：真實頭像圓形裁切＋小身體＋影子（QHeadView.setAvatar），走 QAnimManager 的 walk／jump／idle／sip；
 *  - 作息：LifeSceneChooser（buildSnapshot）挑每人所在店面，劇本欄位 forceVenue 只用來讓展示一定看得到喝酒與跳躍；
 *  - 頭上符號：QSymbolView（喝酒的酒罈）；日夜：SceneLightingController 乘色；
 *  - 行走：遮罩預先轉成的走道＋連通巷（StreetQHeadModel.planPath），不會走出遮罩；
 *  - 相遇：靠近就停下互相面對，泡泡輪流講 2～3 句（台詞走 i18n，劇本走 JSON），泡泡排版互不重疊、不出畫面；
 *  - 點武將跳名字。
 * 節點全部重用：Q 頭走池、泡泡固定 5 個節點輪用；每幀只有這個 Component 一個 update。
 * 入口：大廳網址帶 ?lifeProto=street（見 LifeProtoEntry）。
 */
import { _decorator, Color, Component, EventTouch, Graphics, Label, Node, resources, Sprite, SpriteFrame, Texture2D, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import cfgJson from '../../../../resources/data/street-qhead-proto.json';
import streetJson from '../../../../resources/data/life-proto-street.json';
import symbolJson from '../../../../resources/data/q-symbol-groups.json';
import clipsJson from '../../../../resources/data/q-motion-clips.json';
import budgetJson from '../../../../resources/data/q-anim-budget.json';
import lightingJson from '../../../../resources/data/life-lighting.json';
import profileJson from '../../../../resources/data/life-profile.json';
import factorsJson from '../../../../resources/data/life-factors.json';
import scenesJson from '../../../../resources/data/life-scenes.json';
import rosterJson from '../../../../resources/data/life-roster.json';
import { QAnimManager } from '../../../shared/presentation/anim/QAnimManager';
import { INVALID_HANDLE } from '../../../shared/presentation/anim/types';
import type { ActorHandle, QAnimBudget, QClipLibrary } from '../../../shared/presentation/anim/types';
import { createQHeadPool } from '../../../shared/presentation/anim/cocos/QAnimCocosView';
import type { QHeadView } from '../../../shared/presentation/anim/cocos/QAnimCocosView';
import { hash01 } from '../../../shared/presentation/symbol/QSymbolSystem';
import { parseSymbolData } from '../../../shared/presentation/symbol/QSymbolData';
import { QSymbolView } from '../../../shared/presentation/symbol/QSymbolView';
import { parseLightingTable } from '../../../shared/presentation/lighting/LightingTable';
import { SceneLightingController } from '../../../shared/presentation/lighting/SceneLightingController';
import type { ILightingTintTarget } from '../../../shared/presentation/lighting/SceneLightingController';
import { buildSnapshot, defaultStatesFromRoster } from '../../../core/life/LifeSceneChooser';
import { slotOfSeq } from '../../../core/life/LifeClock';
import type { LifeData, LifeSnapshot } from '../../../core/life/types';
import { filterStreetData } from '../LifeStreetModel';
import type { StreetConfig } from '../LifeStreetModel';
import {
    canMeet, clampWalkX, createWalker, estimateBubbleSize, layoutBubbles, pickDialogue, planPath, stepWalker, venuePoint,
} from '../StreetQHeadModel';
import type { BubbleRequest, StreetCastEntry, StreetDialogue, StreetQHeadConfig, Walker } from '../StreetQHeadModel';
import type { Translate } from './LifePanelView';
import { makeBox, makeLabel, placeBox, fitLabel } from './LifeUiKit';
import { SpriteTintTargetBox } from './LifeTintTargets';

const { ccclass } = _decorator;

const BUBBLE_POOL = 6;
const MAX_TALKS = 2;
const CLICK_MOVE_PX = 10;
const NAME_SHOW_SEC = 2.2;
const BODY_COLORS = ['C95A4A', '4A7FC9', '4AA877', 'C9A24A', '9B6FC9', '4AB5B5', 'D07A8E', '8E7A5A'];

type ActorState = 'idle' | 'walk' | 'talk';

interface Talk {
    a: Actor;
    b: Actor;
    dialogue: StreetDialogue;
    swap: boolean;
    t: number;
    shown: number;
}

interface Actor {
    cast: StreetCastEntry;
    index: number;
    view: QHeadView;
    handle: ActorHandle;
    symId: number;
    walker: Walker;
    state: ActorState;
    timer: number;
    clip: string;
    dir: 1 | -1;
    activity: string | null;
    cooldown: number;
    sipT: number;
    jumpT: number;
    venue: string;
    nameLeft: number;
    talk: Talk | null;
    seed: number;
}

interface BubbleNode {
    node: Node;
    gfx: Graphics;
    label: Label;
    opacity: UIOpacity;
}

interface ShownBubble {
    id: string;
    actor: Actor;
    text: string;
    kind: 'line' | 'name';
}

@ccclass('StreetQHeadProto')
export class StreetQHeadProto extends Component {
    private readonly cfg = cfgJson as unknown as StreetQHeadConfig;
    private t: Translate = (k) => k;
    private onExit: () => void = () => undefined;
    private built = false;

    private anim!: QAnimManager;
    private headPool!: ReturnType<typeof createQHeadPool>;
    private symbols!: QSymbolView;
    private lighting!: SceneLightingController;
    private tint = new SpriteTintTargetBox();
    private snapshot: LifeSnapshot | null = null;
    private slotSeq = 0;
    private quarter = 1;

    private w = 1920;
    private h = 1080;
    private scale = 1;
    private px = 0;
    private pxTarget = 0;
    private worldNode!: Node;
    private actorLayer!: Node;
    private bubbleLayer!: Node;
    private actors: Actor[] = [];
    private talks: Talk[] = [];
    private bubbles: BubbleNode[] = [];
    private shown: ShownBubble[] = [];
    private hintBox!: Node;
    private slotLabel!: Label;
    private touchMoved = 0;
    private sortAcc = 0;
    private lastDialogue: string | null = null;
    private talkSeq = 0;
    private frames = new Map<string, SpriteFrame>();
    private loadLeft = 0;
    private elapsed = 0;

    public init(t: Translate, onExit: () => void): void {
        this.t = t;
        this.onExit = onExit;
        this.buildAll();
    }

    // ───────────────────────────── 建構 ─────────────────────────────

    private buildAll(): void {
        const root = this.node;
        const ui = root.getComponent(UITransform) ?? root.addComponent(UITransform);
        ui.setAnchorPoint(0.5, 0.5);
        const widget = root.getComponent(Widget) ?? root.addComponent(Widget);
        widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true;
        widget.left = widget.right = widget.top = widget.bottom = 0;
        widget.alignMode = Widget.AlignMode.ALWAYS;
        widget.updateAlignment();
        this.w = ui.contentSize.width || 1920;
        this.h = ui.contentSize.height || 1080;

        const cfg = this.cfg;
        const street = streetJson as unknown as StreetConfig;
        this.quarter = street.clock.startQuarter;
        this.slotSeq = street.clock.startSlotSeq;

        // 世界層：以全景中心為原點、y 向上；整體縮放到「整條街高度剛好填滿畫面高度」
        this.worldNode = new Node('StreetWorld');
        this.worldNode.layer = root.layer;
        this.worldNode.addComponent(UITransform).setContentSize(cfg.world.width, cfg.world.height);
        root.addChild(this.worldNode);
        const mkBg = (name: string, x: number): void => {
            const n = new Node(name);
            n.layer = root.layer;
            n.addComponent(UITransform).setContentSize(cfg.world.width / 2, cfg.world.height);
            const sp = n.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            n.setPosition(x, 0, 0);
            this.worldNode.addChild(n);
            this.tint.add(n, new Color(255, 255, 255, 255));
        };
        mkBg('BgLeft', -cfg.world.width / 4);
        mkBg('BgRight', cfg.world.width / 4);
        this.actorLayer = new Node('Actors');
        this.actorLayer.layer = root.layer;
        this.actorLayer.addComponent(UITransform);
        this.worldNode.addChild(this.actorLayer);

        this.symbols = new QSymbolView(this.worldNode, parseSymbolData(symbolJson), street.tier);
        const budget = budgetJson as unknown as QAnimBudget;
        this.anim = new QAnimManager(clipsJson as unknown as QClipLibrary, budget, { tier: street.tier });
        this.headPool = createQHeadPool(budget.tiers[street.tier].maxActors + budget.poolSpare);
        this.lighting = new SceneLightingController(parseLightingTable(lightingJson), { tintTargets: [this.tint as ILightingTintTarget] });
        this.lighting.enter(this.quarter, slotOfSeq(this.slotSeq));

        this.bindTouch();
        this.buildHud();
        this.buildBubbles();
        this.relayout();
        this.loadAssets();
        (globalThis as Record<string, unknown>)['__streetQ'] = {
            scene: this,
            state: () => this.debugState(),
            panTo: (wx: number) => { this.pxTarget = this.clampPx(-wx * this.scale); this.px = this.pxTarget; this.applyCamera(); },
            setSlot: (n: number) => this.setSlot(n),
            talkNow: (a: string, b: string) => this.startTalk(this.byId(a), this.byId(b)),
        };
    }

    private loadAssets(): void {
        const cfg = this.cfg;
        this.loadLeft = 2 + cfg.cast.length;
        const done = (): void => { if (--this.loadLeft === 0) this.onAssetsReady(); };
        for (const p of [cfg.world.leftTex, cfg.world.rightTex]) {
            resources.load(p, SpriteFrame, (err, frame) => {
                if (!this.isValid) return;
                if (!err && frame) this.frames.set(p, frame);
                done();
            });
        }
        // 頭像目前只匯成貼圖（沒有 spriteFrame 子資源）：載貼圖，執行期包成 SpriteFrame
        for (const c of cfg.cast) {
            resources.load(c.avatar, Texture2D, (err, tex) => {
                if (!this.isValid) return;
                if (!err && tex) {
                    const f = new SpriteFrame();
                    f.texture = tex;
                    this.frames.set(c.avatar, f);
                }
                done();
            });
        }
    }

    private onAssetsReady(): void {
        const cfg = this.cfg;
        const l = this.frames.get(cfg.world.leftTex);
        const r = this.frames.get(cfg.world.rightTex);
        if (l) this.worldNode.getChildByName('BgLeft')!.getComponent(Sprite)!.spriteFrame = l;
        if (r) this.worldNode.getChildByName('BgRight')!.getComponent(Sprite)!.spriteFrame = r;
        this.spawnActors();
        this.symbols.container.setSiblingIndex(this.worldNode.children.length - 1);
        const v = venuePoint(cfg, cfg.camera.startVenue);
        this.pxTarget = this.px = this.clampPx(-(v.x - cfg.world.width / 2) * this.scale);
        this.applyCamera();
        this.built = true;
    }

    private buildHud(): void {
        const root = this.node;
        const mk = (name: string, w: number, h: number, text: string, onTap: () => void): Node => {
            const box = makeBox(root, name, new Color(40, 40, 52, 205));
            placeBox(box, 0, 0, w, h);
            const lb = makeLabel(box, 'Text', 30, new Color(255, 255, 255, 255));
            fitLabel(lb, w, h, 6);
            lb.string = text;
            box.on(Node.EventType.TOUCH_END, onTap);
            return box;
        };
        const mkSlot = mk('StreetBtnSlot', 230, 56, '', () => this.setSlot(slotOfSeq(this.slotSeq) % 7 + 1));
        this.slotLabel = mkSlot.getChildByName('Text')!.getComponent(Label)!;
        mk('StreetBtnLeft', 80, 80, '◀', () => this.nudge(-900));
        mk('StreetBtnRight', 80, 80, '▶', () => this.nudge(900));
        mk('StreetBtnBack', 190, 56, this.t('life.street.back'), () => this.onExit());
        this.hintBox = makeBox(root, 'StreetHint', new Color(0, 0, 0, 120));
        const hint = makeLabel(this.hintBox, 'Text', 24, new Color(255, 255, 255, 240));
        hint.string = this.t('life.street.hint');
        fitLabel(hint, 640, 40, 8);
        placeBox(this.hintBox, 0, 0, 640, 40);
        this.syncSlotLabel();
    }

    private buildBubbles(): void {
        this.bubbleLayer = new Node('Bubbles');
        this.bubbleLayer.layer = this.node.layer;
        this.bubbleLayer.addComponent(UITransform);
        this.node.addChild(this.bubbleLayer);
        for (let i = 0; i < BUBBLE_POOL; i++) {
            const n = new Node(`Bubble${i}`);
            n.layer = this.node.layer;
            n.addComponent(UITransform).setAnchorPoint(0.5, 0.5);
            const opacity = n.addComponent(UIOpacity);
            const gfx = n.addComponent(Graphics);
            const lbNode = new Node('Text');
            lbNode.layer = this.node.layer;
            lbNode.addComponent(UITransform).setAnchorPoint(0.5, 0.5);
            const label = lbNode.addComponent(Label);
            label.color = new Color(40, 30, 24, 255);
            label.overflow = Label.Overflow.SHRINK;
            label.enableWrapText = true;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            n.addChild(lbNode);
            n.active = false;
            this.bubbleLayer.addChild(n);
            this.bubbles.push({ node: n, gfx, label, opacity });
        }
    }

    private spawnActors(): void {
        const cfg = this.cfg;
        const street = streetJson as unknown as StreetConfig;
        // 作息引擎：只留市井大街場景，挑「現在這個時段」每個人去哪
        const data = filterStreetData({
            profiles: profileJson as unknown as LifeData['profiles'],
            factors: factorsJson as unknown as LifeData['factors'],
            scenes: scenesJson as unknown as LifeData['scenes'],
            roster: rosterJson as unknown as LifeData['roster'],
        }, street.venues);
        this.snapshot = buildSnapshot({ data, quarter: this.quarter, slotSeq: this.slotSeq, states: defaultStatesFromRoster(data) });
        const perVenue: Record<string, number> = {};
        cfg.cast.forEach((c, i) => {
            const frame = this.frames.get(c.avatar);
            const view = this.headPool.acquire();
            if (!view || !frame) return;
            for (const n of [view.root, view.shadow, view.head]) n.layer = this.node.layer;
            view.seed = (i + 1) * 7919 + 13;
            view.focusDistance = i;
            view.setAvatar(frame, cfg.head.sizePx, cfg.head.lift, new Color(...hexRgb(BODY_COLORS[i % BODY_COLORS.length]), 255), c.crop);
            view.root.active = true;
            this.actorLayer.addChild(view.root);
            const handle = this.anim.register(view);
            if (handle === INVALID_HANDLE) { this.headPool.release(view); return; }
            const venue = c.forceVenue ?? this.snapshot?.choices[c.id]?.sceneId ?? cfg.plazaVenue;
            const vp = venuePoint(cfg, venue);
            const n = perVenue[venue] = (perVenue[venue] ?? 0) + 1;
            const off = (n % 2 === 0 ? 1 : -1) * 55 * Math.ceil(n / 2) * 1.0;
            const walker = createWalker(clampWalkX(cfg, vp.x + off), vp.y);
            const symId = this.symbols.system.addHead({ x: 0, y: 0, size: cfg.head.sizePx, activity: null, seed: c.id });
            const a: Actor = {
                cast: c, index: i, view, handle, symId, walker, state: 'idle', timer: 0.4 + i * 0.25, clip: 'idle', dir: i % 2 === 0 ? 1 : -1,
                activity: null, cooldown: 0, sipT: 1 + i * 0.7, jumpT: 0.5 + i * 0.6, venue, nameLeft: 0, talk: null, seed: hash01(c.id),
            };
            this.anim.play(handle, 'idle');
            this.anim.setFacing(handle, a.dir);
            if (c.role === 'drinker') this.setActivity(a, cfg.drink.symbolActivity);
            if (c.firstGoto) this.walkTo(a, c.firstGoto, 0);
            this.actors.push(a);
        });
        // 讓喝酒的兩位面對面
        const drinkers = this.actors.filter((a) => a.cast.role === 'drinker');
        drinkers.forEach((a, i) => { a.dir = i % 2 === 0 ? 1 : -1; this.anim.setFacing(a.handle, a.dir); });
        this.syncActors();
    }

    // ───────────────────────────── 輸入、鏡頭 ─────────────────────────────

    private bindTouch(): void {
        const wn = this.worldNode;
        wn.on(Node.EventType.TOUCH_START, () => { this.touchMoved = 0; });
        wn.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            const d = e.getUIDelta();
            this.touchMoved += Math.abs(d.x) + Math.abs(d.y);
            this.pxTarget = this.px = this.clampPx(this.px + d.x);
            this.applyCamera();
        });
        wn.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            if (this.touchMoved <= CLICK_MOVE_PX) this.onTap(e);
        });
    }

    private nudge(dx: number): void {
        this.pxTarget = this.clampPx(this.pxTarget + dx * this.scale / 1.4);
    }

    private clampPx(px: number): number {
        const half = (this.cfg.world.width * this.scale) / 2;
        const lim = Math.max(0, half - this.w / 2);
        return Math.max(-lim, Math.min(lim, px));
    }

    private applyCamera(): void {
        this.worldNode.setPosition(this.px, 0, 0);
    }

    private relayout(): void {
        const ui = this.node.getComponent(UITransform)!;
        this.w = ui.contentSize.width || this.w;
        this.h = ui.contentSize.height || this.h;
        this.scale = this.h / this.cfg.world.height;
        this.worldNode.setScale(this.scale, this.scale, 1);
        this.px = this.pxTarget = this.clampPx(this.px);
        this.applyCamera();
        const set = (name: string, x: number, y: number): void => { this.node.getChildByName(name)?.setPosition(x, y, 0); };
        set('StreetBtnSlot', this.w / 2 - 242, this.h / 2 - 68);
        set('StreetBtnBack', -this.w / 2 + 14, this.h / 2 - 68);
        set('StreetBtnLeft', -this.w / 2 + 14, -this.h / 2 + 120);
        set('StreetBtnRight', this.w / 2 - 94, -this.h / 2 + 120);
        this.hintBox.setPosition(-320, -this.h / 2 + 18, 0);
    }

    private onTap(e: EventTouch): void {
        const ui = this.node.getComponent(UITransform)!;
        const p = e.getUILocation();
        const local = ui.convertToNodeSpaceAR(new Vec3(p.x, p.y, 0));
        const wx = (local.x - this.px) / this.scale;
        const wy = local.y / this.scale;
        const hc = this.cfg.head.lift + this.cfg.head.sizePx / 2;
        let best: Actor | null = null;
        let bd = Infinity;
        for (const a of this.actors) {
            const d = Math.hypot(a.walker.x - this.cfg.world.width / 2 - wx, this.cfg.world.height / 2 - a.walker.y + hc - wy);
            if (d < this.cfg.head.sizePx * 0.9 && d < bd) { bd = d; best = a; }
        }
        if (best) best.nameLeft = NAME_SHOW_SEC;
    }

    private setSlot(slot: number): void {
        this.slotSeq = slot - 1;
        this.lighting.setSlot(slot, true);
        this.syncSlotLabel();
    }

    private syncSlotLabel(): void {
        const slot = slotOfSeq(this.slotSeq);
        this.slotLabel.string = this.t('life.proto.btn.slot', this.t(`life.panel.slot.${slot - 1}`));
    }

    // ───────────────────────────── 武將行為 ─────────────────────────────

    private byId(id: string): Actor {
        return this.actors.find((a) => a.cast.id === id) ?? this.actors[0];
    }

    private setActivity(a: Actor, act: string | null): void {
        if (a.activity === act) return;
        a.activity = act;
        this.symbols.system.setHeadActivity(a.symId, act);
    }

    private play(a: Actor, clip: string): void {
        if (a.clip === clip) return;
        a.clip = clip;
        this.anim.play(a.handle, clip);
    }

    private walkTo(a: Actor, venue: string, spread: number): void {
        const vp = venuePoint(this.cfg, venue);
        const off = (hash01(`${a.cast.id}:${this.elapsed.toFixed(1)}`) - 0.5) * 2 * spread;
        a.walker.path = planPath(this.cfg, { x: a.walker.x, y: a.walker.y }, vp.lane, vp.x + off);
        a.venue = venue;
        a.state = 'walk';
        this.setActivity(a, null);
    }

    private pickVenue(a: Actor): string {
        const keys = Object.keys(this.cfg.venues).filter((k) => k !== a.venue);
        const r = hash01(`${a.cast.id}:${Math.floor(this.elapsed * 3)}`);
        return keys[Math.floor(r * keys.length) % keys.length];
    }

    private stepActors(dt: number): void {
        const cfg = this.cfg;
        for (const a of this.actors) {
            a.cooldown = Math.max(0, a.cooldown - dt);
            a.nameLeft = Math.max(0, a.nameLeft - dt);
            const role = a.cast.role ?? 'stroller';
            if (a.state === 'walk') {
                const done = stepWalker(a.walker, dt, cfg.speed.stroll);
                this.play(a, 'walk');
                if (done) {
                    a.state = 'idle';
                    a.timer = cfg.stroll.idleMinSec + (cfg.stroll.idleMaxSec - cfg.stroll.idleMinSec) * hash01(`${a.cast.id}:t${Math.floor(this.elapsed)}`);
                    this.play(a, 'idle');
                }
            } else if (a.state === 'idle') {
                a.timer -= dt;
                if (role === 'stroller' && a.timer <= 0) this.walkTo(a, this.pickVenue(a), cfg.stroll.spreadPx);
                if (role === 'drinker') {
                    this.setActivity(a, cfg.drink.symbolActivity);
                    a.sipT -= dt;
                    if (a.sipT <= 0) {
                        a.sipT = cfg.drink.sipEverySec * (0.8 + 0.4 * hash01(`${a.cast.id}:s${Math.floor(this.elapsed)}`));
                        this.anim.play(a.handle, 'sip');
                        this.anim.queue(a.handle, 'idle');
                        a.clip = 'idle';
                    }
                }
                if (role === 'jumper') {
                    a.jumpT -= dt;
                    if (a.jumpT <= 0) {
                        a.jumpT = cfg.jump.everySecMin + (cfg.jump.everySecMax - cfg.jump.everySecMin) * hash01(`${a.cast.id}:j${Math.floor(this.elapsed * 2)}`);
                        this.anim.play(a.handle, cfg.jump.clip);
                        this.anim.queue(a.handle, 'idle');
                        a.clip = 'idle';
                    }
                }
            }
            if (a.walker.dir !== a.dir && a.state !== 'talk') {
                a.dir = a.walker.dir;
                this.anim.setFacing(a.handle, a.dir);
            }
        }
        this.updateTalks(dt);
        this.detectMeetings();
    }

    // ───────────────────────────── 相遇與對話 ─────────────────────────────

    private detectMeetings(): void {
        const cfg = this.cfg;
        if (this.talks.length >= MAX_TALKS) return;
        for (let i = 0; i < this.actors.length; i++) {
            const a = this.actors[i];
            if (a.state === 'talk' || a.cooldown > 0 || a.cast.role === 'jumper') continue;
            for (let j = i + 1; j < this.actors.length; j++) {
                const b = this.actors[j];
                if (b.state === 'talk' || b.cooldown > 0 || b.cast.role === 'jumper') continue;
                if (canMeet(cfg, a.walker, b.walker)) { this.startTalk(a, b); break; }
            }
        }
    }

    private startTalk(a: Actor, b: Actor): void {
        if (a === b || a.state === 'talk' || b.state === 'talk') return;
        const pick = pickDialogue(this.cfg, a.cast.id, b.cast.id, ++this.talkSeq + a.index * 3 + b.index, this.lastDialogue);
        this.lastDialogue = pick.dialogue.id;
        const talk: Talk = { a, b, dialogue: pick.dialogue, swap: pick.swap, t: -this.cfg.talk.startDelaySec, shown: 0 };
        for (const x of [a, b]) {
            x.state = 'talk';
            x.talk = talk;
            x.walker.path = [];
            this.play(x, 'idle');
        }
        // 互相面對
        a.dir = b.walker.x >= a.walker.x ? 1 : -1;
        b.dir = -a.dir as 1 | -1;
        this.anim.setFacing(a.handle, a.dir);
        this.anim.setFacing(b.handle, b.dir);
        this.talks.push(talk);
    }

    private updateTalks(dt: number): void {
        const cfg = this.cfg;
        for (const talk of this.talks.slice()) {
            talk.t += dt;
            const idx = Math.min(talk.dialogue.lines.length, Math.floor(talk.t / cfg.talk.lineSec) + 1);
            if (talk.t >= 0 && idx > talk.shown) {
                talk.shown = idx;
                const line = talk.dialogue.lines[idx - 1];
                const speaker = (line.who === 0) !== talk.swap ? talk.a : talk.b;
                this.anim.play(speaker.handle, 'nod');
                this.anim.queue(speaker.handle, 'idle');
                speaker.clip = 'idle';
            }
            if (talk.t >= talk.dialogue.lines.length * cfg.talk.lineSec + 1) this.endTalk(talk);
        }
    }

    private endTalk(talk: Talk): void {
        this.talks.splice(this.talks.indexOf(talk), 1);
        for (const x of [talk.a, talk.b]) {
            x.talk = null;
            x.state = 'idle';
            x.timer = 0.3;
            x.cooldown = this.cfg.talk.cooldownSec;
            x.sipT = 1.2;
        }
    }

    // ───────────────────────────── 每幀 ─────────────────────────────

    public update(dt: number): void {
        if (!this.built) return;
        dt = Math.min(dt, 0.1);
        this.elapsed += dt;
        const ui = this.node.getComponent(UITransform)!;
        if (Math.abs(ui.contentSize.width - this.w) > 0.5 || Math.abs(ui.contentSize.height - this.h) > 0.5) this.relayout();
        if (Math.abs(this.pxTarget - this.px) > 0.5) {
            this.px += (this.pxTarget - this.px) * Math.min(1, dt * 7);
            this.applyCamera();
        }
        this.stepActors(dt);
        this.anim.update(dt);
        this.symbols.tick(dt);
        this.symbols.system.setFocus(-this.px / this.scale, 0, this.w / this.scale);
        this.lighting.update(dt);
        this.syncActors();
        this.sortAcc += dt;
        if (this.sortAcc > 0.15) {
            this.sortAcc = 0;
            this.sortActors();
            // 大廳後掛的面板會被拉到最上層；雛形是全螢幕疊層，要一直留在最上面
            const parent = this.node.parent;
            if (parent && this.node.getSiblingIndex() !== parent.children.length - 1) this.node.setSiblingIndex(parent.children.length - 1);
        }
        this.updateBubbles();
    }

    private syncActors(): void {
        const cfg = this.cfg;
        const hw = cfg.world.width / 2;
        const hh = cfg.world.height / 2;
        for (const a of this.actors) {
            const wx = a.walker.x - hw;
            const wy = hh - a.walker.y;
            a.view.root.setPosition(wx, wy, 0);
            this.symbols.system.move(a.symId, wx, wy + cfg.head.lift + cfg.head.sizePx * 1.45, cfg.head.sizePx);
        }
    }

    /** 越靠下（y 越大）越靠前 */
    private sortActors(): void {
        const sorted = this.actors.slice().sort((x, y) => y.walker.y - x.walker.y);
        sorted.forEach((a, i) => { if (a.view.root.getSiblingIndex() !== i) a.view.root.setSiblingIndex(i); });
    }

    // ───────────────────────────── 泡泡 ─────────────────────────────

    private headAnchor(a: Actor, withSymbol: boolean): { x: number; y: number } {
        const cfg = this.cfg;
        const wx = a.walker.x - cfg.world.width / 2;
        const wy = cfg.world.height / 2 - a.walker.y;
        const top = cfg.head.lift + cfg.head.sizePx * (withSymbol ? 2.0 : 1.18);
        return { x: this.px + wx * this.scale, y: (wy + top) * this.scale };
    }

    private collectBubbles(): ShownBubble[] {
        const out: ShownBubble[] = [];
        for (const talk of this.talks) {
            for (let i = 0; i < talk.shown; i++) {
                const line = talk.dialogue.lines[i];
                const speaker = (line.who === 0) !== talk.swap ? talk.a : talk.b;
                // 每人只留他最新一句，舊句子被自己的新句取代
                const later = talk.dialogue.lines.slice(i + 1, talk.shown).some((l) => ((l.who === 0) !== talk.swap ? talk.a : talk.b) === speaker);
                if (!later) out.push({ id: `${talk.dialogue.id}:${i}`, actor: speaker, text: this.t(line.key), kind: 'line' });
            }
        }
        for (const a of this.actors) {
            if (a.nameLeft > 0 && !out.some((b) => b.actor === a)) out.push({ id: `name:${a.cast.id}`, actor: a, text: this.t(a.cast.nameKey), kind: 'name' });
        }
        return out.slice(0, BUBBLE_POOL);
    }

    private feetAnchor(a: Actor): { x: number; y: number } {
        const cfg = this.cfg;
        return { x: this.px + (a.walker.x - cfg.world.width / 2) * this.scale, y: (cfg.world.height / 2 - a.walker.y) * this.scale };
    }

    /** 不准被泡泡蓋住的區塊：所有武將（含頭上符號）與畫面四角的按鈕 */
    private obstacles(): Array<{ cx: number; cy: number; w: number; h: number }> {
        const cfg = this.cfg;
        const out: Array<{ cx: number; cy: number; w: number; h: number }> = [];
        for (const a of this.actors) {
            const f = this.feetAnchor(a);
            const hgt = (cfg.head.lift + cfg.head.sizePx * (a.activity !== null ? 1.95 : 1.1)) * this.scale;
            const wid = cfg.head.sizePx * 0.95 * this.scale;
            out.push({ cx: f.x, cy: f.y + hgt / 2 - 6, w: wid, h: hgt + 12 });
        }
        const hw = this.w / 2;
        const hh = this.h / 2;
        out.push({ cx: -hw + 110, cy: hh - 40, w: 220, h: 80 });
        out.push({ cx: hw - 125, cy: hh - 40, w: 250, h: 80 });
        out.push({ cx: -hw + 54, cy: -hh + 160, w: 108, h: 100 });
        out.push({ cx: hw - 54, cy: -hh + 160, w: 108, h: 100 });
        out.push({ cx: 0, cy: -hh + 38, w: 660, h: 56 });
        return out;
    }

    private updateBubbles(): void {
        const cfg = this.cfg;
        const items = this.collectBubbles();
        const reqs: BubbleRequest[] = items.map((it) => {
            const size = it.kind === 'name' ? { w: Math.max(120, it.text.length * 34 + 40), h: 56 } : estimateBubbleSize(it.text, cfg);
            const anc = this.headAnchor(it.actor, it.actor.activity !== null);
            const feet = this.feetAnchor(it.actor);
            return { id: it.id, ax: anc.x, ay: anc.y + cfg.bubble.tailPx, fx: feet.x, fy: feet.y - cfg.bubble.tailPx, w: size.w, h: size.h };
        });
        const bounds = { minX: -this.w / 2 + 6, maxX: this.w / 2 - 6, minY: -this.h / 2 + 6, maxY: this.h / 2 - 6 };
        const placed = layoutBubbles(reqs, bounds, cfg.bubble.gapPx, this.obstacles());
        this.bubbles.forEach((bn, i) => {
            const it = items[i];
            if (!it) { bn.node.active = false; return; }
            const p = placed[i];
            const req = reqs[i];
            bn.node.active = true;
            bn.node.setPosition(p.cx, p.cy, 0);
            bn.node.getComponent(UITransform)!.setContentSize(p.w, p.h);
            const lt = bn.label.node.getComponent(UITransform)!;
            lt.setContentSize(p.w - cfg.bubble.padPx * 2, p.h - cfg.bubble.padPx * 2);
            bn.label.fontSize = it.kind === 'name' ? 30 : cfg.bubble.fontPx;
            bn.label.lineHeight = Math.round(bn.label.fontSize * 1.25);
            if (bn.label.string !== it.text) bn.label.string = it.text;
            bn.opacity.opacity = 255;
            // 泡泡在頭頂上方就指向頭頂，否則（放在腳下）指向腳
            const above = p.cy >= req.ay;
            const tx = (above ? req.ax : req.fx) - p.cx;
            const ty = (above ? req.ay - cfg.bubble.tailPx : req.fy + cfg.bubble.tailPx) - p.cy;
            this.drawBubble(bn.gfx, p.w, p.h, tx, ty, it.kind === 'name');
        });
    }

    private drawBubble(g: Graphics, w: number, h: number, tx: number, ty: number, name: boolean): void {
        const r = 16;
        const tail = this.cfg.bubble.tailPx;
        const fill = name ? new Color(255, 236, 170, 250) : new Color(255, 255, 255, 250);
        const line = new Color(60, 44, 30, 255);
        g.clear();
        g.lineWidth = 3;
        g.strokeColor = line;
        g.fillColor = fill;
        // 尾巴：目標在泡泡下方就從底邊指下去，在上方就從頂邊指上去；目標在泡泡左右範圍內才畫
        const down = ty < -h / 2;
        const up = ty > h / 2;
        if (down || up) {
            const edge = down ? -h / 2 : h / 2;
            const bx = Math.max(-w / 2 + r + tail, Math.min(w / 2 - r - tail, tx));
            g.moveTo(bx - tail, edge);
            g.lineTo(Math.max(-w / 2, Math.min(w / 2, tx)), ty);
            g.lineTo(bx + tail, edge);
            g.stroke();
            g.fill();
        }
        g.roundRect(-w / 2, -h / 2, w, h, r);
        g.fill();
        g.stroke();
        if (down || up) {
            const edge = down ? -h / 2 : h / 2;
            const bx = Math.max(-w / 2 + r + tail, Math.min(w / 2 - r - tail, tx));
            g.fillColor = fill;
            g.rect(bx - tail + 1.5, down ? edge - 2 : edge - 1, tail * 2 - 3, 3);
            g.fill();
        }
    }

    // ───────────────────────────── 除錯 ─────────────────────────────

    private debugState(): unknown {
        return {
            scale: this.scale,
            px: this.px,
            actors: this.actors.map((a) => ({
                id: a.cast.id, state: a.state, clip: a.clip, venue: a.venue, x: Math.round(a.walker.x), y: Math.round(a.walker.y),
                activity: a.activity, talk: a.talk?.dialogue.id ?? null,
            })),
            talks: this.talks.length,
            bubbles: this.collectBubbles().map((b) => b.text),
        };
    }

    protected onDestroy(): void {
        for (const a of this.actors) {
            this.anim.unregister(a.handle);
            this.symbols.system.remove(a.symId);
            this.headPool.release(a.view);
        }
        this.symbols.dispose();
        delete (globalThis as Record<string, unknown>)['__streetQ'];
    }
}

function hexRgb(hex: string): [number, number, number] {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
