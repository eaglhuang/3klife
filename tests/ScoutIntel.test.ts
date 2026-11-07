/**
 * ScoutIntel — 戰前偵查情報防火牆與戰法槽位（doc_spec_0347；PROG-2-2033）
 */
import { assert, TestSuite } from './TestRunner';
import { buildScoutPanelIntel, computeTacticSlotCapacity, findScoutLeaks, scoutSortieAction } from '../assets/scripts/core/systems/ScoutIntel';
import { checkRecommendedLoadout } from '../assets/scripts/core/systems/LoadoutCheck';

export function createScoutIntelSuite(): TestSuite {
    const suite = new TestSuite('ScoutIntel (戰前偵查 doc_spec_0347 PROG-2-2033)');

    suite.test('§1 防火牆：站位、埋伏、AI 路徑不進面板', () => {
        const stage = {
            enemyLeader: { name: '于禁', title: '左將軍', powerGrade: 'A', troopType: '重步', formation: [[1, 2]] },
            coreMechanics: ['水攻'],
            riskTags: ['騎兵衝擊'],
            enemyPositions: [{ x: 1, y: 2 }],
            ambushCoords: [[3, 4]],
            aiPath: ['a', 'b'],
        };
        const intel = buildScoutPanelIntel(stage, checkRecommendedLoadout(['破城'], ['破城'], []));
        assert.equals(0, findScoutLeaks(intel).length);
        assert.equals('于禁', intel.enemyLeader!.name);
        assert.equals('水攻', intel.coreMechanics.join(','));
        assert.equals('ready', intel.loadoutState);
        assert.equals('formation,ambushCoords', findScoutLeaks({ a: { formation: 1 }, ambushCoords: 2 }).join(','));
    });

    suite.test('§2 高風險只跳確認，不鎖出征', () => {
        assert.equals('confirm-then-sortie', scoutSortieAction('high-risk'));
        assert.equals('sortie', scoutSortieAction('missing'));
        assert.equals('sortie', scoutSortieAction('ready'));
    });

    suite.test('§3 槽位容量 2～6', () => {
        assert.equals(2, computeTacticSlotCapacity({ intelligence: 29, nurtureRank: 'B', stageChainCompleted: false }));
        assert.equals(3, computeTacticSlotCapacity({ intelligence: 30, nurtureRank: 'A', stageChainCompleted: false }));
        assert.equals(5, computeTacticSlotCapacity({ intelligence: 90, nurtureRank: 'C', stageChainCompleted: false }));
        assert.equals(6, computeTacticSlotCapacity({ intelligence: 90, nurtureRank: 'S', stageChainCompleted: true }));
        assert.equals(6, computeTacticSlotCapacity({ intelligence: 125, nurtureRank: 'S', stageChainCompleted: true }));
        assert.equals(4, computeTacticSlotCapacity({ intelligence: 10, nurtureRank: 'S', stageChainCompleted: true }));
    });

    return suite;
}
