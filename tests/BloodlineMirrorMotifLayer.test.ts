/**
 * BloodlineMirrorMotifLayer — 命鏡 motif layer 可替換（血脈命鏡過場載入規格書 §4.4；BML-11；PROG-2-2070）
 *
 * 規格：中國元素作為可替換 motif layer，不是核心骨架；替換配色／符號後骨架仍成立，禁區清單審查通過。
 * - 各變體 skin 的槽位集合相同，且涵蓋 layout 用到的所有槽位。
 * - motif 以外的槽位在各變體間完全相同；換變體只動 motif 槽位。
 * - 變體用到的顏色 token 都存在，且通過 BVC-04 自動禁區規則。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const UI_SPEC_DIR = path.resolve(__dirname, '../assets/resources/ui-spec');
const FIXTURES = path.resolve(__dirname, 'fixtures');

interface MotifLayers {
    layout: string;
    motifSlots: string[];
    variants: Record<string, string>;
}

interface LayoutNode {
    skinSlot?: string;
    styleSlot?: string;
    children?: LayoutNode[];
}

type Skin = { id: string; slots: Record<string, Record<string, unknown>> };

function readJson<T>(file: string): T {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function layoutSlots(node: LayoutNode, out = new Set<string>()): Set<string> {
    for (const slot of [node.skinSlot, node.styleSlot]) if (slot) out.add(slot);
    for (const child of node.children ?? []) layoutSlots(child, out);
    return out;
}

export function createBloodlineMirrorMotifLayerSuite(): TestSuite {
    const suite = new TestSuite('BloodlineMirrorMotifLayer (命鏡 motif layer 可替換 BML-11 PROG-2-2070)');
    const motif = readJson<MotifLayers>(path.join(FIXTURES, 'bloodline-mirror-motif-layers.json'));
    const skins = Object.entries(motif.variants).map(([variant, id]) => ({ variant, id, skin: readJson<Skin>(path.join(UI_SPEC_DIR, `skins/${id}.json`)) }));
    const [base, ...others] = skins;

    suite.test('各變體槽位集合相同，且涵蓋 layout 用到的槽位', () => {
        assert.isTrue(skins.length >= 2, '至少要有兩個變體');
        const used = layoutSlots(readJson<{ root: LayoutNode }>(path.join(UI_SPEC_DIR, `layouts/${motif.layout}.json`)).root);
        const baseKeys = Object.keys(base.skin.slots).sort().join(',');
        for (const { variant, id, skin } of skins) {
            assert.equals(id, skin.id, variant);
            assert.equals(baseKeys, Object.keys(skin.slots).sort().join(','), variant);
            for (const slot of used) assert.isTrue(slot in skin.slots, `${variant} 缺 ${slot}`);
        }
        for (const slot of motif.motifSlots) assert.isTrue(slot in base.skin.slots, `motif 槽位 ${slot} 不在 skin`);
    });

    suite.test('motif 以外的槽位各變體完全相同；換變體只動 motif 槽位', () => {
        for (const { variant, skin } of others) {
            for (const [slot, value] of Object.entries(base.skin.slots)) {
                const same = JSON.stringify(value) === JSON.stringify(skin.slots[slot]);
                if (motif.motifSlots.includes(slot)) assert.isTrue(!same, `${variant}.${slot} 沒有替換`);
                else assert.isTrue(same, `${variant}.${slot} 不是 motif 卻被改動`);
            }
        }
    });

    suite.test('變體用到的顏色 token 都存在，且通過 BVC-04 自動禁區規則', () => {
        const tokens = fs.readFileSync(path.join(UI_SPEC_DIR, 'ui-design-tokens.json'), 'utf8');
        const checklist = readJson<{ items: Array<{ id: string; check: string; patterns?: string[] }> }>(path.join(FIXTURES, 'bloodline-art-review-checklist.json'));
        const rules = checklist.items.filter((item) => item.check === 'auto').flatMap((item) => (item.patterns ?? []).map((p) => ({ id: item.id, re: new RegExp(p, 'i') })));
        for (const { variant, skin } of others) {
            for (const slot of motif.motifSlots) {
                const color = skin.slots[slot].color;
                if (typeof color === 'string') assert.isTrue(tokens.includes(`"${color}":`), `${variant}.${slot} token ${color} 不存在`);
            }
            const text = JSON.stringify(skin);
            for (const rule of rules) assert.isTrue(!rule.re.test(text), `${variant} 違反 ${rule.id}`);
        }
    });

    return suite;
}
