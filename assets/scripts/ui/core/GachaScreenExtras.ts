// @spec-source → 轉蛋系統.md §貨幣系統（PROG-2-9117：轉蛋畫面顯示可消耗資源、「詳情 ›」按鈕）
/**
 * 轉蛋畫面補件（依賴 cc）：資源列與「詳情 ›」按鈕綁定。
 * 判斷與文字都在 core/gacha/GachaButtonRules.ts，這裡只管節點。
 *
 * 手機記憶體：資源列只有一個 Label 節點，重用、不隨切池或抽卡重建；字不走字元快取（CHAR），不佔圖集。
 *
 * Unity 對照：HUD 上一個 TextMeshPro，每次錢包變動只改 text。
 */
import { Button, Color, Label, Node, UITransform, Widget } from 'cc';
import { formatGachaWalletStrip } from '../../core/gacha/GachaButtonRules';
import type { GachaWalletDto } from '../../core/gacha/GachaApi';
import { SolidBackground } from '../components/SolidBackground';

export const GACHA_WALLET_STRIP_NODE = 'GachaWalletStrip';
export const GACHA_POOL_DETAIL_NODE = 'BtnPoolDetail';

/** 在轉蛋畫面頂部（返回、傭兵鈕右側、左上說明框右邊）顯示全部可消耗資源；沒有節點時建立一次，之後只改字。 */
export function updateGachaWalletStrip(host: Node | null, wallet: Readonly<Partial<GachaWalletDto>>): void {
    if (!host?.isValid) return;
    let node = host.getChildByName(GACHA_WALLET_STRIP_NODE);
    if (!node) {
        node = new Node(GACHA_WALLET_STRIP_NODE);
        node.layer = host.layer;
        node.parent = host;
        node.addComponent(UITransform).setContentSize(860, 36);
        const widget = node.addComponent(Widget);
        widget.isAlignLeft = true;
        widget.left = 440;
        widget.isAlignTop = true;
        widget.top = 70;
        widget.alignMode = Widget.AlignMode.ALWAYS;
        node.addComponent(SolidBackground).color = new Color(10, 14, 22, 170);
        const label = node.addComponent(Label);
        label.fontSize = 22;
        label.lineHeight = 30;
        label.color = new Color(245, 210, 122, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        label.cacheMode = Label.CacheMode.NONE;
    }
    const label = node.getComponent(Label);
    if (label) label.string = formatGachaWalletStrip(wallet);
    node.setSiblingIndex(host.children.length - 1);
}

/** 各池右側內容都有「詳情 ›」（切池時重新載入），每次切池後重綁；off 再 on，不疊加監聽。 */
export function bindGachaPoolDetail(getNode: (name: string) => Node | null, onClick: () => void, owner: object): void {
    const node = getNode(GACHA_POOL_DETAIL_NODE);
    if (!node) return;
    const button = node.getComponent(Button) ?? node.addComponent(Button);
    button.interactable = true;
    node.off(Button.EventType.CLICK, undefined, owner);
    node.off('touch-end', undefined, owner);
    node.on(Button.EventType.CLICK, onClick, owner);
    node.on('touch-end', onClick, owner);
}
