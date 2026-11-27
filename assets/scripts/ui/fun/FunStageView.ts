// @spec-source → 新手第一年樂趣四功能規格書 doc_spec_1347 §1.5 UI 與記憶體、§3.3、§4.3、§5.3；PROG-2-10185
/**
 * FunStageView — FUN-02 滿月酒、FUN-03 勝仗搭話、FUN-04 首次招募自我介紹共用的小舞台（View 層）。
 *
 *  - 只有一個舞台節點（掛在大廳 Canvas 最上層、重複使用）；賓客頭像節點固定 5 個，依序重用，播完收起不銷毀。
 *  - 座標一律用「Canvas 寬高比例＋中心點」，不寫死像素與橫式假設；尺寸變動時下次播放自然重排。
 *  - 武將說的話（古代口吻）用一般對話框；主角內心 OS 另起一行淡色小字，前綴「（心想）」，不是武將說的。
 *  - 頭像只用既有貼圖（GeneralAvatarLoader），不新增圖集、不用逐幀動畫；走路／彈出用節點補間。
 *  - modal 模式（FUN-02／04）：暗幕＋點一下換下一句、右上「跳過」；light 模式（FUN-03）：不擋操作，
 *    武將頭像走進來說一句，玩家一碰畫面就收（不擋其他按鈕）。
 *
 * Unity 對照：像一個 DialogueStage prefab，Show(plan) 回傳 Task，跳過時 Task 以 skipped 完成。
 */
import { Color, Graphics, Label, Node, Sprite, SpriteFrame, UITransform, Vec3, Canvas, director, tween, Tween, UIOpacity, input, Input } from 'cc';

const STAGE_NAME = 'FunStage';
const MAX_SLOTS = 5;
const BEAT_SEC = 3.4;
const LIGHT_HOLD_SEC = 5.5;
const WALK_SEC = 1.5;

const DIM = new Color(0, 0, 0, 150);
const PANEL_FILL = new Color(28, 22, 16, 238);
const PANEL_BORDER = new Color(214, 178, 96, 255);
const NAME_COLOR = new Color(255, 214, 120, 255);
const TEXT_COLOR = new Color(250, 240, 214, 255);
/** 主角內心 OS：淡藍灰小字，和武將的暖白對話明顯分開 */
const OS_COLOR = new Color(165, 190, 214, 255);
const NARRATION_COLOR = new Color(226, 214, 190, 255);

export interface FunStageSlot {
    generalId: string;
    name: string;
}

export interface FunStageBeat {
    /** 說話的頭像位置（FunStagePlan.slots 的索引）；省略＝旁白（沒有說話者） */
    slot?: number;
    /** 說話者顯示名（旁白留空） */
    speakerName?: string;
    /** 武將（或旁白）說的話 */
    text: string;
    /** 主角內心 OS，不含前綴；空字串＝沒有 */
    osText?: string;
    /** 補充小字（賀禮等） */
    noteText?: string;
}

export interface FunStagePlan {
    mode: 'modal' | 'light';
    slots: readonly FunStageSlot[];
    beats: readonly FunStageBeat[];
    /** 「（心想）」前綴與按鈕字（已本地化） */
    osPrefix: string;
    skipLabel: string;
    tapLabel: string;
    loadAvatar: (generalId: string) => Promise<SpriteFrame | null>;
    /** 每句開始時通知（記次數、播音效） */
    onBeat?: (index: number) => void;
}

export interface FunStageOutcome {
    /** 播完（沒被跳過／中止） */
    completed: boolean;
    /** 實際出現過的句數 */
    beatsShown: number;
}

interface StageNodes {
    root: Node;
    backdrop: Graphics;
    slots: Array<{ node: Node; sprite: Sprite; name: Label }>;
    panel: Node;
    panelGfx: Graphics;
    speaker: Label;
    text: Label;
    os: Label;
    note: Label;
    tap: Label;
    skip: Node;
    skipLabel: Label;
}

let _nodes: StageNodes | null = null;
let _run: { finish: (o: FunStageOutcome) => void; timer: ReturnType<typeof setTimeout> | null } | null = null;
/** 出現次數累計（QA 證據：每個功能的出現次數＋截圖） */
const _shown: Record<string, number> = {};

export function funStageShownCount(kind: string): number {
    return _shown[kind] ?? 0;
}

export function countFunStageShown(kind: string): void {
    _shown[kind] = (_shown[kind] ?? 0) + 1;
}

function canvasOf(anchor: Node | null): Node | null {
    const scene = director.getScene();
    const canvas = scene?.getComponentInChildren(Canvas)?.node ?? null;
    return canvas ?? anchor ?? null;
}

function makeLabel(parent: Node, name: string, size: number, color: Color): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.addComponent(UITransform);
    const label = node.addComponent(Label);
    label.fontSize = size;
    label.lineHeight = Math.round(size * 1.3);
    label.color = color;
    label.overflow = Label.Overflow.CLAMP;
    label.enableWrapText = true;
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.TOP;
    parent.addChild(node);
    return label;
}

function build(root: Node): StageNodes {
    const stage = new Node(STAGE_NAME);
    stage.layer = root.layer;
    stage.addComponent(UITransform);
    const backdropNode = new Node('Backdrop');
    backdropNode.layer = root.layer;
    backdropNode.addComponent(UITransform);
    const backdrop = backdropNode.addComponent(Graphics);
    stage.addChild(backdropNode);
    const slots: StageNodes['slots'] = [];
    for (let i = 0; i < MAX_SLOTS; i += 1) {
        const node = new Node(`Guest${i}`);
        node.layer = root.layer;
        node.addComponent(UITransform);
        node.addComponent(UIOpacity);
        const spriteNode = new Node('Avatar');
        spriteNode.layer = root.layer;
        spriteNode.addComponent(UITransform);
        const sprite = spriteNode.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        node.addChild(spriteNode);
        const name = makeLabel(node, 'Name', 26, NAME_COLOR);
        name.horizontalAlign = Label.HorizontalAlign.CENTER;
        name.verticalAlign = Label.VerticalAlign.CENTER;
        node.active = false;
        stage.addChild(node);
        slots.push({ node, sprite, name });
    }
    const panel = new Node('Panel');
    panel.layer = root.layer;
    panel.addComponent(UITransform);
    const panelGfx = panel.addComponent(Graphics);
    stage.addChild(panel);
    const speaker = makeLabel(panel, 'Speaker', 30, NAME_COLOR);
    const text = makeLabel(panel, 'Text', 32, TEXT_COLOR);
    const os = makeLabel(panel, 'OS', 26, OS_COLOR);
    const note = makeLabel(panel, 'Note', 24, NAME_COLOR);
    const tap = makeLabel(panel, 'Tap', 22, OS_COLOR);
    tap.horizontalAlign = Label.HorizontalAlign.RIGHT;
    tap.verticalAlign = Label.VerticalAlign.BOTTOM;
    const skip = new Node('Skip');
    skip.layer = root.layer;
    skip.addComponent(UITransform);
    const skipLabel = makeLabel(skip, 'Label', 30, TEXT_COLOR);
    skipLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    skipLabel.verticalAlign = Label.VerticalAlign.CENTER;
    stage.addChild(skip);
    root.addChild(stage);
    return { root: stage, backdrop, slots, panel, panelGfx, speaker, text, os, note, tap, skip, skipLabel };
}

function ensureNodes(canvas: Node): StageNodes {
    if (_nodes?.root.isValid) {
        if (_nodes.root.parent !== canvas) {
            _nodes.root.removeFromParent();
            canvas.addChild(_nodes.root);
        }
        _nodes.root.setSiblingIndex(canvas.children.length - 1);
        return _nodes;
    }
    _nodes = build(canvas);
    return _nodes;
}

function sizeOf(node: Node, w: number, h: number): void {
    node.getComponent(UITransform)!.setContentSize(w, h);
}

/** 版面：全部以 Canvas 寬高比例算，座標原點在 Canvas 中心 */
function layout(n: StageNodes, W: number, H: number, plan: FunStagePlan): void {
    sizeOf(n.root, W, H);
    n.root.setPosition(0, 0, 0);
    n.backdrop.clear();
    if (plan.mode === 'modal') {
        n.backdrop.fillColor = DIM;
        n.backdrop.rect(-W / 2, -H / 2, W, H);
        n.backdrop.fill();
    }
    const avatar = Math.round(H * 0.2);
    const count = Math.max(1, plan.slots.length);
    n.slots.forEach((slot, i) => {
        const used = i < plan.slots.length;
        slot.node.active = used;
        if (!used) return;
        // 賓客橫排：x 依人數均分 0.2～0.8（單人置中），y 約 0.55 處（畫面高度比例）
        const rx = plan.mode === 'light' ? 0.3 : (count === 1 ? 0.5 : 0.2 + (0.6 * i) / (count - 1));
        slot.node.setPosition((rx - 0.5) * W, (0.56 - 0.5) * H, 0);
        sizeOf(slot.node, avatar, avatar);
        slot.sprite.node.getComponent(UITransform)!.setContentSize(avatar, avatar);
        slot.sprite.node.setPosition(0, 0, 0);
        slot.name.node.getComponent(UITransform)!.setContentSize(avatar * 1.6, avatar * 0.22);
        slot.name.node.setPosition(0, -avatar * 0.62, 0);
        slot.name.string = plan.slots[i].name;
        slot.name.fontSize = Math.round(H * 0.026);
        slot.name.lineHeight = Math.round(H * 0.034);
    });
    // 對話框：寬 0.78W、高 0.26H，中心在 y = 0.2H 處（light 模式在頭像右側上方，較小）
    const pw = Math.round(W * (plan.mode === 'light' ? 0.52 : 0.78));
    const ph = Math.round(H * (plan.mode === 'light' ? 0.24 : 0.27));
    sizeOf(n.panel, pw, ph);
    const light = plan.mode === 'light';
    n.panel.setPosition(light ? (0.3 - 0.5) * W + pw / 2 + avatar * 0.65 : 0, (light ? 0.56 - 0.5 : 0.19 - 0.5) * H, 0);
    n.panelGfx.clear();
    n.panelGfx.fillColor = PANEL_FILL;
    n.panelGfx.roundRect(-pw / 2, -ph / 2, pw, ph, 18);
    n.panelGfx.fill();
    n.panelGfx.lineWidth = 3;
    n.panelGfx.strokeColor = PANEL_BORDER;
    n.panelGfx.roundRect(-pw / 2, -ph / 2, pw, ph, 18);
    n.panelGfx.stroke();
    const pad = Math.round(ph * 0.08);
    const innerW = pw - pad * 2;
    const f = Math.round(H * 0.03);
    const place = (label: Label, top: number, height: number, size: number): void => {
        const t = label.node.getComponent(UITransform)!;
        t.setAnchorPoint(0, 1);
        t.setContentSize(innerW, height);
        label.node.setPosition(-pw / 2 + pad, ph / 2 - pad - top, 0);
        label.fontSize = size;
        label.lineHeight = Math.round(size * 1.3);
    };
    place(n.speaker, 0, f * 1.4, f);
    place(n.text, f * 1.35, f * 2.7, f);
    place(n.os, f * 4.2, f * 2.2, Math.round(f * 0.82));
    place(n.note, f * 6.1, f * 1.2, Math.round(f * 0.72));
    const tapT = n.tap.node.getComponent(UITransform)!;
    tapT.setAnchorPoint(1, 0);
    tapT.setContentSize(innerW, f);
    n.tap.node.setPosition(pw / 2 - pad, -ph / 2 + pad * 0.6, 0);
    n.tap.fontSize = Math.round(f * 0.7);
    n.tap.node.active = plan.mode === 'modal';
    // 右上「跳過」
    n.skip.active = plan.mode === 'modal';
    sizeOf(n.skip, Math.round(W * 0.09), Math.round(H * 0.05));
    n.skip.setPosition((0.5 - 0.07) * W, (0.5 - 0.06) * H, 0);
    n.skipLabel.node.getComponent(UITransform)!.setContentSize(Math.round(W * 0.09), Math.round(H * 0.05));
    n.skipLabel.fontSize = Math.round(H * 0.03);
    n.skipLabel.string = plan.skipLabel;
    n.tap.string = plan.tapLabel;
}

function showBeat(n: StageNodes, plan: FunStagePlan, index: number): void {
    const beat = plan.beats[index];
    n.slots.forEach((slot, i) => {
        const op = slot.node.getComponent(UIOpacity)!;
        op.opacity = beat.slot === undefined || beat.slot === i ? 255 : 110;
    });
    n.speaker.string = beat.speakerName ?? '';
    n.text.string = beat.text;
    n.text.color = beat.slot === undefined ? NARRATION_COLOR : TEXT_COLOR;
    n.os.string = beat.osText ? `${plan.osPrefix}${beat.osText}` : '';
    n.note.string = beat.noteText ?? '';
    n.panel.active = true;
    if (beat.slot !== undefined && plan.mode === 'modal') {
        // 說話的人彈一下（補間物件由 cc 管理；先停舊的）
        const node = n.slots[beat.slot].node;
        Tween.stopAllByTarget(node);
        node.setScale(1, 1, 1);
        tween(node).to(0.1, { scale: new Vec3(1.1, 1.1, 1) }).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
    }
}

async function loadSlots(n: StageNodes, plan: FunStagePlan): Promise<void> {
    await Promise.all(plan.slots.map(async (slot, i) => {
        const frame = await plan.loadAvatar(slot.generalId).catch(() => null);
        if (frame && n.slots[i].node.isValid) n.slots[i].sprite.spriteFrame = frame;
    }));
}

/** 中止目前正在播的舞台（離開大廳、開面板時可呼叫） */
export function stopFunStage(): void {
    const run = _run;
    if (!run) return;
    _run = null;
    if (run.timer) clearTimeout(run.timer);
    if (_nodes?.root.isValid) {
        _nodes.root.active = false;
        _nodes.slots.forEach((s) => Tween.stopAllByTarget(s.node));
    }
    run.finish({ completed: false, beatsShown: 0 });
}

/**
 * 播一段舞台。同時只會有一段；新的來會先收掉舊的。回傳結果（播完／被跳過、實際出現句數）。
 * canvasAnchor 只用來在找不到場景 Canvas 時墊底。
 */
export function playFunStage(canvasAnchor: Node | null, plan: FunStagePlan): Promise<FunStageOutcome> {
    stopFunStage();
    const canvas = canvasOf(canvasAnchor);
    if (!canvas || plan.beats.length === 0) return Promise.resolve({ completed: false, beatsShown: 0 });
    const n = ensureNodes(canvas);
    const ui = canvas.getComponent(UITransform);
    const W = ui?.width ?? 1920;
    const H = ui?.height ?? 1080;
    layout(n, W, H, plan);
    n.root.active = true;
    n.panel.active = false;
    n.slots.forEach((s) => { s.node.setScale(1, 1, 1); s.node.getComponent(UIOpacity)!.opacity = 255; });

    return new Promise<FunStageOutcome>((resolve) => {
        let shown = 0;
        let index = -1;
        let done = false;
        const state: NonNullable<typeof _run> = { finish: () => undefined, timer: null };
        const finish = (completed: boolean): void => {
            if (done) return;
            done = true;
            if (state.timer) clearTimeout(state.timer);
            n.skip.off(Node.EventType.TOUCH_END);
            n.root.off(Node.EventType.TOUCH_END);
            if (plan.mode === 'light') input.off(Input.EventType.TOUCH_START, onGlobalTouch);
            if (n.root.isValid) {
                n.root.active = false;
                n.slots.forEach((s) => { Tween.stopAllByTarget(s.node); s.node.active = false; });
            }
            if (_run === state) _run = null;
            resolve({ completed, beatsShown: shown });
        };
        // stopFunStage 會呼叫 finish；補上 shown 數
        state.finish = (o) => finish(o.completed);
        const onGlobalTouch = (): void => finish(false);
        _run = state;

        const next = (): void => {
            if (done) return;
            if (state.timer) clearTimeout(state.timer);
            index += 1;
            if (index >= plan.beats.length) { finish(true); return; }
            showBeat(n, plan, index);
            shown += 1;
            plan.onBeat?.(index);
            const hold = plan.mode === 'light' ? LIGHT_HOLD_SEC : BEAT_SEC;
            state.timer = setTimeout(next, hold * 1000);
        };

        void loadSlots(n, plan).then(() => {
            if (done) return;
            if (plan.mode === 'modal') {
                n.root.on(Node.EventType.TOUCH_END, () => next());
                n.skip.on(Node.EventType.TOUCH_END, (e: { propagationStopped?: boolean; stopPropagation?: () => void }) => { e.stopPropagation?.(); finish(false); });
                next();
            } else {
                // light：頭像從畫面左側外走到站位，走到才出氣泡；玩家碰任何地方就收
                const slot = n.slots[0].node;
                const targetX = slot.position.x;
                slot.setPosition(-W * 0.6, slot.position.y, 0);
                n.panel.active = false;
                tween(slot).to(WALK_SEC, { position: new Vec3(targetX, slot.position.y, 0) }, { easing: 'sineOut' }).call(() => next()).start();
                input.on(Input.EventType.TOUCH_START, onGlobalTouch);
            }
        });
    });
}
