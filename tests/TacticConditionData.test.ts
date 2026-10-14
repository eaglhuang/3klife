/**
 * TacticConditionData — 戰法資料的 tcond 欄位（TAC-07 條件表，PROG-2-0572）測試
 *
 * 只對戰法描述有明確兵種／天氣限定的戰法填 tcond；其餘留空，代表無條件。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { TroopType, Weather } from '../assets/scripts/core/config/Constants';
import { evaluateTacticConditions, type TacticCondition, type TacticConditionContext } from '../assets/scripts/core/systems/TacticCondition';

const ROOT = path.resolve(__dirname, '..');

interface TacticRow {
    id: string;
    tcond?: TacticCondition[];
}

function loadTactics(): Record<string, TacticRow> {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/master/tactic-library.json'), 'utf8'));
    const out: Record<string, TacticRow> = {};
    for (const row of raw.data as TacticRow[]) out[row.id] = row;
    return out;
}

function ctx(over: Partial<TacticConditionContext> = {}): TacticConditionContext {
    return {
        casterTroopType: TroopType.Infantry,
        weather: Weather.Clear,
        adjacentAllies: 0,
        adjacentEnemies: 0,
        ...over,
    };
}

export function createTacticConditionDataSuite(): TestSuite {
    const suite = new TestSuite('TacticConditionData (戰法 tcond 資料 TAC-07)');

    suite.test('兵種限定的戰法填入對應的 troopType 條件', () => {
        const tactics = loadTactics();
        assert.equals('troopType', tactics['tactic-cavalry-shock'].tcond?.[0].kind ?? '');
        assert.equals('troopType', tactics['tactic-dragon-pierce'].tcond?.[0].kind ?? '');
        assert.equals('troopType', tactics['tactic-archer-volley'].tcond?.[0].kind ?? '');
        assert.equals('troopType', tactics['tactic-battle-roar'].tcond?.[0].kind ?? '');
    });

    suite.test('天氣限定的火計佈陣填入 weather 條件（地形條件不進 tcond）', () => {
        const fire = loadTactics()['tactic-fire-scheme'];
        assert.equals(1, fire.tcond?.length ?? 0);
        assert.equals('weather', fire.tcond?.[0].kind ?? '');
    });

    suite.test('只有地形限定的水路伏擊留空，代表無條件', () => {
        assert.isTrue(loadTactics()['tactic-river-ambush'].tcond === undefined);
    });

    suite.test('所有 tcond 的值都是合法的兵種或天氣代碼', () => {
        const troops = new Set<string>(Object.values(TroopType));
        const weathers = new Set<string>(Object.values(Weather));
        for (const row of Object.values(loadTactics())) {
            for (const cond of row.tcond ?? []) {
                const allowed = cond.kind === 'troopType' ? troops : cond.kind === 'weather' ? weathers : null;
                assert.isTrue(allowed !== null, `${row.id} 的 tcond 種類不合法`);
                const values: readonly string[] = 'allowed' in cond ? cond.allowed : [];
                for (const value of values) {
                    assert.isTrue(allowed!.has(value), `${row.id} 的 tcond 值 ${value} 不合法`);
                }
            }
        }
    });

    suite.test('騎軍衝鋒：騎兵施放可發動，步兵施放不可發動', () => {
        const conds = loadTactics()['tactic-cavalry-shock'].tcond;
        assert.isTrue(evaluateTacticConditions(conds, ctx({ casterTroopType: TroopType.Cavalry })).ok);
        assert.isFalse(evaluateTacticConditions(conds, ctx({ casterTroopType: TroopType.Infantry })).ok);
    });

    suite.test('火計佈陣：晴天不可發動，大風可發動', () => {
        const conds = loadTactics()['tactic-fire-scheme'].tcond;
        assert.isFalse(evaluateTacticConditions(conds, ctx({ weather: Weather.Clear })).ok);
        assert.isTrue(evaluateTacticConditions(conds, ctx({ weather: Weather.Windy })).ok);
    });

    suite.test('水路伏擊沒有 tcond 時任何情況都可發動', () => {
        const conds = loadTactics()['tactic-river-ambush'].tcond;
        assert.isTrue(evaluateTacticConditions(conds, ctx({ weather: Weather.Rain, casterTroopType: TroopType.Navy })).ok);
    });

    return suite;
}
