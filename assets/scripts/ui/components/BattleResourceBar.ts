// @spec-source → 戰場軍勢糧草常駐顯示與出牌不足提示規格書.md (doc_spec_1341) §3；PROG-2-10104
/**
 * BattleResourceBar — 戰場常駐資源列：軍勢 目前/總量、糧草 目前/總量（只顯示我方）。
 *
 * - 錨點：上方置中，寬度與高度走比例；直式（寬 < 高）改成上下兩列，不寫死橫式座標。
 * - 重用節點：全部節點只在第一次建立，之後只改文字與重畫兩條進度條，不每幀配置。
 * - 數字滾動 0.25 秒、低於 25% 轉紅並跳動一下：都只在有變化時才開 update，平時不佔每幀成本。
 * - 選卡預覽：呼叫 setPreview(cost) 在兩條進度條上標出「派出後會剩多少」的白色細豎線。
 *
 * Unity 對照：像一個 HUD 上的 ResourceMeter prefab，Presenter（DeployComposite）只呼叫 SetSnapshot。
 */
import { _decorator, Color, Component, Graphics, Label, Node, UITransform, Widget } from 'cc';
import {
    resourceAfterDeploy,
    resourceFillRatio,
    resourceTone,
    type ResourceSnapshot,
    type ResourceTone,
} from '../../core/systems/SortieDeployScripts';
import { services } from '../../core/managers/ServiceLoader';

const { ccclass } = _decorator;

const NODE_NAME = 'BattleResourceBar';
/** 頂欄（回合數、關卡名）下緣到資源列上緣的距離；頂欄高度約 104px，留 4px 縫 */
const TOP_OFFSET = 108;
const WIDTH_RATIO_LANDSCAPE = 0.36;
const MIN_WIDTH = 690;
const HEIGHT_LANDSCAPE = 76;
const HEIGHT_PORTRAIT = 92;
const ROLL_SECONDS = 0.25;
const POP_SECONDS = 0.2;
const TIP_SECONDS = 3;

const COLOR_GOLD = new Color(244, 206, 96, 255);
const COLOR_RED = new Color(238, 84, 72, 255);
const COLOR_DIM = new Color(206, 194, 168, 255);
const COLOR_PANEL = new Color(34, 24, 16, 232);
const COLOR_STROKE = new Color(150, 118, 58, 255);
const COLOR_TRACK = new Color(14, 10, 8, 255);
const COLOR_PREVIEW = new Color(255, 255, 255, 235);
const COLOR_FILL: Readonly<Record<ResourceTone, Color>> = {
    normal: new Color(222, 176, 64, 255),
    low: new Color(226, 70, 58, 255),
    empty: new Color(226, 70, 58, 255),
};

type ResourceKey = 'troops' | 'food';

interface Section {
    key: ResourceKey;
    root: Node;
    icon: Graphics;
    iconLabel: Label;
    name: Label;
    value: Label;
    max: Label;
    emptyTag: Label;
    infoHit: Node;
    infoLabel: Label;
    /** 數字滾動：目前顯示值與目標值 */
    shown: number;
    target: number;
    cur: number;
    maxValue: number;
    tone: ResourceTone;
    popT: number;
}

function makeLabel(parent: Node, name: string, size: number, color: Color, h: number, bold = false): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    parent.addChild(node);
    const ui = node.addComponent(UITransform);
    ui.setContentSize(160, size + 8);
    const label = node.addComponent(Label);
    label.fontSize = size;
    label.lineHeight = size + 4;
    label.color = color;
    label.isBold = bold;
    label.horizontalAlign = h;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.NONE;
    label.enableOutline = true;
    label.outlineColor = new Color(0, 0, 0, 200);
    label.outlineWidth = 2;
    return label;
}

function fmt(n: number): string {
    return Math.round(n).toLocaleString('en-US');
}

@ccclass('BattleResourceBar')
export class BattleResourceBar extends Component {
    /** 在 host 底下取得或建立常駐資源列（重複呼叫回同一個） */
    public static mount(host: Node): BattleResourceBar {
        const existing = host.getChildByName(NODE_NAME);
        if (existing?.isValid) {
            const comp = existing.getComponent(BattleResourceBar);
            if (comp) return comp;
        }
        const node = new Node(NODE_NAME);
        node.layer = host.layer;
        host.addChild(node);
        const comp = node.addComponent(BattleResourceBar);
        comp.build();
        return comp;
    }

    private panel: Graphics | null = null;
    private bars: Graphics | null = null;
    private sections: Section[] = [];
    private tipNode: Node | null = null;
    private tipBg: Graphics | null = null;
    private tipLabel: Label | null = null;
    private snapshot: ResourceSnapshot | null = null;
    private previewCost: { troopCost: number; foodCost: number } | null = null;
    private laidOutFor = '';

    /** 目前是否顯示軍勢（非名冊出征不顯示） */
    public get troopsVisible(): boolean {
        return this.sections[0]?.root.active ?? false;
    }

    private build(): void {
        const node = this.node;
        node.addComponent(UITransform);
        const widget = node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignHorizontalCenter = true;
        widget.top = TOP_OFFSET;
        widget.horizontalCenter = 0;

        const panelNode = new Node('Panel');
        panelNode.layer = node.layer;
        node.addChild(panelNode);
        panelNode.addComponent(UITransform);
        this.panel = panelNode.addComponent(Graphics);

        const barsNode = new Node('Bars');
        barsNode.layer = node.layer;
        node.addChild(barsNode);
        barsNode.addComponent(UITransform);
        this.bars = barsNode.addComponent(Graphics);

        this.sections = [this.buildSection('troops', '兵'), this.buildSection('food', '糧')];
        this.buildTip();
        this.applyTexts();
        this.enabled = false;
    }

    private buildSection(key: ResourceKey, glyph: string): Section {
        const root = new Node(`Section_${key}`);
        root.layer = this.node.layer;
        this.node.addChild(root);
        root.addComponent(UITransform);

        const iconNode = new Node('Icon');
        iconNode.layer = root.layer;
        root.addChild(iconNode);
        iconNode.addComponent(UITransform).setContentSize(34, 34);
        const icon = iconNode.addComponent(Graphics);
        const iconLabel = makeLabel(iconNode, 'Glyph', 18, COLOR_GOLD, Label.HorizontalAlign.CENTER, true);
        iconLabel.string = glyph;
        iconLabel.node.getComponent(UITransform)!.setContentSize(34, 26);

        const name = makeLabel(root, 'Name', 20, COLOR_DIM, Label.HorizontalAlign.LEFT);
        const value = makeLabel(root, 'Value', 32, COLOR_GOLD, Label.HorizontalAlign.RIGHT, true);
        const max = makeLabel(root, 'Max', 20, COLOR_DIM, Label.HorizontalAlign.LEFT);
        const emptyTag = makeLabel(root, 'EmptyTag', 18, COLOR_RED, Label.HorizontalAlign.LEFT, true);
        emptyTag.node.active = false;

        const infoHit = new Node('Info');
        infoHit.layer = root.layer;
        root.addChild(infoHit);
        infoHit.addComponent(UITransform).setContentSize(44, 44);
        const infoLabel = makeLabel(infoHit, 'InfoGlyph', 22, COLOR_DIM, Label.HorizontalAlign.CENTER);
        infoLabel.string = 'ⓘ';
        infoLabel.node.getComponent(UITransform)!.setContentSize(44, 30);
        infoHit.on(Node.EventType.TOUCH_END, () => this.toggleTip(key), this);

        return { key, root, icon, iconLabel, name, value, max, emptyTag, infoHit, infoLabel, shown: 0, target: 0, cur: 0, maxValue: 0, tone: 'normal', popT: 0 };
    }

    private buildTip(): void {
        const tip = new Node('Tip');
        tip.layer = this.node.layer;
        this.node.addChild(tip);
        tip.addComponent(UITransform);
        this.tipBg = tip.addComponent(Graphics);
        this.tipLabel = makeLabel(tip, 'TipText', 20, new Color(250, 240, 220, 255), Label.HorizontalAlign.LEFT);
        this.tipLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
        this.tipLabel.enableWrapText = true;
        this.tipLabel.lineHeight = 26;
        tip.active = false;
        this.tipNode = tip;
    }

    /** 文字全走 i18n；語系切換後呼叫一次即可重新套用 */
    public applyTexts(): void {
        const t = (k: string): string => services().i18n.t(k);
        const [troops, food] = this.sections;
        if (troops) {
            troops.name.string = t('battle.resource.troops.name');
        }
        if (food) {
            food.name.string = t('battle.resource.food.name');
        }
        for (const s of this.sections) s.emptyTag.string = t('battle.resource.empty');
        this.laidOutFor = '';
        this.layout();
        this.redrawBars();
    }

    /** 軍勢／糧草目前值與總量；沒有 troops 就把軍勢整項藏起來（舊路徑） */
    public setSnapshot(snap: ResourceSnapshot): void {
        this.snapshot = snap;
        const [troops, food] = this.sections;
        const hadTroops = troops.root.active;
        troops.root.active = !!snap.troops;
        if (hadTroops !== troops.root.active) this.laidOutFor = '';
        if (snap.troops) this.applyValue(troops, snap.troops.cur, snap.troops.max);
        this.applyValue(food, snap.food.cur, snap.food.max);
        this.layout();
        this.redrawBars();
    }

    /** 選中兵牌時標出派出後剩餘；null 取消 */
    public setPreview(cost: { troopCost: number; foodCost: number } | null): void {
        this.previewCost = cost;
        this.redrawBars();
    }

    /** 給測試與實跑檢查用：目前顯示的文字（不含滾動中的中間值） */
    public readout(): { troops: string | null; food: string; troopsMax: string | null; foodMax: string } {
        const [troops, food] = this.sections;
        return {
            troops: troops.root.active ? troops.value.string : null,
            troopsMax: troops.root.active ? troops.max.string : null,
            food: food.value.string,
            foodMax: food.max.string,
        };
    }

    private applyValue(s: Section, cur: number, max: number): void {
        const first = s.value.string === '';
        const tone = resourceTone(cur, max);
        const dropped = !first && cur < s.cur;
        s.cur = cur;
        s.maxValue = max;
        s.target = cur;
        s.max.string = `/ ${fmt(max)}`;
        // 第一次給值直接顯示，不從 0 滾上來
        if (first) {
            s.shown = cur;
            s.value.string = fmt(cur);
        } else if (Math.round(s.shown) !== cur) {
            this.enabled = true;
        }
        s.value.color = tone === 'normal' ? COLOR_GOLD : COLOR_RED;
        s.emptyTag.node.active = tone === 'empty';
        if (tone !== 'normal' && dropped) {
            s.popT = POP_SECONDS;
            this.enabled = true;
        }
        s.tone = tone;
    }

    protected update(dt: number): void {
        let busy = false;
        for (const s of this.sections) {
            if (Math.round(s.shown) !== s.target) {
                const step = (s.target - s.shown) * Math.min(1, dt / (ROLL_SECONDS * 0.35));
                s.shown = Math.abs(s.target - s.shown) < 1 ? s.target : s.shown + step;
                s.value.string = fmt(s.shown);
                busy = true;
            } else if (s.value.string !== fmt(s.target)) {
                s.shown = s.target;
                s.value.string = fmt(s.target);
            }
            if (s.popT > 0) {
                s.popT = Math.max(0, s.popT - dt);
                const k = 1 + 0.25 * Math.sin((1 - s.popT / POP_SECONDS) * Math.PI);
                s.value.node.setScale(k, k, 1);
                busy = true;
            } else if (s.value.node.scale.x !== 1) {
                s.value.node.setScale(1, 1, 1);
            }
        }
        if (!busy) this.enabled = false;
        // 滾動中的數字寬度會變，/ 總量要貼著數字右側
        this.placeMaxLabels();
    }

    // ── 版面 ────────────────────────────────────────────────

    private hostSize(): { w: number; h: number } {
        const ui = this.node.parent?.getComponent(UITransform);
        return { w: ui?.width ?? 1920, h: ui?.height ?? 1080 };
    }

    private layout(): void {
        const host = this.hostSize();
        const portrait = host.w < host.h;
        const visible = this.sections.filter((s) => s.root.active);
        const key = `${Math.round(host.w)}x${Math.round(host.h)}:${visible.length}:${this.sections[0].name.string}`;
        if (key === this.laidOutFor) return;
        this.laidOutFor = key;

        const count = Math.max(1, visible.length);
        const width = portrait ? host.w * 0.96 : Math.max(MIN_WIDTH, host.w * WIDTH_RATIO_LANDSCAPE * (count === 1 ? 0.6 : 1));
        const height = portrait ? HEIGHT_PORTRAIT : HEIGHT_LANDSCAPE;
        this.node.getComponent(UITransform)!.setContentSize(width, height);
        this.node.getComponent(Widget)?.updateAlignment();

        // 直式：上下兩列；橫式：左右兩欄
        const cellW = portrait ? width : width / count;
        const cellH = portrait ? height / count : height;
        visible.forEach((s, i) => {
            const cx = portrait ? 0 : -width / 2 + cellW * (i + 0.5);
            const cy = portrait ? height / 2 - cellH * (i + 0.5) : 0;
            s.root.setPosition(cx, cy, 0);
            s.root.getComponent(UITransform)!.setContentSize(cellW, cellH);
            this.layoutSection(s, cellW, cellH);
        });
        this.drawPanel(width, height, count, portrait);
        this.placeTip(width, height);
        this.placeMaxLabels();
    }

    private layoutSection(s: Section, w: number, h: number): void {
        const compact = h < 60;
        const left = -w / 2 + 14;
        const topY = compact ? 0 : 10;
        const valueSize = compact ? 24 : 32;
        s.value.fontSize = valueSize;
        s.value.lineHeight = valueSize + 4;
        s.icon.clear();
        s.icon.fillColor = new Color(62, 42, 20, 255);
        s.icon.strokeColor = COLOR_GOLD;
        s.icon.lineWidth = 2;
        s.icon.circle(0, 0, 15);
        s.icon.fill();
        s.icon.stroke();
        s.icon.node.setPosition(left + 17, topY, 0);
        s.name.node.setPosition(left + 40, topY, 0);
        this.setAnchor(s.name.node, 0, 0.5);
        const valueRight = left + 40 + (compact ? 70 : 78) + (compact ? 60 : 96);
        s.value.node.setPosition(valueRight, topY, 0);
        this.setAnchor(s.value.node, 1, 0.5);
        this.setAnchor(s.max.node, 0, 0.5);
        this.setAnchor(s.emptyTag.node, 0, 0.5);
        s.infoHit.setPosition(w / 2 - 26, topY, 0);
    }

    private setAnchor(node: Node, x: number, y: number): void {
        node.getComponent(UITransform)?.setAnchorPoint(x, y);
    }

    private placeMaxLabels(): void {
        for (const s of this.sections) {
            if (!s.root.active) continue;
            const v = s.value.node.position;
            s.max.node.setPosition(v.x + 8, v.y - 3, 0);
            s.emptyTag.node.setPosition(v.x + 98, v.y + 14, 0);
        }
    }

    private drawPanel(w: number, h: number, count: number, portrait: boolean): void {
        const g = this.panel;
        if (!g) return;
        g.clear();
        g.fillColor = COLOR_PANEL;
        g.strokeColor = COLOR_STROKE;
        g.lineWidth = 2;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.fill();
        g.stroke();
        if (count > 1) {
            g.strokeColor = new Color(120, 96, 52, 200);
            g.lineWidth = 1;
            if (portrait) {
                g.moveTo(-w / 2 + 12, 0);
                g.lineTo(w / 2 - 12, 0);
            } else {
                g.moveTo(0, -h / 2 + 10);
                g.lineTo(0, h / 2 - 10);
            }
            g.stroke();
        }
    }

    private redrawBars(): void {
        const g = this.bars;
        if (!g) return;
        g.clear();
        const preview = this.previewCost && this.snapshot ? resourceAfterDeploy(this.snapshot, this.previewCost) : null;
        for (const s of this.sections) {
            if (!s.root.active) continue;
            const ui = s.root.getComponent(UITransform)!;
            const w = ui.width - 28 - 52;
            const x = s.root.position.x - ui.width / 2 + 14;
            const y = s.root.position.y - ui.height / 2 + (ui.height < 60 ? 8 : 12);
            const ratio = resourceFillRatio(s.cur, s.maxValue);
            g.fillColor = COLOR_TRACK;
            g.roundRect(x, y, w, 8, 4);
            g.fill();
            if (ratio > 0) {
                g.fillColor = COLOR_FILL[s.tone];
                g.roundRect(x, y, Math.max(8, w * ratio), 8, 4);
                g.fill();
            }
            const after = preview ? (s.key === 'troops' ? preview.troops : preview.food) : undefined;
            if (after) {
                const px = x + w * resourceFillRatio(after.cur, after.max);
                g.fillColor = COLOR_PREVIEW;
                g.rect(px - 1.5, y - 4, 3, 16);
                g.fill();
            }
        }
    }

    // ── ⓘ 說明氣泡 ───────────────────────────────────────────

    private placeTip(w: number, h: number): void {
        if (!this.tipNode) return;
        this.tipNode.setPosition(0, -h / 2 - 8, 0);
        this.tipNode.getComponent(UITransform)!.setAnchorPoint(0.5, 1);
        void w;
    }

    private toggleTip(key: ResourceKey): void {
        const node = this.tipNode;
        const label = this.tipLabel;
        const g = this.tipBg;
        if (!node || !label || !g) return;
        const text = services().i18n.t(`battle.resource.${key}.tip`);
        if (node.active && label.string === text) {
            this.hideTip();
            return;
        }
        const width = Math.min(520, this.node.getComponent(UITransform)!.width);
        label.node.getComponent(UITransform)!.setContentSize(width - 28, 30);
        label.string = text;
        label.updateRenderData(true);
        const textH = label.node.getComponent(UITransform)!.height;
        const h = textH + 20;
        label.node.setPosition(0, -h / 2, 0);
        node.getComponent(UITransform)!.setContentSize(width, h);
        g.clear();
        g.fillColor = new Color(24, 16, 10, 240);
        g.strokeColor = COLOR_STROKE;
        g.lineWidth = 2;
        g.roundRect(-width / 2, -h, width, h, 8);
        g.fill();
        g.stroke();
        node.setSiblingIndex(node.parent!.children.length - 1);
        node.active = true;
        this.unschedule(this.hideTip);
        this.scheduleOnce(this.hideTip, TIP_SECONDS);
    }

    private hideTip = (): void => {
        if (this.tipNode) this.tipNode.active = false;
    };
}
