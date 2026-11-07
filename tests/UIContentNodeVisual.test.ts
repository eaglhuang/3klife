/**
 * UIContentNodeVisual — 內容契約字串值 → 節點透明度／sprite 顏色（命鏡 state 差異接線 BMV3-02；PROG-2-2064）
 */
import * as fs from 'fs';
import * as path from 'path';
import { Node, Sprite, UIOpacity } from 'cc';
import { assert, TestSuite } from './TestRunner';
import { applyContentNodeVisual } from '../assets/scripts/ui/core/UIContentNodeVisual';
import { UIContentBinder, type ContentContractSchema } from '../assets/scripts/ui/core/UIContentBinder';
import type { UITemplateBinder } from '../assets/scripts/ui/core/UITemplateBinder';
import { MIRROR_AURA_COLOR_TOKEN, type MirrorAuraColor } from '../assets/scripts/core/systems/MirrorRarityAura';

const UI_SPEC_DIR = path.resolve(__dirname, '../assets/resources/ui-spec');
const MIRROR_SCHEMA = path.join(UI_SPEC_DIR, 'contracts/bloodline-mirror-state-content.schema.json');

function readJson<T>(file: string): T {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

/** 只提供 bindWithSchema 會用到的方法 */
function fakeBinder(nodes: Record<string, Node>): UITemplateBinder {
    return {
        getLabelByPath: () => null,
        getNodeByPath: (p: string) => nodes[p] ?? null,
        setTexts: () => undefined,
    } as unknown as UITemplateBinder;
}

export function createUIContentNodeVisualSuite(): TestSuite {
    const suite = new TestSuite('UIContentNodeVisual (契約字串值套節點視覺 BMV3-02 PROG-2-2064)');

    suite.test('opacity：沒有 UIOpacity 自動補上；值不在表內不動節點', () => {
        const node = new Node('Spirit');
        assert.isTrue(applyContentNodeVisual(node, { opacity: { dim: 110 } }, 'dim'));
        assert.equals(110, node.getComponent(UIOpacity)!.opacity);
        assert.equals(false, applyContentNodeVisual(node, { opacity: { dim: 110 } }, 'bright'));
        assert.equals(110, node.getComponent(UIOpacity)!.opacity);
    });

    suite.test('spriteColor：套到 Sprite.color；沒有 Sprite 或色碼不合法時略過', () => {
        const node = new Node('Core');
        const sprite = node.addComponent(Sprite);
        assert.isTrue(applyContentNodeVisual(node, { spriteColor: { gold: '#FFC107' } }, 'gold'));
        assert.equals('255,193,7,255', [sprite.color.r, sprite.color.g, sprite.color.b, sprite.color.a].join(','));
        assert.equals(false, applyContentNodeVisual(new Node('Bare'), { spriteColor: { gold: '#FFC107' } }, 'gold'));
        assert.equals(false, applyContentNodeVisual(node, { spriteColor: { gold: 'gold' } }, 'gold'));
    });

    suite.test('命鏡契約：英靈亮度與 aura 色每個列舉值都有對照，aura 色碼等於設計 token', () => {
        const schema = readJson<ContentContractSchema & { fields: Record<string, { enum?: string[] }> }>(MIRROR_SCHEMA);
        const tokens = fs.readFileSync(path.join(UI_SPEC_DIR, 'ui-design-tokens.json'), 'utf8');
        const brightness = schema.fields.spiritBrightness;
        const aura = schema.fields.auraColor;
        for (const value of brightness.enum!) assert.equals('number', typeof brightness.nodeVisual?.opacity?.[value], value);
        for (const value of aura.enum!) {
            const hex = aura.nodeVisual?.spriteColor?.[value];
            const token = MIRROR_AURA_COLOR_TOKEN[value as MirrorAuraColor];
            assert.isTrue(tokens.includes(`"${token}": "${hex}"`), `${value} 色碼 ${String(hex)} 不等於 ${token}`);
        }
    });

    suite.test('UIContentBinder：布林切 active、字串依契約套透明度與 aura 色', () => {
        const schema = readJson<ContentContractSchema>(MIRROR_SCHEMA);
        const spirit = new Node('SpiritHero');
        const core = new Node('VesselCore');
        const sprite = core.addComponent(Sprite);
        const veil = new Node('UnownedLayer');
        const binder = fakeBinder({ SpiritHero: spirit, 'CenterStage/VesselCore': core, UnownedLayer: veil });
        new UIContentBinder().bindWithSchema(binder, { schemaId: schema.schemaId, familyId: schema.familyId, requiredFields: [] } as never, schema,
            { spiritBrightness: 'dim', auraColor: 'purple', showLockBadge: false }, { suppressUnresolvedWarnings: true });
        assert.equals(110, spirit.getComponent(UIOpacity)!.opacity);
        assert.equals('156,39,176', [sprite.color.r, sprite.color.g, sprite.color.b].join(','));
        assert.equals(false, veil.active);
    });

    return suite;
}
