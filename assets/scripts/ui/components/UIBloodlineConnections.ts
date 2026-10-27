// @spec-source → 血統樹14人UI規格書 §2.3 連線機制（LineGraphics：Graphics 動態畫貝茲）（PROG-2-1300，BUI-04）
/**
 * UIBloodlineConnections — 血統樹父子連線的 Graphics 繪製（cc 元件，曲線計算在 BloodlineCurve）
 *
 * 職責：
 *   1. 接收已排好位置的父子節點座標（與本節點同一座標系）。
 *   2. 用 BloodlineCurve 算出取樣點，逐段 lineTo 畫在掛載的 Graphics 上。
 *
 * 座標由上層 Layout 算好後傳入，本元件不去抓世界座標，因此不同螢幕比例下只要重新呼叫即可。
 * 需要掛在同一個節點上有 Graphics 元件；缺少時靜默不畫，不拋例外。
 *
 * Unity 對照：像自訂的 LineRenderer 元件，每次排版變動後呼叫 Redraw，點列由純資料算好。
 */
import { _decorator, Color, Component, Graphics } from 'cc';
import { bloodlineCurveBetween, sampleCubicBezier, type CurvePoint } from '../../core/systems/BloodlineCurve';
import { factorEdgeRgb } from '../../core/systems/FactorTagTokens';
import type { FactorColor } from '../../core/systems/FactorInheritance';

const { ccclass, property } = _decorator;

export interface BloodlineEdge {
    from: CurvePoint;
    to: CurvePoint;
    color: Color;
}

/** 依子代因子色上色的父子連線；childColor 為 null 時用中性灰。 */
export interface FactorBloodlineEdge {
    from: CurvePoint;
    to: CurvePoint;
    childColor: FactorColor | null;
}

@ccclass('UIBloodlineConnections')
export class UIBloodlineConnections extends Component {

    /** 每條曲線的取樣段數；越多越圓滑，預設 24 */
    @property
    segments: number = 24;

    @property
    lineWidth: number = 3;

    /** 清掉舊線後重畫全部父子連線 */
    drawConnections(edges: readonly BloodlineEdge[]): void {
        const graphics = this.getComponent(Graphics);
        if (!graphics) return;
        graphics.clear();
        graphics.lineWidth = this.lineWidth;
        for (const edge of edges) {
            const points = sampleCubicBezier(bloodlineCurveBetween(edge.from, edge.to), this.segments);
            if (points.length < 2) continue;
            graphics.strokeColor = edge.color;
            graphics.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                graphics.lineTo(points[i].x, points[i].y);
            }
            graphics.stroke();
        }
    }

    /** 依子代因子色重畫父子連線；顏色由 factorEdgeRgb 決定，與標籤色一致。 */
    drawFactorConnections(edges: readonly FactorBloodlineEdge[]): void {
        this.drawConnections(
            edges.map((edge) => {
                const rgb = factorEdgeRgb(edge.childColor);
                return { from: edge.from, to: edge.to, color: new Color(rgb.r, rgb.g, rgb.b, 255) };
            }),
        );
    }
}
