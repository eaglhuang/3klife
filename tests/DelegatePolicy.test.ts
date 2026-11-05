/**
 * DelegatePolicy.test.ts — 太傅代管方針（PROG-2-1820）
 *
 * 鎖住：各方針排程、27T + 9R、均衡走舊邏輯、按鈕循環、方針傳到代管、版面有按鈕。
 */
import { TestSuite, assert } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import { DELEGATE_POLICIES, delegateSchedule, resolveAutoSchedule, type DelegatePolicy } from '../assets/scripts/core/systems/AutoNurture';
import { NURTURE_TOTAL_ROUNDS, type TrainingKind } from '../assets/scripts/core/systems/NurtureSystem';
import { unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { NurtureFlowController } from '../assets/scripts/ui/core/NurtureFlowController';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

/** 已開獎、尚未選宿命 */
const unveiled = (id: string): UnveilingGeneral => unveilGeneral({
    id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
    str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [],
} as unknown as UnveilingGeneral).general;
const count = (schedule: readonly string[], action: string): number => schedule.filter((item) => item === action).length;

export function createDelegatePolicySuite(): TestSuite {
    const suite = new TestSuite('DelegatePolicy (太傅代管方針 PROG-2-1820)');

    suite.test('尚武、經世、奇謀都是 27 回訓練 + 9 回休沐，主修佔 18 回', () => {
        const main: Record<string, string> = { martial: 'str', civil: 'pol', strategy: 'int' };
        for (const policy of ['martial', 'civil', 'strategy'] as DelegatePolicy[]) {
            const schedule = delegateSchedule(policy)!;
            assert.equals(NURTURE_TOTAL_ROUNDS, schedule.length);
            assert.equals(9, count(schedule, 'rest'));
            assert.equals(18, count(schedule, main[policy]));
        }
    });

    suite.test('排程可直接給 resolveAutoSchedule；均衡走練最低屬性', () => {
        const prowess = { str: 5, int: 1, lea: 5, pol: 5, cha: 5 } as Record<TrainingKind, number>;
        assert.equals(delegateSchedule('martial')!.join(), resolveAutoSchedule(prowess, delegateSchedule('martial')).join());
        assert.isTrue(delegateSchedule('balanced') === undefined);
        assert.equals(NURTURE_TOTAL_ROUNDS, count(resolveAutoSchedule(prowess, delegateSchedule('balanced')), 'int'));
    });

    suite.test('方針按鈕循環一圈，代管時傳出目前方針', async () => {
        const roster = new InMemoryRosterStore([unveiled('kid')]);
        const received: DelegatePolicy[] = [];
        const flow = new NurtureFlowController({
            roster,
            unveiling: new UnveilingService(roster, () => 0.5),
            nurture: new NurtureService(roster, { random: () => 0.5, currentSeason: () => 3 }),
            loadMentorCards: async () => [],
            persist: async () => undefined,
            autoNurture: async (_id, policy) => { received.push(policy); return { ok: true, logs: [] }; },
        });
        flow.cycleDelegatePolicy();
        await flow.autoNurture();
        assert.equals('martial', received[0]);
        assert.isTrue(flow.getView().texts.flowNotice!.includes('太傅代管完成（尚武'));
        for (let i = 1; i < DELEGATE_POLICIES.length; i++) flow.cycleDelegatePolicy();
        await flow.autoNurture();
        assert.equals('balanced', received[1]);
    });

    suite.test('版面有方針按鈕，且不和代管按鈕重疊', () => {
        const text = fs.readFileSync(path.resolve(__dirname, '..', 'assets/resources/ui-spec/layouts/nurture-flow-main.json'), 'utf8');
        const find = (node: unknown, id: string): Record<string, never> | null => {
            if (!node || typeof node !== 'object') return null;
            const record = node as Record<string, unknown>;
            if (record.id === id) return record as Record<string, never>;
            for (const value of Object.values(record)) {
                const found = find(value, id);
                if (found) return found;
            }
            return null;
        };
        const layout = JSON.parse(text);
        const auto = find(layout, 'btnAutoNurture') as unknown as { width: number; widget: { left: number } };
        const policy = find(layout, 'btnDelegatePolicy') as unknown as { widget: { left: number } };
        assert.isTrue(auto.widget.left + auto.width <= policy.widget.left);
    });

    return suite;
}
