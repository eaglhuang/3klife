// @spec-source → PROG-2-10153 年末頒獎典禮 A 版領獎台（設計稿 artifacts/ui-review/ceremony-redesign-1127/）
import { Color, EventTouch, Font, Graphics, HorizontalTextAlignment, Label, Node, Sprite, SpriteFrame, tween, UIOpacity, UITransform, Vec3, VerticalTextAlignment } from 'cc';
import {
    CEREMONY_BOARD_BADGE,
    type CeremonyBoard,
    type CeremonyEntry,
} from '../../core/systems/YearEndCeremonyPodium';
import type { CeremonyTranslate } from '../../core/systems/YearEndCeremonyRuntime';

/**
 * CeremonyPodiumView — 頒獎台畫面（程式繪製，不新增圖集；節點只建一次，換榜只換文字與頭像）
 *
 * 版面（舞台中心為原點，y 向上；舞台設計尺寸 STAGE_W×STAGE_H，全部以舞台大小等比取座標，保留直式縮窄彈性）：
 *   標題帶（紅漸層）：獎盃（上凸）＋獎項名＋左上品牌／第 N 年＋右上榜序圓點
 *   副標列：第 N 年歲末頒獎典禮　幕名　｜　計分依據
 *   領獎台：冠軍居中最高，亞軍左、季軍右；每柱＝台座＋名次大字＋頭像＋名字分數＋得獎感言泡泡
 *   第 4 名以後：膠囊（池，最多 CAPSULE_MAX 個，≥6 筆縮小成兩行）
 */
export const STAGE_W = 1460;
export const STAGE_H = 640;
const CAPSULE_MAX = 10;

const COLOR = {
    parchment: '#F3E7CB',
    redTop: '#B03018',
    redBottom: '#8E1B12',
    gold: '#E8BE60',
    goldDeep: '#A06E00',
    goldLight: '#F7DE8E',
    silver: '#8D96A3',
    silverLight: '#D6DBE2',
    silverText: '#5D6672',
    bronze: '#B8651F',
    bronzeLight: '#E0A36A',
    bronzeText: '#8A4B12',
    ink: '#2D2926',
    title: '#FFF4D0',
    accent: '#FFE088',
    muted: '#6B5E4E',
    playerBg: '#F8E3A8',
    bubble: '#FFFDF5',
};

interface Column {
    rank: 1 | 2 | 3;
    root: Node;
    opacity: UIOpacity;
    pedestal: Graphics;
    rankLabel: Label;
    avatar: Sprite;
    avatarNode: Node;
    ring: Graphics;
    nameLabel: Label;
    scoreLabel: Label;
    bubble: Node;
    bubbleLabel: Label;
    crown: Node | null;
    shown: boolean;
    /** 載圖序號，換榜時舊結果丟棄 */
    loadSeq: number;
}

interface Capsule {
    node: Node;
    bg: Graphics;
    avatar: Sprite;
    label: Label;
    scoreLabel: Label;
}

export interface PodiumViewDeps {
    readonly font: Font | null;
    readonly t: CeremonyTranslate;
    readonly loadAvatar: (portraitId: string) => Promise<SpriteFrame | null>;
    /** 點前三名頭像：回傳這次要說的感言文字（由宿主依榜名、名次與點擊次數挑句） */
    readonly onTapWinner: (rank: 1 | 2 | 3) => string;
    /** 點舞台空白處：跳到下一榜 */
    readonly onTapStage: () => void;
}

const hex = (value: string): Color => new Color().fromHEX(value);

/** 柱的幾何：x 為柱中心、h 為台座高，冠軍最高；avatarSize 隨名次縮小 */
const COLUMN_GEOMETRY: Readonly<Record<1 | 2 | 3, { x: number; h: number; w: number; avatar: number }>> = {
    1: { x: 0, h: 140, w: 440, avatar: 104 },
    2: { x: -490, h: 100, w: 420, avatar: 92 },
    3: { x: 490, h: 76, w: 420, avatar: 92 },
};
const PEDESTAL_BOTTOM = -166;

export class CeremonyPodiumView {
    private readonly _stage: Node;
    private readonly _deps: PodiumViewDeps;
    private _built = false;
    private _titleLabel!: Label;
    private _brandLabel!: Label;
    private _yearLabel!: Label;
    private _subtitleLabel!: Label;
    private _badgeLabel!: Label;
    private _trophy!: Node;
    private _dots: Graphics | null = null;
    private _columns: Column[] = [];
    private _capsules: Capsule[] = [];
    private _board: CeremonyBoard | null = null;
    private _boardCount = 1;
    private _boardIndex = 0;

    constructor(stage: Node, deps: PodiumViewDeps) {
        this._stage = stage;
        this._deps = deps;
    }

    /** 目前顯示的榜（供台詞挑選） */
    public get board(): CeremonyBoard | null {
        return this._board;
    }

    /** 換榜：標題／獎盃字徽／副標／頭像／名字分數全換，台座與膠囊先收起，等 revealRank 一個個升起 */
    public setBoard(board: CeremonyBoard, year: number, boardIndex: number, boardCount: number, actHeadline: string): void {
        this.ensureBuilt();
        this._board = board;
        this._boardIndex = boardIndex;
        this._boardCount = boardCount;
        const t = this._deps.t;
        this._titleLabel.string = t(`ui.ceremony.board.${board.id}.title`);
        this._badgeLabel.string = CEREMONY_BOARD_BADGE[board.id];
        this._brandLabel.string = t(board.id === 'house' ? 'ui.ceremony.brand.house' : 'ui.ceremony.brand.fame');
        this._yearLabel.string = t('ui.ceremony.title', String(year));
        this._subtitleLabel.string = `${t('ui.ceremony.title', String(year))}　${actHeadline}　｜　${t(`ui.ceremony.board.${board.id}.desc`)}`;
        this.drawDots();
        for (const column of this._columns) this.fillColumn(column, board.entries.find((e) => e.rank === column.rank) ?? null);
        this.fillCapsules(board.entries.filter((e) => e.rank >= 4));
        this.hideAll();
    }

    /** 換幕（第 1 幕入場）時只更新副標的幕名，不重置台座 */
    public setActHeadline(year: number, actHeadline: string): void {
        if (!this._built || !this._board) return;
        const t = this._deps.t;
        this._subtitleLabel.string = `${t('ui.ceremony.title', String(year))}　${actHeadline}　｜　${t(`ui.ceremony.board.${this._board.id}.desc`)}`;
    }

    public hideAll(): void {
        for (const column of this._columns) {
            column.shown = false;
            column.opacity.opacity = 0;
            column.root.setScale(1, 1, 1);
            column.bubble.active = false;
        }
        // 膠囊保持在場、先全透明，等冠軍揭曉後再淡入
        for (const capsule of this._capsules) {
            const opacity = capsule.node.getComponent(UIOpacity);
            if (opacity) opacity.opacity = 0;
        }
    }

    /** 台座升起：由矮到高彈出，揭曉當下自動說第一句感言（clicks=0） */
    public revealRank(rank: 1 | 2 | 3): void {
        this.ensureBuilt();
        const column = this._columns[rank - 1];
        if (!column || column.shown) return;
        column.shown = true;
        const base = column.root.position;
        column.root.setPosition(base.x, base.y - 70, base.z);
        column.opacity.opacity = 0;
        column.root.setScale(0.9, 0.9, 1);
        tween(column.root)
            .to(0.28, { position: new Vec3(base.x, base.y + 8, base.z), scale: new Vec3(1.04, 1.04, 1) }, { easing: 'sineOut' })
            .to(0.14, { position: new Vec3(base.x, base.y, base.z), scale: new Vec3(1, 1, 1) })
            .start();
        tween(column.opacity).to(0.22, { opacity: 255 }).start();
        this.showSpeech(rank, this._deps.onTapWinner(rank));
        if (rank === 1) this.pulseTrophy();
    }

    /** 第 4 名以後的膠囊由上淡入（每項錯開 0.05 秒） */
    public revealCapsules(): void {
        this._capsules.forEach((capsule, i) => {
            if (!capsule.node.active) return;
            const opacity = capsule.node.getComponent(UIOpacity);
            if (!opacity) return;
            opacity.opacity = 0;
            tween(opacity).delay(i * 0.05).to(0.25, { opacity: 255 }).start();
        });
    }

    /** 全部直接亮出（第 3 幕、跳過典禮時用） */
    public revealAll(): void {
        this.ensureBuilt();
        for (const column of this._columns) {
            column.shown = true;
            column.opacity.opacity = 255;
            column.root.setScale(1, 1, 1);
        }
        for (const capsule of this._capsules) {
            const opacity = capsule.node.getComponent(UIOpacity);
            if (opacity) opacity.opacity = 255;
        }
    }

    /** 點頭像或揭曉：氣泡換成這句感言，頭像小跳一下 */
    public showSpeech(rank: 1 | 2 | 3, text: string): void {
        const column = this._columns[rank - 1];
        if (!column) return;
        column.bubble.active = text.length > 0;
        column.bubbleLabel.string = text;
        const base = column.avatarNode.position;
        tween(column.avatarNode).stop();
        column.avatarNode.setPosition(base.x, COLUMN_AVATAR_Y(rank), base.z);
        tween(column.avatarNode)
            .to(0.1, { position: new Vec3(base.x, COLUMN_AVATAR_Y(rank) + 14, base.z) }, { easing: 'sineOut' })
            .to(0.14, { position: new Vec3(base.x, COLUMN_AVATAR_Y(rank), base.z) }, { easing: 'sineIn' })
            .start();
    }

    /** 測試與截圖用：目前各柱的文字（名字、分數、感言） */
    public describe(): Array<{ rank: number; name: string; score: string; speech: string; shown: boolean }> {
        return this._columns.map((c) => ({ rank: c.rank, name: c.nameLabel.string, score: c.scoreLabel.string, speech: c.bubbleLabel.string, shown: c.shown }));
    }

    public get capsuleCount(): number {
        return this._capsules.filter((c) => c.node.active).length;
    }

    // ───────────── 建構 ─────────────

    private ensureBuilt(): void {
        if (this._built) return;
        this._built = true;
        const stage = this._stage;
        const stageTransform = stage.getComponent(UITransform) ?? stage.addComponent(UITransform);
        stageTransform.setContentSize(STAGE_W, STAGE_H);
        this.buildBackdrop();
        this.buildHeader();
        this._subtitleLabel = this.makeLabel(stage, 'Subtitle', 0, 128, STAGE_W - 120, 30, 22, COLOR.muted, false);
        for (const rank of [1, 2, 3] as const) this._columns.push(this.buildColumn(rank));
        for (let i = 0; i < CAPSULE_MAX; i++) this._capsules.push(this.buildCapsule(i));
        // 點舞台空白處換下一榜；頭像節點各自攔截事件，不會一起觸發
        stage.on(Node.EventType.TOUCH_END, () => this._deps.onTapStage());
    }

    private newNode(parent: Node, name: string, x: number, y: number, w: number, h: number): Node {
        const node = new Node(name);
        node.layer = parent.layer;
        node.addComponent(UITransform).setContentSize(w, h);
        node.setPosition(x, y, 0);
        parent.addChild(node);
        return node;
    }

    private makeLabel(parent: Node, name: string, x: number, y: number, w: number, h: number, size: number, color: string, bold: boolean, align: HorizontalTextAlignment = HorizontalTextAlignment.CENTER): Label {
        const node = this.newNode(parent, name, x, y, w, h);
        const label = node.addComponent(Label);
        if (this._deps.font) {
            label.useSystemFont = false;
            label.font = this._deps.font;
        }
        label.fontSize = size;
        label.lineHeight = Math.round(size * 1.25);
        label.color = hex(color);
        label.isBold = bold;
        label.horizontalAlign = align;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        label.string = '';
        // Label 剛掛上時預設會依文字自動縮放節點，overflow 設好後要把設計尺寸再寫回去
        node.getComponent(UITransform)?.setContentSize(w, h);
        return label;
    }

    private buildBackdrop(): void {
        const g = this.newNode(this._stage, 'Backdrop', 0, 0, STAGE_W, STAGE_H).addComponent(Graphics);
        g.fillColor = hex(COLOR.parchment);
        g.rect(-STAGE_W / 2, -STAGE_H / 2, STAGE_W, STAGE_H);
        g.fill();
    }

    /** 標題帶：紅漸層（兩段色塊）＋金線；獎盃凸出上緣，獎項名在獎盃下方，兩者不重疊 */
    private buildHeader(): void {
        const top = STAGE_H / 2;
        const bandH = 170;
        const g = this.newNode(this._stage, 'HeaderBand', 0, top - bandH / 2, STAGE_W, bandH).addComponent(Graphics);
        g.fillColor = hex(COLOR.redTop);
        g.rect(-STAGE_W / 2, 0, STAGE_W, bandH / 2);
        g.fill();
        g.fillColor = hex(COLOR.redBottom);
        g.rect(-STAGE_W / 2, -bandH / 2, STAGE_W, bandH / 2);
        g.fill();
        g.fillColor = hex(COLOR.gold);
        g.rect(-STAGE_W / 2, -bandH / 2 - 3, STAGE_W, 5);
        g.fill();
        this._brandLabel = this.makeLabel(this._stage, 'Brand', -STAGE_W / 2 + 210, top - 40, 340, 28, 24, COLOR.accent, true, HorizontalTextAlignment.LEFT);
        this._yearLabel = this.makeLabel(this._stage, 'Year', -STAGE_W / 2 + 210, top - 76, 340, 26, 20, COLOR.title, false, HorizontalTextAlignment.LEFT);
        this._titleLabel = this.makeLabel(this._stage, 'BoardTitle', 0, top - 135, 900, 62, 56, COLOR.title, true);
        this._titleLabel.isBold = true;
        // 獎盃：金杯＋底座，字徽疊在杯身；位置在標題上方，凸出標題帶 20px
        this._trophy = this.newNode(this._stage, 'Trophy', 0, top - 50, 110, 118);
        const tg = this._trophy.addComponent(Graphics);
        tg.fillColor = hex(COLOR.gold);
        tg.moveTo(-46, 56);
        tg.lineTo(46, 56);
        tg.lineTo(40, 6);
        tg.lineTo(0, -14);
        tg.lineTo(-40, 6);
        tg.close();
        tg.fill();
        tg.fillColor = hex(COLOR.goldLight);
        tg.rect(-34, 22, 14, 30);
        tg.fill();
        tg.fillColor = hex(COLOR.goldDeep);
        tg.rect(-7, -44, 14, 32);
        tg.rect(-30, -58, 60, 16);
        tg.fill();
        tg.strokeColor = hex(COLOR.gold);
        tg.lineWidth = 7;
        tg.arc(-48, 34, 18, Math.PI / 2, -Math.PI / 2, false);
        tg.arc(48, 34, 18, Math.PI / 2, 3 * Math.PI / 2, true);
        tg.stroke();
        this._badgeLabel = this.makeLabel(this._trophy, 'Badge', 0, 30, 60, 50, 40, COLOR.redBottom, true);
    }

    private drawDots(): void {
        if (!this._dots) {
            const node = this.newNode(this._stage, 'BoardDots', STAGE_W / 2 - 110, STAGE_H / 2 - 50, 90, 24);
            this._dots = node.addComponent(Graphics);
        }
        const g = this._dots;
        g.clear();
        for (let i = 0; i < this._boardCount; i++) {
            const x = (i - (this._boardCount - 1) / 2) * 28;
            if (i === this._boardIndex) {
                g.fillColor = hex(COLOR.gold);
                g.circle(x, 0, 9);
                g.fill();
            } else {
                g.strokeColor = hex(COLOR.gold);
                g.lineWidth = 3;
                g.circle(x, 0, 8);
                g.stroke();
            }
        }
    }

    private buildColumn(rank: 1 | 2 | 3): Column {
        const geo = COLUMN_GEOMETRY[rank];
        const root = this.newNode(this._stage, `Podium${rank}`, geo.x, 0, geo.w, 400);
        const opacity = root.addComponent(UIOpacity);
        const topLight = rank === 1 ? COLOR.goldLight : rank === 2 ? COLOR.silverLight : COLOR.bronzeLight;
        const body = rank === 1 ? COLOR.gold : rank === 2 ? COLOR.silver : COLOR.bronze;
        const pedestal = this.newNode(root, 'Pedestal', 0, 0, geo.w, geo.h).addComponent(Graphics);
        pedestal.node.setPosition(0, PEDESTAL_BOTTOM + geo.h / 2, 0);
        pedestal.fillColor = hex(body);
        pedestal.roundRect(-geo.w / 2, -geo.h / 2, geo.w, geo.h, 10);
        pedestal.fill();
        pedestal.fillColor = hex(topLight);
        pedestal.roundRect(-geo.w / 2, geo.h / 2 - 22, geo.w, 22, 10);
        pedestal.fill();
        const rankLabel = this.makeLabel(root, 'RankNumber', 0, PEDESTAL_BOTTOM + geo.h / 2 - 8, 120, 80, rank === 1 ? 72 : 56, '#FFFFFF', true);
        rankLabel.string = String(rank);
        const topY = PEDESTAL_BOTTOM + geo.h;
        // 頭像（圓）在柱左側，名字與分數在右側，感言泡泡在頭像上方整柱寬
        const avatarX = -geo.w / 2 + geo.avatar / 2 + 24;
        const avatarNode = this.newNode(root, 'Avatar', avatarX, COLUMN_AVATAR_Y(rank), geo.avatar, geo.avatar);
        const ring = this.newNode(avatarNode, 'Ring', 0, 0, geo.avatar + 12, geo.avatar + 12).addComponent(Graphics);
        ring.lineWidth = rank === 1 ? 7 : 5;
        ring.strokeColor = hex(rank === 1 ? COLOR.gold : rank === 2 ? COLOR.silver : COLOR.bronze);
        ring.circle(0, 0, geo.avatar / 2 + 2);
        ring.stroke();
        const avatarSprite = this.newNode(avatarNode, 'Face', 0, 0, geo.avatar, geo.avatar).addComponent(Sprite);
        avatarSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        const textX = avatarX + geo.avatar / 2 + 20 + 120;
        const nameColor = rank === 1 ? COLOR.ink : rank === 2 ? COLOR.silverText : COLOR.bronzeText;
        const nameLabel = this.makeLabel(root, 'Name', textX, COLUMN_AVATAR_Y(rank) + 16, 240, rank === 1 ? 44 : 38, rank === 1 ? 40 : 32, nameColor, true, HorizontalTextAlignment.LEFT);
        const scoreLabel = this.makeLabel(root, 'Score', textX, COLUMN_AVATAR_Y(rank) - 20, 240, 32, rank === 1 ? 28 : 24, rank === 1 ? COLOR.goldDeep : nameColor, true, HorizontalTextAlignment.LEFT);
        // 感言泡泡：整柱寬，位於頭像與名字上方
        const bubbleW = geo.w - 8;
        const bubbleH = 64;
        const bubble = this.newNode(root, 'Bubble', 0, topY + 20 + geo.avatar + bubbleH / 2 + 8, bubbleW, bubbleH);
        const bg = this.newNode(bubble, 'Bg', 0, 0, bubbleW, bubbleH).addComponent(Graphics);
        bg.fillColor = hex(COLOR.bubble);
        bg.strokeColor = hex(COLOR.gold);
        bg.lineWidth = 3;
        bg.roundRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, 14);
        bg.fill();
        bg.stroke();
        bg.fillColor = hex(COLOR.bubble);
        bg.moveTo(-geo.w / 2 + geo.avatar / 2 + 4, -bubbleH / 2 + 1);
        bg.lineTo(-geo.w / 2 + geo.avatar / 2 + 28, -bubbleH / 2 + 1);
        bg.lineTo(-geo.w / 2 + geo.avatar / 2 + 12, -bubbleH / 2 - 14);
        bg.close();
        bg.fill();
        const bubbleLabel = this.makeLabel(bubble, 'Speech', 0, 0, bubbleW - 28, bubbleH - 14, 22, COLOR.ink, false, HorizontalTextAlignment.LEFT);
        bubbleLabel.overflow = Label.Overflow.SHRINK;
        bubbleLabel.enableWrapText = true;
        let crown: Node | null = null;
        if (rank === 1) {
            crown = this.newNode(root, 'Crown', avatarX, COLUMN_AVATAR_Y(rank) + geo.avatar / 2 + 12, 40, 26);
            const cg = crown.addComponent(Graphics);
            cg.fillColor = hex(COLOR.gold);
            cg.moveTo(-18, -10);
            cg.lineTo(-18, 6);
            cg.lineTo(-9, -2);
            cg.lineTo(0, 10);
            cg.lineTo(9, -2);
            cg.lineTo(18, 6);
            cg.lineTo(18, -10);
            cg.close();
            cg.fill();
        }
        avatarNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            this.showSpeech(rank, this._deps.onTapWinner(rank));
        });
        return { rank, root, opacity, pedestal, rankLabel, avatar: avatarSprite, avatarNode, ring, nameLabel, scoreLabel, bubble, bubbleLabel, crown, shown: false, loadSeq: 0 };
    }

    private fillColumn(column: Column, entry: CeremonyEntry | null): void {
        column.root.active = entry !== null;
        if (!entry) return;
        column.nameLabel.string = entry.name;
        column.scoreLabel.string = this._deps.t('ui.ceremony.podium.score', String(entry.score));
        column.loadSeq += 1;
        const seq = column.loadSeq;
        column.avatar.spriteFrame = null;
        void this._deps.loadAvatar(entry.portraitId ?? '').then((frame) => {
            if (!frame || seq !== column.loadSeq || !column.avatar.node.isValid) return;
            column.avatar.sizeMode = Sprite.SizeMode.CUSTOM;
            column.avatar.spriteFrame = frame;
            column.avatar.node.getComponent(UITransform)?.setContentSize(COLUMN_GEOMETRY[column.rank].avatar, COLUMN_GEOMETRY[column.rank].avatar);
        });
    }

    private buildCapsule(index: number): Capsule {
        const node = this.newNode(this._stage, `Capsule${index + 1}`, 0, -270, 260, 34);
        node.addComponent(UIOpacity);
        const bg = this.newNode(node, 'Bg', 0, 0, 260, 34).addComponent(Graphics);
        const avatarNode = this.newNode(node, 'Face', -100, 0, 28, 28);
        const avatar = avatarNode.addComponent(Sprite);
        avatar.sizeMode = Sprite.SizeMode.CUSTOM;
        const label = this.makeLabel(node, 'Name', -25, 0, 150, 30, 18, COLOR.ink, true, HorizontalTextAlignment.LEFT);
        const scoreLabel = this.makeLabel(node, 'Score', 85, 0, 80, 30, 16, COLOR.muted, true, HorizontalTextAlignment.RIGHT);
        node.active = false;
        return { node, bg, avatar, label, scoreLabel };
    }

    /** 膠囊排版：≥6 筆縮小成兩行；每行最多 5 顆，置中 */
    private fillCapsules(entries: readonly CeremonyEntry[]): void {
        const shown = entries.slice(0, CAPSULE_MAX);
        const compact = shown.length >= 6;
        const perRow = compact ? Math.ceil(shown.length / 2) : Math.max(1, shown.length);
        const scale = compact ? 0.9 : 1;
        const w = 270;
        const rowGap = 36;
        this._capsules.forEach((capsule, i) => {
            const entry = shown[i];
            capsule.node.active = !!entry;
            if (!entry) return;
            const row = Math.floor(i / perRow);
            const col = i % perRow;
            const inThisRow = row === 0 ? Math.min(perRow, shown.length) : shown.length - perRow;
            capsule.node.setPosition((col - (inThisRow - 1) / 2) * (w + 16), -262 - row * rowGap, 0);
            capsule.node.setScale(scale, scale, 1);
            capsule.bg.clear();
            capsule.bg.fillColor = hex(entry.isPlayer ? COLOR.playerBg : '#EFE2C2');
            capsule.bg.strokeColor = hex(entry.isPlayer ? COLOR.gold : '#B9A98A');
            capsule.bg.lineWidth = 2;
            capsule.bg.roundRect(-130, -17, 260, 34, 17);
            capsule.bg.fill();
            capsule.bg.stroke();
            capsule.label.string = `${this._deps.t('ui.ceremony.podium.capsule', String(entry.rank))}　${entry.name}`;
            capsule.label.node.getComponent(UITransform)?.setContentSize(190, 30);
            capsule.label.node.setPosition(-45, 0, 0);
            capsule.scoreLabel.string = this._deps.t('ui.ceremony.podium.score', String(entry.score));
            capsule.avatar.spriteFrame = null;
            void this._deps.loadAvatar(entry.portraitId ?? '').then((frame) => {
                if (!frame || !capsule.avatar.node.isValid || !capsule.node.active) return;
                capsule.avatar.spriteFrame = frame;
                capsule.avatar.node.getComponent(UITransform)?.setContentSize(28, 28);
            });
        });
    }

    private pulseTrophy(): void {
        tween(this._trophy).stop();
        this._trophy.setScale(1, 1, 1);
        tween(this._trophy)
            .to(0.15, { scale: new Vec3(1.15, 1.15, 1) })
            .to(0.2, { scale: new Vec3(1, 1, 1) })
            .start();
    }
}

/** 頭像中心的 y（台座頂面上方；冠軍柱最高所以頭像也最高） */
function COLUMN_AVATAR_Y(rank: 1 | 2 | 3): number {
    const geo = COLUMN_GEOMETRY[rank];
    return PEDESTAL_BOTTOM + geo.h + 20 + geo.avatar / 2;
}
