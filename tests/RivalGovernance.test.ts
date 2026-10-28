/**
 * RivalGovernance.test.ts — 他國 AI 季度內政結算與招募品質（E-3、E-7、F-3，PROG-2-1474）
 */
import {
    aiGovernanceTick, governanceTaskOutput, rollRecruitQuality, shouldRecruitThisSeason,
    type GovernanceGeneralStats, type GovernanceResources,
} from '../assets/scripts/core/systems/RivalGovernance';
import { TestSuite, assert } from './TestRunner';

const GEN: GovernanceGeneralStats = { str: 80, int: 70, pol: 60, cha: 50 };
const BASE: GovernanceResources = { food: 1000, gold: 1000, troops: 1000, fame: 500, intel: 10 };

export function createRivalGovernanceSuite(): TestSuite {
    const suite = new TestSuite('RivalGovernance (他國 AI 內政結算 E-3 E-7 PROG-2-1474)');

    suite.test('E-3 任務基礎產出依屬性計算', () => {
        assert.equals(220, governanceTaskOutput('FARMING', GEN));
        assert.equals(200, governanceTaskOutput('COMMERCE', GEN));
        assert.equals(140, governanceTaskOutput('DIPLOMACY', GEN));
        assert.equals(240, governanceTaskOutput('MILITARY', GEN));
        assert.equals(170, governanceTaskOutput('RECON', GEN));
    });

    suite.test('性格效率修正後取整；GUARDIAN 均衡', () => {
        const tasks = [{ type: 'MILITARY' as const, general: GEN }, { type: 'FARMING' as const, general: GEN }];
        const mil = aiGovernanceTick(BASE, 'MILITARIST', tasks);
        assert.equals(1000 + 288, mil.troops);
        assert.equals(1000 + 198, mil.food);
        const passive = aiGovernanceTick(BASE, 'PASSIVE', tasks);
        assert.equals(1000 + 144, passive.troops);
        assert.equals(1000 + 242, passive.food);
        const guardian = aiGovernanceTick(BASE, 'GUARDIAN', tasks);
        assert.equals(1240, guardian.troops);
        assert.equals(1220, guardian.food);
    });

    suite.test('資源封頂（共用玩家上限、情報 100）且不改輸入', () => {
        const full: GovernanceResources = { food: 9990, gold: 4990, troops: 2990, fame: 1990, intel: 95 };
        const out = aiGovernanceTick(full, 'GUARDIAN', [
            { type: 'FARMING', general: GEN }, { type: 'COMMERCE', general: GEN },
            { type: 'MILITARY', general: GEN }, { type: 'DIPLOMACY', general: GEN },
            { type: 'RECON', general: GEN },
        ]);
        assert.equals(10000, out.food);
        assert.equals(5000, out.gold);
        assert.equals(3000, out.troops);
        assert.equals(2000, out.fame);
        assert.equals(100, out.intel);
        assert.equals(9990, full.food);
    });

    suite.test('E-7 每 2 季招募', () => {
        assert.isTrue(shouldRecruitThisSeason(4));
        assert.isTrue(!shouldRecruitThisSeason(3));
    });

    suite.test('E-7 招募品質依名聲三段機率', () => {
        assert.equals('S', rollRecruitQuality(1600, () => 0.05));
        assert.equals('A', rollRecruitQuality(1600, () => 0.2));
        assert.equals('B', rollRecruitQuality(1600, () => 0.99));
        assert.equals('A', rollRecruitQuality(1000, () => 0.1));
        assert.equals('C', rollRecruitQuality(1000, () => 0.95));
        assert.equals('C', rollRecruitQuality(800, () => 0.75));
        assert.equals('B', rollRecruitQuality(0, () => 0.5));
    });

    return suite;
}
