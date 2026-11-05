// @spec-source → 戰法系統.md (doc_spec_0038) §H-2 SSR/UR 半身英靈閃現；PROG-2-1861
import { TestSuite, assert } from './TestRunner';
import { TACTIC_FLASH_TIMING, tacticFlashOf, tallyTacticOf } from '../assets/scripts/battle/shared/TacticVfxHooks';
import { TIGER_TALLY_SPEC_TACTICS } from '../assets/scripts/core/config/TigerTallySpecTactics';

export function createTacticFlashSuite(): TestSuite {
    const suite = new TestSuite('TacticFlash');

    suite.test('SSR 虎符戰法閃現，帶施放方與虎符名', () => {
        const view = tacticFlashOf('tally-long-dan', 'player');
        assert.isTrue(view !== null);
        assert.equals('player', view!.side);
        assert.equals('SSR', view!.quality);
        assert.equals('龍膽符', view!.caption);
        assert.equals('enemy', tacticFlashOf('tally-long-dan', 'enemy')!.side);
    });

    suite.test('UR 虎符戰法也閃現', () => {
        const ur = TIGER_TALLY_SPEC_TACTICS.find((row) => row.quality === 'UR')!;
        assert.equals('UR', tacticFlashOf(ur.battleSkillId, 'player')!.quality);
    });

    suite.test('R／SR 虎符與不在虎符表的戰法不閃現', () => {
        assert.equals(null, tacticFlashOf('tally-teng-jia', 'player'));
        assert.equals(null, tacticFlashOf('tally-dan-yang', 'player'));
        assert.equals(null, tacticFlashOf('zhang-fei-roar', 'player'));
        assert.equals(null, tallyTacticOf('not-a-skill'));
    });

    suite.test('同一招多張虎符時取品質最高的', () => {
        const shared = new Map<string, string[]>();
        for (const row of TIGER_TALLY_SPEC_TACTICS) shared.set(row.battleSkillId, [...(shared.get(row.battleSkillId) ?? []), row.quality]);
        for (const [skillId, qualities] of shared) {
            const best = tallyTacticOf(skillId)!.quality;
            const rank = (q: string) => ['R', 'SR', 'SSR', 'UR'].indexOf(q);
            assert.isTrue(qualities.every((q) => rank(q) <= rank(best)));
        }
    });

    suite.test('閃現總長不超過 1.5 秒', () => {
        const t = TACTIC_FLASH_TIMING;
        assert.isTrue(t.slideIn + t.hold + t.fadeOut <= 1.5);
    });

    return suite;
}
