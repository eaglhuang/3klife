import { UITransform, Vec3, Widget, type Node } from 'cc';
import type { UITemplateBinder } from './UITemplateBinder';
/** 讓邊緣目標的箭頭仍留在可見範圍，不改變真實目標框。 */
export function tutorialPointerPlacement(x: number, y: number, targetHeight: number, labelWidth: number,
    viewportLeft: number, viewportRight: number, viewportBottom: number): { above: boolean; offsetX: number } {
    const half = labelWidth / 2;
    const center = Math.max(viewportLeft + half + 8, Math.min(viewportRight - half - 8, x));
    return { above: y - targetHeight / 2 - 44 < viewportBottom + 8, offsetX: center - x };
}
/** 依真實節點世界邊界定位；僅畫框與箭頭，不攔截原按鈕觸控。 */
export function placeTutorialTarget(binder: UITemplateBinder | null, target: Node | null): void {
    const frame = binder?.getNode('tutorialHighlight');
    if (!frame) return;
    const source = target?.getComponent(UITransform);
    const parent = frame.parent?.getComponent(UITransform);
    const transform = frame.getComponent(UITransform);
    frame.active = !!source && !!parent && !!transform && !!target?.activeInHierarchy;
    if (!frame.active || !source || !parent || !transform) return;
    const left = -source.width * source.anchorX;
    const bottom = -source.height * source.anchorY;
    const corners = [[left, bottom], [left + source.width, bottom], [left, bottom + source.height], [left + source.width, bottom + source.height]]
        .map(([x, y]) => parent.convertToNodeSpaceAR(source.convertToWorldSpaceAR(new Vec3(x, y, 0))));
    const min = new Vec3(Math.min(...corners.map(p => p.x)), Math.min(...corners.map(p => p.y)), 0);
    const max = new Vec3(Math.max(...corners.map(p => p.x)), Math.max(...corners.map(p => p.y)), 0);
    transform.setContentSize(Math.abs(max.x - min.x) + 16, Math.abs(max.y - min.y) + 16);
    frame.setPosition((min.x + max.x) / 2, (min.y + max.y) / 2, 0);
    const pointer = binder?.getNode('tutorialPointer');
    const pointerTransform = pointer?.getComponent(UITransform);
    const pointerWidget = pointer?.getComponent(Widget);
    if (pointerTransform && pointerWidget) {
        const width = Math.min(600, Math.max(0, parent.width - 16));
        pointerTransform.setContentSize(width, 40);
        const pos = tutorialPointerPlacement(frame.position.x, frame.position.y, transform.height, width,
            -parent.width * parent.anchorX, parent.width * (1 - parent.anchorX), -parent.height * parent.anchorY);
        pointerWidget.isAlignBottom = !pos.above;
        pointerWidget.isAlignTop = pos.above;
        pointerWidget.top = pointerWidget.bottom = -44;
        pointerWidget.horizontalCenter = pos.offsetX;
        const label = binder?.getLabel('tutorialPointer');
        if (label) label.string = label.string.replace(/[▲▼]/, pos.above ? '▼' : '▲');
    }
    for (const child of frame.children) child.getComponent(Widget)?.updateAlignment();
}
