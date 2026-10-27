/**
 * BloodlineTreeBinding.test.ts — 14 張先祖卡對應到血統樹版型節點（BUI-01 後續，PROG-2-1049）
 *
 * 不開 Cocos：確認每張卡都有唯一節點名稱，排內序號與 buildNodeCards 的順序一致，
 * 空卡與有資料的文字格式正確。版型檔的交叉比對待 PROG-2-1048（PR #1056）合併後另補。
 *
 * Unity 對照：EditMode Test 驗證 Prefab 陣列的 child 名稱與資料數量對得上。
 */
import { assert, TestSuite } from './TestRunner';
import { buildNodeCards, type AncestorSource } from '../assets/scripts/core/systems/BloodlineNodeCards';
import { bindTreeCards, treeCardNodeName, treeCardText } from '../assets/scripts/core/systems/BloodlineTreeBinding';

function source(name: string): AncestorSource {
    return {
        name,
        location: '幽州',
        factorStars: 3,
        portraitPath: null,
        stats: { force: 80, command: 70 },
        genes: [],
        tags: [],
    };
}

export function createBloodlineTreeBindingSuite(): TestSuite {
    const suite = new TestSuite('BloodlineTreeBinding (血統樹先祖卡節點綁定 BUI-01)');

    suite.test('14 張卡都有唯一節點名稱', () => {
        const targets = bindTreeCards(buildNodeCards({}));
        assert.equals(14, targets.length);
        const names = targets.map((t) => t.nodeName);
        assert.equals(names.length, new Set(names).size);
    });

    suite.test('排內序號依 PEDIGREE 順序：最上排 FFF 為 G1_0、MMM 為 G1_7；父母為 G3_0、G3_1', () => {
        const targets = bindTreeCards(buildNodeCards({}));
        const byNode = new Map(targets.map((t) => [t.nodeName, t.card.slot]));
        assert.equals('FFF', byNode.get('NodeCard_G1_0'));
        assert.equals('MMM', byNode.get('NodeCard_G1_7'));
        assert.equals('FF', byNode.get('NodeCard_G2_0'));
        assert.equals('F', byNode.get('NodeCard_G3_0'));
        assert.equals('M', byNode.get('NodeCard_G3_1'));
    });

    suite.test('空卡顯示破折號，有資料時第一行名稱、第二行地點', () => {
        const cards = buildNodeCards({ F: source('關羽'), FFF: null });
        const f = cards.find((c) => c.slot === 'F');
        const fff = cards.find((c) => c.slot === 'FFF');
        assert.equals('—', treeCardText(fff!));
        assert.equals('關羽\n幽州', treeCardText(f!));
    });

    suite.test('每張卡的 slot 位數 = 4 − 排數：第 1 排三代、第 2 排兩代、第 3 排父母', () => {
        for (const card of buildNodeCards({})) {
            assert.equals(4 - card.row, card.slot.length);
        }
    });

    suite.test('節點名稱格式固定：NodeCard_G{排}_{序號}', () => {
        assert.equals('NodeCard_G2_3', treeCardNodeName(2, 3));
    });

    return suite;
}
