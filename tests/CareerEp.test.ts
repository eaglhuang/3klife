/**
 * CareerEp.test.ts — 戰功累積 EP（PROG-2-1827）
 */
import { TestSuite, assert } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { CAREER_EP_MAX, CAREER_EP_PER_MILESTONE, CAREER_EP_PER_WIN, careerEpGain, withCareerEp } from '../assets/scripts/core/systems/CareerEp';
import { settleBattle } from '../assets/scripts/core/systems/BattleRoster';

function general(extra: object = {}): GeneralConfig {
    return { id: 'g', name: 'g', ep: 60, epRating: 'B+', vitality: 100, maxVitality: 100, ...extra } as unknown as GeneralConfig;
}

export function createCareerEpSuite(): TestSuite {
    const suite = new TestSuite('CareerEp');

    suite.test('只有勝仗加點，里程碑另計', () => {
        assert.equals(CAREER_EP_PER_WIN, careerEpGain('win', 0));
        assert.equals(0, careerEpGain('draw', 0));
        assert.equals(0, careerEpGain('loss', 0));
        assert.equals(CAREER_EP_PER_MILESTONE, careerEpGain('loss', 1));
        assert.equals(CAREER_EP_PER_WIN + 2 * CAREER_EP_PER_MILESTONE, careerEpGain('win', 2));
    });

    suite.test('EP 封頂時實得只算到上限', () => {
        const { general: next, gained } = withCareerEp(general({ ep: CAREER_EP_MAX - 2 }), 5);
        assert.equals(CAREER_EP_MAX, next.ep);
        assert.equals(2, gained);
        assert.equals(0, withCareerEp(general({ ep: CAREER_EP_MAX }), 5).gained);
    });

    suite.test('沒有 EP 的資料不補值', () => {
        const source = general({ ep: undefined, epRating: undefined });
        const { general: next, gained } = withCareerEp(source, 5);
        assert.equals(0, gained);
        assert.equals(undefined, next.ep);
    });

    suite.test('EP 高於上限的舊資料不被拉低', () => {
        const { general: next, gained } = withCareerEp(general({ ep: 120 }), 5);
        assert.equals(120, next.ep);
        assert.equals(0, gained);
    });

    suite.test('評級沿用原本那一套', () => {
        assert.equals('A', withCareerEp(general({ ep: 69, epRating: 'A-' }), 1).general.epRating);
        assert.equals('良才美質', withCareerEp(general({ ep: 69, epRating: '中規中矩' }), 1).general.epRating);
        assert.equals(undefined, withCareerEp(general({ ep: 69, epRating: undefined }), 1).general.epRating);
    });

    suite.test('戰後結算把 EP 寫回名冊與結算項目', () => {
        const settled = settleBattle([general(), general({ id: 'idle' })], { deployedIds: ['g'], result: 'player-win' });
        assert.equals(61, settled.roster[0].ep);
        assert.equals(60, settled.roster[1].ep);
        assert.equals(1, settled.entries[0].epGained);
        assert.equals(61, settled.entries[0].epAfter);
    });

    suite.test('敗仗不加 EP，但精力與功勳照算', () => {
        const settled = settleBattle([general()], { deployedIds: ['g'], result: 'enemy-win' });
        assert.equals(60, settled.roster[0].ep);
        assert.equals(0, settled.entries[0].epGained);
        assert.equals(3, settled.entries[0].meritGained);
    });

    suite.test('本場新里程碑的 EP 一起結算，不重複發', () => {
        const veteran = { wins: 9, losses: 0, draws: 0, merit: 90, kills: 99 };
        const performance = { g: { kills: 1, damageDealt: 0, damageTaken: 0, healingDone: 0 } };
        const first = settleBattle([general({ battleRecord: veteran })], { deployedIds: ['g'], result: 'player-win', performance });
        assert.equals(1, first.entries[0].newMilestones.length);
        assert.equals(CAREER_EP_PER_WIN + CAREER_EP_PER_MILESTONE, first.entries[0].epGained);
        const second = settleBattle(first.roster, { deployedIds: ['g'], result: 'player-win', performance });
        assert.lengthEquals(0, second.entries[0].newMilestones);
        assert.equals(CAREER_EP_PER_WIN, second.entries[0].epGained);
    });

    return suite;
}
