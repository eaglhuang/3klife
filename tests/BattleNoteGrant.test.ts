/**
 * 戰法筆記發放（GEN-13 / PROG-2-0816；PROG-2-9205 起改走 reward.claim 的獎勵套件）
 *
 * 鎖住：千人斬產出 3 本戰法筆記、百人斬 1 本（獎勵表與 reward-config 套件數量一致）、
 * 非筆記獎勵沒有套件，以及道具表有戰法筆記的顯示名稱。實際入庫由 BattleMilestoneNotes 與 RewardBase 驗證。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { hasTacticNoteReward, milestoneBundleId, MILESTONE_REWARDS, rewardsForMilestones } from '../assets/scripts/core/systems/MilestoneRewards';
import { ITEM_BATTLE_NOTE, ITEM_DISPLAY_NAMES } from '../assets/scripts/core/systems/PlayerInventory';
import { findBundle, normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';

const REWARD_CONFIG = normalizeRewardConfig(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'data', 'reward-config.json'), 'utf8')));

function noteQtyOfBundle(milestoneId: string): number {
    const bundle = findBundle(REWARD_CONFIG, milestoneBundleId(milestoneId));
    const effect = bundle?.effects.find((e) => e.kind === 'item' && e.itemId === ITEM_BATTLE_NOTE);
    return typeof effect?.qty === 'number' ? effect.qty : 0;
}

export function createBattleNoteGrantSuite(): TestSuite {
    const suite = new TestSuite('BattleNoteGrant (戰法筆記發放 GEN-13)');

    suite.test('千人斬發 3 本、百人斬發 1 本戰法筆記（套件數量與獎勵表一致）', () => {
        assert.equals(3, noteQtyOfBundle('KILL_1000'));
        assert.equals(1, noteQtyOfBundle('KILL_100'));
        for (const id of Object.keys(MILESTONE_REWARDS)) {
            const table = rewardsForMilestones([id]).reduce((sum, r) => (r.kind === 'tacticNote' ? sum + r.count : sum), 0);
            assert.equals(table, noteQtyOfBundle(id));
        }
    });

    suite.test('非筆記獎勵（稱號、虎符品質、因子）沒有戰法筆記套件', () => {
        for (const id of ['KILL_10000', 'ASURA']) {
            assert.equals(false, hasTacticNoteReward(id));
            assert.equals(undefined, findBundle(REWARD_CONFIG, milestoneBundleId(id)));
        }
    });

    suite.test('道具表有戰法筆記的顯示名稱', () => {
        assert.equals('戰法筆記', ITEM_DISPLAY_NAMES[ITEM_BATTLE_NOTE]);
    });

    return suite;
}
