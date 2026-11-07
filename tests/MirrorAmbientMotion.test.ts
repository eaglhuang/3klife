/**
 * MirrorAmbientMotion — 命鏡低頻動效（霧化、呼吸光、英靈淡閃）（BMV3-04；PROG-2-2068）
 */
import * as fs from 'fs';
import * as path from 'path';
import { Node, UIOpacity } from 'cc';
import { assert, TestSuite } from './TestRunner';
import { MIRROR_AMBIENT_EFFECTS, mirrorAmbientFactor } from '../assets/scripts/core/systems/MirrorAmbientMotion';
import { MirrorAmbientDriver, MIRROR_AMBIENT_TICK_SEC, startMirrorAmbientMotion } from '../assets/scripts/ui/core/UIMirrorAmbientMotion';

const LAYOUT = path.resolve(__dirname, '../assets/resources/ui-spec/layouts/bloodline-mirror-loading-main.json');

interface LayoutNode {
    type: string;
    name: string;
    children?: LayoutNode[];
}

function flatten(node: LayoutNode, out: LayoutNode[] = []): LayoutNode[] {
    out.push(node);
    for (const child of node.children ?? []) flatten(child, out);
    return out;
}

function tree(): { root: Node; gate: Node; spirit: Node } {
    const root = new Node('Root');
    const stage = new Node('CenterStage');
    const gate = new Node('MirrorGate');
    const spirit = new Node('SpiritHero');
    stage.children.push(gate);
    root.children.push(stage, spirit);
    return { root, gate, spirit };
}

export function createMirrorAmbientMotionSuite(): TestSuite {
    const suite = new TestSuite('MirrorAmbientMotion (命鏡低頻動效 BMV3-04 PROG-2-2068)');

    suite.test('三種動效都對到命鏡 layout 的非文字節點，且低頻、不過暗', () => {
        const nodes = flatten(JSON.parse(fs.readFileSync(LAYOUT, 'utf8')).root);
        assert.equals('gateMist,coreBreath,spiritFlicker', MIRROR_AMBIENT_EFFECTS.map((e) => e.id).join(','));
        for (const effect of MIRROR_AMBIENT_EFFECTS) {
            const node = nodes.filter((n) => n.name === effect.nodeName);
            assert.equals(1, node.length, effect.nodeName);
            assert.isTrue(node[0].type !== 'label', `${effect.nodeName} 不可是文字`);
            assert.isTrue(effect.periodSec >= 3, `${effect.id} 週期太短`);
            assert.isTrue(effect.minFactor >= 0.7 && effect.minFactor < 1, `${effect.id} 下限`);
        }
    });

    suite.test('倍率：相位 0 最亮、半週期最暗、一個週期回到原點', () => {
        const spec = { id: 'gateMist' as const, nodeName: 'X', periodSec: 4, minFactor: 0.6, phase: 0 };
        assert.equals(1, mirrorAmbientFactor(spec, 0));
        assert.isTrue(Math.abs(mirrorAmbientFactor(spec, 2) - 0.6) < 1e-9);
        assert.isTrue(Math.abs(mirrorAmbientFactor(spec, 4) - 1) < 1e-9);
    });

    suite.test('driver：以現有透明度為基準；外部改透明度後改用新基準', () => {
        const { root, gate, spirit } = tree();
        gate.addComponent(UIOpacity).opacity = 255;
        spirit.addComponent(UIOpacity).opacity = 110;
        const specs = [
            { id: 'gateMist' as const, nodeName: 'MirrorGate', periodSec: 4, minFactor: 0.5, phase: 0 },
            { id: 'spiritFlicker' as const, nodeName: 'SpiritHero', periodSec: 4, minFactor: 0.5, phase: 0 },
            { id: 'coreBreath' as const, nodeName: 'Missing', periodSec: 4, minFactor: 0.5, phase: 0 },
        ];
        const driver = new MirrorAmbientDriver(root, specs);
        assert.equals(2, driver.targetCount);
        driver.tick(2);
        assert.equals(128, gate.getComponent(UIOpacity)!.opacity);
        assert.equals(55, spirit.getComponent(UIOpacity)!.opacity);
        spirit.getComponent(UIOpacity)!.opacity = 200;
        driver.tick(2);
        assert.equals(200, spirit.getComponent(UIOpacity)!.opacity);
        assert.equals(255, gate.getComponent(UIOpacity)!.opacity);
    });

    suite.test('startMirrorAmbientMotion：有目標節點才排程，間隔為低頻 tick', () => {
        const intervals: number[] = [];
        const host = (node: Node) => ({ node, schedule: (_cb: () => void, interval?: number) => { intervals.push(interval ?? 0); } });
        startMirrorAmbientMotion(host(tree().root));
        startMirrorAmbientMotion(host(new Node('Empty')));
        assert.equals(String(MIRROR_AMBIENT_TICK_SEC), intervals.join(','));
    });

    return suite;
}
