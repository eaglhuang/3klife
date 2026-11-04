// @spec-source → 武將人物介面規格書.md (doc_ui_0012)；UI-2-0166
/**
 * Ds3NodeLookup — 人物頁子面板依固定名稱找節點。
 *
 * 轉換器把有底色的文字拆成「面板＋文字」兩層，名字在面板上、文字在子節點；
 * 綁定表取的名字可能落在任一層，所以找 Label 時也要往子節點找。
 */
import { Label, Layout, Node, UITransform } from 'cc';

export interface Ds3BinderLike {
    getNode(name: string): Node | null | undefined;
    getLabel(name: string): Label | null | undefined;
}

function findByName(root: Node | null | undefined, name: string): Node | null {
    if (!root) return null;
    if (root.name === name) return root;
    for (const child of root.children) {
        const found = findByName(child, name);
        if (found) return found;
    }
    return null;
}

export function ds3Node(binder: Ds3BinderLike, host: Node | null | undefined, name: string): Node | null {
    return binder.getNode(name) ?? findByName(host, name);
}

export function ds3Label(binder: Ds3BinderLike, host: Node | null | undefined, name: string): Label | null {
    const node = ds3Node(binder, host, name);
    const label = binder.getLabel(name) ?? node?.getComponent(Label) ?? node?.getComponentInChildren(Label) ?? null;
    // 這裡拿到的文字會隨武將改變，字元不可預期，不佔共用字元圖集（CHAR 滿了會缺字）
    if (label && label.cacheMode === Label.CacheMode.CHAR) label.cacheMode = Label.CacheMode.NONE;
    return label;
}

export function ds3SetActive(binder: Ds3BinderLike, host: Node | null | undefined, name: string, active: boolean): void {
    const node = ds3Node(binder, host, name);
    if (!node) return;
    node.active = active;
    // 轉換器用 <名字>_margin 容器表現外距，要一起收起來才不會留白
    if (node.parent?.name === `${name}_margin`) node.parent.active = active;
}

/**
 * 隱藏節點後重算版面：由內而外依可見子節點重算垂直／格狀容器高度，讓後面的區塊往上補位。
 * 只調整父節點也有 Layout 的容器；分頁根節點維持原高度，頂端才不會跟著移動。
 * 內容沒有變動的容器不動，有些卡片的高度來自格狀欄位而不是內容。回傳高度是否改變。
 */
export function ds3Reflow(node: Node): boolean {
    const children = node.children.filter((child) => child.active);
    let contentChanged = children.length !== node.children.length;
    for (const child of children) {
        if (ds3Reflow(child)) contentChanged = true;
    }
    const layout = node.getComponent(Layout);
    if (!layout) return contentChanged;
    const transform = node.getComponent(UITransform);
    let resized = false;
    if (contentChanged && transform && children.length > 0 && node.parent?.getComponent(Layout)) {
        const height = contentHeight(layout, children);
        if (height !== null && height !== transform.height) {
            transform.setContentSize(transform.width, height);
            resized = true;
        }
    }
    layout.updateLayout();
    return resized;
}

function contentHeight(layout: Layout, children: Node[]): number | null {
    const heightOf = (child: Node): number => child.getComponent(UITransform)?.height ?? 0;
    const padding = layout.paddingTop + layout.paddingBottom;
    if (layout.type === Layout.Type.VERTICAL) {
        const total = children.reduce((sum, child) => sum + heightOf(child), 0);
        return padding + total + layout.spacingY * (children.length - 1);
    }
    if (layout.type === Layout.Type.GRID && layout.constraintNum > 0) {
        const rows = Math.ceil(children.length / layout.constraintNum);
        return padding + rows * heightOf(children[0]) + layout.spacingY * (rows - 1);
    }
    return null;
}
