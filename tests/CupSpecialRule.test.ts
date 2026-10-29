import { createTournamentState, cupSpecialPowerMultiplier, registerTournamentTeam, tournamentVenueOf, TOURNAMENT_CUPS } from '../assets/scripts/core/systems/TournamentLocal';
import { TestSuite, assert } from './TestRunner';

export function createCupSpecialRuleSuite(): TestSuite {
    const suite = new TestSuite('CupSpecialRule (九州盃特殊規則 PROG-2-1612)');
    const cup = (name: string) => TOURNAMENT_CUPS.find((c) => c.cupName === name)!;

    suite.test('赤壁火攻 ×2、官渡騎兵 ×1.8、夷陵弓兵 ×0.5 陷阱 ×2；沒命中為 1', () => {
        assert.equals(2, cupSpecialPowerMultiplier(cup('赤壁盃'), ['FIRE']));
        assert.equals(1.8, cupSpecialPowerMultiplier(cup('官渡盃'), ['CAVALRY', 'FIRE']));
        assert.equals(1, cupSpecialPowerMultiplier(cup('夷陵盃'), ['RANGED', 'TRAP']));
        assert.equals(1, cupSpecialPowerMultiplier(cup('虎牢盃'), ['FIRE']));
        assert.equals(1, cupSpecialPowerMultiplier(cup('張飛盃'), ['FIRE']));
        assert.equals(1, cupSpecialPowerMultiplier(cup('赤壁盃'), undefined));
    });

    suite.test('報名時依當季杯賽規則換算鏡像戰力', () => {
        const state = createTournamentState(0);
        const venue = tournamentVenueOf(state.seasonIndex);
        const r = registerTournamentTeam(state, [{ id: 'a', power: 100, attackTags: ['FIRE'] }, { id: 'b', power: 100 }], 0);
        assert.isTrue(r.ok);
        if (r.ok) assert.equals(Math.round(100 * cupSpecialPowerMultiplier(venue, ['FIRE']) + 100), r.state.team!.totalPower);
    });

    return suite;
}
