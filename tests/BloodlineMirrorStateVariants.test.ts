/**
 * BloodlineMirrorStateVariants — 命鏡五種 state 差異（命鏡過場規格補遺 v3「狀態變體」；BMV3-02；PROG-2-2063）
 *
 * 規格：同一版型支援五種 state，差異落在 CTA 是否顯示、tips 是否顯示、右側英靈亮度、定心者 aura 色、未持有鎖定標記。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { resolveMirrorRarityAura } from '../assets/scripts/core/systems/MirrorRarityAura';

const UI_SPEC_DIR = path.resolve(__dirname, '../assets/resources/ui-spec');
const VARIANT_FIELDS = ['showPrimaryAction', 'showTips', 'spiritBrightness', 'auraColor', 'showLockBadge'];
const STATES = ['loading', 'awakening', 'ascension', 'unowned-preview', 'owned-legendary'];

interface MirrorState {
    tipProfile: string;
    crestState: string;
    rarityLabel: string;
    showPrimaryAction: boolean;
    showTips: boolean;
    spiritBrightness: string;
    auraColor: string;
    showLockBadge: boolean;
}

function readJson<T>(relative: string): T {
    return JSON.parse(fs.readFileSync(path.join(UI_SPEC_DIR, relative), 'utf8')) as T;
}

export function createBloodlineMirrorStateVariantsSuite(): TestSuite {
    const suite = new TestSuite('BloodlineMirrorStateVariants (命鏡五種 state 差異 BMV3-02 PROG-2-2063)');
    const content = readJson<{ states: Record<string, MirrorState> }>('content/bloodline-mirror-states-v1.json');
    const schema = readJson<{ fields: Record<string, { enum?: string[]; type: string }> }>('contracts/bloodline-mirror-state-content.schema.json');

    suite.test('五種 state 齊備，每個都有五項差異欄位且值合法', () => {
        assert.equals(STATES.join(','), Object.keys(content.states).join(','));
        for (const [id, state] of Object.entries(content.states)) {
            for (const field of VARIANT_FIELDS) {
                const spec = schema.fields[field];
                assert.isTrue(!!spec, `契約缺 ${field}`);
                const value = (state as unknown as Record<string, unknown>)[field];
                if (spec.type === 'boolean') assert.equals('boolean', typeof value, `${id}.${field}`);
                else assert.isTrue(spec.enum!.includes(value as string), `${id}.${field}=${String(value)}`);
            }
        }
    });

    suite.test('未完整覺醒的 state 一律銀白 aura；鎖定標記只在未持有時顯示', () => {
        for (const [id, state] of Object.entries(content.states)) {
            if (state.crestState !== 'awakened') assert.equals('silver', state.auraColor, id);
            assert.equals(state.tipProfile === 'unowned', state.showLockBadge, id);
        }
    });

    suite.test('owned-legendary：金色 aura 與傳說標籤和 MirrorRarityAura 一致，不顯示 CTA 與 tips、英靈全亮', () => {
        const state = content.states['owned-legendary'];
        const aura = resolveMirrorRarityAura('legendary', state.crestState as 'awakened');
        assert.equals(aura.aura, state.auraColor);
        assert.equals(aura.label, state.rarityLabel);
        assert.equals(false, state.showPrimaryAction);
        assert.equals(false, state.showTips);
        assert.equals('bright', state.spiritBrightness);
    });

    return suite;
}
