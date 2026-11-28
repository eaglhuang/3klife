// @spec-source → QSOC-01 第 9.5.1 節（大廳「出去逛逛」入口）；PROG-2-10256
/**
 * LifeStreetEntry — 大廳右下角的「出去逛逛」圖示按鈕，點了進市井大街生活層
 *
 *  - 位置：Canvas 右下、推進一季鈕正上方（拇指點得到）；Widget 用百分比錨點，不寫死座標；
 *  - 外觀：深褐底金邊，左邊街門圖示、右邊金字（與大廳底欄同色系）；上鎖時圖示換成鎖頭、整顆變暗；
 *  - 開放時機：照 StreetEntry.streetEntryState（StreetOpenGate）；上鎖點下去跳提示字講開放時機；
 *  - 進入：生活層疊在大廳上（回大廳就銷毀疊層，大廳不動）；帶真實家臣名冊與性別，接首訪任務；
 *  - 只在幕府大廳顯示：跟著 LobbyHallHost 的顯示與層級走，別的全螢幕面板蓋上來就一起被蓋住。
 */
import { _decorator, Color, Component, Layers, Node, UITransform, Widget } from 'cc';
import { services } from '../../../core/managers/ServiceLoader';
import { FriendshipService } from '../../../core/services/FriendshipService';
import type { GeneralConfig } from '../../../core/models/GeneralUnit';
import rosterJson from '../../../../resources/data/life-roster.json';
import budgetJson from '../../../../resources/data/q-anim-budget.json';
import streetJson from '../../../../resources/data/life-proto-street.json';
import { ownedLivingGenerals } from '../../core/OwnedRosterSource';
import {
    buildStreetRoster, claimStreetFirstVisitReward, markStreetRewardClaimed, openStreetFirstVisit, streetEntryState, toLifeId,
} from '../StreetEntry';
import type { RealGeneral } from '../StreetEntry';
import { LifeProtoScene } from './LifeProtoScene';
import { fitLabel, hexToColor, makeBox, makeLabel, newUiNode, placeBox, setBoxColor } from './LifeUiKit';

const { ccclass } = _decorator;

const ENTRY_NODE = 'StreetEntryButton';
const LAYER_NODE = 'StreetLayer';
const HALL_NODE = 'LobbyHallHost';
/** 按鈕大小（設計解析度 px；整個 Canvas 會隨螢幕縮放） */
const BTN_W = 220;
const BTN_H = 84;
const POLL_SEC = 0.4;

const GOLD = hexToColor('E8C879');
const GOLD_DIM = hexToColor('8A7B58');
const BODY = new Color(44, 30, 22, 235);
const BODY_DIM = new Color(34, 28, 26, 225);

function qaStreetOpen(): boolean {
    try {
        return typeof location !== 'undefined' && new URLSearchParams(location.search).get('streetQa') === '1';
    } catch {
        return false;
    }
}

function toReal(g: GeneralConfig): RealGeneral {
    return { id: g.id, name: g.name, gender: g.gender, faction: g.faction as unknown as string };
}

@ccclass('LifeStreetEntryButton')
export class LifeStreetEntryButton extends Component {
    private canvas!: Node;
    private frame!: Node;
    private body!: Node;
    private gateIcon!: Node;
    private lockIcon!: Node;
    private label!: ReturnType<typeof makeLabel>;
    private acc = 0;
    private opened = false;
    private lastOpen: boolean | null = null;

    /** 大廳就緒後呼叫一次：放入口鈕（已存在就不重放） */
    public static install(canvas: Node): void {
        if (canvas.getChildByName(ENTRY_NODE)) return;
        const n = newUiNode(ENTRY_NODE, canvas);
        n.addComponent(LifeStreetEntryButton).build(canvas);
    }

    private build(canvas: Node): void {
        this.canvas = canvas;
        const root = this.node;
        root.layer = Layers.Enum.UI_2D;
        root.getComponent(UITransform)!.setAnchorPoint(0.5, 0.5);
        root.getComponent(UITransform)!.setContentSize(BTN_W, BTN_H);
        // 右下角、推進一季鈕正上方：右緣 2%、下緣 11%（百分比，隨畫面伸縮）
        const w = root.addComponent(Widget);
        w.isAlignRight = true;
        w.isAlignBottom = true;
        w.isAbsoluteRight = false;
        w.isAbsoluteBottom = false;
        w.right = 0.02;
        w.bottom = 0.115;
        w.alignMode = Widget.AlignMode.ALWAYS;
        w.updateAlignment();

        this.frame = makeBox(root, 'Frame', GOLD);
        placeBox(this.frame, 0, 0, BTN_W, BTN_H);
        this.body = makeBox(root, 'Body', BODY);
        placeBox(this.body, 3, 3, BTN_W - 6, BTN_H - 6);
        this.gateIcon = this.buildGateIcon(root);
        this.lockIcon = this.buildLockIcon(root);
        this.label = makeLabel(root, 'Label', 34, GOLD);
        const lx = 84;
        placeBox(this.label.node, lx, 0, BTN_W - lx - 8, BTN_H);
        fitLabel(this.label, BTN_W - lx - 8, BTN_H, 2);
        this.label.string = services().i18n.t('life.street_entry.label');
        // 整顆鈕以左下為原點排版，位置交給 Widget；內容偏移半個尺寸讓中心對齊
        for (const c of root.children) c.setPosition(c.position.x - BTN_W / 2, c.position.y - BTN_H / 2, 0);
        root.on(Node.EventType.TOUCH_END, () => this.onTap());
        this.refresh(true);
    }

    /** 街門：兩根柱子＋橫梁＋屋簷＋門洞 */
    private buildGateIcon(parent: Node): Node {
        const icon = newUiNode('GateIcon', parent);
        const c = GOLD;
        const dark = BODY;
        const part = (name: string, x: number, y: number, w: number, h: number, color: Color): void => {
            placeBox(makeBox(icon, name, color), x, y, w, h);
        };
        part('RoofL', 12, 54, 52, 8, c);
        part('RoofTop', 22, 62, 32, 7, c);
        part('PillarL', 18, 14, 9, 40, c);
        part('PillarR', 49, 14, 9, 40, c);
        part('Lintel', 18, 44, 40, 7, c);
        part('Door', 27, 14, 22, 30, dark);
        part('Step', 14, 10, 48, 5, c);
        return icon;
    }

    /** 鎖頭：鎖身＋鎖環 */
    private buildLockIcon(parent: Node): Node {
        const icon = newUiNode('LockIcon', parent);
        const c = GOLD_DIM;
        const part = (name: string, x: number, y: number, w: number, h: number, color: Color): void => {
            placeBox(makeBox(icon, name, color), x, y, w, h);
        };
        part('ShackleL', 25, 38, 7, 24, c);
        part('ShackleR', 44, 38, 7, 24, c);
        part('ShackleTop', 25, 58, 26, 7, c);
        part('LockBody', 18, 14, 40, 30, c);
        part('Keyhole', 35, 24, 6, 12, BODY_DIM);
        icon.active = false;
        return icon;
    }

    private facts(): { firstBattleDone: boolean; seasonIndex: number } {
        const session = services().session;
        // 驗收旗標：網址帶 ?streetQa=1 時視為已打完第一場戰鬥（只放寬開放判斷，不動存檔；正式玩家看不到）
        return { firstBattleDone: session.firstBattleCleared || qaStreetOpen(), seasonIndex: session.gameTime.totalSeasonsElapsed + 1 };
    }

    private refresh(force = false): void {
        const hall = this.canvas.getChildByName(HALL_NODE);
        const visible = !!hall && hall.active && !this.opened;
        if (this.node.active !== visible) this.node.active = visible;
        if (!visible) return;
        // 跟著大廳層級：別的面板被拉到前面時，鈕就被蓋在下面
        const want = Math.min(this.canvas.children.length - 1, hall!.getSiblingIndex() + 1);
        if (this.node.getSiblingIndex() !== want) this.node.setSiblingIndex(want);
        const open = streetEntryState(this.facts()).open;
        if (!force && open === this.lastOpen) return;
        this.lastOpen = open;
        this.gateIcon.active = open;
        this.lockIcon.active = !open;
        this.label.color = open ? GOLD : GOLD_DIM;
        setBoxColor(this.body, open ? BODY : BODY_DIM);
        setBoxColor(this.frame, open ? GOLD : GOLD_DIM);
    }

    public update(dt: number): void {
        this.acc += dt;
        if (this.acc < POLL_SEC) return;
        this.acc = 0;
        this.refresh();
    }

    private onTap(): void {
        const state = streetEntryState(this.facts());
        const s = services();
        if (!state.open) {
            if (state.lockedHintKey) s.event.emit('SHOW_TOAST', { message: s.i18n.t(state.lockedHintKey), duration: 3 });
            return;
        }
        void this.openStreet();
    }

    /** 進大街：先把真實名冊與遊歷訪客備好，再疊上生活層 */
    private async openStreet(): Promise<void> {
        if (this.opened || this.canvas.getChildByName(LAYER_NODE)) return;
        this.opened = true;
        this.node.active = false;
        const s = services();
        try {
            const owned = ownedLivingGenerals(s.session.roster).map(toReal);
            const wanted = new Set((rosterJson as unknown as { generals: Array<{ id: string; kind: string }> }).generals
                .filter((g) => g.kind === 'visitor').map((g) => g.id));
            let visitors: RealGeneral[] = [];
            try {
                const all = await s.resource.loadJson<GeneralConfig[]>('data/generals');
                visitors = all.filter((g) => wanted.has(toLifeId(g.id))).map(toReal);
            } catch {
                visitors = [];
            }
            if (!this.canvas.isValid) return;
            const friendship = FriendshipService.getInstance();
            const budget = (budgetJson as unknown as { tiers: Record<string, { maxActors: number }> }).tiers[(streetJson as unknown as { tier: string }).tier];
            const roster = buildStreetRoster({
                retainers: owned,
                visitors,
                intimacyOf: (id) => friendship.get(id),
                maxActors: budget.maxActors,
                maxVisitors: 4,
            });
            const visit = openStreetFirstVisit();
            const layer = new Node(LAYER_NODE);
            layer.layer = Layers.Enum.UI_2D;
            this.canvas.addChild(layer);
            const scene = layer.addComponent(LifeProtoScene);
            scene.init(
                (k, ...a) => s.i18n.t(k, ...a),
                () => {
                    if (layer.isValid) layer.destroy();
                    this.opened = false;
                },
                {
                    roster,
                    visit,
                    facts: this.facts(),
                    claimReward: async () => {
                        const r = await claimStreetFirstVisitReward(s.api);
                        if (r.ok) markStreetRewardClaimed();
                        return r;
                    },
                },
            );
        } catch (err) {
            this.opened = false;
            console.warn('[LifeStreetEntry] 進入大街失敗', err);
        }
    }
}
