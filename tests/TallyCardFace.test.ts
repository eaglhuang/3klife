/**
 * TallyCardFace — 虎符卡面與卡圖備援（doc_spec_0355；PROG-2-2041）
 */
import { assert, TestSuite } from './TestRunner';
import {
    TALLY_CARD_ART_FALLBACK, buildTallyCardFace, findIncompleteTallyCardConfigs, resolveTallyCardArt, tallyResonancePercent,
} from '../assets/scripts/core/systems/TallyCardFace';

export function createTallyCardFaceSuite(): TestSuite {
    const suite = new TestSuite('TallyCardFace (虎符卡面 doc_spec_0355 PROG-2-2041)');

    suite.test('§2 缺圖回退：專屬 → troops → 純色底板，不拋例外', () => {
        const has = new Set(['ui/tiger-tally/card-art/troops_baier', TALLY_CARD_ART_FALLBACK]);
        assert.equals('specific', resolveTallyCardArt('BaiEr', (p) => has.has(p)).source);
        const miss = resolveTallyCardArt('unknown', (p) => has.has(p));
        assert.equals(TALLY_CARD_ART_FALLBACK, miss.path);
        assert.isTrue(miss.warning !== null);
        const none = resolveTallyCardArt('unknown', () => false);
        assert.equals('solid', none.source);
        assert.equals(null, none.path);
    });

    suite.test('§1 四欄與星級共鳴', () => {
        assert.equals('0,50,100', [1, 3, 5].map(tallyResonancePercent).join(','));
        const face = buildTallyCardFace({ campId: 'baier', campName: '白毦兵', star: 3, grainCost: 80, tacticName: '白毦護主' });
        assert.equals('投入兵力 1,500', face.troopLabel);
        assert.equals('糧耗 80 斛/次', face.grainLabel);
        assert.equals('共鳴倍率 +50%', face.resonanceLabel);
        assert.equals('全場限調遣 1 隊', face.limitLabel);
    });

    suite.test('§4-3 卡面設定缺欄位會被列出', () => {
        const bad = findIncompleteTallyCardConfigs([
            { campId: 'a', campName: 'A', star: 1, grainCost: 20 },
            { campId: 'b', campName: 'B', star: 1 },
        ]);
        assert.equals('b', bad.join(','));
    });

    return suite;
}
