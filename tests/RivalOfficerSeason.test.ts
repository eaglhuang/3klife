/**
 * RivalOfficerSeason.test.ts — 他國逐將季推進重算（PROG-2-1713）
 */
import { assert, TestSuite } from './TestRunner';
import type { RivalNationRoster, RivalOfficer, RivalTally } from '../assets/scripts/core/systems/RivalOfficers';
import {
    AI_TALLY_EXP_PER_TURN,
    advanceRivalOfficer,
    advanceRivalRoster,
    advanceRivalTallyStar,
    evaluateRivalRoster,
    reassignRivalTallies,
    RIVAL_AGE_PER_SEASON,
    type RivalPowerContext,
} from '../assets/scripts/core/systems/RivalOfficerSeason';

function officer(id: string, over: Partial<RivalOfficer> = {}): RivalOfficer {
    return {
        generalId: id,
        age: 30,
        vitality: 50,
        baseStats: { str: 80, int: 60, lea: 70, pol: 50, cha: 50 },
        ...over,
    };
}

function tally(id: string, over: Partial<RivalTally> = {}): RivalTally {
    return { id, quality: 'R', troopType: 'cavalry', star: 1, starExp: 0, equippedGeneralId: null, ...over };
}

const TROOPS: Record<string, { attack: number; defense: number }> = {
    cavalry: { attack: 40, defense: 20 },
    archer: { attack: 30, defense: 15 },
};

const CTX: RivalPowerContext = {
    difficulty: { statScale: 1 },
    chapter: 1,
    troopStatsOf: (t) => TROOPS[t] ?? null,
};

export function createRivalOfficerSeasonSuite(): TestSuite {
    const suite = new TestSuite('RivalOfficerSeason');

    suite.test('Phase 1：年齡 +0.25，精力回復 30% 且不超過 100 × 難度', () => {
        const next = advanceRivalOfficer(officer('a', { vitality: 50 }), CTX);
        assert.equals(next.age, 30 + RIVAL_AGE_PER_SEASON);
        assert.equals(next.vitality, 80);
        assert.equals(advanceRivalOfficer(officer('a', { vitality: 95 }), CTX).vitality, 100);
        const hard = advanceRivalOfficer(officer('a', { vitality: 100 }), { ...CTX, difficulty: { statScale: 1.3 } });
        assert.equals(hard.vitality, 130);
    });

    suite.test('Phase 2a：經驗累積升星，3★ 與品質上限後不再升', () => {
        let t = tally('t');
        t = advanceRivalTallyStar(t);
        assert.equals(t.starExp, AI_TALLY_EXP_PER_TURN);
        t = advanceRivalTallyStar(t);
        assert.equals(t.star, 2, '100 經驗升 2★');
        assert.equals(t.starExp, 0);
        for (let i = 0; i < 7; i++) t = advanceRivalTallyStar(t);
        assert.equals(t.star, 3, '350 經驗升 3★');
        const capped = advanceRivalTallyStar(t);
        assert.equals(capped, t, 'R 卡 3★ 為上限');
        const sr = tally('s', { quality: 'SR', star: 3 });
        assert.equals(advanceRivalTallyStar(sr), sr, '4★ 以上要精華突破，本卡不處理');
    });

    suite.test('Phase 2b：適性高者拿虎符，一將一符', () => {
        const officers = [officer('a'), officer('b'), officer('c')];
        const aptitude: Record<string, 'S' | 'A' | 'C'> = { 'a:cavalry': 'C', 'b:cavalry': 'S', 'c:cavalry': 'A', 'a:archer': 'A' };
        const ctx = { ...CTX, aptitudeOf: (g: string, t: string) => aptitude[`${g}:${t}`] ?? null };
        const out = reassignRivalTallies(officers, [
            tally('cav1', { quality: 'SR' }),
            tally('cav2'),
            tally('arc', { troopType: 'archer' }),
        ], ctx);
        assert.equals(out[0].equippedGeneralId, 'b', 'SR 先挑，給 S 適性');
        assert.equals(out[1].equippedGeneralId, 'c', '次佳 A 適性');
        assert.equals(out[2].equippedGeneralId, 'a', '剩下的武將');
    });

    suite.test('Phase 2b：同適性同屬性時留給原持有者；武將不足時卸下', () => {
        const officers = [officer('a'), officer('b')];
        const kept = reassignRivalTallies(officers, [tally('t', { equippedGeneralId: 'b' })], CTX);
        assert.equals(kept[0].equippedGeneralId, 'b');
        const short = reassignRivalTallies([officer('a')], [tally('x'), tally('y')], CTX);
        assert.equals(short[0].equippedGeneralId, 'a');
        assert.equals(short[1].equippedGeneralId, null);
    });

    suite.test('Phase 3：裝虎符的武將戰力較高，軍力為逐將加總', () => {
        const roster: RivalNationRoster = {
            officers: [officer('a'), officer('b')],
            tallies: [tally('t', { equippedGeneralId: 'a' })],
        };
        const power = evaluateRivalRoster(roster, CTX);
        const [a, b] = power.officers;
        assert.equals(a.tallyId, 't');
        assert.equals(b.tallyId, null);
        assert.isTrue(a.totalPower > b.totalPower, '虎符加成');
        assert.equals(power.militaryIndex, a.totalPower + b.totalPower);
        const noTroop = evaluateRivalRoster({ ...roster, tallies: [tally('n', { troopType: 'navy', equippedGeneralId: 'a' })] }, CTX);
        assert.equals(noTroop.officers[0].totalPower, b.totalPower, '查不到兵種攻防時不計特殊兵種');
    });

    suite.test('advanceRivalRoster：推進一季後虎符自動裝上', () => {
        const roster: RivalNationRoster = { officers: [officer('a')], tallies: [tally('t')] };
        const next = advanceRivalRoster(roster, CTX);
        assert.equals(next.officers[0].age, 30.25);
        assert.equals(next.tallies[0].equippedGeneralId, 'a');
        assert.equals(next.tallies[0].starExp, AI_TALLY_EXP_PER_TURN);
        assert.equals(roster.tallies[0].equippedGeneralId, null, '不改動原名冊');
    });

    return suite;
}
