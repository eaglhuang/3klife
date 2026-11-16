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
import type { UITemplateBinder } from './UITemplateBinder';
import { formatGachaWalletStrip } from '../../core/gacha/GachaButtonRules';
import type { GachaWalletDto } from '../../core/gacha/GachaApi';
import { SolidBackground } from '../components/SolidBackground';

export const GACHA_WALLET_STRIP_NODE = 'GachaWalletStrip';
export const GACHA_POOL_DETAIL_NODE = 'BtnPoolDetail';

/** 在轉蛋畫面右欄中段的空白帶（機率表與「我的餘額」之間，立繪蓋不到；原本放頂部被立繪蓋住）顯示全部可消耗資源；沒有節點時建立一次，之後只改字。 */
export function updateGachaWalletStrip(host: Node | null, wallet: Readonly<Partial<GachaWalletDto>>): void {
    if (!host?.isValid) return;
    let node = host.getChildByName(GACHA_WALLET_STRIP_NODE);
    if (!node) {
        node = new Node(GACHA_WALLET_STRIP_NODE);
        node.layer = host.layer;
        node.parent = host;
        node.addComponent(UITransform).setContentSize(540, 120);
        const widget = node.addComponent(Widget);
        widget.isAlignRight = true;
        widget.right = 30;
        widget.isAlignTop = true;
        widget.top = 600;
        widget.alignMode = Widget.AlignMode.ALWAYS;
        node.addComponent(SolidBackground).color = new Color(10, 14, 22, 170);
        const label = node.addComponent(Label);
        label.fontSize = 24;
        label.lineHeight = 36;
        label.enableWrapText = true;
        label.color = new Color(245, 210, 122, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        label.cacheMode = Label.CacheMode.NONE;
    }
    const label = node.getComponent(Label);
    if (label) {
        // 七項分三行（3／2／2），不靠自動換行，避免數字被攔腰折斷
        const items = formatGachaWalletStrip(wallet).split('　');
        label.string = [items.slice(0, 3), items.slice(3, 5), items.slice(5)].map((row) => row.join('　')).join('\n');
    }
    node.setSiblingIndex(host.children.length - 1);
}

/** 切池、載入立繪後把資源列再拉回最上層，避免被後掛上的池子內容蓋住。 */
export function raiseGachaWalletStrip(host: Node | null): void {
    const node = host?.isValid ? host.getChildByName(GACHA_WALLET_STRIP_NODE) : null;
    if (node && node.getSiblingIndex() !== host!.children.length - 1) node.setSiblingIndex(host!.children.length - 1);
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

/**
 * 文字節點本身是外框（panel）、字寫在子 Label 時（限定池橫幅名字、紅顏池標籤與保底），
 * 直接對外框 setTexts 寫不進去，畫面會留著原稿示意字（例如限定池寫「呂 布」卻是趙雲，PROG-2-9118）。
 * 這裡找出實際放字的 Label：節點自己有就用自己，否則取第一個子孫 Label。
 */
export function textLabelOf(node: Node | null): Label | null {
    if (!node) return null;
    return node.getComponent(Label) ?? node.getComponentInChildren(Label);
}

/**
 * 寫入轉蛋畫面動態文字：外框節點改寫到內部 Label；寫入的 Label 一律關字元快取（CHAR 沒出現過的字畫不出來）。
 * 節點本身就是 Label 的照舊交給 binder，維持原行為。
 */
export function setGachaTexts(binder: Pick<UITemplateBinder, 'getNode' | 'setTexts'>, texts: Record<string, string>): void {
    const direct: Record<string, string> = {};
    for (const [name, text] of Object.entries(texts)) {
        const node = binder.getNode(name);
        if (node && !node.getComponent(Label)) {
            const label = textLabelOf(node);
            if (label) {
                label.cacheMode = Label.CacheMode.NONE;
                label.string = text;
                continue;
            }
        }
        direct[name] = text;
    }
    binder.setTexts(direct);
}
