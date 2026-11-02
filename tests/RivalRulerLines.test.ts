import { TestSuite, assert } from './TestRunner';
import { ERA_SHIFT_TEXT, formatAllianceFormed, formatRivalDeclareWar, RULER_LINES } from '../assets/scripts/core/systems/RivalRulerLines';
import { NATION_DEFS, proposeAlliance, createRivalWorld } from '../assets/scripts/core/systems/RivalNations';

export function createRivalRulerLinesSuite(): TestSuite {
    const suite = new TestSuite('RivalRulerLines (君主台詞 PROG-2-1707)');

    suite.test('宣戰文案帶君主與台詞', () => {
        assert.equals('魏 的 曹操 向你宣戰！『識時務者為俊傑，你已錯失良機。』準備迎戰吧！', formatRivalDeclareWar('wei', '魏'));
    });

    suite.test('沒有台詞的勢力退回簡短版', () => {
        assert.equals('南蠻 率軍來犯！', formatRivalDeclareWar('nanman', '南蠻'));
        assert.equals('與 呂布軍 結為同盟', formatAllianceFormed('lvbu', '呂布軍'));
    });

    suite.test('台詞表的 id 都是現有勢力', () => {
        const ids = new Set(NATION_DEFS.map(d => d.id));
        for (const id of Object.keys(RULER_LINES)) assert.isTrue(ids.has(id), id);
    });

    suite.test('結盟成功訊息附上結盟台詞', () => {
        const base = createRivalWorld();
        const world = { nations: base.nations.map(n => n.id === 'shu' ? { ...n, relation: 60 } : n) };
        const r = proposeAlliance(world, 'shu');
        assert.isTrue(r.ok);
        assert.isTrue(r.message.includes('義結金蘭'), r.message);
    });

    suite.test('天下大亂文案照規格 G-1', () => {
        assert.equals('天下大亂，諸侯版圖重整，新的霸權競逐再次開始。', ERA_SHIFT_TEXT);
    });

    return suite;
}
