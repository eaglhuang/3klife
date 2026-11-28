// @spec-source → 武將生活系統 QLIFE-01／QSOC-01 第 4 章；工作包 WP1～WP5；PROG-2-10214
/**
 * LifeProtoScene — 生活層第一個「看得到」的原型（佔位市井大街）
 *
 * 把 WP1～WP5 底層接成畫面：
 *  - WP3 作息引擎（core/life）：10 位假武將每個時段挑市井大街的場景，換時段、換季重挑；
 *  - WP1 Q 動畫管理器：走路（walk／run）、待機（idle）、睡覺（sit），單一 update 迴圈；
 *  - WP2 頭上生活符號：依當下活動（睡、練武、喝酒、讀書、喝茶、發呆）＋同場景兩人聊天符號；
 *  - WP5 日夜四季調色：底圖、建築依時段與季節乘色，光源／星空／積雪疊層走 OverlayLifecycle；
 *  - WP4 場景切換面板：地圖、最近、收藏、找人四分頁，左下地圖鈕、右上時段徽章。
 * 底圖全是純色方塊（Codex 大圖還沒交）。節點全部重用：Q 頭走物件池、符號走子精靈池、列表列走列池。
 * 除錯：左上兩顆按鈕切時段、切季節；右上下方一行統計（Q 頭數、符號數）。
 */
import { _decorator, Color, Component, Label, Node, UIOpacity, UITransform, Widget } from 'cc';
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
import { parseSymbolData } from '../../../shared/presentation/symbol/QSymbolData';
import { QSymbolView } from '../../../shared/presentation/symbol/QSymbolView';
import { parseLightingTable } from '../../../shared/presentation/lighting/LightingTable';
import type { LightingSeason } from '../../../shared/presentation/lighting/LightingTable';
import { OverlayLifecycle } from '../../../shared/presentation/lighting/OverlayLifecycle';
import type { IOverlayLoader } from '../../../shared/presentation/lighting/OverlayLifecycle';
import { SceneLightingController } from '../../../shared/presentation/lighting/SceneLightingController';
import type { ILightingTintTarget } from '../../../shared/presentation/lighting/SceneLightingController';
import { OpacityLightTarget } from '../../../shared/presentation/lighting/SpriteTintTarget';
import { buildSnapshot, defaultStatesFromRoster } from '../../../core/life/LifeSceneChooser';
import { SLOT_REAL_SECONDS, seasonOfQuarter, slotOfSeq } from '../../../core/life/LifeClock';
import type { LifeData, LifeGeneralState, LifeSnapshot } from '../../../core/life/types';
import { SceneRegistry } from '../SceneRegistry';
import { SceneSwitchService } from '../SceneSwitchService';
import type { SceneSwitchResult } from '../SceneSwitchService';
import { FindPersonResolver } from '../FindPersonResolver';
import type { FindPersonEntry } from '../FindPersonResolver';
import { ScenePanelController } from '../ScenePanelController';
import {
    activityOf, cellOf, countByScene, createWalker, filterStreetData, isStationary, layoutStreet, setWalkTarget,
    standPoint, stepWalker,
} from '../LifeStreetModel';
import type { StreetConfig, StreetLayout, WalkerState } from '../LifeStreetModel';
import { LifePanelView } from './LifePanelView';
import type { Translate } from './LifePanelView';
import { fitLabel, hexToColor, makeBox, makeLabel, newUiNode, placeBox, setBoxColor } from './LifeUiKit';
import { SpriteTintTargetBox } from './LifeTintTargets';

const { ccclass } = _decorator;

const STAR_COUNT = 20;
const SLOT_COUNT = 7;

interface Actor {
    id: string;
    index: number;
    view: QHeadView;
    handle: ActorHandle;
    symId: number;
    walker: WalkerState;
    sceneId: string;
    cellIndex: number;
    activity: string | null;
    /** 已走到目標場景（換時段時先清掉符號，到了才顯示新活動） */
    arrived: boolean;
    clip: string;
    dir: 1 | -1;
}

/** 疊層 id → 畫面層：載入＝顯示、卸載＝隱藏（節點重用，不反覆建立） */
class LayerOverlayLoader implements IOverlayLoader {
    public readonly log: string[] = [];
    public constructor(private readonly layers: Record<string, Node>) {}
    public load(id: string): void {
        this.log.push(`+${id}`);
        const n = this.layers[id];
        if (n) n.active = true;
    }
    public unload(id: string): void {
        this.log.push(`-${id}`);
        const n = this.layers[id];
        if (n) n.active = false;
    }
}

@ccclass('LifeProtoScene')
export class LifeProtoScene extends Component {
    private readonly cfg = streetJson as unknown as StreetConfig;
    private t: Translate = (k) => k;
    private onExit: () => void = () => undefined;
    private built = false;

    // 引擎
    private lifeData!: LifeData;
    private states: LifeGeneralState[] = [];
    private snapshot: LifeSnapshot | null = null;
    private quarter = 1;
    private slotSeq = 0;
    private autoAcc = 0;
    private anim!: QAnimManager;
    private headPool!: ReturnType<typeof createQHeadPool>;
    private symbols!: QSymbolView;
    private lighting!: SceneLightingController;
    private overlays!: OverlayLifecycle;
    private overlayLoader!: LayerOverlayLoader;
    private registry!: SceneRegistry;
    private service!: SceneSwitchService;
    private panelCtrl!: ScenePanelController;
    private panel!: LifePanelView;

    // 畫面
    private w = 0;
    private h = 0;
    private layout!: StreetLayout;
    private worldNode!: Node;
    private skyBox!: Node;
    private groundBox!: Node;
    private actorLayer!: Node;
    private glowLayer!: Node;
    private starsLayer!: Node;
    private snowLayer!: Node;
    private tint = new SpriteTintTargetBox();
    private readonly yardBoxes: Node[] = [];
    private readonly buildBoxes: Node[] = [];
    private readonly roofBoxes: Node[] = [];
    private readonly glowBoxes: Node[] = [];
    private readonly snowBoxes: Node[] = [];
    private readonly nameLabels: Label[] = [];
    private readonly starBoxes: Node[] = [];
    private highlightBox!: Node;
    private highlightLeft = 0;
    private fadeBox!: Node;
    private fadeOpacity!: UIOpacity;
    private fadeLeft = 0;
    private fadeTotal = 0.5;
    private placeholder!: Node;
    private placeholderTitle!: Label;
    private placeholderTag!: Label;
    private placeholderHint!: Label;
    private btnSlot!: Node;
    private btnSeason!: Node;
    private btnSlotLabel!: Label;
    private btnSeasonLabel!: Label;
    private statsLabel!: Label;
    private statsAcc = 0;
    private sortAcc = 0;

    private actors: Actor[] = [];
    private pairIds: Array<{ id: number; a: Actor; b: Actor }> = [];
    private sizeW = 0;
    private sizeH = 0;
    private maxPairs = 0;

    /** 由 LifeProtoEntry 呼叫：傳入翻譯函式與離開回呼，然後建好全部節點 */
    public init(t: Translate, onExit: () => void): void {
        this.t = t;
        this.onExit = onExit;
        this.buildAll();
    }

    // ───────────────────────────── 建構 ─────────────────────────────

    private buildAll(): void {
        const cfg = this.cfg;
        const root = this.node;
        const ui = root.getComponent(UITransform) ?? root.addComponent(UITransform);
        ui.setAnchorPoint(0.5, 0.5);
        const widget = root.getComponent(Widget) ?? root.addComponent(Widget);
        widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true;
        widget.left = widget.right = widget.top = widget.bottom = 0;
        widget.alignMode = Widget.AlignMode.ALWAYS;
        widget.updateAlignment();
        const size = ui.contentSize;
        this.w = size.width || 1920;
        this.h = size.height || 1080;

        this.lifeData = filterStreetData({
            profiles: profileJson as unknown as LifeData['profiles'],
            factors: factorsJson as unknown as LifeData['factors'],
            scenes: scenesJson as unknown as LifeData['scenes'],
            roster: rosterJson as unknown as LifeData['roster'],
        }, cfg.venues);
        this.states = defaultStatesFromRoster(this.lifeData);
        this.quarter = cfg.clock.startQuarter;
        this.slotSeq = cfg.clock.startSlotSeq;

        // 世界層（以畫面中心為原點）
        this.worldNode = newUiNode('LifeWorld', root);
        this.worldNode.getComponent(UITransform)!.setAnchorPoint(0.5, 0.5);
        this.skyBox = makeBox(this.worldNode, 'Sky', hexToColor('CFE6F5'));
        this.skyBox.on(Node.EventType.TOUCH_START, () => undefined); // 擋住底下大廳的點擊
        this.skyBox.on(Node.EventType.TOUCH_END, () => undefined);
        this.groundBox = makeBox(this.worldNode, 'Ground', hexToColor(cfg.ground.spring));
        this.tint.add(this.skyBox, hexToColor('CFE6F5'));
        this.tint.add(this.groundBox, hexToColor(cfg.ground.spring));

        this.symbols = new QSymbolView(this.worldNode, parseSymbolData(symbolJson), cfg.tier);
        const dotFrame = this.symbols.frameOf('dot');
        // 讓符號層在最上面：先建底圖，再把符號層與角色層排在後面
        this.buildVenues(dotFrame);
        this.starsLayer = this.makeLayer('Stars');
        for (let i = 0; i < STAR_COUNT; i++) this.starBoxes.push(makeBox(this.starsLayer, `Star${i}`, new Color(255, 255, 240, 230), dotFrame));
        this.snowLayer.setSiblingIndex(this.worldNode.children.length - 1);
        this.glowLayer.setSiblingIndex(this.worldNode.children.length - 1);
        this.actorLayer = newUiNode('Actors', this.worldNode);
        this.symbols.container.setSiblingIndex(this.worldNode.children.length - 1);

        this.highlightBox = makeBox(this.worldNode, 'Highlight', new Color(255, 240, 120, 0));
        this.highlightBox.addComponent(UIOpacity).opacity = 0;
        this.highlightBox.active = false;

        // 疊層＋調色
        const table = parseLightingTable(lightingJson);
        this.overlayLoader = new LayerOverlayLoader({
            lights_atlas: this.glowLayer,
            stars: this.starsLayer,
            overlay_winter_snow: this.snowLayer,
        });
        this.overlays = new OverlayLifecycle(table, this.overlayLoader);
        const lightTargets = [
            new OpacityLightTarget(this.glowLayer.getComponent(UIOpacity)!),
            new OpacityLightTarget(this.starsLayer.getComponent(UIOpacity)!),
        ];
        this.lighting = new SceneLightingController(table, {
            tintTargets: [this.tint as ILightingTintTarget],
            lightTargets,
            lifecycle: this.overlays,
        });

        // 動畫管理器、Q 頭
        const budget = budgetJson as unknown as QAnimBudget;
        this.anim = new QAnimManager(clipsJson as unknown as QClipLibrary, budget, { tier: cfg.tier });
        this.headPool = createQHeadPool(budget.tiers[cfg.tier].maxActors + budget.poolSpare);

        // 場景面板（WP4）
        this.registry = new SceneRegistry();
        this.service = new SceneSwitchService(this.registry);
        this.panelCtrl = new ScenePanelController({
            registry: this.registry,
            service: this.service,
            resolver: new FindPersonResolver(this.registry),
            roster: () => this.findRoster(),
            intel: () => cfg.intel,
            onBackToLobby: () => this.onExit(),
        });
        this.service.switchTo(this.registry.defaultSceneId, { slot: slotOfSeq(this.slotSeq) - 1 });

        // 佔位底圖（非市井大街場景）與淡入淡出蓋板
        this.buildPlaceholder();
        this.panel = new LifePanelView(root, this.panelCtrl, {
            t: this.t,
            onSwitched: (r) => this.onSwitched(r),
        });
        this.buildDebugBar();
        this.fadeBox = makeBox(root, 'Fade', new Color(0, 0, 0, 255));
        this.fadeOpacity = this.fadeBox.addComponent(UIOpacity);
        this.fadeOpacity.opacity = 0;
        this.fadeBox.active = false;

        // 進入生活層：以當下時段與季度直接生成快照（不補算過去）
        this.snapshot = buildSnapshot({ data: this.lifeData, quarter: this.quarter, slotSeq: this.slotSeq, states: this.states });
        this.relayout(true);
        this.spawnActors();
        this.lighting.enter(this.quarter, slotOfSeq(this.slotSeq));
        this.applyGround();
        this.applySnapshot(true);
        this.syncClockUi();
        this.panel.setSize(this.w, this.h);
        this.built = true;
        (globalThis as Record<string, unknown>)['__lifeProto'] = { stats: () => this.stats(), scene: this };
    }

    private makeLayer(name: string): Node {
        const n = newUiNode(name, this.worldNode);
        n.addComponent(UIOpacity).opacity = 0;
        n.active = false;
        return n;
    }

    private buildVenues(dotFrame: ReturnType<QSymbolView['frameOf']>): void {
        const cfg = this.cfg;
        const t = this.t;
        this.snowLayer = this.makeLayer('Snow');
        this.snowLayer.getComponent(UIOpacity)!.opacity = 255;
        this.glowLayer = this.makeLayer('Glow');
        for (let i = 0; i < cfg.venues.length; i++) {
            const id = cfg.venues[i];
            const yard = makeBox(this.worldNode, `Yard_${id}`, hexToColor(cfg.roadColor));
            this.tint.add(yard, hexToColor(cfg.roadColor));
            this.yardBoxes.push(yard);
            const base = hexToColor(cfg.buildingColors[i % cfg.buildingColors.length]);
            const body = makeBox(this.worldNode, `Body_${id}`, base);
            this.tint.add(body, base);
            this.buildBoxes.push(body);
            const roofColor = new Color(Math.round(base.r * 0.7), Math.round(base.g * 0.7), Math.round(base.b * 0.7), 255);
            const roof = makeBox(this.worldNode, `Roof_${id}`, roofColor);
            this.tint.add(roof, roofColor);
            this.roofBoxes.push(roof);
            const lb = makeLabel(body, 'Name', 26, new Color(255, 255, 255, 255));
            lb.string = t(`life.scene.${id}`);
            this.nameLabels.push(lb);
            this.snowBoxes.push(makeBox(this.snowLayer, `Snow_${id}`, new Color(250, 252, 255, 255)));
            this.glowBoxes.push(makeBox(this.glowLayer, `Glow_${id}`, new Color(255, 214, 110, 255), dotFrame));
        }
    }

    private buildPlaceholder(): void {
        this.placeholder = makeBox(this.node, 'LifePlaceholder', new Color(58, 64, 82, 255));
        this.placeholder.on(Node.EventType.TOUCH_START, () => undefined);
        this.placeholder.on(Node.EventType.TOUCH_END, () => undefined);
        this.placeholderTitle = makeLabel(this.placeholder, 'Title', 44, new Color(255, 255, 255, 255));
        this.placeholderTag = makeLabel(this.placeholder, 'Tag', 36, new Color(255, 214, 120, 255));
        this.placeholderHint = makeLabel(this.placeholder, 'Hint', 26, new Color(190, 200, 220, 255));
        this.placeholder.active = false;
    }

    private buildDebugBar(): void {
        const mk = (name: string, onTap: () => void): { box: Node; label: Label } => {
            const box = makeBox(this.node, name, new Color(70, 110, 170, 235));
            const label = makeLabel(box, 'Text', 24, new Color(255, 255, 255, 255));
            box.on(Node.EventType.TOUCH_END, onTap);
            return { box, label };
        };
        const a = mk('LifeDbgSlot', () => this.advanceSlot(true));
        const b = mk('LifeDbgSeason', () => this.advanceSeason());
        this.btnSlot = a.box;
        this.btnSlotLabel = a.label;
        this.btnSeason = b.box;
        this.btnSeasonLabel = b.label;
        const sbox = newUiNode('LifeStats', this.node);
        this.statsLabel = makeLabel(sbox, 'Text', 20, new Color(255, 255, 255, 235), 'left');
    }

    // ───────────────────────────── 武將 ─────────────────────────────

    private spawnActors(): void {
        const cfg = this.cfg;
        const ids = this.states.map((s) => s.generalId);
        ids.forEach((id, i) => {
            const view = this.headPool.acquire();
            if (!view) return;
            for (const n of [view.root, view.shadow, view.head]) n.layer = this.worldNode.layer;
            view.seed = (i + 1) * 7919 + 13;
            view.focusDistance = i;
            view.setup(hexToColor(cfg.headColors[i % cfg.headColors.length]), this.layout.headH);
            view.root.active = true;
            this.actorLayer.addChild(view.root);
            const handle = this.anim.register(view);
            if (handle === INVALID_HANDLE) {
                this.headPool.release(view);
                return;
            }
            this.anim.play(handle, 'idle');
            const symId = this.symbols.system.addHead({ x: 0, y: 0, size: this.layout.headH, activity: null, seed: id });
            this.actors.push({
                id, index: i, view, handle, symId, walker: createWalker(0, 0), sceneId: '', cellIndex: 0,
                activity: null, arrived: true, clip: 'idle', dir: 1,
            });
        });
        // 兩人聊天符號：最多每個場景一個，預留池（想同時有幾組由人數決定）
        this.maxPairs = Math.floor(this.actors.length / 2);
    }

    /** 依快照決定每個人站哪個場景；initial＝直接站定，之後＝走過去 */
    private applySnapshot(initial: boolean): void {
        const snap = this.snapshot;
        if (!snap) return;
        const slot = slotOfSeq(this.slotSeq);
        const byScene: Record<string, Actor[]> = {};
        for (const a of this.actors) {
            const sceneId = snap.choices[a.id]?.sceneId ?? this.cfg.venues[0];
            const cell = cellOf(this.layout, sceneId) ?? this.layout.cells[0];
            const sid = cell.sceneId;
            (byScene[sid] = byScene[sid] ?? []).push(a);
        }
        for (const sid of Object.keys(byScene)) {
            const group = byScene[sid].slice().sort((x, y) => (x.id < y.id ? -1 : 1));
            const cell = cellOf(this.layout, sid)!;
            group.forEach((a, gi) => {
                const p = standPoint(cell.yard, this.layout.headH, gi, group.length, a.id);
                const moved = a.sceneId !== sid;
                a.sceneId = sid;
                a.cellIndex = cell.index;
                if (initial) {
                    a.walker = createWalker(p.x, p.y);
                    a.arrived = true;
                } else if (moved) {
                    setWalkTarget(a.walker, p.x, p.y);
                    a.arrived = false;
                }
                const act = activityOf(this.cfg, sid, slot);
                if (a.arrived) this.setActivity(a, act);
                else this.setActivity(a, null);
            });
        }
        this.refreshPairs();
    }

    private setActivity(a: Actor, activity: string | null): void {
        if (a.activity === activity) return;
        a.activity = activity;
        this.symbols.system.setHeadActivity(a.symId, activity);
    }

    private refreshPairs(): void {
        for (const p of this.pairIds) this.symbols.system.remove(p.id);
        this.pairIds = [];
        const slot = slotOfSeq(this.slotSeq);
        const scenes: Record<string, string> = {};
        for (const a of this.actors) if (a.arrived) scenes[a.id] = a.sceneId;
        const counts = countByScene(scenes);
        for (const sid of Object.keys(counts)) {
            if (counts[sid] < 2 || this.pairIds.length >= this.maxPairs) continue;
            if (activityOf(this.cfg, sid, slot) !== this.cfg.defaultActivity) continue;
            const group = this.actors.filter((a) => a.arrived && a.sceneId === sid);
            const id = this.symbols.system.addPair(this.cfg.pairKind, 0, 0, this.layout.headH);
            this.pairIds.push({ id, a: group[0], b: group[1] });
        }
    }

    private findRoster(): FindPersonEntry[] {
        const snap = this.snapshot;
        const symbolOf = (act: string): string => symbolJson.activities[act as keyof typeof symbolJson.activities]?.symbol ?? 'S50';
        return this.actors.map((a) => ({
            generalId: a.id,
            name: this.cfg.names[a.id] ?? a.id,
            pinyin: a.id.replace(/_/g, ''),
            faction: this.lifeData.roster.generals.find((g) => g.id === a.id)?.faction ?? '',
            office: '',
            friendship: (a.index * 17) % 60 - 10,
            hasBond: a.index % 4 === 0,
            sceneId: snap?.choices[a.id]?.sceneId ?? a.sceneId,
            activityId: symbolOf(activityOf(this.cfg, a.sceneId, slotOfSeq(this.slotSeq))),
        }));
    }

    // ───────────────────────────── 時鐘、切換 ─────────────────────────────

    private advanceSlot(manual: boolean): void {
        this.slotSeq++;
        this.recompute(manual);
    }

    private advanceSeason(): void {
        this.quarter++;
        this.slotSeq = slotOfSeq(this.slotSeq) - 1; // 換季時段序號歸零，但保留目前時段讓畫面不跳
        this.lighting.setQuarter(this.quarter);
        this.applyGround();
        this.recompute(true, true);
    }

    private recompute(manual: boolean, seasonChanged = false): void {
        this.snapshot = buildSnapshot({
            data: this.lifeData, quarter: this.quarter, slotSeq: this.slotSeq, states: this.states, previous: this.snapshot,
        });
        if (!seasonChanged) this.lighting.setSlot(slotOfSeq(this.slotSeq), manual);
        this.autoAcc = 0;
        this.applySnapshot(false);
        this.syncClockUi();
    }

    private syncClockUi(): void {
        const season = (seasonOfQuarter(this.quarter) as LightingSeason);
        const seasonNo = ['spring', 'summer', 'autumn', 'winter'].indexOf(season) + 1;
        this.panelCtrl.setClock(seasonNo, slotOfSeq(this.slotSeq) - 1);
        this.panel.refresh();
        this.btnSlotLabel.string = this.t('life.proto.btn.slot', this.t(`life.panel.slot.${slotOfSeq(this.slotSeq) - 1}`));
        this.btnSeasonLabel.string = this.t('life.proto.btn.season', this.t(`life.panel.season.${seasonNo}`));
    }

    private applyGround(): void {
        const season = seasonOfQuarter(this.quarter);
        this.tint.setBase(this.groundBox, hexToColor(this.cfg.ground[season]));
    }

    private onSwitched(r: SceneSwitchResult): void {
        const area = r.areaId;
        this.fadeTotal = Math.max(0.1, r.transitionSec);
        this.fadeLeft = this.fadeTotal;
        this.fadeBox.active = true;
        this.fadeOpacity.opacity = 200;
        if (area === 'mkt') {
            this.placeholder.active = false;
            const cell = cellOf(this.layout, r.sceneId);
            if (cell) this.flashCell(cell.index);
        } else {
            this.placeholder.active = true;
            this.placeholderTitle.string = this.t(`life.scene.${r.sceneId}`);
            this.placeholderTag.string = this.t('life.scene.underConstruction');
            this.placeholderHint.string = this.t('life.scene.placeholderHint');
        }
    }

    private flashCell(index: number): void {
        const cell = this.layout.cells[index];
        placeBox(this.highlightBox, cell.cell.x, cell.cell.y, cell.cell.w, cell.cell.h);
        setBoxColor(this.highlightBox, new Color(255, 240, 120, 255));
        this.highlightBox.active = true;
        this.highlightLeft = 1.6;
    }

    // ───────────────────────────── 版面 ─────────────────────────────

    private relayout(first = false): void {
        const w = this.w;
        const h = this.h;
        this.layout = layoutStreet(w, h, this.cfg);
        const L = this.layout;
        placeBox(this.skyBox, -w / 2, -h / 2, w, h);
        placeBox(this.groundBox, L.ground.x, L.ground.y, L.ground.w, L.ground.h);
        L.cells.forEach((c, i) => {
            placeBox(this.yardBoxes[i], c.yard.x, c.yard.y, c.yard.w, c.yard.h);
            const b = c.building;
            placeBox(this.buildBoxes[i], b.x, b.y, b.w, b.h);
            fitLabel(this.nameLabels[i], b.w, b.h * 0.5, 4);
            this.nameLabels[i].node.setPosition(4, b.h * 0.42, 0); // 名字放建築上半，下半留給夜間窗光
            const roofH = b.h * 0.22;
            placeBox(this.roofBoxes[i], b.x - b.w * 0.04, b.y + b.h - roofH, b.w * 1.08, roofH);
            placeBox(this.snowBoxes[i], b.x - b.w * 0.04, b.y + b.h - 2, b.w * 1.08, roofH * 0.45);
            const g = Math.min(b.w, b.h) * 0.28;
            placeBox(this.glowBoxes[i], b.x + b.w / 2 - g / 2, b.y + b.h * 0.1, g, g);
        });
        this.starBoxes.forEach((s, i) => {
            const u = ((i * 0.6180339) % 1);
            const v = ((i * 0.3819660 + 0.11) % 1);
            const sz = 6 + (i % 3) * 3;
            placeBox(s, -w / 2 + u * w, h / 2 - h * 0.1 * v - sz, sz, sz);
        });
        this.symbols.system.setFocus(0, 0, w);
        if (!first) {
            for (const a of this.actors) a.view.setup(hexToColor(this.cfg.headColors[a.index % this.cfg.headColors.length]), L.headH);
        }
        // 全屏蓋板
        placeBox(this.placeholder, -w / 2, -h / 2, w, h);
        fitLabel(this.placeholderTitle, w, h * 0.12, 0);
        this.placeholderTitle.node.setPosition(0, h * 0.56, 0);
        fitLabel(this.placeholderTag, w, h * 0.1, 0);
        this.placeholderTag.node.setPosition(0, h * 0.44, 0);
        fitLabel(this.placeholderHint, w, h * 0.08, 0);
        this.placeholderHint.node.setPosition(0, h * 0.36, 0);
        if (this.fadeBox) placeBox(this.fadeBox, -w / 2, -h / 2, w, h);
        // 除錯按鈕：左上，高 ≥ 56
        const bh = Math.max(56, h * 0.06);
        const bw = Math.max(220, Math.min(w * 0.22, 300));
        const gap = 10;
        const x0 = -w / 2 + w * 0.02;
        const y0 = h / 2 - h * 0.03 - bh;
        if (this.btnSlot) {
            placeBox(this.btnSlot, x0, y0, bw, bh);
            fitLabel(this.btnSlotLabel, bw, bh, 6);
            placeBox(this.btnSeason, x0 + bw + gap, y0, bw, bh);
            fitLabel(this.btnSeasonLabel, bw, bh, 6);
            const sb = this.statsLabel.node.parent!;
            placeBox(sb, x0, y0 - 40, Math.max(300, w * 0.4), 34);
            fitLabel(this.statsLabel, Math.max(300, w * 0.4), 34, 4);
        }
    }

    /** 回到某格的站位（換尺寸時） */
    private reseatActors(): void {
        const byScene: Record<string, Actor[]> = {};
        for (const a of this.actors) (byScene[a.sceneId] = byScene[a.sceneId] ?? []).push(a);
        for (const sid of Object.keys(byScene)) {
            const cell = cellOf(this.layout, sid);
            if (!cell) continue;
            const group = byScene[sid].slice().sort((x, y) => (x.id < y.id ? -1 : 1));
            group.forEach((a, gi) => {
                const p = standPoint(cell.yard, this.layout.headH, gi, group.length, a.id);
                a.cellIndex = cell.index;
                a.walker = createWalker(p.x, p.y);
                a.arrived = true;
            });
        }
    }

    // ───────────────────────────── 每幀 ─────────────────────────────

    public update(dt: number): void {
        if (!this.built) return;
        dt = Math.min(dt, 0.1);
        const ui = this.node.getComponent(UITransform)!;
        const cs = ui.contentSize;
        if (cs.width > 0 && cs.height > 0 && (Math.abs(cs.width - this.w) > 0.5 || Math.abs(cs.height - this.h) > 0.5)) {
            this.w = cs.width;
            this.h = cs.height;
            this.relayout();
            this.reseatActors();
            this.panel.setSize(this.w, this.h);
            this.syncClockUi();
        }

        // 自動換時段（規格：生活層每時段 90 秒）
        if (this.cfg.clock.autoAdvance) {
            this.autoAcc += dt;
            if (this.autoAcc >= SLOT_REAL_SECONDS) this.advanceSlot(false);
        }

        this.stepActors(dt);
        this.anim.update(dt);
        this.symbols.tick(dt);
        this.lighting.update(dt);
        this.updateOverlays(dt);

        this.sortAcc += dt;
        if (this.sortAcc > 0.3) {
            this.sortAcc = 0;
            this.sortActors();
            // 大廳後掛的面板（開場信等）會被拉到最上層；生活層是全螢幕疊層，要一直留在最上面
            const parent = this.node.parent;
            if (parent && this.node.getSiblingIndex() !== parent.children.length - 1) this.node.setSiblingIndex(parent.children.length - 1);
        }
        this.statsAcc += dt;
        if (this.statsAcc > 0.4) {
            this.statsAcc = 0;
            const s = this.stats();
            this.statsLabel.string = this.t('life.proto.stats', String(s.headsAlive), String(s.symbolHeads), String(s.symbolSprites));
        }
    }

    private stepActors(dt: number): void {
        const L = this.layout;
        const cfg = this.cfg;
        const slot = slotOfSeq(this.slotSeq);
        let arrivedAny = false;
        for (const a of this.actors) {
            const cell = L.cells[a.cellIndex];
            const stationary = isStationary(activityOf(cfg, a.sceneId, slot)) && a.arrived;
            const before = a.walker.phase;
            stepWalker(a.walker, dt, {
                speed: a.arrived ? cfg.walk.speedPxPerSec : cfg.walk.transitSpeedPxPerSec,
                idleMinSec: cfg.walk.idleMinSec,
                idleMaxSec: cfg.walk.idleMaxSec,
                stationary,
                yard: cell.yard,
                headH: L.headH,
                wanderPx: cell.cell.w * cfg.walk.wanderRel,
                seed: a.id,
            });
            if (!a.arrived && before === 'walk' && a.walker.phase === 'idle') {
                a.arrived = true;
                arrivedAny = true;
                this.setActivity(a, activityOf(cfg, a.sceneId, slot));
            }
            const wantClip = a.walker.phase === 'walk' ? (a.arrived ? 'walk' : 'run') : (stationary ? 'sit' : 'idle');
            if (wantClip !== a.clip) {
                a.clip = wantClip;
                this.anim.play(a.handle, wantClip);
            }
            if (a.walker.dir !== a.dir) {
                a.dir = a.walker.dir;
                this.anim.setFacing(a.handle, a.dir);
            }
            a.view.root.setPosition(a.walker.x, a.walker.y, 0);
            this.symbols.system.move(a.symId, a.walker.x, a.walker.y + L.headH * 1.45, L.headH);
        }
        if (arrivedAny) this.refreshPairs();
        for (const p of this.pairIds) {
            const mx = (p.a.walker.x + p.b.walker.x) / 2;
            const my = Math.max(p.a.walker.y, p.b.walker.y) + L.headH * 2.4;
            this.symbols.system.move(p.id, mx, my, L.headH);
        }
    }

    private sortActors(): void {
        const sorted = this.actors.slice().sort((x, y) => y.walker.y - x.walker.y);
        sorted.forEach((a, i) => { if (a.view.root.getSiblingIndex() !== i) a.view.root.setSiblingIndex(i); });
    }

    private updateOverlays(dt: number): void {
        if (this.highlightLeft > 0) {
            this.highlightLeft -= dt;
            const k = Math.max(0, this.highlightLeft / 1.6);
            const pulse = 0.5 + 0.5 * Math.sin(this.highlightLeft * 10);
            this.highlightBox.getComponent(UIOpacity)!.opacity = Math.round(150 * k * pulse);
            if (this.highlightLeft <= 0) this.highlightBox.active = false;
        }
        if (this.fadeLeft > 0) {
            this.fadeLeft -= dt;
            const k = Math.max(0, this.fadeLeft / this.fadeTotal);
            this.fadeOpacity.opacity = Math.round(200 * k);
            if (this.fadeLeft <= 0) this.fadeBox.active = false;
        }
    }

    // ───────────────────────────── 證據用統計 ─────────────────────────────

    public stats(): {
        headsAlive: number; headsWalking: number; symbolHeads: number; symbolSprites: number; symbolPoolCreated: number;
        headPoolCreated: number; pairs: number; rowNodes: number; shownRows: number; overlaysHeld: string[];
        season: string; slot: number; quarter: number; scenes: Record<string, number>; activities: Record<string, number>;
    } {
        let walking = 0;
        let symbolHeads = 0;
        let sprites = 0;
        const scenes: Record<string, number> = {};
        const activities: Record<string, number> = {};
        for (const a of this.actors) {
            if (a.walker.phase === 'walk') walking++;
            if (a.activity) {
                symbolHeads++;
                activities[a.activity] = (activities[a.activity] ?? 0) + 1;
            }
            sprites += this.symbols.system.spriteCountOf(a.symId);
            scenes[a.sceneId] = (scenes[a.sceneId] ?? 0) + 1;
        }
        for (const p of this.pairIds) sprites += this.symbols.system.spriteCountOf(p.id);
        return {
            headsAlive: this.anim.stats.alive,
            headsWalking: walking,
            symbolHeads,
            symbolSprites: sprites,
            symbolPoolCreated: this.symbols.system.pool.created,
            headPoolCreated: this.anim.getPoolInfo().created,
            pairs: this.pairIds.length,
            rowNodes: this.panel.rowNodeCount,
            shownRows: this.panel.shownRowCount,
            overlaysHeld: this.overlays.held(),
            season: seasonOfQuarter(this.quarter),
            slot: slotOfSeq(this.slotSeq),
            quarter: this.quarter,
            scenes,
            activities,
        };
    }

    /** 除錯／驗收用：直接設定時段（1～7）與季度 */
    public debugSet(slot: number, quarter: number): void {
        if (quarter !== this.quarter) {
            this.quarter = quarter;
            this.lighting.setQuarter(quarter);
            this.applyGround();
        }
        this.slotSeq = slot - 1;
        this.recompute(true, false);
    }

    public onDestroy(): void {
        const g = globalThis as Record<string, unknown>;
        if (g['__lifeProto'] && (g['__lifeProto'] as { scene?: unknown }).scene === this) delete g['__lifeProto'];
        for (const a of this.actors) {
            this.symbols?.system.remove(a.symId);
            this.anim?.unregister(a.handle);
            a.view.root.removeFromParent();
            this.headPool?.release(a.view);
        }
        this.actors.length = 0;
        this.overlays?.releaseAll();
        this.symbols?.dispose();
    }
}
