/**
 * MirrorRarityAura — 血脈命鏡稀有度 aura 色映射（命鏡過場規格補遺 v3；BMV3-03；PROG-2-2062）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { MIRROR_AURA_COLOR_TOKEN, resolveMirrorRarityAura } from '../assets/scripts/core/systems/MirrorRarityAura';

export function createMirrorRarityAuraSuite(): TestSuite {
    const suite = new TestSuite('MirrorRarityAura (命鏡稀有度 aura BMV3-03 PROG-2-2062)');

    suite.test('覺醒後：傳說金、史詩紫、稀有藍、低階銀白，mythic 併金色', () => {
        assert.equals('gold', resolveMirrorRarityAura('legendary', 'awakened').aura);
        assert.equals('gold', resolveMirrorRarityAura('mythic', 'awakened').aura);
        assert.equals('purple', resolveMirrorRarityAura('epic', 'awakened').aura);
        assert.equals('blue', resolveMirrorRarityAura('rare', 'awakened').aura);
        assert.equals('silver', resolveMirrorRarityAura('common', 'awakened').aura);
        assert.equals('稀有度: 傳說', resolveMirrorRarityAura('legendary', 'awakened').label);
    });

    suite.test('未完整覺醒一律銀白並顯示命紋未全；缺稀有度視為低階', () => {
        for (const state of ['placeholder', 'rumored', 'revealed', null] as const) {
            const aura = resolveMirrorRarityAura('legendary', state);
            assert.equals('silver', aura.aura);
            assert.equals('稀有度: 命紋未全', aura.label);
        }
        assert.equals('silver', resolveMirrorRarityAura(undefined, 'awakened').aura);
    });

    suite.test('色碼 token 都存在於 ui-design-tokens.json', () => {
        const tokens = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/ui-spec/ui-design-tokens.json'), 'utf8'));
        const text = JSON.stringify(tokens);
        for (const token of Object.values(MIRROR_AURA_COLOR_TOKEN)) {
            assert.isTrue(text.includes(`"${token}":`), `缺 token ${token}`);
        }
        assert.equals('rarityGold', resolveMirrorRarityAura('legendary', 'awakened').colorToken);
    });

    return suite;
}
