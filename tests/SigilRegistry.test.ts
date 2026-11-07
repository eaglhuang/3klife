/**
 * SigilRegistry — 血脈圖騰登錄表與四件組契約（doc_spec_0345；PROG-2-2031）
 */
import { assert, TestSuite } from './TestRunner';
import {
    SIGIL_REGISTRY, findMissingSigilAssets, findOrphanSigilRefs, isSigilQuadConsistent, layerIndex, sigilAssetPath, sigilVfxEnabled,
} from '../assets/scripts/core/models/SigilRegistry';

export function createSigilRegistrySuite(): TestSuite {
    const suite = new TestSuite('SigilRegistry (血脈圖騰 doc_spec_0345 PROG-2-2031)');

    suite.test('§2 四大圖騰登錄，id 與鍵一致', () => {
        const ids = Object.keys(SIGIL_REGISTRY);
        assert.equals(4, ids.length);
        for (const id of ids) assert.equals(id, SIGIL_REGISTRY[id].id);
    });

    suite.test('§4-1 非法圖騰 ID 被找出', () => {
        const orphans = findOrphanSigilRefs([
            { owner: 'card-1', sigilPatternId: 'SIGIL_AZURE_DRAGON' },
            { owner: 'card-2', sigilPatternId: 'SIGIL_WHITE_TIGER' },
            { owner: 'tally-1', sigilPatternId: '' },
        ]);
        assert.equals('card-2,tally-1', orphans.map((o) => o.owner).join(','));
    });

    suite.test('§1 四件組必須同一 ID 且已登錄', () => {
        const id = 'SIGIL_SCARLET_PHOENIX';
        assert.isTrue(isSigilQuadConsistent({ bloodline: id, spiritCard: id, tallyCrest: id, troopBanner: id }));
        assert.isFalse(isSigilQuadConsistent({ bloodline: id, spiritCard: id, tallyCrest: id, troopBanner: 'SIGIL_GOLDEN_QILIN' }));
        assert.isFalse(isSigilQuadConsistent({ bloodline: 'X', spiritCard: 'X', tallyCrest: 'X', troopBanner: 'X' }));
    });

    suite.test('§3 圖層順序與 VFX 稀有度', () => {
        assert.isTrue(layerIndex('base') < layerIndex('sigil-decal'));
        assert.isTrue(layerIndex('frame') < layerIndex('vfx'));
        assert.isTrue(sigilVfxEnabled('UR'));
        assert.isFalse(sigilVfxEnabled('SR'));
    });

    suite.test('§4-3 資產路徑約定與缺檔檢查', () => {
        assert.equals('sprites/sigils/sigil_black_tortoise/crest', sigilAssetPath('SIGIL_BLACK_TORTOISE', 'crest'));
        assert.equals(0, findMissingSigilAssets(() => true).length);
        const missing = findMissingSigilAssets((p) => !p.endsWith('/banner'));
        assert.equals(4, missing.length);
    });

    return suite;
}
