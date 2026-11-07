/**
 * UIMirrorAmbientMotion — 把命鏡低頻動效套到節點透明度（BMV3-04；PROG-2-2068）
 *
 * 以節點目前的透明度為基準乘上倍率，所以不會蓋掉內容契約設的英靈亮度（spiritBrightness）：
 * 若偵測到透明度被外部改過（不等於上次寫入值），就把新值當成新基準。
 */
import { Node, UIOpacity } from 'cc';
import { MIRROR_AMBIENT_EFFECTS, mirrorAmbientFactor, type MirrorAmbientEffectSpec } from '../../core/systems/MirrorAmbientMotion';

/** 每 0.1 秒更新一次即可，低頻動效不需要逐幀 */
export const MIRROR_AMBIENT_TICK_SEC = 0.1;

interface AmbientTarget {
    spec: MirrorAmbientEffectSpec;
    node: Node;
    base: number;
    written: number | null;
}

function findByName(root: Node, name: string): Node | null {
    for (const child of root.children) {
        if (child.name === name) return child;
        const found = findByName(child, name);
        if (found) return found;
    }
    return null;
}

export class MirrorAmbientDriver {
    private _elapsed = 0;
    private readonly _targets: AmbientTarget[] = [];

    constructor(root: Node, specs: readonly MirrorAmbientEffectSpec[] = MIRROR_AMBIENT_EFFECTS) {
        for (const spec of specs) {
            const node = findByName(root, spec.nodeName);
            if (node) this._targets.push({ spec, node, base: 255, written: null });
        }
    }

    get targetCount(): number {
        return this._targets.length;
    }

    tick(dt: number): void {
        this._elapsed += dt;
        for (const target of this._targets) {
            const opacity = target.node.getComponent(UIOpacity) ?? target.node.addComponent(UIOpacity);
            if (target.written === null || opacity.opacity !== target.written) target.base = opacity.opacity;
            const value = Math.round(target.base * mirrorAmbientFactor(target.spec, this._elapsed));
            opacity.opacity = value;
            target.written = value;
        }
    }
}

/** 命鏡 screen host（Cocos Component 的 node 與 schedule） */
export interface MirrorAmbientHost {
    node: Node;
    schedule(callback: () => void, interval?: number): void;
}

/** 掛在命鏡 screen host 上；host 未啟用時 Cocos 排程會暫停 */
export function startMirrorAmbientMotion(host: MirrorAmbientHost): MirrorAmbientDriver {
    const driver = new MirrorAmbientDriver(host.node);
    if (driver.targetCount > 0) host.schedule(() => driver.tick(MIRROR_AMBIENT_TICK_SEC), MIRROR_AMBIENT_TICK_SEC);
    return driver;
}
