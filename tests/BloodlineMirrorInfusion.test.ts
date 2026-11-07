/**
 * BloodlineMirrorInfusion — 血脈灌注結果顯示在命鏡升階頁（DUP-04；PROG-2-2071）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';
import { applyBloodlineInfusion } from '../assets/scripts/core/systems/BloodlineInfusion';
import { buildMirrorInfusionResultTexts, runMirrorInfusion } from '../assets/scripts/ui/core/UIBloodlineMirrorInfusion';

const LAYOUT = path.resolve(__dirname, '../assets/resources/ui-spec/layouts/bloodline-mirror-loading-main.json');

interface LayoutNode {
    name: string;
    type: string;
    children?: LayoutNode[];
}

function labels(node: LayoutNode, out = new Set<string>()): Set<string> {
    if (node.type === 'label') out.add(node.name);
    for (const child of node.children ?? []) labels(child, out);
    return out;
}

export function createBloodlineMirrorInfusionSuite(): TestSuite {
    const suite = new TestSuite('BloodlineMirrorInfusion (命鏡升階頁灌注結果 DUP-04 PROG-2-2071)');
    const card = { uid: 'sc-1', name: '趙雲', bloodlineLevel: 2, spiritPower: 120, linkedTallyLevel: 1 };

    suite.test('文字：血脈等級、英靈濃度、虎符層級顯示前後值；缺值當 0', () => {
        const texts = buildMirrorInfusionResultTexts('趙雲', card, applyBloodlineInfusion(card, 50));
        assert.equals('趙雲・血脈灌注', texts.HeaderTitle);
        assert.equals('血脈等級: Lv2 → Lv3', texts.PhaseLabel);
        assert.equals('英靈濃度: 120 → 170', texts.MirrorLabel);
        assert.equals('虎符層級: 1 → 2', texts.CrestLabel);
        assert.equals('灌注完成', texts.ProgressLabel);
        assert.equals('血脈等級: Lv0 → Lv1', buildMirrorInfusionResultTexts('甲', {}, applyBloodlineInfusion({}, 0)).PhaseLabel);
    });

    suite.test('文字鍵都是命鏡 layout 的 label 節點', () => {
        const names = labels(JSON.parse(fs.readFileSync(LAYOUT, 'utf8')).root);
        for (const key of Object.keys(buildMirrorInfusionResultTexts('甲', {}, {}))) assert.isTrue(names.has(key), key);
    });

    suite.test('runMirrorInfusion：以 uid 與灌注值呼叫 session；無法灌注時回傳 null', async () => {
        const calls: string[] = [];
        const ok = {
            infuseSpiritCard: async (uid: string, v: number) => {
                calls.push(`${uid}:${v}`);
                return { ...card, ...applyBloodlineInfusion(card, v) } as unknown as SpiritCard;
            },
        };
        const texts = await runMirrorInfusion(ok, card, 30);
        assert.equals('sc-1:30', calls.join(','));
        assert.equals('英靈濃度: 120 → 150', texts?.MirrorLabel);
        assert.equals(null, await runMirrorInfusion({ infuseSpiritCard: async () => null }, card, 30));
    });

    return suite;
}
