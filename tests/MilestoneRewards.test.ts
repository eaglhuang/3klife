/**
 * 里程碑獎勵表與達成後的獎勵組合（REC-05，PROG-2-0438）
 *
 * 鎖住：每個里程碑的獎勵內容與規格一致；新達成才發放、已記錄不重複；未知 id 略過；
 * 隱藏因子在因子字典補上前 factorId 為 null。稱號名稱與因子 ID 為暫定，這裡不鎖其值。
 */
import { assert, TestSuite } from './TestRunner';
import {
    MILESTONE_REWARDS,
    claimMilestoneRewards,
    rewardsForMilestones,
} from '../assets/scripts/core/systems/MilestoneRewards';

export function createMilestoneRewardsSuite(): TestSuite {
    const suite = new TestSuite('MilestoneRewards (里程碑獎勵表 REC-05)');

    suite.test('獎勵表：百人斬戰法筆記 ×1，千人斬戰法筆記 ×3 加稱號', () => {
        assert.equals(1, (MILESTONE_REWARDS.KILL_100[0] as { count: number }).count);
        assert.equals(2, MILESTONE_REWARDS.KILL_1000.length);
        assert.equals(3, (MILESTONE_REWARDS.KILL_1000[0] as { count: number }).count);
        assert.equals('title', MILESTONE_REWARDS.KILL_1000[1].kind);
    });

    suite.test('獎勵表：萬人斬給虎符品質提升與英靈牆動畫', () => {
        const kinds = MILESTONE_REWARDS.KILL_10000.map((r) => r.kind).join(',');
        assert.equals('tallyQualityUp,spiritWallAnimation', kinds);
    });

    suite.test('獎勵表：不敗、鐵壁為白色隱藏因子，殺意為紅色隱藏因子；因子 ID 待字典補上', () => {
        const undefeated = MILESTONE_REWARDS.UNDEFEATED_50[0];
        const wall = MILESTONE_REWARDS.GUARDIAN_WALL[0];
        const asura = MILESTONE_REWARDS.ASURA[0];
        assert.isTrue(undefeated.kind === 'hiddenFactor' && undefeated.color === 'white' && undefeated.factorId === null);
        assert.isTrue(wall.kind === 'hiddenFactor' && wall.color === 'white' && wall.factorId === null);
        assert.isTrue(asura.kind === 'hiddenFactor' && asura.color === 'red' && asura.factorId === null);
    });

    suite.test('依里程碑組獎勵：依輸入順序合併，未知 id 略過', () => {
        const rewards = rewardsForMilestones(['KILL_100', 'NOT_A_MILESTONE', 'ASURA']);
        assert.equals(2, rewards.length);
        assert.equals('tacticNote', rewards[0].kind);
        assert.equals('hiddenFactor', rewards[1].kind);
    });

    suite.test('達成判定：新達成才發放，已記錄的里程碑不重複', () => {
        const fresh = claimMilestoneRewards({ wins: 0, losses: 0, kills: 100 });
        assert.equals('KILL_100', fresh.newIds.join(','));
        assert.equals(1, fresh.rewards.length);

        const recorded = claimMilestoneRewards({ wins: 0, losses: 0, kills: 100, milestones: ['KILL_100'] });
        assert.equals('', recorded.newIds.join(','));
        assert.equals(0, recorded.rewards.length);
    });

    suite.test('達成判定：一次跨多個門檻時，各自給獎勵', () => {
        const claim = claimMilestoneRewards({ wins: 50, losses: 0, kills: 1000, guardianPower: 50000 });
        const ids = claim.newIds.join(',');
        assert.isTrue(ids.includes('KILL_100') && ids.includes('KILL_1000') && ids.includes('UNDEFEATED_50'));
        assert.isTrue(claim.rewards.length >= 4);
    });

    return suite;
}
