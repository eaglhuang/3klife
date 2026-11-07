/**
 * AncestorApparitionLines — 名士批語旁的祖輩顯靈補充台詞（ORAC-08；PROG-2-1967）
 */
import { assert, TestSuite } from './TestRunner';
import {
    appendApparitionLine, apparitionText, pickAncestorApparition,
} from '../assets/scripts/core/systems/AncestorApparitionLines';

export function createAncestorApparitionLinesSuite(): TestSuite {
    const suite = new TestSuite('AncestorApparitionLines (祖輩顯靈 ORAC-08 PROG-2-1967)');

    suite.test('三種標籤各有台詞；空白名字或內容不出句', () => {
        assert.isTrue(apparitionText('趙雲', { kind: 'TROOP', value: '騎兵' })!.includes('騎兵'));
        assert.isTrue(apparitionText('關羽', { kind: 'PERSONALITY', value: '忠義' })!.includes('忠義'));
        assert.isTrue(apparitionText('諸葛亮', { kind: 'SKILL_SEED', value: '八陣圖' })!.includes('八陣圖'));
        assert.equals(null, apparitionText(' ', { kind: 'TROOP', value: '騎兵' }));
        assert.equals(null, apparitionText('趙雲', { kind: 'TROOP', value: '' }));
    });

    suite.test('只挑一位：世代最遠優先，同世代取先出現；無標籤不觸發', () => {
        const picked = pickAncestorApparition([
            { name: '馬騰', generation: 2, tags: [{ kind: 'TROOP', value: '騎兵' }] },
            { name: '馬援', generation: 4, tags: [] },
            { name: '趙雲', generation: 3, tags: [{ kind: 'PERSONALITY', value: '膽識' }, { kind: 'TROOP', value: '槍兵' }] },
            { name: '張飛', generation: 3, tags: [{ kind: 'TROOP', value: '步兵' }] },
        ]);
        assert.equals('趙雲', picked?.ancestorName);
        assert.equals('PERSONALITY', picked?.tag.kind);
        assert.equals(null, pickAncestorApparition([{ name: '無名', generation: 5, tags: [] }]));
        assert.equals(null, pickAncestorApparition([]));
    });

    suite.test('附加在名士批語後，不改原批語陣列', () => {
        const remarks = ['此子聰慧過人。'];
        const line = pickAncestorApparition([{ name: '趙雲', generation: 3, tags: [{ kind: 'TROOP', value: '騎兵' }] }]);
        const out = appendApparitionLine(remarks, line);
        assert.equals(2, out.length);
        assert.equals(1, remarks.length);
        assert.equals(1, appendApparitionLine(remarks, null).length);
    });

    return suite;
}
