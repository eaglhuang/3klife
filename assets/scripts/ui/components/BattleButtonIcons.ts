// @spec-source → 戰場右側 UI 重設計規格 §3.1（單色線稿圖示）；PROG-2-10133（B2）
/**
 * BattleButtonIcons — 戰場按鈕用的單色線稿圖示（純路徑，不依賴 cc，可單測）
 *
 * 全部畫在 [-0.5,0.5]×[-0.5,0.5] 的單位方塊內，再乘上 size；線寬、圓頭、顏色由呼叫端的 Graphics 決定，
 * 之後 B3 換正式圖集時整組取代，這裡只是程式繪製的過渡版（不佔任何貼圖記憶體）。
 */

/** 只用到 Graphics 的這幾個繪圖函式；測試可以用記錄用的假畫筆 */
export interface IconPen {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    circle(x: number, y: number, r: number): void;
    arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, counterclockwise: boolean): void;
    close(): void;
}

export type BattleIconId = 'auto' | 'delegate' | 'speed' | 'log' | 'settings' | 'exit' | 'endturn' | 'sortie' | 'tactics';

export const BATTLE_ICON_IDS: readonly BattleIconId[] = ['auto', 'delegate', 'speed', 'log', 'settings', 'exit', 'endturn', 'sortie', 'tactics'];

const PI = Math.PI;

/** 畫一個圖示；(0,0) 為中心，size 為外框邊長（設計 px） */
export function drawBattleIcon(pen: IconPen, id: BattleIconId, size: number): void {
    const s = size;
    const mv = (x: number, y: number): void => pen.moveTo(x * s, y * s);
    const ln = (x: number, y: number): void => pen.lineTo(x * s, y * s);
    // 弧線前先移到起點，避免 Graphics.arc 從上一條路徑的終點拉出一條連線
    const arcAt = (cx: number, cy: number, r: number, a0: number, a1: number): void => {
        mv(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
        // Cocos Graphics.arc 的 counterclockwise=false 會繞遠路（長弧）；要走 a0→a1 的短弧需傳 true
        pen.arc(cx * s, cy * s, r * s, a0, a1, true);
    };
    const poly = (pts: Array<[number, number]>, closed = false): void => {
        pts.forEach(([x, y], i) => (i === 0 ? mv(x, y) : ln(x, y)));
        if (closed) pen.close();
    };
    switch (id) {
        case 'auto': {
            // 兩段圓弧箭頭：循環自動
            const r = 0.34;
            arcAt(0, 0, r, PI * 0.1, PI * 0.9);
            poly([[-0.34, 0.16], [-0.34, 0.34], [-0.16, 0.34]]);
            arcAt(0, 0, r, PI * 1.1, PI * 1.9);
            poly([[0.34, -0.16], [0.34, -0.34], [0.16, -0.34]]);
            break;
        }
        case 'delegate':
            // 人像：頭＋肩
            pen.circle(0, 0.16 * s, 0.17 * s);
            arcAt(0, -0.46, 0.5, PI * 0.2, PI * 0.8);
            break;
        case 'speed':
            poly([[-0.4, 0.3], [-0.1, 0], [-0.4, -0.3]]);
            poly([[0.02, 0.3], [0.32, 0], [0.02, -0.3]]);
            break;
        case 'log':
            poly([[-0.3, 0.42], [0.3, 0.42], [0.3, -0.42], [-0.3, -0.42]], true);
            poly([[-0.14, 0.2], [0.14, 0.2]]);
            poly([[-0.14, 0], [0.14, 0]]);
            poly([[-0.14, -0.2], [0.06, -0.2]]);
            break;
        case 'settings': {
            pen.circle(0, 0, 0.17 * s);
            for (let i = 0; i < 8; i++) {
                const a = (PI * 2 * i) / 8;
                mv(Math.cos(a) * 0.3, Math.sin(a) * 0.3);
                ln(Math.cos(a) * 0.44, Math.sin(a) * 0.44);
            }
            pen.circle(0, 0, 0.3 * s);
            break;
        }
        case 'exit':
            poly([[0.0, 0.4], [-0.34, 0.4], [-0.34, -0.4], [0.0, -0.4]]);
            poly([[-0.12, 0], [0.4, 0]]);
            poly([[0.2, 0.2], [0.4, 0], [0.2, -0.2]]);
            break;
        case 'endturn':
            poly([[-0.28, -0.44], [-0.28, 0.44]]);
            poly([[-0.28, 0.4], [0.38, 0.2], [-0.28, 0.0]], true);
            break;
        case 'sortie':
            poly([[-0.4, -0.4], [0.4, 0.4]]);
            poly([[0.06, 0.4], [0.4, 0.4], [0.4, 0.06]]);
            break;
        case 'tactics': {
            const pts: Array<[number, number]> = [];
            for (let i = 0; i < 10; i++) {
                const r = i % 2 === 0 ? 0.46 : 0.19;
                const a = PI / 2 + (PI * i) / 5;
                pts.push([Math.cos(a) * r, Math.sin(a) * r]);
            }
            poly(pts, true);
            break;
        }
    }
}
