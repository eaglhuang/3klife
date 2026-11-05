import { TestSuite, assert } from './TestRunner';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { clanMarriageBlock } from '../assets/scripts/core/systems/ClanMarriageRule';

/** 太祖 gf、gm 生 uncle（男）與 aunt（女）；uncle 生 heir、sis、cousinM；aunt 嫁外姓生 outer */
function family(): BloodlineGraph {
    const graph = new BloodlineGraph();
    const uids = ['ggf', 'gf', 'gm', 'uncle', 'uncle2', 'aunt', 'wife', 'wife2', 'wife3', 'other', 'heir', 'sis', 'tangmei', 'outer', 'halfsis', 'stranger', 'gdau'];
    const person = (uid: string) => ({ uid, template_id: null, name: uid, gene_refs: [], ep_base: 50, faction: 'shu', role: 'general', is_virtual: false, ancestor_chain: [] });
    const link = (child_uid: string, parent_uid: string, relation: string) => ({ child_uid, parent_uid, relation, generation: 1 });
    graph.loadFromData({
        version: 't',
        updatedAt: 't',
        persons: uids.map(person),
        links: [
            link('gf', 'ggf', 'F'),
            link('uncle', 'gf', 'F'), link('uncle', 'gm', 'M'),
            link('uncle2', 'gf', 'F'), link('uncle2', 'gm', 'M'),
            link('aunt', 'gf', 'F'), link('aunt', 'gm', 'M'),
            link('heir', 'uncle', 'F'), link('heir', 'wife', 'M'),
            link('sis', 'uncle', 'F'), link('sis', 'wife', 'M'),
            link('tangmei', 'uncle2', 'F'), link('tangmei', 'wife2', 'M'),
            link('outer', 'other', 'F'), link('outer', 'aunt', 'M'),
            link('halfsis', 'other', 'F'), link('halfsis', 'wife', 'M'),
            link('gdau', 'outer', 'F'), link('gdau', 'wife3', 'M'),
        ],
    } as never);
    return graph;
}

export function createClanMarriageRuleSuite(): TestSuite {
    const suite = new TestSuite('ClanMarriageRule');

    suite.test('兄妹、父女、祖孫、堂親：同宗擋下', () => {
        const graph = family();
        assert.equals('same-clan', clanMarriageBlock('heir', 'sis', graph) ?? '');
        assert.equals('same-clan', clanMarriageBlock('uncle', 'sis', graph) ?? '');
        assert.equals('same-clan', clanMarriageBlock('gf', 'sis', graph) ?? '');
        assert.equals('same-clan', clanMarriageBlock('heir', 'tangmei', graph) ?? '');
    });

    suite.test('同母異父、母子：母系至親擋下', () => {
        const graph = family();
        assert.equals('inbreeding', clanMarriageBlock('heir', 'halfsis', graph) ?? '');
        assert.equals('inbreeding', clanMarriageBlock('heir', 'wife', graph) ?? '');
    });

    suite.test('姑表、隔代外姻、毫無關係：放行', () => {
        const graph = family();
        assert.equals(null, clanMarriageBlock('outer', 'sis', graph));
        assert.equals(null, clanMarriageBlock('heir', 'gdau', graph));
        assert.equals(null, clanMarriageBlock('heir', 'stranger', graph));
    });

    return suite;
}
