/**
 * TournamentBracket — 單機對戰樹：初賽／複賽／準決賽五戰三勝，決賽一場定勝負（PROG-2-1575，輪數暫定）。
 */
import { assert, TestSuite } from './TestRunner';
import {
    bracketSeriesRule, createTournamentState, normalizeTournamentState, playTournamentSeries, TOURNAMENT_DAY_MS, TOURNAMENT_FINAL_ROUND,
    type TournamentState,
} from '../assets/scripts/core/systems/TournamentLocal';

const D = TOURNAMENT_DAY_MS;
const TEAM = [{ id: 'a', power: 100 }];
const even = (): number => 0.5;

function play(state: TournamentState, random: () => number) {
    const r = playTournamentSeries(state, TEAM, 8 * D, random, () => true);
    if (!r.ok) throw new Error(r.reason);
    return r;
}

export function createTournamentBracketSuite(): TestSuite {
    const suite = new TestSuite('TournamentBracket (挑戰賽對戰樹 PROG-2-1575)');

    suite.test('決賽單場，其餘五戰三勝', () => {
        assert.equals(5, bracketSeriesRule(0).bestOf);
        assert.equals(3, bracketSeriesRule(2).winNeeded);
        assert.equals(1, bracketSeriesRule(TOURNAMENT_FINAL_ROUND).bestOf);
    });

    suite.test('連勝四輪：晉級到決賽，決賽只打一場並奪冠後回到初賽', () => {
        let state = createTournamentState(0);
        const rounds: number[] = [];
        for (let i = 0; i < 4; i++) {
            const r = play(state, even);
            rounds.push(r.result.round);
            state = r.state;
            if (i === 3) {
                assert.equals(1, r.result.games.length);
                assert.equals(true, r.result.champion);
            }
        }
        assert.equals('0,1,2,3', rounds.join(','));
        assert.equals(0, state.bracketRound);
        assert.equals(1, state.championships);
    });

    suite.test('輸一輪回到初賽', () => {
        let state = play(createTournamentState(0), even).state;
        assert.equals(1, state.bracketRound);
        let i = 0;
        const foe = (): number => (i++ % 2 === 0 ? 0.99 : 0.0);
        const r = play(state, foe);
        assert.equals(false, r.result.win);
        assert.equals(0, r.state.bracketRound);
    });

    suite.test('舊存檔沒有對戰樹欄位時補 0', () => {
        const raw = { ...createTournamentState(0) } as Partial<TournamentState>;
        delete raw.bracketRound;
        delete raw.championships;
        const n = normalizeTournamentState(raw)!;
        assert.equals(0, n.bracketRound);
        assert.equals(0, n.championships);
    });

    return suite;
}
