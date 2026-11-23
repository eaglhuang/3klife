// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-1429 依建檔紀錄補標出處
import { BlockInputEvents, Button, Canvas, Color, Director, director, Label, Layout, Mask, Node, ScrollView, UITransform, Widget } from 'cc';
import { DEV } from 'cc/env';
import { isDevToolEnabled } from '../../core/dev/DevToolGate';
import { installDevToolOverlay, registerDevToolLocalAction, setDevOverlayHidden, setDevToolChangeListener } from './DevToolOverlay';
import { services } from '../../core/managers/ServiceLoader';
import { PlayerRosterService } from '../../core/services/PlayerRosterService';
import type { GachaHistoryRecord } from '../../core/services/ActionLogStore';
import type { LocalGachaResultEntry, LocalGachaService } from '../../core/services/LocalGachaService';
import { ActionLogDebugPanel } from '../panels/ActionLogDebugPanel';
import { SolidBackground } from '../components/SolidBackground';
import { describeGachaAction } from '../../core/gacha/GachaButtonRules';

interface OverlayState {
    actionLogPanel: ActionLogDebugPanel | null;
    gachaService: LocalGachaService | null;
    onSinglePlayerToggle: (() => void) | null;
    onClearRoster: (() => void) | null;
    onWalletChanged: (() => void) | null;
}

interface ModalWindow {
    root: Node;
}

interface ButtonHandle {
    node: Node;
    label: Label;
}

const overlayState: OverlayState = {
    actionLogPanel: null,
    gachaService: null,
    onSinglePlayerToggle: null,
    onClearRoster: null,
    onWalletChanged: null,
};

let gachaResultsWindow: ModalWindow | null = null;
let gachaHistoryWindow: ModalWindow | null = null;
let gachaErrorWindow: ModalWindow | null = null;
let gachaInfoWindow: ModalWindow | null = null;

function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    const seconds = `${date.getSeconds()}`.padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function truncateText(value: unknown, limit = 180): string {
    try {
        const text = JSON.stringify(value);
        if (!text) {
            return 'null';
        }
        return text.length > limit ? `${text.slice(0, limit)}...` : text;
    } catch {
        return String(value);
    }
}

function resolveCanvasNode(): Node | null {
    const scene = director.getScene();
    if (!scene) {
        return null;
    }

    const canvas = scene.getComponentInChildren(Canvas);
    return canvas?.node ?? scene;
}

function inheritParentLayer(node: Node, parent: Node): void {
    node.layer = parent.layer;
}

function promoteToFront(node: Node | null, parent?: Node | null): void {
    if (!node?.isValid) {
        return;
    }

    const owner = parent ?? node.parent;
    if (!owner?.isValid || node.parent !== owner) {
        return;
    }

    const lastIndex = Math.max(owner.children.length - 1, 0);
    if (node.getSiblingIndex() !== lastIndex) {
        node.setSiblingIndex(lastIndex);
    }
}

function createTextNode(parent: Node, name: string, width: number, height: number, text: string, fontSize = 20): Label {
    const node = new Node(name);
    node.parent = parent;
    inheritParentLayer(node, parent);
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const label = node.getComponent(Label) ?? node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = Math.max(fontSize + 4, fontSize);
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.TOP;
    label.overflow = Label.Overflow.RESIZE_HEIGHT;
    return label;
}

function bindPointerFallback(node: Node, onClick: () => void): void {
    let lastInvokeAt = 0;
    const invoke = (): void => {
        const now = Date.now();
        if (now - lastInvokeAt < 80) {
            return;
        }
        lastInvokeAt = now;
        onClick();
    };
    node.on(Node.EventType.TOUCH_END, invoke);
    node.on(Node.EventType.MOUSE_UP, invoke);
}

function createButton(
    parent: Node,
    name: string,
    text: string,
    width: number,
    height: number,
    color: Color,
    onClick: () => void,
    options?: { pointerFallback?: boolean },
): ButtonHandle {
    const node = new Node(name);
    node.parent = parent;
    inheritParentLayer(node, parent);
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const background = node.getComponent(SolidBackground) ?? node.addComponent(SolidBackground);
    background.color = color;
    const button = node.getComponent(Button) ?? node.addComponent(Button);
    button.transition = Button.Transition.NONE;
    button.node.on(Button.EventType.CLICK, onClick, button);
    if (options?.pointerFallback) {
        bindPointerFallback(button.node, onClick);
    }
    const label = createTextNode(node, 'Label', width - 16, height - 8, text, 18);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    return { node, label };
}

function createListRow(parent: Node, name: string, width: number, title: string, detail: string, accent: Color, height = 88): void {
    const row = new Node(name);
    row.parent = parent;
    inheritParentLayer(row, parent);
    const transform = row.getComponent(UITransform) ?? row.addComponent(UITransform);
    transform.setContentSize(width, height);
    const background = row.getComponent(SolidBackground) ?? row.addComponent(SolidBackground);
    background.color = accent;
    const label = createTextNode(row, 'Label', width - 24, height - 16, `${title}\n${detail}`, 18);
    // 文字節點預設錨點在中心，貼左上定位時要把錨點移到左上，否則文字有一半跑出列外被遮罩切掉。
    label.node.getComponent(UITransform)?.setAnchorPoint(0, 1);
    label.node.setPosition(-((width / 2) - 12), (height / 2) - 8, 0);
}

function createModalRoot(name: string, width = 1180, height = 760): Node | null {
    const canvasNode = resolveCanvasNode();
    if (!canvasNode) {
        return null;
    }

    const root = new Node(name);
    root.parent = canvasNode;
    inheritParentLayer(root, canvasNode);
    const transform = root.getComponent(UITransform) ?? root.addComponent(UITransform);
    const canvasTransform = canvasNode.getComponent(UITransform);
    transform.setContentSize(canvasTransform?.width ?? 1920, canvasTransform?.height ?? 1080);
    const widget = root.getComponent(Widget) ?? root.addComponent(Widget);
    widget.isAlignTop = true;
    widget.top = 0;
    widget.isAlignBottom = true;
    widget.bottom = 0;
    widget.isAlignLeft = true;
    widget.left = 0;
    widget.isAlignRight = true;
    widget.right = 0;
    widget.isAlignHorizontalCenter = true;
    widget.horizontalCenter = 0;
    widget.isAlignVerticalCenter = true;
    widget.verticalCenter = 0;
    const background = root.getComponent(SolidBackground) ?? root.addComponent(SolidBackground);
    background.color = new Color(10, 14, 22, 208);
    root.getComponent(BlockInputEvents) ?? root.addComponent(BlockInputEvents);

    const panel = new Node('Panel');
    panel.parent = root;
    inheritParentLayer(panel, root);
    const panelTransform = panel.getComponent(UITransform) ?? panel.addComponent(UITransform);
    panelTransform.setContentSize(width, height);
    const panelWidget = panel.getComponent(Widget) ?? panel.addComponent(Widget);
    panelWidget.isAlignHorizontalCenter = true;
    panelWidget.horizontalCenter = 0;
    panelWidget.isAlignVerticalCenter = true;
    panelWidget.verticalCenter = 0;
    const panelBackground = panel.getComponent(SolidBackground) ?? panel.addComponent(SolidBackground);
    panelBackground.color = new Color(15, 20, 30, 238);
    promoteToFront(root, canvasNode);
    return root;
}

function destroyWindow(windowRef: ModalWindow | null): void {
    if (windowRef?.root?.isValid) {
        windowRef.root.active = false;
        windowRef.root.destroy();
    }
    syncDebugChromeVisibility();
}

function hasOpenModalWindow(windowRef: ModalWindow | null): boolean {
    return !!(windowRef?.root?.isValid && windowRef.root.activeInHierarchy);
}

function hasOpenDebugWindow(): boolean {
    return hasOpenModalWindow(gachaResultsWindow)
        || hasOpenModalWindow(gachaHistoryWindow)
        || hasOpenModalWindow(gachaInfoWindow)
        || hasOpenModalWindow(gachaErrorWindow)
        || !!(overlayState.actionLogPanel?.node?.isValid && overlayState.actionLogPanel.node.activeInHierarchy);
}

function syncDebugChromeVisibility(): void {
    setDevOverlayHidden(hasOpenDebugWindow());
}

function buildListModal(
    name: string,
    title: string,
    summary: string,
    items: Array<{ title: string; detail: string; accent?: Color }>,
    primaryButton?: { text: string; onClick: () => void },
): ModalWindow | null {
    const root = createModalRoot(name);
    if (!root) {
        return null;
    }

    const panel = root.getChildByName('Panel') ?? root;

    const closeModal = (): void => {
        if (!root.isValid) {
            syncDebugChromeVisibility();
            return;
        }
        root.active = false;
        root.destroy();
        syncDebugChromeVisibility();
    };

    const header = new Node('Header');
    header.parent = panel;
    inheritParentLayer(header, panel);
    const headerTransform = header.getComponent(UITransform) ?? header.addComponent(UITransform);
    headerTransform.setContentSize(1120, 56);
    header.setPosition(0, 342, 0);
    const headerBg = header.getComponent(SolidBackground) ?? header.addComponent(SolidBackground);
    headerBg.color = new Color(24, 30, 42, 240);

    const titleLabel = createTextNode(header, 'Title', 420, 40, title, 24);
    titleLabel.node.setPosition(-360, 0, 0);

    if (primaryButton) {
        createButton(
            header,
            'PrimaryButton',
            primaryButton.text,
            144,
            36,
            new Color(54, 84, 108, 240),
            primaryButton.onClick,
        ).node.setPosition(390, 0, 0);
    }

    createButton(
        header,
        'CloseButton',
        '關閉',
        110,
        36,
        new Color(108, 52, 52, 240),
        closeModal,
        { pointerFallback: true },
    ).node.setPosition(540, 0, 0);

    const summaryLabel = createTextNode(panel, 'Summary', 1100, 30, summary, 18);
    summaryLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    summaryLabel.node.setPosition(0, 304, 0);

    const scrollNode = new Node('ScrollView');
    scrollNode.parent = panel;
    inheritParentLayer(scrollNode, panel);
    const scrollTransform = scrollNode.getComponent(UITransform) ?? scrollNode.addComponent(UITransform);
    scrollTransform.setContentSize(1120, 620);
    scrollNode.setPosition(0, -28, 0);
    const scrollView = scrollNode.getComponent(ScrollView) ?? scrollNode.addComponent(ScrollView);
    scrollView.horizontal = false;
    scrollView.vertical = true;

    const viewNode = new Node('view');
    viewNode.parent = scrollNode;
    inheritParentLayer(viewNode, scrollNode);
    const viewTransform = viewNode.getComponent(UITransform) ?? viewNode.addComponent(UITransform);
    viewTransform.setContentSize(1080, 590);
    viewNode.setPosition(0, 0, 0);
    const viewMask = viewNode.getComponent(Mask) ?? viewNode.addComponent(Mask);
    viewMask.type = Mask.Type.GRAPHICS_RECT;

    const contentNode = new Node('Content');
    contentNode.parent = viewNode;
    inheritParentLayer(contentNode, viewNode);
    const contentTransform = contentNode.getComponent(UITransform) ?? contentNode.addComponent(UITransform);
    contentTransform.setContentSize(1080, 100);
    contentNode.setPosition(0, 0, 0);
    const layout = contentNode.getComponent(Layout) ?? contentNode.addComponent(Layout);
    layout.type = Layout.Type.VERTICAL;
    layout.spacingY = 8;
    layout.paddingTop = 12;
    layout.paddingBottom = 12;
    layout.paddingLeft = 12;
    layout.paddingRight = 12;
    layout.resizeMode = Layout.ResizeMode.CONTAINER;

    if (items.length === 0) {
        createListRow(
            contentNode,
            'EmptyRow',
            1050,
            '目前沒有資料。',
            '請先進行一次轉蛋，或重新整理後再查看。',
            new Color(46, 54, 66, 220),
            84,
        );
    } else {
        items.forEach((item, index) => {
            createListRow(
                contentNode,
                `Item_${index}`,
                1050,
                item.title,
                item.detail,
                item.accent ?? (index % 2 === 0 ? new Color(28, 34, 46, 220) : new Color(35, 42, 56, 220)),
                88,
            );
        });
    }

    layout.updateLayout();
    const contentHeight = Math.max(120, items.length * 96 + 24);
    contentTransform.setContentSize(contentTransform.width, contentHeight);
    scrollView.content = contentNode;
    scrollView.scrollToTop(0);

    syncDebugChromeVisibility();
    return { root };
}

function formatGachaResultTitle(entry: LocalGachaResultEntry): string {
    return entry.displayText;
}

function formatGachaResultDetail(entry: LocalGachaResultEntry): string {
    return `pool=${entry.poolId} | currency=${entry.currencyKey}`;
}


/**
 * 把轉蛋場景的資料接到全域測試工具（測試工具 2.0，PROG-2-9858）。
 * 測試工具本體（圓鈕、分頁面板）在 DevToolOverlay，開關由 DevToolGate 決定（?dev=1 或設定頁連點版本號）；
 * 這裡只登記「資源變動後刷新畫面」與場景專屬的 local 動作，沒開測試工具時完全不掛。
 */
function wireDevTool(
    gachaService: LocalGachaService | undefined,
    onSinglePlayerToggle: (() => void) | undefined,
    onClearRoster: (() => void) | undefined,
    onWalletChanged: (() => void) | undefined,
): void {
    overlayState.gachaService = gachaService ?? null;
    overlayState.onSinglePlayerToggle = onSinglePlayerToggle ?? null;
    overlayState.onClearRoster = onClearRoster ?? null;
    overlayState.onWalletChanged = onWalletChanged ?? null;
    installDevToolOverlay();
    setDevToolChangeListener(() => { overlayState.onWalletChanged?.(); });
    registerDevToolLocalAction('openActionLog', () => { showActionLogWindow(); });
    registerDevToolLocalAction('toggleSinglePlayer', overlayState.gachaService
        ? () => {
            if (overlayState.onSinglePlayerToggle) overlayState.onSinglePlayerToggle();
            else overlayState.gachaService?.toggleSinglePlayerModeEnabled();
            return `單機模式 ${overlayState.gachaService?.isSinglePlayerModeEnabled() ? 'ON' : 'OFF'}`;
        }
        : null);
}

export function attachCurrencyCheatPanel(
    gachaService: LocalGachaService,
    onSinglePlayerToggle?: (() => void) | undefined,
    onClearRoster?: (() => void) | undefined,
    onWalletChanged?: (() => void) | undefined,
): void {
    wireDevTool(gachaService, onSinglePlayerToggle, onClearRoster, onWalletChanged);
}

export function ensureGlobalDevOverlay(
    gachaService?: LocalGachaService,
    onSinglePlayerToggle?: (() => void) | undefined,
    onClearRoster?: (() => void) | undefined,
    onWalletChanged?: (() => void) | undefined,
): void {
    wireDevTool(gachaService, onSinglePlayerToggle, onClearRoster, onWalletChanged);
}

export function detachCurrencyCheatPanel(): void {
    destroyWindow(gachaResultsWindow);
    destroyWindow(gachaHistoryWindow);
    destroyWindow(gachaErrorWindow);
    gachaResultsWindow = null;
    gachaHistoryWindow = null;
    gachaErrorWindow = null;

    if (overlayState.actionLogPanel?.node.isValid) {
        overlayState.actionLogPanel.node.destroy();
    }
    overlayState.actionLogPanel = null;
    overlayState.gachaService = null;
    overlayState.onSinglePlayerToggle = null;
    overlayState.onClearRoster = null;
    overlayState.onWalletChanged = null;
    setDevToolChangeListener(null);
    registerDevToolLocalAction('toggleSinglePlayer', null);
}

export function detachRosterClearButton(): void {
    overlayState.onClearRoster = null;
}

/** 轉蛋場景自己改了錢包時呼叫：通知場景刷新資源顯示 */
export function refreshCurrencyDisplay(): void {
    overlayState.onWalletChanged?.();
}

export function showActionLogWindow(limit = 120): void {
    if (!isDevToolEnabled()) {
        return;
    }

    destroyWindow(gachaResultsWindow);
    destroyWindow(gachaHistoryWindow);
    destroyWindow(gachaErrorWindow);
    gachaResultsWindow = null;
    gachaHistoryWindow = null;
    gachaErrorWindow = null;
    syncDebugChromeVisibility();

    if (!overlayState.actionLogPanel?.node.isValid) {
        const root = createModalRoot('ActionLogDebugWindow', 1320, 820);
        if (!root) {
            return;
        }
        overlayState.actionLogPanel = root.addComponent(ActionLogDebugPanel);
        overlayState.actionLogPanel.onVisibilityChanged = syncDebugChromeVisibility;
    }

    void overlayState.actionLogPanel.open(limit);
    syncDebugChromeVisibility();
}

export async function showGachaResults(
    title: string,
    results: LocalGachaResultEntry[],
    onRetry?: (() => void) | undefined,
): Promise<void> {
    // 沒有轉蛋結果畫面可用時的後備清單，正式版也要能看到結果（PROG-2-9117）

    destroyWindow(gachaResultsWindow);
    gachaResultsWindow = buildListModal(
        'GachaResultsWindow',
        `${title} 結果`,
        `共 ${results.length} 筆抽取結果`,
        results.map((entry) => ({
            title: formatGachaResultTitle(entry),
            detail: formatGachaResultDetail(entry),
        })),
        onRetry
            ? { text: '再抽一次', onClick: onRetry }
            : undefined,
    );
    syncDebugChromeVisibility();
}

/** 轉蛋畫面的「紀錄」鈕：玩家功能，正式版也要開（原本被 DEV 擋掉，點了沒反應，PROG-2-9117） */
export async function showGachaHistory(data: { total: number; records: GachaHistoryRecord[] }): Promise<void> {

    // Expand each record into per-result rows so all drawn generals are visible individually.
    type HistoryItem = { title: string; detail: string; accent?: Color };
    const items: HistoryItem[] = [];
    for (const record of data.records) {
        const sessionLabel = `${formatTimestamp(record.timestamp)} | ${describeGachaAction(record.actionType)} | ${record.drawCount} 抽`;
        if (record.results.length === 0) {
            items.push({
                title: `#${record.seq} | (空)`,
                detail: sessionLabel,
                accent: new Color(46, 54, 66, 220),
            });
        } else {
            record.results.forEach((result, idx) => {
                items.push({
                    title: result.displayText,
                    detail: idx === 0 ? `#${record.seq} ${sessionLabel}` : `#${record.seq} (続)`,
                    accent: idx % 2 === 0 ? new Color(28, 34, 46, 220) : new Color(35, 42, 56, 220),
                });
            });
        }
    }

    if (items.length === 0) items.push({ title: '尚無召喚紀錄', detail: '抽過之後會列在這裡' });

    destroyWindow(gachaHistoryWindow);
    gachaHistoryWindow = buildListModal(
        'GachaHistoryWindow',
        '召喚紀錄',
        `共 ${data.total} 筆，最新紀錄在最上方`,
        items,
    );
    syncDebugChromeVisibility();
}

/** 轉蛋「詳情 ›」：列出費用、持有、機率、保底（玩家功能，不受 DEV 限制，PROG-2-9117） */
export function showGachaInfoModal(title: string, summary: string, rows: Array<{ title: string; detail: string }>): void {
    destroyWindow(gachaInfoWindow);
    gachaInfoWindow = buildListModal('GachaInfoWindow', title, summary, rows);
    syncDebugChromeVisibility();
}

export function showGachaError(message: string): void {
    if (!DEV) {
        return;
    }

    destroyWindow(gachaErrorWindow);
    gachaErrorWindow = buildListModal(
        'GachaErrorWindow',
        '召喚錯誤',
        '請確認轉蛋資料或網路狀態。',
        [{
            title: '錯誤訊息',
            detail: message,
        }],
    );
    syncDebugChromeVisibility();
}

// 模組載入時就掛上場景載入監聽：所有場景（含戰場）都會依測試工具開關補掛圓鈕，不必每個場景各自呼叫
installDevToolOverlay();
