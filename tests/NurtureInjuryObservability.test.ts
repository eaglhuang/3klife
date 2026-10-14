import { assert, TestSuite } from './TestRunner';
import { createNurtureSession, executeRound, NurtureSession } from '../assets/scripts/core/systems/NurtureSystem';
import { chooseFate, unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { Faction } from '../assets/scripts/shared/CommonEnums';
import { NURTURE_INJURY_CHANCE } from '../assets/scripts/core/systems/NurtureEvents';

export function createNurtureInjuryObservabilitySuite(): TestSuite {
    const suite = new TestSuite('NurtureInjuryObservability');
    const base = () => {
        const child = { id: 'injury-child', name: 'test', faction: Faction.Player, gender: '男', age: 5, status: 'Mystery', hp: 800, str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [] } as UnveilingGeneral;
        return createNurtureSession({ sessionId: 'injury-session', child: chooseFate(unveilGeneral(child).general, 'accept'), mentors: [], startSeason: 0, random: () => 0.5 });
    };
    const sequence = (...values: number[]) => { let index = 0; return () => { if (index >= values.length) throw Error('多抽亂數'); return values[index++]; }; };
    suite.test('確定性受傷、跳過、恢復且序列化每回合保留兩旗標', () => {
        const injured = executeRound(base(), 'str', sequence(0, 0, 0));
        assert.isTrue(injured.log.injured === true);
        assert.equals(false, injured.log.skipped);
        assert.equals(0, injured.log.statGained);
        assert.equals(0, injured.log.tpGained);
        assert.equals(1, injured.session.skipRounds);
        const skipped = executeRound(injured.session, 'int', () => { throw Error('跳過回合不應抽亂數'); });
        assert.equals(false, skipped.log.injured);
        assert.equals(true, skipped.log.skipped);
        assert.equals(injured.session.vigor, skipped.session.vigor);
        const resumed = executeRound(skipped.session, 'str', sequence(0, 0, 0.99, 0.99));
        assert.equals(false, resumed.log.injured);
        assert.equals(false, resumed.log.skipped);
        assert.isTrue(resumed.log.statGained > 0);
        const saved = JSON.parse(JSON.stringify(resumed.session)) as NurtureSession;
        assert.equals(3, saved.log.length);
        for (const log of saved.log) {
            assert.equals('boolean', typeof log.injured);
            assert.equals('boolean', typeof log.skipped);
        }
        assert.equals(true, saved.log[0].injured);
        assert.equals(true, saved.log[1].skipped);
    });
    suite.test('休息亦保存明確 false，機率常數不變', () => {
        const result = executeRound(base(), 'rest', sequence(0));
        assert.equals(false, result.log.injured);
        assert.equals(false, result.log.skipped);
        assert.equals(0.03, NURTURE_INJURY_CHANCE);
    });
    return suite;
}
