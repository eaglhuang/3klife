/**
 * SpriteTintTarget.ts — Cocos 端薄層：把乘色套到圖層 Sprite.color、把光源強度套到 UIOpacity。
 * 核心邏輯（LightingPhase／LightingTable／SceneLightingController／OverlayLifecycle）不依賴 Cocos，
 * 只有此檔 import 'cc'。
 */
import { Color, Sprite, UIOpacity } from 'cc';
import type { ILightIntensityTarget, ILightingTintTarget } from './SceneLightingController';

/** 對圖層 Sprite 乘色（Sprite.color 即乘色，不換圖） */
export class SpriteTintTarget implements ILightingTintTarget {
    private readonly color = new Color(255, 255, 255, 255);

    constructor(private readonly sprite: Sprite) {}

    applyTint(r: number, g: number, b: number): void {
        this.color.set(r, g, b, this.sprite.color.a);
        this.sprite.color = this.color;
    }
}

/** 光源圖集／星空圖層：強度 0～1 映成不透明度（加色混合由材質負責） */
export class OpacityLightTarget implements ILightIntensityTarget {
    constructor(private readonly opacity: UIOpacity) {}

    applyIntensity(intensity: number): void {
        this.opacity.opacity = Math.round(Math.min(1, Math.max(0, intensity)) * 255);
    }
}
