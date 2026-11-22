/**
 * TroopTypeBadge.ts — 兵種徽章共用繪製（PROG-2-9724）
 *
 * 全遊戲的兵種符號只有這一處畫法：戰場頭頂徽章、虎符卡、武將資訊、精兵圖鑑都走這裡。
 * 底圓：battle_badge_atlas 右格的金圈深底圓章；剪影：battle_unit_type_<key> 對應的 battle_unit_type_icon_<key>（單色象牙白）。
 * 剪影沒交件或載入失敗時退回 shared/TallyCardContract 的 troopTypeGlyph 單字（象牙白字，疊在同一顆圓章上）。
 * 節點在 attach 時一次建好，之後只換圖與字，不重複建立（手機記憶體優先）。
 * Unity 對照：同一個 Icon Prefab，圖缺失時切到 TMP 文字子物件。
 */
import { Color, Label, Node, Rect, Sprite, SpriteFrame, UITransform } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { troopTypeGlyph } from '../../shared/TallyCardContract';

/** 兵種剪影資源前綴；交件路徑固定為 sprites/battle/battle_unit_type_icon_<key> */
export const TROOP_TYPE_ICON_PREFIX = 'sprites/battle/battle_unit_type_icon_';
/** 部隊徽章底圖（2 倍解析度；左 80x80 九宮格底框、右 80x80 兵種圓章），由 tools_node/gen-battle-badge-atlas.py 產生 */
export const BADGE_ATLAS_PATH = 'sprites/battle/battle_badge_atlas';
const BADGE_ATLAS_CELL = 80;
const BADGE_ATLAS_INSET = 30;
/** 底圖 2 倍解析度，節點縮 0.5 還原 */
export const BADGE_ATLAS_SCALE = 0.5;

/** 剪影與單字共用的象牙白 */
export const TROOP_BADGE_IVORY = new Color(243, 233, 210, 255);
const TROOP_BADGE_OUTLINE = new Color(30, 18, 8, 255);
const TROOP_BADGE_OUTLINE_WIDTH = 2;
const WHITE = new Color(255, 255, 255, 255);

export type SpriteFrameLoader = (path: string) => Promise<SpriteFrame | null>;
const defaultLoader: SpriteFrameLoader = (path) => services().resource.loadSpriteFrame(path).catch(() => null);

/** 兵種代號正規化（與資源 key 一致）：小寫、非英數字換底線 */
export function normalizeTroopTypeKey(raw: string | null | undefined): string {
    return `${raw ?? ''}`
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/** 兵種剪影的資源路徑；兵種空白時回 null */
export function troopTypeIconPath(raw: string | null | undefined): string | null {
    const key = normalizeTroopTypeKey(raw);
    return key.length > 0 ? `${TROOP_TYPE_ICON_PREFIX}${key}` : null;
}

const iconLoads = new Map<string, Promise<SpriteFrame | null>>();

/** 兵種剪影（同一路徑只載一次；失敗結果也快取，之後直接退回單字） */
export function loadTroopTypeIconFrame(raw: string | null | undefined, loader: SpriteFrameLoader = defaultLoader): Promise<SpriteFrame | null> {
    const path = troopTypeIconPath(raw);
    if (!path) return Promise.resolve(null);
    let pending = iconLoads.get(path);
    if (!pending) {
        pending = loader(path).catch(() => null);
        iconLoads.set(path, pending);
    }
    return pending;
}

export interface BadgeAtlasFrames {
    /** 左格：九宮格底框 */
    bg: SpriteFrame;
    /** 右格：金圈深底圓章 */
    disc: SpriteFrame;
}

let atlasLoad: Promise<BadgeAtlasFrames | null> | null = null;

/** 徽章底圖切成底框與圓章兩個 SpriteFrame；共用同一張貼圖，才能跟其他徽章合批 */
export function loadBadgeAtlasFrames(): Promise<BadgeAtlasFrames | null> {
    if (!atlasLoad) {
        atlasLoad = services().resource.loadSpriteFrame(BADGE_ATLAS_PATH, { tags: ['battle'] })
            .then((base) => {
                const cut = (x: number): SpriteFrame => {
                    const frame = new SpriteFrame();
                    frame.packable = false;
                    frame.texture = base.texture;
                    frame.rect = new Rect(x, 0, BADGE_ATLAS_CELL, BADGE_ATLAS_CELL);
                    return frame;
                };
                const bg = cut(0);
                bg.insetLeft = BADGE_ATLAS_INSET;
                bg.insetRight = BADGE_ATLAS_INSET;
                bg.insetTop = BADGE_ATLAS_INSET;
                bg.insetBottom = BADGE_ATLAS_INSET;
                return { bg, disc: cut(BADGE_ATLAS_CELL) };
            })
            .catch(() => null);
    }
    return atlasLoad;
}

/** 在 parent 下建金圈圓章節點（size 為畫面直徑）；底圖載好才指定 SpriteFrame */
export function addBadgeDisc(parent: Node, name: string, size: number, x = 0, y = 0): Node {
    const node = new Node(name);
    node.layer = parent.layer;
    parent.addChild(node);
    node.setPosition(x, y, 0);
    node.setScale(BADGE_ATLAS_SCALE, BADGE_ATLAS_SCALE, 1);
    node.addComponent(UITransform).setContentSize(size / BADGE_ATLAS_SCALE, size / BADGE_ATLAS_SCALE);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.type = Sprite.Type.SIMPLE;
    void loadBadgeAtlasFrames().then((frames) => {
        if (frames && sprite.isValid) sprite.spriteFrame = frames.disc;
    });
    return node;
}

/** 元件所在節點（真實 cc 元件都有 node；型別檢查用的 mock 沒有，這裡補上） */
type NodeHost = { readonly node: Node; readonly isValid: boolean };

export interface TroopTypeBadgeParts {
    /** 兵種剪影（載入成功才顯示） */
    icon: Sprite & NodeHost;
    /** 金圈圓章節點（畫在剪影與單字後面） */
    disc: Node;
    /** 退路單字（剪影不可用時顯示） */
    glyph: Label & NodeHost;
}

export interface TroopTypeBadgeAttachOptions {
    /** 圓章直徑；沒給就用剪影節點的尺寸 */
    size?: number;
    /** 圓章父節點（戰場合批時換成共用底層代理）；沒給就與剪影同一父節點 */
    discParent?: Node;
    /** 已存在的單字節點（戰場頭頂徽章沿用既有 typeLabel）；沒給就新建 */
    glyph?: Label & NodeHost;
    /** 新建單字節點時的父節點（沒給就與剪影同一父節點） */
    textParent?: Node;
    /** 剪影載入器（測試用，預設走資源服務） */
    loader?: SpriteFrameLoader;
}

/** 剪影邊長相對圓章直徑的比例（戰場頭頂徽章同款：直徑 40 配剪影 28） */
const TROOP_ICON_RATIO = 0.7;
const mountedBadges = new WeakMap<Node, TroopTypeBadge>();

export class TroopTypeBadge {
    private shownKey: string | null = null;
    private seq = 0;

    constructor(private readonly parts: TroopTypeBadgeParts, private readonly loader: SpriteFrameLoader = defaultLoader) {
        parts.icon.node.active = false;
        parts.glyph.color = TROOP_BADGE_IVORY;
        parts.glyph.node.active = true;
    }

    /** 收編既有的剪影節點：圓章與單字都掛在它旁邊，位置與它相同（只建一次，之後 setType 只換圖與字） */
    static attach(icon: Sprite & NodeHost, opts: TroopTypeBadgeAttachOptions = {}): TroopTypeBadge {
        const host = icon.node;
        const parent = host.parent ?? host;
        const pos = host.position;
        const tf = host.getComponent(UITransform);
        const size = opts.size ?? Math.max(tf?.width ?? 0, tf?.height ?? 0);

        const disc = addBadgeDisc(opts.discParent ?? parent, 'TypeDisc', size, pos.x, pos.y);
        if (!opts.discParent && host.parent) disc.setSiblingIndex(host.getSiblingIndex());

        const glyph = opts.glyph ?? createGlyph(opts.textParent ?? parent, size, pos.x, pos.y);
        return new TroopTypeBadge({ icon, disc, glyph }, opts.loader ?? defaultLoader);
    }

    /** UI 面板用：把徽章掛在既有節點上（節點本身變成金圈圓章，剪影與單字是它的子節點）；同一節點只掛一次，之後回傳同一個實例 */
    static mount(host: Node, opts: { size?: number; loader?: SpriteFrameLoader } = {}): TroopTypeBadge {
        const cached = mountedBadges.get(host);
        if (cached) return cached;
        const tf = host.getComponent(UITransform);
        const size = opts.size ?? (Math.max(tf?.width ?? 0, tf?.height ?? 0) || 40);

        const disc = host.getComponent(Sprite) ?? host.addComponent(Sprite);
        disc.sizeMode = Sprite.SizeMode.CUSTOM;
        disc.type = Sprite.Type.SIMPLE;
        disc.color = WHITE;
        void loadBadgeAtlasFrames().then((frames) => {
            if (frames && disc.isValid) disc.spriteFrame = frames.disc;
        });

        const iconNode = new Node('TypeIcon');
        iconNode.layer = host.layer;
        host.addChild(iconNode);
        iconNode.addComponent(UITransform).setContentSize(size * TROOP_ICON_RATIO, size * TROOP_ICON_RATIO);
        const icon = iconNode.addComponent(Sprite) as Sprite & NodeHost;
        icon.sizeMode = Sprite.SizeMode.CUSTOM;
        icon.type = Sprite.Type.SIMPLE;

        const glyph = createGlyph(host, size, 0, 0);
        const badge = new TroopTypeBadge({ icon, disc: host, glyph }, opts.loader ?? defaultLoader);
        mountedBadges.set(host, badge);
        return badge;
    }

    get glyph(): Label { return this.parts.glyph; }

    /** 換成某兵種：先顯示單字，剪影載入成功才換成圖；同一兵種不重做 */
    setType(raw: string | null | undefined): void {
        const key = normalizeTroopTypeKey(raw);
        if (key === this.shownKey) return;
        this.shownKey = key;
        const seq = ++this.seq;

        this.parts.glyph.string = troopTypeGlyph(raw);
        this.showGlyph();
        if (key.length === 0) return;

        void loadTroopTypeIconFrame(raw, this.loader).then((frame) => {
            if (seq !== this.seq || !this.isAlive()) return;
            if (!frame) {
                this.showGlyph();
                return;
            }
            this.parts.icon.spriteFrame = frame;
            this.parts.icon.color = WHITE;
            this.parts.icon.node.active = true;
            this.parts.glyph.node.active = false;
        });
    }

    private showGlyph(): void {
        this.parts.icon.node.active = false;
        this.parts.glyph.node.active = true;
    }

    private isAlive(): boolean {
        return this.parts.icon.isValid && this.parts.glyph.node.isValid;
    }
}

function createGlyph(parent: Node, size: number, x: number, y: number): Label & NodeHost {
    const node = new Node('TypeGlyph');
    node.layer = parent.layer;
    parent.addChild(node);
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(size, size);
    const label = node.addComponent(Label) as Label & NodeHost;
    label.string = '';
    label.fontSize = Math.round(size * 0.45);
    label.lineHeight = label.fontSize + 2;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.enableOutline = true;
    label.outlineColor = TROOP_BADGE_OUTLINE;
    label.outlineWidth = TROOP_BADGE_OUTLINE_WIDTH;
    return label;
}
