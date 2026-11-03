/**
 * RivalOfficerSetup.test.ts — 開局建立他國名冊與逐將重算情境（PROG-2-1715）
 */
import { assert, TestSuite } from './TestRunner';
import type { RivalRostersConfig } from '../assets/scripts/core/systems/RivalOfficers';
import { buildRivalOfficerSetup, type RivalSetupGeneral } from '../assets/scripts/core/systems/RivalOfficerSetup';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

const ROSTERS: RivalRostersConfig = {
    nations: { wei: { generals: ['a', 'b'], tallies: [{ id: 't', quality: 'R', troopType: 'cavalry', star: 1 }] } },
};
const GENERALS: RivalSetupGeneral[] = [
    { id: 'a', age: 30, str: 80, troopAptitude: { CAVALRY: 'S', ARCHER: 'X' } },
    { id: 'b', age: 30, str: 70 },
];
const TROOPS = { cavalry: { attack: 40, defense: 20 }, broken: { attack: 1 } };
const DIFFICULTY = { difficulties: [{ difficultyId: 'hard', statScale: 1.3 }] };

export function createRivalOfficerSetupSuite(): TestSuite {
    const suite = new TestSuite('RivalOfficerSetup');

    suite.test('情境：適性取自 troopAptitude，非法等級視為缺值；兵種攻防缺欄回 null', () => {
        const { context } = buildRivalOfficerSetup({ rosters: ROSTERS, generals: GENERALS, troops: TROOPS, difficultyTable: DIFFICULTY });
        assert.equals(context.aptitudeOf!('a', 'cavalry'), 'S');
        assert.equals(context.aptitudeOf!('a', 'archer'), null);
        assert.equals(context.aptitudeOf!('b', 'cavalry'), null);
        assert.equals(JSON.stringify(context.troopStatsOf('cavalry')), JSON.stringify({ attack: 40, defense: 20 }));
        assert.equals(context.troopStatsOf('broken'), null);
        assert.equals(context.chapter, 1);
    });

    suite.test('難度：取自難度表（預設 normal）；表不完整或壞掉時 statScale 取 1', () => {
        const table = loadJson<unknown>('assets/resources/data/ai-difficulty.json');
        const hard = buildRivalOfficerSetup({ rosters: ROSTERS, generals: GENERALS, troops: TROOPS, difficultyTable: table, difficulty: 'hard' });
        assert.equals(hard.context.difficulty.statScale, 1.3);
        const partial = buildRivalOfficerSetup({ rosters: ROSTERS, generals: GENERALS, troops: TROOPS, difficultyTable: DIFFICULTY, difficulty: 'hard' });
        assert.equals(partial.context.difficulty.statScale, 1);
        const broken = buildRivalOfficerSetup({ rosters: ROSTERS, generals: GENERALS, troops: TROOPS, difficultyTable: null });
        assert.equals(broken.context.difficulty.statScale, 1);
    });

    suite.test('名冊排除玩家已擁有的武將', () => {
        const { rosters } = buildRivalOfficerSetup({
            rosters: ROSTERS, generals: GENERALS, troops: TROOPS, difficultyTable: DIFFICULTY, playerOwnedIds: new Set(['a']),
        });
        assert.equals(rosters.wei.officers.map((o) => o.generalId).join(','), 'b');
    });

    suite.test('實際資料：normal 難度 statScale 1，八國名冊皆可建出', () => {
        const setup = buildRivalOfficerSetup({
            rosters: loadJson('assets/resources/data/rival-rosters.json'),
            generals: loadJson('assets/resources/data/generals.json'),
            troops: loadJson('assets/resources/data/troops.json'),
            difficultyTable: loadJson('assets/resources/data/ai-difficulty.json'),
        });
        assert.equals(setup.context.difficulty.statScale, 1);
        assert.equals(Object.keys(setup.rosters).length, 8);
        assert.isTrue(Object.values(setup.rosters).every((r) => r.officers.length > 0));
    });

    return suite;
}
