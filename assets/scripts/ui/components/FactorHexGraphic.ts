// @spec-source → 新手開場規格書.md §分鏡 8（因子解鎖特效）、§7.4 視覺化需求（六色六角圖）；OPEN-08（PROG-2-0717/0721）
/**
 * FactorHexGraphic — 六色六角圖的繪製與解鎖特效（cc 端，資料由 FactorHexPanel 提供）
 *
 * 外觀（色票、線寬、特效時長）為暫定，座標與色感由 Codex 實機驗收微調。
 *
 * Unity 對照：像一個掛在物件上的 MeshRenderer，render 每次重畫整張圖；
 * playUnlockFlash 像在新亮起的頂點生成一個粒子，播完就 Destroy。
 */
import { _decorator, Color, Component, Graphics, Node, tween, UITransform, Vec3 } from 'cc';
import { FactorHexVertex, hexVertexPoint } from '../../core/systems/FactorHexPanel';
import type { FactorColor } from '../../core/systems/FactorInheritance';

const { ccclass } = _decorator;

/** 暫定色票：藍 粉 綠 紫 白 紅 */
const VERTEX_COLORS: Readonly<Record<FactorColor, Color>> = {
    blue: new Color(80, 160, 255, 255),
    pink: new Color(255, 140, 190, 255),
    green: new Color(110, 200, 120, 255),
    purple: new Color(170, 120, 230, 255),
    white: new Color(240, 240, 240, 255),
    red: new Color(230, 80, 70, 255),
};
const MASK_COLOR = new Color(110, 110, 110, 255);
const RING_LEVELS = [0.25, 0.5, 0.75, 1];
const FLASH_DURATION_SEC = 0.4;
const FLASH_SCALE = 2.2;

@ccclass('FactorHexGraphic')
export class FactorHexGraphic extends Component {

    private _radius = 120;
    private _graphics: Graphics | null = null;
    private _vertices: FactorHexVertex[] = [];

    /** 設定半徑並確保有 Graphics；可重複呼叫。 */
    public setup(radius: number): void {
        this._radius = radius;
        if (!this.node.getComponent(UITransform)) {
            this.node.addComponent(UITransform);
        }
        this._graphics = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);
    }

    /**
     * 整張重畫：外圈環、軸線、已覺醒的數值多邊形與各色頂點點。
     * visibleColors 為玩家已解鎖的色（LUK-04）；省略時全部可見。未解鎖的色以灰階遮罩畫點。
     */
    public render(vertices: readonly FactorHexVertex[], visibleColors?: readonly FactorColor[]): void {
        const g = this._graphics;
        if (!g) return;
        this._vertices = [...vertices];
        g.clear();

        g.lineWidth = 1;
        g.strokeColor = new Color(255, 255, 255, 60);
        for (const level of RING_LEVELS) {
            this._tracePolygon(g, vertices.map((_, i) => hexVertexPoint(i, level, this._radius)));
            g.stroke();
        }
        for (let i = 0; i < vertices.length; i++) {
            const tip = hexVertexPoint(i, 1, this._radius);
            g.moveTo(0, 0);
            g.lineTo(tip.x, tip.y);
            g.stroke();
        }

        // 未解鎖色的數值不露出：頂點固定畫在圓心，相鄰邊改畫灰色（LUK-04）
        const isVisible = (i: number): boolean => visibleColors === undefined || visibleColors.includes(vertices[i].color);
        const valuePoints = vertices.map((v, i) => hexVertexPoint(i, isVisible(i) ? v.value : 0, this._radius));
        g.fillColor = new Color(220, 180, 90, 110);
        this._tracePolygon(g, valuePoints);
        g.fill();
        g.lineWidth = 2;
        g.strokeColor = new Color(220, 180, 90, 255);
        this._tracePolygon(g, valuePoints);
        g.stroke();

        g.strokeColor = MASK_COLOR;
        for (let i = 0; i < vertices.length; i++) {
            const j = (i + 1) % vertices.length;
            if (isVisible(i) && isVisible(j)) continue;
            g.moveTo(valuePoints[i].x, valuePoints[i].y);
            g.lineTo(valuePoints[j].x, valuePoints[j].y);
            g.stroke();
        }

        for (let i = 0; i < vertices.length; i++) {
            if (!isVisible(i)) {
                const p = valuePoints[i];
                g.fillColor = MASK_COLOR;
                g.circle(p.x, p.y, 5);
                g.fill();
                continue;
            }
            if (!vertices[i].lit) continue;
            const p = valuePoints[i];
            g.fillColor = VERTEX_COLORS[vertices[i].color];
            g.circle(p.x, p.y, 5);
            g.fill();
        }
    }

    /**
     * 解鎖特效：在新亮起的頂點生成一個光點，放大後移除。
     * colors 為 newlyLitFactorColors 的結果；找不到頂點的色會略過。
     */
    public playUnlockFlash(colors: readonly FactorColor[]): void {
        for (const color of colors) {
            const index = this._vertices.findIndex((v) => v.color === color);
            if (index < 0) continue;
            const p = hexVertexPoint(index, this._vertices[index].value, this._radius);
            const flash = new Node(`FactorFlash_${color}`);
            flash.layer = this.node.layer;
            flash.parent = this.node;
            flash.setPosition(p.x, p.y, 0);
            const g = flash.addComponent(Graphics);
            g.fillColor = VERTEX_COLORS[color];
            g.circle(0, 0, 8);
            g.fill();
            flash.setScale(new Vec3(0.5, 0.5, 1));
            tween(flash)
                .to(FLASH_DURATION_SEC, { scale: new Vec3(FLASH_SCALE, FLASH_SCALE, 1) })
                .call(() => flash.destroy())
                .start();
        }
    }

    private _tracePolygon(g: Graphics, points: readonly { x: number; y: number }[]): void {
        points.forEach((p, i) => {
            if (i === 0) g.moveTo(p.x, p.y);
            else g.lineTo(p.x, p.y);
        });
        g.close();
    }
}
