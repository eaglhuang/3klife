import { _decorator, Color, Component, Graphics, Mask, Node, UITransform } from 'cc';

const { ccclass, executeInEditMode, property, requireComponent } = _decorator;

type ClipShape =
    | { kind: 'polygon'; points: Array<{ x: number; y: number }> }
    | { kind: 'rect'; left: number; top: number; right: number; bottom: number }
    | { kind: 'circle'; cx: number; cy: number; r: number }
    | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

@ccclass('CssClipPathMask')
@requireComponent(UITransform)
@executeInEditMode
export class CssClipPathMask extends Component {
    @property
    private _clipPath = '';

    @property
    get clipPath(): string { return this._clipPath; }
    set clipPath(value: string) {
        this._clipPath = value || '';
        this._redraw();
    }

    private _graphics: Graphics | null = null;

    onLoad(): void {
        this._ensureMaskComponents();
        this.node.on(Node.EventType.SIZE_CHANGED, this._redraw, this);
        this._redraw();
    }

    onEnable(): void {
        this._redraw();
    }

    onDestroy(): void {
        this.node.off(Node.EventType.SIZE_CHANGED, this._redraw, this);
    }

    private _ensureMaskComponents(): void {
        const mask = this.getComponent(Mask) || this.addComponent(Mask);
        mask.type = Mask.Type.GRAPHICS_STENCIL;
        mask.inverted = false;
        mask.enabled = true;
        this._graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
    }

    private _redraw(): void {
        const transform = this.getComponent(UITransform);
        if (!transform) {
            return;
        }

        const width = transform.width;
        const height = transform.height;
        this._ensureMaskComponents();
        const graphics = this._graphics || this.getComponent(Graphics);
        const mask = this.getComponent(Mask);
        if (!graphics || !mask) {
            return;
        }

        graphics.clear();
        const shape = parseCssClipPath(this._clipPath, width, height);
        if (!shape || width <= 0 || height <= 0) {
            mask.enabled = false;
            return;
        }

        mask.enabled = true;
        graphics.fillColor = new Color(255, 255, 255, 255);
        const halfWidth = width * 0.5;
        const halfHeight = height * 0.5;

        if (shape.kind === 'polygon') {
            const [first, ...rest] = shape.points;
            graphics.moveTo(first.x - halfWidth, halfHeight - first.y);
            for (const point of rest) {
                graphics.lineTo(point.x - halfWidth, halfHeight - point.y);
            }
            graphics.close();
        } else if (shape.kind === 'rect') {
            const x = shape.left - halfWidth;
            const y = halfHeight - shape.bottom;
            graphics.rect(x, y, Math.max(0, shape.right - shape.left), Math.max(0, shape.bottom - shape.top));
        } else if (shape.kind === 'circle') {
            graphics.circle(shape.cx - halfWidth, halfHeight - shape.cy, shape.r);
        } else {
            graphics.ellipse(shape.cx - halfWidth, halfHeight - shape.cy, shape.rx, shape.ry);
        }
        graphics.fill();
    }
}

function parseCssClipPath(rawClipPath: string, width: number, height: number): ClipShape | null {
    const raw = String(rawClipPath || '').trim();
    if (!raw || raw.toLowerCase() === 'none') {
        return null;
    }

    const polygon = raw.match(/^polygon\((.*)\)$/i);
    if (polygon) {
        const points = polygon[1]
            .split(',')
            .map(part => part.trim().split(/\s+/).filter(Boolean))
            .filter(parts => parts.length >= 2)
            .map(parts => ({
                x: parseCssLength(parts[0], width),
                y: parseCssLength(parts[1], height),
            }))
            .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
        return points.length >= 3 ? { kind: 'polygon', points } : null;
    }

    const inset = raw.match(/^inset\((.*)\)$/i);
    if (inset) {
        const tokens = inset[1].split(/\s+/).filter(token => token.toLowerCase() !== 'round');
        const values = tokens.slice(0, 4).map((token, index) => parseCssLength(token, index % 2 === 0 ? height : width));
        const top = values[0] ?? 0;
        const right = values[1] ?? top;
        const bottom = values[2] ?? top;
        const left = values[3] ?? right;
        return { kind: 'rect', left, top, right: width - right, bottom: height - bottom };
    }

    const circle = raw.match(/^circle\((.*)\)$/i);
    if (circle) {
        const [radiusPart, centerPart] = splitShapeAt(circle[1]);
        const radius = parseCssLength(radiusPart || '50%', Math.min(width, height));
        const center = parseCenter(centerPart, width, height);
        return { kind: 'circle', cx: center.x, cy: center.y, r: radius };
    }

    const ellipse = raw.match(/^ellipse\((.*)\)$/i);
    if (ellipse) {
        const [radiusPart, centerPart] = splitShapeAt(ellipse[1]);
        const radii = radiusPart.trim().split(/\s+/).filter(Boolean);
        const rx = parseCssLength(radii[0] || '50%', width);
        const ry = parseCssLength(radii[1] || '50%', height);
        const center = parseCenter(centerPart, width, height);
        return { kind: 'ellipse', cx: center.x, cy: center.y, rx, ry };
    }

    return null;
}

function splitShapeAt(value: string): [string, string] {
    const parts = String(value || '').split(/\s+at\s+/i);
    return [parts[0] || '', parts[1] || '50% 50%'];
}

function parseCenter(value: string, width: number, height: number): { x: number; y: number } {
    const parts = String(value || '50% 50%').trim().split(/\s+/).filter(Boolean);
    return {
        x: parseCssLength(parts[0] || '50%', width),
        y: parseCssLength(parts[1] || '50%', height),
    };
}

function parseCssLength(value: string, axisSize: number): number {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) {
        return 0;
    }
    if (raw.endsWith('%')) {
        return axisSize * (Number(raw.slice(0, -1)) || 0) / 100;
    }
    if (raw.endsWith('px')) {
        return Number(raw.slice(0, -2)) || 0;
    }
    return Number(raw) || 0;
}