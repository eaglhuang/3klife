import { TestSuite, assert } from './TestRunner';
import { BloodlineGraph, PEDIGREE_SLOTS } from '../assets/scripts/core/services/BloodlineGraph';
import { ancestorCardText, buildBloodlineTreeSlots } from '../assets/scripts/core/systems/BloodlineTreeSlots';
import type { PersonRecord } from '../assets/scripts/core/models/PersonRegistry';

const person = (uid: string): PersonRecord => ({ uid, template_id: null, name: uid, gene_refs: [], ep_base: 50, faction: 'wei', is_virtual: false } as unknown as PersonRecord);

export function createBloodlinePedigreeCardsSuite(): TestSuite {
    const suite = new TestSuite('BloodlinePedigreeCards');

    suite.test('祖先卡顯示姓名、EP、主因子；沒有主因子不留空行', () => {
        assert.equals('趙雲\nEP 88\n軍令', ancestorCardText('趙雲', 87.6, '軍令'));
        assert.equals('趙雲\nEP 50', ancestorCardText('趙雲', 50, null));
    });

    suite.test('缺父親時母系不會往前擠到父系的位置', () => {
        const slots = buildBloodlineTreeSlots([null, 'mom', null, null, 'mgf', 'mgm', null, null, null, null, null, null, null, null]);
        assert.equals(null, slots.gen3[0].uid);
        assert.equals('mom', slots.gen3[1].uid);
        assert.equals(null, slots.gen2[0].uid);
        assert.equals('mgf', slots.gen2[2].uid);
    });

    suite.test('getPedigree 照 PEDIGREE_SLOTS 排，只有母系時位置正確；近親同一人出現在兩格', () => {
        const graph = new BloodlineGraph();
        graph.registerChild(person('mom'), 'mgf', 'mgm');
        graph.registerChild(person('kid'), '', 'mom');
        const pedigree = graph.getPedigree('kid');
        assert.equals('F,M,FF,FM,MF,MM', PEDIGREE_SLOTS.slice(0, 6).join(','));
        assert.equals(null, pedigree.F);
        assert.equals('mom', pedigree.M);
        assert.equals('mgf', pedigree.MF);

        const inbred = new BloodlineGraph();
        inbred.registerChild(person('dad'), 'gf', 'gm');
        inbred.registerChild(person('aunt'), 'gf', 'gm');
        inbred.registerChild(person('kid'), 'dad', 'aunt');
        const twice = inbred.getPedigree('kid');
        assert.equals('gf', twice.FF);
        assert.equals('gf', twice.MF);
    });

    return suite;
}
