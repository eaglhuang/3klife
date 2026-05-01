import { Node, Layout, Size, UITransform, Widget } from 'cc';
import type { UILayoutNodeSpec } from './UISpecTypes';
import { resolveSize } from './UISpecTypes';

/**
 * UIPreviewLayoutBuilder
 * 
 * 負責節點的佈局與對齊元件設定：
 *   - applyWidget: 設定 Widget 對齊 (Unity: RectTransform anchors)
 *   - setupLayout: 設定 Layout 分組 (Unity: LayoutGroup)
 */
export class UIPreviewLayoutBuilder {

    private static readonly DEFAULT_GRID_CELL = 100;

    /**
     * 套用 Widget 對齊設定到節點。
     * Unity 對照：RectTransform anchor + stretch 設定
     *
     * 支援欄位：
     *   top / bottom / left / right   → Widget 對邊距留白
     *   hCenter: true                 → 水平置中（alignHorizontalCenter = 0）
     *   vCenter: true                 → 垂直置中（alignVerticalCenter = 0）
     *   hCenter: number               → 水平置中偏移（正值向右）
     *   vCenter: number               → 垂直置中偏移（正值向上）
     */
    public applyWidget(
        node: Node,
        widgetDef?: UILayoutNodeSpec['widget'],
        parentWidth = 0,
        parentHeight = 0,
    ): void {
        if (!widgetDef) return;
        const widget = node.getComponent(Widget) || node.addComponent(Widget);
        if (widgetDef.top    !== undefined) { widget.isAlignTop    = true; widget.top    = resolveSize(widgetDef.top, parentHeight); }
        if (widgetDef.bottom !== undefined) { widget.isAlignBottom = true; widget.bottom = resolveSize(widgetDef.bottom, parentHeight); }
        if (widgetDef.left   !== undefined) { widget.isAlignLeft   = true; widget.left   = resolveSize(widgetDef.left, parentWidth); }
        if (widgetDef.right  !== undefined) { widget.isAlignRight  = true; widget.right  = resolveSize(widgetDef.right, parentWidth); }

        // 水平置中：hCenter = true（偏移 0）或 hCenter = number（帶偏移）
        const hc = (widgetDef as any).hCenter;
        if (hc !== undefined) {
            widget.isAlignHorizontalCenter = true;
            widget.horizontalCenter = typeof hc === 'number' ? hc : 0;
        }

        // 垂直置中：vCenter = true（偏移 0）或 vCenter = number（帶偏移）
        const vc = (widgetDef as any).vCenter;
        if (vc !== undefined) {
            widget.isAlignVerticalCenter = true;
            widget.verticalCenter = typeof vc === 'number' ? vc : 0;
        }

        // 注意：此處不呼叫 updateAlignment()。
        // 整棵樹建完後由 UIPreviewBuilder._postBuildPass() 統一重算對齊，
        // 可避免建樹期間父容器尺寸尚未穩定時的冀示計算對齊寬魯。
        // Unity 對照：Canvas.ForceUpdateCanvases() 在整樹 Instantiate 完成後才呼叫。
    }

    /**
     * 掛載 Layout 元件並設定排列方向、間距與 padding。
     * Unity 對照：HorizontalLayoutGroup / VerticalLayoutGroup / GridLayoutGroup
     */
    public setupLayout(node: Node, spec: UILayoutNodeSpec): void {
        if (!spec.layout) return;
        const layout = node.getComponent(Layout) || node.addComponent(Layout);
        (node as any).__ucufLayoutDef = spec.layout;
        
        switch (spec.layout.type) {
            case 'horizontal': layout.type = Layout.Type.HORIZONTAL; break;
            case 'vertical':   layout.type = Layout.Type.VERTICAL;   break;
            case 'grid':       layout.type = Layout.Type.GRID;       break;
            default:           layout.type = Layout.Type.NONE;       break;
        }

        layout.spacingX      = spec.layout.spacingX     ?? spec.layout.spacing ?? 0;
        layout.spacingY      = spec.layout.spacingY     ?? spec.layout.spacing ?? 0;
        layout.paddingLeft   = spec.layout.paddingLeft   ?? 0;
        layout.paddingRight  = spec.layout.paddingRight  ?? 0;
        layout.paddingTop    = spec.layout.paddingTop    ?? 0;
        layout.paddingBottom = spec.layout.paddingBottom ?? 0;

        if (layout.type === Layout.Type.GRID) {
            const cellWidth = spec.layout.cellWidth ?? UIPreviewLayoutBuilder.DEFAULT_GRID_CELL;
            const cellHeight = spec.layout.cellHeight ?? UIPreviewLayoutBuilder.DEFAULT_GRID_CELL;
            layout.cellSize = new Size(cellWidth, cellHeight);

            switch (spec.layout.startAxis) {
                case 'vertical':
                    layout.startAxis = Layout.AxisDirection.VERTICAL;
                    break;
                default:
                    layout.startAxis = Layout.AxisDirection.HORIZONTAL;
                    break;
            }

            switch (spec.layout.constraint) {
                case 'fixed-row':
                    layout.constraint = Layout.Constraint.FIXED_ROW;
                    break;
                case 'fixed-col':
                    layout.constraint = Layout.Constraint.FIXED_COL;
                    break;
                default:
                    layout.constraint = Layout.Constraint.NONE;
                    break;
            }

            if (typeof spec.layout.constraintNum === 'number' && spec.layout.constraintNum > 0) {
                layout.constraintNum = spec.layout.constraintNum;
            }
        }

        if (layout.type === Layout.Type.HORIZONTAL) {
            layout.horizontalDirection = spec.layout.horizontalDirection === 'right-to-left'
                ? Layout.HorizontalDirection.RIGHT_TO_LEFT
                : Layout.HorizontalDirection.LEFT_TO_RIGHT;
        }

        if (layout.type === Layout.Type.VERTICAL) {
            layout.verticalDirection = spec.layout.verticalDirection === 'bottom-to-top'
                ? Layout.VerticalDirection.BOTTOM_TO_TOP
                : Layout.VerticalDirection.TOP_TO_BOTTOM;
        }
        
        // resizeMode：可由 spec 顯式指定。
        // 若未指定，且節點沒有明確 width/height、也沒有 widget 錨點，
        // 以 CONTAINER 作為 auto 模式，避免 Cocos UITransform 預設 100x100
        // 讓純內容容器（例如 stats row）被放大成錯誤尺寸。
        // Unity 對照：ContentSizeFitter (Preferred Size)
        const hasExplicitSize = spec.width !== undefined || spec.height !== undefined;
        const widgetDef = spec.widget as Record<string, unknown> | undefined;
        const hasWidgetAnchors = !!(widgetDef
            && (widgetDef.top !== undefined
                || widgetDef.right !== undefined
                || widgetDef.bottom !== undefined
                || widgetDef.left !== undefined
                || widgetDef.hCenter !== undefined
                || widgetDef.vCenter !== undefined));

        let autoResizeMode = Layout.ResizeMode.NONE;
        if (!hasExplicitSize && !hasWidgetAnchors && layout.type !== Layout.Type.NONE) {
            autoResizeMode = Layout.ResizeMode.CONTAINER;
        }

        //   'container' → 容器自適應子節點總尺寸
        //   'children'  → 子節點自適應容器尺寸（均分）
        switch (spec.layout.resizeMode) {
            case 'container': layout.resizeMode = Layout.ResizeMode.CONTAINER; break;
            case 'children':  layout.resizeMode = Layout.ResizeMode.CHILDREN;  break;
            default:          layout.resizeMode = autoResizeMode;              break;
        }
    }

    /**
     * Cocos Layout 只負責基礎排列；這裡補上 CSS flex 的 cross/main-axis 對齊。
     * Unity 對照：LayoutGroup 排版後，再套用 Child Alignment / spacing distribution。
     */
    public applyPostLayoutAlignment(root: Node): void {
        for (const child of root.children) {
            this.applyPostLayoutAlignment(child);
        }

        const layout = root.getComponent(Layout);
        const layoutDef = (root as any).__ucufLayoutDef as UILayoutNodeSpec['layout'] | undefined;
        if (!layout || !layoutDef) return;
        if (layout.type !== Layout.Type.HORIZONTAL && layout.type !== Layout.Type.VERTICAL) return;

        const parentTransform = root.getComponent(UITransform);
        if (!parentTransform) return;

        const flowChildren = root.children
            .filter(child => child.active && child.getComponent(UITransform))
            .map(child => ({ node: child, transform: child.getComponent(UITransform)! }));
        if (flowChildren.length === 0) return;

        const bounds = this._contentBounds(parentTransform, layoutDef);
        if (layoutDef.justifyContent) {
            this._applyMainAxisDistribution(layout, layoutDef, flowChildren, bounds);
        }
        if (layoutDef.alignItems) {
            this._applyCrossAxisAlignment(layout, layoutDef, flowChildren, bounds);
        }
    }

    private _contentBounds(transform: UITransform, layoutDef: UILayoutNodeSpec['layout']): { left: number; right: number; top: number; bottom: number; width: number; height: number } {
        const left = -transform.width * transform.anchorX + (layoutDef?.paddingLeft ?? 0);
        const right = transform.width * (1 - transform.anchorX) - (layoutDef?.paddingRight ?? 0);
        const bottom = -transform.height * transform.anchorY + (layoutDef?.paddingBottom ?? 0);
        const top = transform.height * (1 - transform.anchorY) - (layoutDef?.paddingTop ?? 0);
        return { left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, top - bottom) };
    }

    private _applyCrossAxisAlignment(
        layout: Layout,
        layoutDef: UILayoutNodeSpec['layout'],
        flowChildren: Array<{ node: Node; transform: UITransform }>,
        bounds: { left: number; right: number; top: number; bottom: number },
    ): void {
        const align = layoutDef?.alignItems;
        if (!align || align === 'stretch') return;

        for (const child of flowChildren) {
            const pos = child.node.position;
            if (layout.type === Layout.Type.HORIZONTAL) {
                const targetY = this._alignedY(child.transform, bounds, align === 'baseline' ? 'end' : align);
                child.node.setPosition(pos.x, targetY, pos.z);
            } else if (layout.type === Layout.Type.VERTICAL) {
                const targetX = this._alignedX(child.transform, bounds, align === 'baseline' ? 'start' : align);
                child.node.setPosition(targetX, pos.y, pos.z);
            }
        }
    }

    private _applyMainAxisDistribution(
        layout: Layout,
        layoutDef: UILayoutNodeSpec['layout'],
        flowChildren: Array<{ node: Node; transform: UITransform }>,
        bounds: { left: number; right: number; top: number; bottom: number; width: number; height: number },
    ): void {
        const justify = layoutDef?.justifyContent;
        if (!justify || justify === 'start') return;
        if (layout.type === Layout.Type.HORIZONTAL) {
            this._distributeHorizontal(layoutDef, flowChildren, bounds, justify);
        } else if (layout.type === Layout.Type.VERTICAL) {
            this._distributeVertical(layoutDef, flowChildren, bounds, justify);
        }
    }

    private _distributeHorizontal(
        layoutDef: UILayoutNodeSpec['layout'],
        flowChildren: Array<{ node: Node; transform: UITransform }>,
        bounds: { left: number; right: number; width: number },
        justify: NonNullable<UILayoutNodeSpec['layout']>['justifyContent'],
    ): void {
        const widths = flowChildren.map(child => child.transform.width);
        const sumWidth = widths.reduce((sum, width) => sum + width, 0);
        const spacing = layoutDef?.spacingX ?? layoutDef?.spacing ?? 0;
        const distributed = this._resolveDistributedSpacing(justify, bounds.width, sumWidth, flowChildren.length, spacing);
        const rightToLeft = layoutDef?.horizontalDirection === 'right-to-left';
        let cursor = rightToLeft ? bounds.right - distributed.leading : bounds.left + distributed.leading;

        for (let index = 0; index < flowChildren.length; index += 1) {
            const child = flowChildren[index];
            const width = widths[index];
            const pos = child.node.position;
            const x = rightToLeft
                ? cursor - width * (1 - child.transform.anchorX)
                : cursor + width * child.transform.anchorX;
            child.node.setPosition(x, pos.y, pos.z);
            cursor += rightToLeft ? -(width + distributed.spacing) : width + distributed.spacing;
        }
    }

    private _distributeVertical(
        layoutDef: UILayoutNodeSpec['layout'],
        flowChildren: Array<{ node: Node; transform: UITransform }>,
        bounds: { top: number; bottom: number; height: number },
        justify: NonNullable<UILayoutNodeSpec['layout']>['justifyContent'],
    ): void {
        const heights = flowChildren.map(child => child.transform.height);
        const sumHeight = heights.reduce((sum, height) => sum + height, 0);
        const spacing = layoutDef?.spacingY ?? layoutDef?.spacing ?? 0;
        const distributed = this._resolveDistributedSpacing(justify, bounds.height, sumHeight, flowChildren.length, spacing);
        const bottomToTop = layoutDef?.verticalDirection === 'bottom-to-top';
        let cursor = bottomToTop ? bounds.bottom + distributed.leading : bounds.top - distributed.leading;

        for (let index = 0; index < flowChildren.length; index += 1) {
            const child = flowChildren[index];
            const height = heights[index];
            const pos = child.node.position;
            const y = bottomToTop
                ? cursor + height * child.transform.anchorY
                : cursor - height * (1 - child.transform.anchorY);
            child.node.setPosition(pos.x, y, pos.z);
            cursor += bottomToTop ? height + distributed.spacing : -(height + distributed.spacing);
        }
    }

    private _resolveDistributedSpacing(
        justify: NonNullable<UILayoutNodeSpec['layout']>['justifyContent'],
        available: number,
        childTotal: number,
        childCount: number,
        fallbackSpacing: number,
    ): { leading: number; spacing: number } {
        const fallbackContent = childTotal + Math.max(0, childCount - 1) * fallbackSpacing;
        const fallbackExtra = Math.max(0, available - fallbackContent);
        const free = Math.max(0, available - childTotal);
        switch (justify) {
            case 'center': return { leading: fallbackExtra / 2, spacing: fallbackSpacing };
            case 'end': return { leading: fallbackExtra, spacing: fallbackSpacing };
            case 'space-between': return childCount > 1 ? { leading: 0, spacing: free / (childCount - 1) } : { leading: fallbackExtra / 2, spacing: fallbackSpacing };
            case 'space-around': return childCount > 0 ? { leading: free / childCount / 2, spacing: free / childCount } : { leading: 0, spacing: fallbackSpacing };
            case 'space-evenly': return childCount > 0 ? { leading: free / (childCount + 1), spacing: free / (childCount + 1) } : { leading: 0, spacing: fallbackSpacing };
            default: return { leading: 0, spacing: fallbackSpacing };
        }
    }

    private _alignedX(transform: UITransform, bounds: { left: number; right: number }, align: string): number {
        if (align === 'center') return (bounds.left + bounds.right) / 2 + transform.width * (transform.anchorX - 0.5);
        if (align === 'end') return bounds.right - transform.width * (1 - transform.anchorX);
        return bounds.left + transform.width * transform.anchorX;
    }

    private _alignedY(transform: UITransform, bounds: { top: number; bottom: number }, align: string): number {
        if (align === 'center') return (bounds.top + bounds.bottom) / 2 + transform.height * (transform.anchorY - 0.5);
        if (align === 'end') return bounds.bottom + transform.height * transform.anchorY;
        return bounds.top - transform.height * (1 - transform.anchorY);
    }
}
