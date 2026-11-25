// @spec-source → 測試工具 2.0（使用者 2026-11-23 定案）；PROG-2-9858
/**
 * DevToolOverlay — 全域測試工具面板（取代舊的右上角「+」小工具列）。
 *
 * - 只在測試工具開啟時出現：網址帶 ?dev=1，或設定頁連點版本號 7 次（記 localStorage）；預設不顯示。
 *   正式版建置設全域旗標 __3K_DEVTOOL_DISABLED__ = true（或把資料檔 buildEnabled 改 false）就整個排除。
 * - 掛在每個場景的 Canvas 上（director 的場景載入事件），含戰場；一個半透明、可拖曳的圓鈕（≥44px），點一下展開分頁面板。
 * - 面板的分頁與按鈕全由 assets/resources/data/dev-tools/dev-tool-panels.json 決定；所有改狀態的動作都經 DevToolRunner 走共通 API
 *   （debug.* 等命令寫入存檔），本檔不直接改任何數字。
 * - 操作紀錄寫進 devToolLog，可一鍵複製。
 * - 數字與 JSON 輸入用瀏覽器的 prompt（手機瀏覽器可貼上）；沒有 prompt 的平台會在紀錄裡說明。
 *
 * Unity 對照：像 DontDestroyOnLoad 的作弊選單 Canvas，每次換場景重新掛一次。
 */
import { BlockInputEvents, Button, Canvas, Color, Director, director, EventTouch, Graphics, JsonAsset, Label, Mask, Node, resources, ScrollView, UITransform } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { PlayerRosterService } from '../../core/services/PlayerRosterService';
import { devToolGate } from '../../core/dev/DevToolGate';
import { devToolJobs, devToolLog } from '../../core/dev/DevToolRuntime';
import { createDevDebugHost } from '../../core/dev/DevDebugHost';
import { parseDevToolPanelConfig, type DevToolAction, type DevToolItem, type DevToolPanelConfig, type DevToolTab } from '../../core/dev/DevToolPanelConfig';
import { DevToolRunner } from '../../core/dev/DevToolRunner';
import { SolidBackground } from '../components/SolidBackground';

const CONFIG_PATH = 'data/dev-tools/dev-tool-panels';
/** 觸控目標最小邊長（手機可點） */
const MIN_TOUCH = 44;
const LAUNCHER_SIZE = 56;
const ROW_H = 52;
const TITLE_H = 30;
const GAP = 8;
const DRAG_THRESHOLD = 8;
const POS_KEY = '3klife.devtool.launcherPos';

const COLOR_PANEL = new Color(15, 20, 30, 240);
const COLOR_BAR = new Color(24, 30, 42, 245);
const COLOR_BTN = new Color(52, 76, 102, 245);
const COLOR_BTN_ON = new Color(88, 124, 168, 255);
const COLOR_BTN_OFF = new Color(60, 64, 72, 200);
const COLOR_DANGER = new Color(108, 52, 52, 245);
const COLOR_GROUP = new Color(36, 44, 60, 245);

type LocalFn = () => Promise<string | void> | string | void;

interface OverlayState {
    installed: boolean;
    hostBound: boolean;
    config: DevToolPanelConfig | null;
    configLoading: boolean;
    runner: DevToolRunner | null;
    launcher: Node | null;
    panel: Node | null;
    tabId: string;
    statusLabel: Label | null;
    hidden: boolean;
    launcherPos: { x: number; y: number } | null;
    changeListener: (() => void) | null;
    locals: Record<string, LocalFn>;
}

const state: OverlayState = {
    installed: false,
    hostBound: false,
    config: null,
    configLoading: false,
    runner: null,
    launcher: null,
    panel: null,
    tabId: 'resources',
    statusLabel: null,
    hidden: false,
    launcherPos: null,
    changeListener: null,
    locals: {},
};

// ───────────────────────── 對外 ─────────────────────────

/** 場景（轉蛋、大廳）登記「資源變動後要刷新畫面」的回呼 */
export function setDevToolChangeListener(listener: (() => void) | null): void {
    state.changeListener = listener;
}

/** 登記面板的 local 動作實作（例如事件日誌視窗、單機模式切換） */
export function registerDevToolLocalAction(id: string, fn: LocalFn | null): void {
    if (fn) state.locals[id] = fn;
    else delete state.locals[id];
}

/** 別的視窗蓋上來時暫時隱藏圓鈕與面板 */
export function setDevOverlayHidden(hidden: boolean): void {
    state.hidden = hidden;
    if (state.launcher?.isValid) state.launcher.active = !hidden;
    if (state.panel?.isValid) state.panel.active = !hidden;
}

/** 掛上全域測試工具；每個場景都可重複呼叫，已掛過只會補掛到目前場景 */
export function installDevToolOverlay(): void {
    const gate = devToolGate();
    if (!gate.buildAllowed()) return;
    if (!state.installed) {
        state.installed = true;
        if (typeof director.on === 'function') {
            director.on(Director.EVENT_AFTER_SCENE_LAUNCH, mountToActiveScene);
            director.on(Director.EVENT_AFTER_UPDATE, keepOverlayOnTop);
        }
        gate.onChange((enabled) => { if (enabled) mountToActiveScene(); else unmount(); });
    }
    if (gate.isEnabled()) mountToActiveScene();
}

// ───────────────────────── 掛載 ─────────────────────────

function resolveCanvasNode(): Node | null {
    const scene = director.getScene();
    if (!scene) return null;
    return scene.getComponentInChildren(Canvas)?.node ?? null;
}

function mountToActiveScene(): void {
    const gate = devToolGate();
    if (!gate.isEnabled() || !gate.buildAllowed()) return;
    const canvas = resolveCanvasNode();
    if (!canvas) return;
    if (!state.config) {
        loadConfig(() => mountToActiveScene());
        return;
    }
    if (!state.config.buildEnabled) return;
    bindHost();
    ensureRunner();
    // 換場景時舊節點已隨場景銷毀
    if (state.launcher && !state.launcher.isValid) state.launcher = null;
    if (state.panel && !state.panel.isValid) { state.panel = null; state.statusLabel = null; }
    if (!state.launcher) buildLauncher(canvas);
    else if (state.launcher.parent !== canvas) { state.launcher.removeFromParent(); canvas.addChild(state.launcher); }
    state.launcher?.setSiblingIndex(canvas.children.length - 1);
    if (state.panel?.isValid && state.panel.parent !== canvas) { state.panel.removeFromParent(); canvas.addChild(state.panel); }
    state.panel?.setSiblingIndex(canvas.children.length - 1);
    setDevOverlayHidden(state.hidden);
}

/** 場景稍後才加進來或自行調整層級的節點（大廳面板、彈窗）會蓋住圓鈕與面板；每個畫面更新後檢查一次，被蓋住就拉回最上層 */
function keepOverlayOnTop(): void {
    const launcher = state.launcher;
    const canvas = launcher?.parent;
    if (!launcher?.isValid || !canvas) return;
    const top = canvas.children.length - 1;
    if (launcher.getSiblingIndex() === top) return;
    if (state.panel?.isValid && state.panel.parent === canvas) state.panel.setSiblingIndex(top);
    launcher.setSiblingIndex(top);
}

function unmount(): void {
    if (state.panel?.isValid) state.panel.destroy();
    if (state.launcher?.isValid) state.launcher.destroy();
    state.panel = null;
    state.launcher = null;
    state.statusLabel = null;
}

function loadConfig(then: () => void): void {
    if (state.configLoading) return;
    state.configLoading = true;
    resources.load(CONFIG_PATH, JsonAsset, (error, asset) => {
        state.configLoading = false;
        if (error || !asset) {
            devToolLog.append('fail', `測試工具設定檔讀不到：${error?.message ?? CONFIG_PATH}`);
            return;
        }
        const parsed = parseDevToolPanelConfig(asset.json);
        for (const message of parsed.errors) devToolLog.append('fail', `設定檔：${message}`);
        state.config = parsed.config;
        then();
    });
}

function bindHost(): void {
    if (state.hostBound) return;
    state.hostBound = true;
    services().extendDebugHost(createDevDebugHost({
        session: () => services().session,
        jobs: devToolJobs,
        log: devToolLog,
        resetRoster: () => { PlayerRosterService.clear(); },
        onStateChanged: notifyChanged,
        reloadScene: reloadScene,
    }));
}

function notifyChanged(): void {
    try { state.changeListener?.(); } catch { /* 場景的刷新壞掉不能影響測試工具 */ }
}

function reloadScene(): void {
    const name = director.getScene()?.name;
    if (name) director.loadScene(name);
}

// ───────────────────────── 動作 ─────────────────────────

function t(key: string, fallback: string, ...args: string[]): string {
    if (!key) return fallback;
    const text = services().i18n.t(key, ...args);
    return text === key ? fallback : text;
}

function promptText(message: string, initial: string): string | null {
    const fn = (globalThis as { prompt?: (m: string, d?: string) => string | null }).prompt;
    if (typeof fn !== 'function') {
        devToolLog.append('fail', '此平台沒有輸入視窗（prompt）');
        return null;
    }
    return fn(message, initial);
}

async function copyText(text: string): Promise<boolean> {
    const g = globalThis as { navigator?: { clipboard?: { writeText(t: string): Promise<void> } }; document?: Document };
    try {
        if (g.navigator?.clipboard) { await g.navigator.clipboard.writeText(text); return true; }
    } catch { /* 往下走備援 */ }
    try {
        const doc = g.document;
        if (doc) {
            const area = doc.createElement('textarea');
            area.value = text;
            doc.body.appendChild(area);
            area.select();
            const ok = doc.execCommand('copy');
            doc.body.removeChild(area);
            if (ok) return true;
        }
    } catch { /* 往下走備援 */ }
    // 最後備援：用 prompt 顯示，讓人手動全選複製
    promptText('複製失敗，請手動全選後複製', text);
    return false;
}

function buildLocals(): Record<string, LocalFn> {
    return {
        copyLog: async () => ((await copyText(devToolLog.toText())) ? '已複製' : '請手動複製'),
        clearLog: () => { devToolLog.clear(); },
        reloadScene: () => { reloadScene(); },
        disableDevTool: () => {
            devToolGate().setPersisted(false);
            return '已清除記號；若網址帶 dev=1 請移除參數後重新整理';
        },
        exportSave: async () => {
            const res = await services().api.query<{ json: string; bytes: number }>('debug.exportSave', {});
            if (!res.ok) throw new Error(`${res.errorCode} ${res.message}`);
            const ok = await copyText(res.result.json);
            return `${res.result.bytes} 字元${ok ? '，已複製' : '，請手動複製'}`;
        },
    };
}

function ensureRunner(): DevToolRunner {
    if (state.runner) return state.runner;
    const builtin = buildLocals();
    state.runner = new DevToolRunner({
        api: () => services().api,
        config: () => state.config as DevToolPanelConfig,
        log: devToolLog,
        jobs: devToolJobs,
        local: new Proxy(builtin, { get: (target, key: string) => state.locals[key] ?? target[key] }),
        onChanged: notifyChanged,
    });
    return state.runner;
}

function runAction(action: DevToolAction): void {
    void ensureRunner().run(action).then(refreshStatus);
}

function runInputCommand(cmd: string, args: Record<string, unknown>): void {
    void ensureRunner().command(cmd, args).then(refreshStatus);
}

// ───────────────────────── UI 積木 ─────────────────────────

function newNode(name: string, parent: Node, w: number, h: number): Node {
    const node = new Node(name);
    node.parent = parent;
    node.layer = parent.layer;
    node.addComponent(UITransform).setContentSize(w, h);
    return node;
}

function fill(node: Node, color: Color): void {
    node.addComponent(SolidBackground).color = color;
}

function addLabel(parent: Node, name: string, w: number, h: number, text: string, size: number, align: number = Label.HorizontalAlign.CENTER): Label {
    const node = newNode(name, parent, w, h);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = size;
    label.lineHeight = size + 4;
    label.horizontalAlign = align;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = false;
    return label;
}

function addButton(parent: Node, name: string, w: number, h: number, text: string, color: Color, onClick: (() => void) | null): Node {
    const node = newNode(name, parent, Math.max(w, MIN_TOUCH), Math.max(h, MIN_TOUCH));
    fill(node, onClick ? color : COLOR_BTN_OFF);
    addLabel(node, 'Label', Math.max(w, MIN_TOUCH) - 8, Math.max(h, MIN_TOUCH) - 4, text, 20);
    if (onClick) {
        const button = node.addComponent(Button);
        button.transition = Button.Transition.NONE;
        node.on(Button.EventType.CLICK, onClick);
    }
    return node;
}

// ───────────────────────── 圓鈕（可拖曳） ─────────────────────────

function loadSavedPos(): { x: number; y: number } | null {
    try {
        const raw = (globalThis as { localStorage?: Storage }).localStorage?.getItem(POS_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as { x?: number; y?: number };
        return typeof p.x === 'number' && typeof p.y === 'number' ? { x: p.x, y: p.y } : null;
    } catch { return null; }
}

function savePos(pos: { x: number; y: number }): void {
    try { (globalThis as { localStorage?: Storage }).localStorage?.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* 存不了就算了 */ }
}

function buildLauncher(canvas: Node): void {
    const size = canvas.getComponent(UITransform)?.contentSize;
    const halfW = (size?.width ?? 1920) / 2;
    const halfH = (size?.height ?? 1080) / 2;
    const node = newNode('DevToolLauncher', canvas, LAUNCHER_SIZE, LAUNCHER_SIZE);
    // 半透明深色圓底＋淺色細框：浮在任何畫面上都看得到（PROG-2-9860）
    const disc = node.addComponent(Graphics);
    disc.fillColor = new Color(20, 26, 38, 190);
    disc.circle(0, 0, LAUNCHER_SIZE / 2);
    disc.fill();
    disc.lineWidth = 2;
    disc.strokeColor = new Color(190, 210, 240, 200);
    disc.circle(0, 0, LAUNCHER_SIZE / 2 - 1);
    disc.stroke();
    addLabel(node, 'Label', LAUNCHER_SIZE - 6, LAUNCHER_SIZE - 6, 'DEV', 18);
    const pos = state.launcherPos ?? loadSavedPos() ?? { x: halfW - LAUNCHER_SIZE, y: halfH - LAUNCHER_SIZE * 2 };
    const clamp = (p: { x: number; y: number }): { x: number; y: number } => ({
        x: Math.max(-halfW + LAUNCHER_SIZE / 2, Math.min(halfW - LAUNCHER_SIZE / 2, p.x)),
        y: Math.max(-halfH + LAUNCHER_SIZE / 2, Math.min(halfH - LAUNCHER_SIZE / 2, p.y)),
    });
    state.launcherPos = clamp(pos);
    node.setPosition(state.launcherPos.x, state.launcherPos.y, 0);

    let moved = 0;
    node.on(Node.EventType.TOUCH_START, () => { moved = 0; });
    node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
        const d = event.getUIDelta();
        moved += Math.abs(d.x) + Math.abs(d.y);
        if (moved < DRAG_THRESHOLD) return;
        const cur = node.position;
        state.launcherPos = clamp({ x: cur.x + d.x, y: cur.y + d.y });
        node.setPosition(state.launcherPos.x, state.launcherPos.y, 0);
    });
    const finish = (): void => {
        if (moved < DRAG_THRESHOLD) togglePanel();
        else if (state.launcherPos) savePos(state.launcherPos);
    };
    node.on(Node.EventType.TOUCH_END, finish);
    node.on(Node.EventType.TOUCH_CANCEL, () => { if (state.launcherPos && moved >= DRAG_THRESHOLD) savePos(state.launcherPos); });
    state.launcher = node;
}

function togglePanel(): void {
    if (state.panel?.isValid) {
        state.panel.destroy();
        state.panel = null;
        state.statusLabel = null;
        return;
    }
    const canvas = resolveCanvasNode();
    if (canvas && state.config) buildPanel(canvas, state.config);
}

// ───────────────────────── 面板 ─────────────────────────

function buildPanel(canvas: Node, config: DevToolPanelConfig): void {
    const size = canvas.getComponent(UITransform)?.contentSize;
    const W = Math.min((size?.width ?? 1920) - 24, 1000);
    const H = Math.min((size?.height ?? 1080) - 24, 760);
    const root = newNode('DevToolPanel', canvas, W, H);
    root.addComponent(BlockInputEvents);
    fill(root, COLOR_PANEL);
    state.panel = root;

    const barH = 56;
    const tabH = 52;
    const statusH = 74;

    const bar = newNode('TitleBar', root, W, barH);
    fill(bar, COLOR_BAR);
    bar.setPosition(0, H / 2 - barH / 2, 0);
    addLabel(bar, 'Title', 320, barH - 8, `🛠 ${t('dev.tool.title', '測試工具')}`, 24, Label.HorizontalAlign.LEFT).node.setPosition(-W / 2 + 190, 0, 0);
    addButton(bar, 'Close', 96, 46, t('dev.tool.close', '關閉'), COLOR_DANGER, togglePanel).setPosition(W / 2 - 60, 0, 0);

    const tabBar = newNode('Tabs', root, W, tabH);
    tabBar.setPosition(0, H / 2 - barH - tabH / 2, 0);
    const tabW = Math.max(MIN_TOUCH, Math.floor((W - 16) / Math.max(1, config.tabs.length)) - 4);
    config.tabs.forEach((tab, i) => {
        const active = tab.id === state.tabId;
        const btn = addButton(tabBar, `Tab_${tab.id}`, tabW, 46, t(tab.labelKey, tab.label), active ? COLOR_BTN_ON : COLOR_BTN, () => { state.tabId = tab.id; rebuildPanel(); });
        btn.setPosition(-W / 2 + 8 + tabW / 2 + i * (tabW + 4), 0, 0);
    });

    const status = newNode('Status', root, W, statusH);
    fill(status, COLOR_BAR);
    status.setPosition(0, -H / 2 + statusH / 2, 0);
    state.statusLabel = addLabel(status, 'Log', W - 24, statusH - 8, '', 16, Label.HorizontalAlign.LEFT);
    state.statusLabel.overflow = Label.Overflow.CLAMP;
    state.statusLabel.enableWrapText = true;
    state.statusLabel.verticalAlign = Label.VerticalAlign.TOP;

    const viewH = H - barH - tabH - statusH;
    const tab = config.tabs.find((x) => x.id === state.tabId) ?? config.tabs[0];
    if (tab) buildTabContent(root, tab, W, viewH, -(barH + tabH) / 2 + statusH / 2);
    refreshStatus();
    root.setSiblingIndex(canvas.children.length - 1);
    state.launcher?.setSiblingIndex(canvas.children.length - 1);
}

function rebuildPanel(): void {
    const canvas = resolveCanvasNode();
    if (state.panel?.isValid) state.panel.destroy();
    state.panel = null;
    if (canvas && state.config) buildPanel(canvas, state.config);
}

function refreshStatus(): void {
    const label = state.statusLabel;
    if (!label?.isValid) return;
    const entries = devToolLog.entries().slice(-3);
    const mark = { cmd: '>', ok: '+', fail: '!', info: '-' } as const;
    label.string = entries.length === 0 ? '—' : entries.map((e) => `${mark[e.kind]} ${e.text}`).join('\n');
}

function buildTabContent(root: Node, tab: DevToolTab, W: number, viewH: number, centerY: number): void {
    const scrollNode = newNode('Scroll', root, W - 16, viewH);
    scrollNode.setPosition(0, centerY, 0);
    const scroll = scrollNode.addComponent(ScrollView);
    scroll.horizontal = false;
    scroll.vertical = true;
    const view = newNode('view', scrollNode, W - 16, viewH);
    view.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
    const content = newNode('Content', view, W - 16, viewH);
    content.getComponent(UITransform)?.setAnchorPoint(0.5, 1);
    content.setPosition(0, viewH / 2, 0);

    const inner = W - 16 - 16;
    let y = -8;
    const place = (node: Node, x: number, rowH: number): void => { node.setPosition(x, y - rowH / 2, 0); };

    if (tab.skeleton) {
        const note = addLabel(content, 'SkeletonNote', inner, 28, t('dev.tool.todo', '尚未接線'), 16, Label.HorizontalAlign.LEFT);
        note.color = new Color(200, 170, 90, 255);
        place(note.node, 0, 28);
        y -= 28 + GAP;
    }

    for (const group of tab.groups) {
        const title = addLabel(content, 'GroupTitle', inner, TITLE_H, t(group.titleKey, group.title), 18, Label.HorizontalAlign.LEFT);
        title.color = new Color(160, 200, 240, 255);
        place(title.node, 0, TITLE_H);
        y -= TITLE_H + 4;
        for (const item of group.items) {
            const rowH = ROW_H;
            const row = newNode('Row', content, inner, rowH);
            fill(row, COLOR_GROUP);
            place(row, 0, rowH);
            buildItem(row, item, inner, rowH);
            y -= rowH + GAP;
        }
        y -= GAP;
    }

    content.getComponent(UITransform)?.setContentSize(W - 16, Math.max(viewH, -y + 16));
    scroll.content = content;
    scroll.scrollToTop(0);
}

function buildItem(row: Node, item: DevToolItem, rowW: number, rowH: number): void {
    const left = -rowW / 2;
    switch (item.type) {
        case 'button': {
            const action = item.action;
            const wired = action.kind !== 'todo';
            const w = rowW - 12;
            const btn = addButton(row, 'Btn', w, rowH - 6, t(item.labelKey, item.label), COLOR_BTN, wired ? () => runAction(action) : null);
            btn.setPosition(0, 0, 0);
            break;
        }
        case 'resourceRow': {
            const labelW = Math.min(230, rowW * 0.28);
            addLabel(row, 'Name', labelW, rowH - 6, t(item.labelKey, item.label), 20, Label.HorizontalAlign.LEFT).node.setPosition(left + 12 + labelW / 2, 0, 0);
            let x = left + 12 + labelW + 8;
            const btnW = Math.max(MIN_TOUCH, Math.min(96, (rowW - labelW - 32) / (item.steps.length + 1) - 6));
            for (const step of item.steps) {
                const b = addButton(row, `Add_${step}`, btnW, rowH - 6, `+${step.toLocaleString('en-US')}`, COLOR_BTN, () => runInputCommand('debug.grant', { resource: item.resource, amount: step }));
                b.setPosition(x + btnW / 2, 0, 0);
                x += btnW + 6;
            }
            const input = addButton(row, 'Input', btnW + 20, rowH - 6, t('dev.tool.input', '輸入…'), COLOR_BTN_ON, () => {
                const text = promptText(`${t(item.labelKey, item.label)}：輸入數量（負數＝扣除）`, '100');
                if (text === null) return;
                const amount = Number(text.trim());
                if (!Number.isInteger(amount) || amount === 0) { devToolLog.append('fail', `輸入不是非 0 整數：${text}`); refreshStatus(); return; }
                runInputCommand('debug.grant', { resource: item.resource, amount });
            });
            input.setPosition(x + (btnW + 20) / 2, 0, 0);
            break;
        }
        case 'numberInput': {
            const w = rowW - 12;
            addButton(row, 'Input', w, rowH - 6, `${t(item.labelKey, item.label)}…`, COLOR_BTN, () => {
                const text = promptText(t(item.labelKey, item.label), String(item.defaultValue));
                if (text === null) return;
                const value = Number(text.trim());
                if (!Number.isInteger(value)) { devToolLog.append('fail', `輸入不是整數：${text}`); refreshStatus(); return; }
                runInputCommand(item.cmd, { ...item.args, [item.argKey]: value });
            }).setPosition(0, 0, 0);
            break;
        }
        case 'textBox': {
            const w = rowW - 12;
            addButton(row, 'Input', w, rowH - 6, `${t(item.labelKey, item.label)}…`, COLOR_BTN, () => {
                const text = promptText(t(item.labelKey, item.label), '');
                if (text === null || text.trim().length === 0) return;
                runInputCommand(item.cmd, { ...item.args, [item.argKey]: text.trim() });
            }).setPosition(0, 0, 0);
            break;
        }
    }
}
