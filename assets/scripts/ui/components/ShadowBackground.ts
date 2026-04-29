import { _decorator, Color, Component, Node, Rect, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';

const { ccclass, executeInEditMode, requireComponent } = _decorator;

export interface ShadowLayerDef {
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: Color;
    inset?: boolean;
}

export interface ShadowPaddingDef {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

@ccclass('ShadowBackground')
@requireComponent(UITransform)
@executeInEditMode
export class ShadowBackground extends Component {
    private _shadows: ShadowLayerDef[] = [];
    private _padding: ShadowPaddingDef = { left: 0, right: 0, top: 0, bottom: 0 };
    private _cornerRadius = 0;
    private _sprite: Sprite | null = null;

    onLoad(): void {
        this._sprite = this.getComponent(Sprite) || this.addComponent(Sprite);
        this.node.on(Node.EventType.SIZE_CHANGED, this._redraw, this);
        this._redraw();
    }

    onEnable(): void {
        this._redraw();
    }

    onDestroy(): void {
        this.node.off(Node.EventType.SIZE_CHANGED, this._redraw, this);
    }

    public setShadows(shadows: ShadowLayerDef[], padding?: Partial<ShadowPaddingDef>, cornerRadius?: number): void {
        this._shadows = (shadows || [])
            .filter(shadow => shadow && !shadow.inset && shadow.color && shadow.color.a > 0)
            .map(shadow => ({
                x: Number.isFinite(shadow.x) ? shadow.x : 0,
                y: Number.isFinite(shadow.y) ? shadow.y : 0,
                blur: Math.max(0, Number.isFinite(shadow.blur) ? shadow.blur : 0),
                spread: Number.isFinite(shadow.spread) ? shadow.spread : 0,
                color: shadow.color,
            }));
        this._padding = {
            left: Math.max(0, Number(padding?.left) || 0),
            right: Math.max(0, Number(padding?.right) || 0),
            top: Math.max(0, Number(padding?.top) || 0),
            bottom: Math.max(0, Number(padding?.bottom) || 0),
        };
        this._cornerRadius = Math.max(0, Number(cornerRadius) || 0);
        this._redraw();
    }

    private _redraw(): void {
        const sprite = this._sprite || this.getComponent(Sprite) || this.addComponent(Sprite);
        this._sprite = sprite;

        const transform = this.getComponent(UITransform);
        const width = Math.max(1, transform?.width || 1);
        const height = Math.max(1, transform?.height || 1);
        const maxTextureSide = 96;
        const aspect = width / height;
        const textureWidth = aspect >= 1 ? maxTextureSide : Math.max(2, Math.round(maxTextureSide * aspect));
        const textureHeight = aspect >= 1 ? Math.max(2, Math.round(maxTextureSide / aspect)) : maxTextureSide;
        const data = new Uint8Array(textureWidth * textureHeight * 4);

        for (let pixelY = 0; pixelY < textureHeight; pixelY++) {
            for (let pixelX = 0; pixelX < textureWidth; pixelX++) {
                const uiX = ((pixelX + 0.5) / textureWidth) * width - width * 0.5;
                const uiY = ((pixelY + 0.5) / textureHeight) * height - height * 0.5;
                const color = this._sampleShadowColor(uiX, uiY, width, height);
                const index = (pixelY * textureWidth + pixelX) * 4;
                data[index] = color.r;
                data[index + 1] = color.g;
                data[index + 2] = color.b;
                data[index + 3] = color.a;
            }
        }

        const texture = new Texture2D();
        texture.reset({ width: textureWidth, height: textureHeight, format: Texture2D.PixelFormat.RGBA8888 });
        texture.uploadData(data);
        (texture as any).loaded = true;

        const frame = new SpriteFrame();
        frame.packable = false;
        frame.rect = new Rect(0, 0, textureWidth, textureHeight);
        frame.texture = texture;

        sprite.enabled = true;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.type = Sprite.Type.SIMPLE;
        sprite.spriteFrame = frame;
        sprite.color = Color.WHITE;
    }

    private _sampleShadowColor(uiX: number, uiY: number, width: number, height: number): Color {
        let outR = 0;
        let outG = 0;
        let outB = 0;
        let outA = 0;
        const baseWidth = Math.max(1, width - this._padding.left - this._padding.right);
        const baseHeight = Math.max(1, height - this._padding.top - this._padding.bottom);
        const baseCenterX = (this._padding.left - this._padding.right) * 0.5;
        const baseCenterY = (this._padding.bottom - this._padding.top) * 0.5;

        for (const shadow of this._shadows) {
            const halfWidth = Math.max(0.5, baseWidth * 0.5 + shadow.spread);
            const halfHeight = Math.max(0.5, baseHeight * 0.5 + shadow.spread);
            const radius = Math.max(0, this._cornerRadius + shadow.spread);
            const localX = uiX - baseCenterX - shadow.x;
            const localY = uiY - baseCenterY + shadow.y;
            const distance = this._roundedRectSignedDistance(localX, localY, halfWidth, halfHeight, radius);
            const alphaFactor = this._shadowAlpha(distance, shadow.blur);
            if (alphaFactor <= 0) {
                continue;
            }

            const layerA = (shadow.color.a / 255) * alphaFactor;
            outR = shadow.color.r * layerA + outR * (1 - layerA);
            outG = shadow.color.g * layerA + outG * (1 - layerA);
            outB = shadow.color.b * layerA + outB * (1 - layerA);
            outA = layerA + outA * (1 - layerA);
        }

        return new Color(
            Math.round(outR),
            Math.round(outG),
            Math.round(outB),
            Math.round(outA * 255),
        );
    }

    private _shadowAlpha(distance: number, blur: number): number {
        if (distance < 0) {
            return 0;
        }
        if (blur <= 0) {
            return distance === 0 ? 1 : 0;
        }
        return Math.max(0, Math.min(1, 1 - distance / blur));
    }

    private _roundedRectSignedDistance(x: number, y: number, halfWidth: number, halfHeight: number, radius: number): number {
        const clampedRadius = Math.max(0, Math.min(radius, halfWidth, halfHeight));
        const innerHalfWidth = halfWidth - clampedRadius;
        const innerHalfHeight = halfHeight - clampedRadius;
        const dx = Math.abs(x) - innerHalfWidth;
        const dy = Math.abs(y) - innerHalfHeight;
        const outsideX = Math.max(dx, 0);
        const outsideY = Math.max(dy, 0);
        const outsideDistance = Math.sqrt(outsideX * outsideX + outsideY * outsideY) - clampedRadius;
        const insideDistance = Math.min(Math.max(dx, dy), 0) - clampedRadius;
        return outsideDistance > 0 ? outsideDistance : insideDistance;
    }
}