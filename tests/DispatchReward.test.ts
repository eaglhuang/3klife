/**
 * PROG-2-1182：派遣完成發放獎勵（JRN-03 第五段）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { DISPATCH_JOB_CATALOG } from '../assets/scripts/core/systems/DispatchCatalog';
import { dispatchRewardAmount } from '../assets/scripts/core/systems/DispatchJobs';
import { BASE_RESOURCE_CAPS } from '../assets/scripts/core/systems/ResourceCap';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const HOUR = 60 * 60 * 1000;

function hero(id: string, careerClass: string, stats: Partial<Record<'str' | 'int' | 'lea' | 'pol' | 'cha', number>>): GeneralConfig {
    return { id, name: id, faction: 'shu', hp: 1000, str: 60, int: 60, lea: 60, pol: 60, cha: 60, careerClass, ...stats } as unknown as GeneralConfig;
}

function sessionWith(general: GeneralConfig): GameSession {
    const session = new GameSession(1);
    session.enrollGenerals([general]);
    return session;
}

export function createDispatchRewardSuite(): TestSuite {
    const suite = new TestSuite('DispatchReward (PROG-2-1182 派遣完成發獎)');

    suite.test('品質倍率向下取整；非法數量不發；清單每個任務都有獎勵', () => {
        const reward = { resource: 'food' as const, amount: 51 };
        assert.equals(25, dispatchRewardAmount(reward, 'POOR'));
        assert.equals(51, dispatchRewardAmount(reward, 'NORMAL'));
        assert.equals(61, dispatchRewardAmount(reward, 'GOOD'));
        assert.equals(76, dispatchRewardAmount(reward, 'EXCELLENT'));
        assert.equals(0, dispatchRewardAmount({ resource: 'gold', amount: -5 }, 'EXCELLENT'));
        assert.isTrue(DISPATCH_JOB_CATALOG.every((j) => j.reward !== undefined && j.reward.amount > 0));
    });

    suite.test('糧草：完成時依品質入帳且不超過上限', () => {
        const session = sessionWith(hero('farmer', 'Scholar', { pol: 99 }));
        const before = session.military.food;
        assert.isTrue(session.dispatchJobById('FARM', 0).ok);
        const done = session.settleDispatchJobs(6 * HOUR);
        assert.equals(1, done.length);
        const expected = Math.min(session.military.foodCap, before + dispatchRewardAmount({ resource: 'food', amount: 120 }, done[0].quality));
        assert.equals(expected, session.military.food);
        assert.isTrue(session.military.food <= session.military.foodCap);
    });

    suite.test('名聲入帳；金幣交呼叫端；未到期不發', () => {
        const fameSession = sessionWith(hero('talker', 'Scholar', { cha: 99, int: 99 }));
        const fameBefore = fameSession.fame;
        fameSession.dispatchJobById('PERSUADE', 0);
        assert.equals(0, fameSession.settleDispatchJobs(HOUR).length);
        assert.equals(fameBefore, fameSession.fame);
        const done = fameSession.settleDispatchJobs(8 * HOUR);
        assert.equals(Math.min(BASE_RESOURCE_CAPS.fame, fameBefore + dispatchRewardAmount({ resource: 'fame', amount: 10 }, done[0].quality)), fameSession.fame);

        const goldSession = sessionWith(hero('guard', 'Combat', { str: 99 }));
        const granted: number[] = [];
        goldSession.dispatchJobById('ESCORT', 0);
        goldSession.recordLoginAt(3 * HOUR, (amount) => granted.push(amount));
        assert.equals(1, granted.length);
        assert.isTrue(granted[0] > 0);
    });

    return suite;
}
