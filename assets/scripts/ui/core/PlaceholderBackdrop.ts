import { Node, Sprite } from 'cc';
import { GradientBackground } from '../components/GradientBackground';
import { SolidBackground } from '../components/SolidBackground';

/**
 * 佔位格底色開關（PROG-2-9029）：原稿用斜紋或色塊標出「美術放這裡」，
 * 真正的美術放進去後佔位底色就該消失；載入失敗時保留，畫面不會開天窗。
 * 只動節點自身的底色元件，子節點（例如換上的立繪）不受影響。
 * 一併停用漸層／純色元件，避免它們之後重繪時又把精靈圖打開。
 */
export function setPlaceholderBackdropVisible(node: Node, visible: boolean): void {
    for (const type of [GradientBackground, SolidBackground, Sprite] as const) {
        const comp = node.getComponent(type as any);
        if (comp) comp.enabled = visible;
    }
}
