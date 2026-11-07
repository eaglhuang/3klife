/**
 * SageAncestorApparition — 祖輩顯靈補充台詞（名士預言系統 §K、暫定裁決 1；ORAC-08；PROG-2-2059）
 */
import { assert, TestSuite } from './TestRunner';
import { ancestorTagLabel, ancestorTagsOf, pickAncestorApparition } from '../assets/scripts/core/systems/SageAncestorApparition';

const caoCao = { name: '曹操', templateId: 'GEN_WEI_CAO_CAO', genes: [{ type: 'Red' }], troopAptitude: { CAVALRY: 'A', SIEGE: 'S' } };
const commoner = { name: '無名氏', templateId: null, genes: [{ type: 'Blue' }], troopAptitude: { INFANTRY: 'A' } };

export function createSageAncestorApparitionSuite(): TestSuite {
    const suite = new TestSuite('SageAncestorApparition (祖輩顯靈台詞 ORAC-08 PROG-2-2059)');

    suite.test('兩類標籤：名將模板在前，因子顏色只配 S 級兵種', () => {
        const tags = ancestorTagsOf(caoCao);
        assert.equals(JSON.stringify(['曹家', '紅・機械']), JSON.stringify(tags.map(ancestorTagLabel)));
        assert.equals(0, ancestorTagsOf(commoner).length);
    });

    suite.test('名門表外的姓氏、格式不符的 templateId 不算名將模板', () => {
        assert.equals(0, ancestorTagsOf({ name: '呂布', templateId: 'GEN_QUN_LU_BU' }).length);
        assert.equals(0, ancestorTagsOf({ name: '某', templateId: 'cao-cao' }).length);
    });

    suite.test('依序找第一位命中的祖先；都沒命中回傳 null', () => {
        const hit = pickAncestorApparition([commoner, caoCao]);
        assert.equals('曹操', hit?.ancestorName);
        assert.equals('template', hit?.tag.kind);
        assert.isTrue(hit!.line.includes('曹操') && hit!.line.includes('曹家'));
        assert.equals(null, pickAncestorApparition([commoner]));
        assert.equals(null, pickAncestorApparition([]));
    });

    suite.test('只有顏色＋兵種標籤時用兵種台詞', () => {
        const hit = pickAncestorApparition([{ name: '某老將', genes: [{ type: 'Green' }], troopAptitude: { NAVY: 'S' } }]);
        assert.equals('color-troop', hit?.tag.kind);
        assert.isTrue(hit!.line.includes('綠') && hit!.line.includes('水軍'));
    });

    return suite;
}
