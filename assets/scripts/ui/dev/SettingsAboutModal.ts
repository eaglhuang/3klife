// @spec-source → 測試工具 2.0（使用者 2026-11-23 定案）；PROG-2-9858
/**
 * SettingsAboutModal — 最小的「設定」視窗：顯示版本號，連點版本號 7 次開啟測試工具。
 *
 * 目前遊戲還沒有完整設定頁，標題畫面的「設定」鈕先接這個視窗；之後設定頁做好，
 * 只要把版本號文字接同一個 VersionTapCounter 即可。正式版建置被旗標排除時，連點不會有任何反應。
 */
import { BlockInputEvents, Button, Color, Label, Node, UITransform } from 'cc';
import { GAME_VERSION_LABEL } from '../../core/config/BuildInfo';
import { devToolGate, VersionTapCounter } from '../../core/dev/DevToolGate';
import { services } from '../../core/managers/ServiceLoader';
import { SolidBackground } from '../components/SolidBackground';
import { installDevToolOverlay } from './DevToolOverlay';

function t(key: string, fallback: string, ...args: string[]): string {
    const text = services().i18n.t(key, ...args);
    return text === key ? fallback : text;
}

function box(parent: Node, name: string, w: number, h: number, color: Color | null): Node {
    const node = new Node(name);
    node.parent = parent;
    node.layer = parent.layer;
    node.addComponent(UITransform).setContentSize(w, h);
    if (color) node.addComponent(SolidBackground).color = color;
    return node;
}

function text(parent: Node, name: string, w: number, h: number, value: string, size: number): Label {
    const node = box(parent, name, w, h, null);
    const label = node.addComponent(Label);
    label.string = value;
    label.fontSize = size;
    label.lineHeight = size + 6;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    return label;
}

/** 在 parent（場景 Canvas）上開設定視窗；回傳視窗根節點 */
export function showSettingsAbout(parent: Node): Node {
    const root = box(parent, 'SettingsAboutModal', 4000, 4000, new Color(8, 12, 20, 200));
    root.addComponent(BlockInputEvents);
    const panel = box(root, 'Panel', 560, 360, new Color(24, 32, 46, 250));

    text(panel, 'Title', 480, 56, t('dev.tool.settings.title', '設定'), 32).node.setPosition(0, 130, 0);

    const gate = devToolGate();
    const versionBtn = box(panel, 'Version', 480, 64, new Color(36, 46, 64, 255));
    versionBtn.setPosition(0, 40, 0);
    text(versionBtn, 'Label', 460, 56, `${t('dev.tool.settings.version', '版本')} ${GAME_VERSION_LABEL}`, 26);
    const hint = text(panel, 'Hint', 480, 40, gate.isEnabled() ? t('dev.tool.settings.enabled', '測試工具已開啟') : '', 20);
    hint.node.setPosition(0, -30, 0);
    hint.color = new Color(160, 220, 160, 255);

    const counter = new VersionTapCounter();
    versionBtn.addComponent(Button).transition = Button.Transition.NONE;
    versionBtn.on(Button.EventType.CLICK, () => {
        if (!gate.buildAllowed()) return;
        const result = counter.tap(Date.now());
        if (result.triggered) {
            gate.setPersisted(true);
            installDevToolOverlay();
            hint.string = t('dev.tool.settings.enabled', '測試工具已開啟');
        } else if (result.count >= 3 && !gate.isEnabled()) {
            hint.string = t('dev.tool.settings.taps_left', '再點 {0} 次開啟測試工具', String(7 - result.count)).replace('{0}', String(7 - result.count));
        }
    });

    const close = box(panel, 'Close', 200, 56, new Color(70, 78, 92, 255));
    close.setPosition(0, -110, 0);
    text(close, 'Label', 180, 48, t('dev.tool.close', '關閉'), 24);
    close.addComponent(Button).transition = Button.Transition.NONE;
    close.on(Button.EventType.CLICK, () => { root.destroy(); });

    root.setSiblingIndex(parent.children.length - 1);
    return root;
}
