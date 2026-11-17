/**
 * HallMissionGenerator — 任務產生、難度權重、過期與補新（PROG-2-9130，doc_spec_1178 §3.2、§9）
 */
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
    HALL_MISSION_WALLS, emptyHallMissionState, parseHallMissionBalance, parseHallMissionTemplates,
    type HallMissionBalance, type HallMissionTemplate,
} from '../assets/scripts/core/systems/HallMissionData';
import {
    createHallMission, expireHallMissions, hallDifficultyWeight, openHallMissionCount, refillHallBoards, visibleHallDifficulties,
} from '../assets/scripts/core/systems/HallMissionGenerator';

function load(): { templates: HallMissionTemplate[]; balance: HallMissionBalance } {
    const read = (name: string): unknown => JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data', name), 'utf8'));
    const templates = parseHallMissionTemplates(read('hall-mission-templates.json'));
    const balance = parseHallMissionBalance(read('hall-mission-balance.json'));
    if (templates.ok === false || balance.ok === false) throw new Error('資料檔驗證失敗');
    return { templates: templates.value, balance: balance.value };
}

export function createHallMissionGeneratorSuite(): TestSuite {
    const suite = new TestSuite('HallMissionGenerator (產生／過期／補新，PROG-2-9130)');
    const { templates, balance } = load();

    suite.test('新開局：三面牆各補到 4 筆，同一面牆沒有重複模板，沒有佔位文字', () => {
        const state = refillHallBoards(emptyHallMissionState(7), templates, balance, 0, 1);
        for (const wall of HALL_MISSION_WALLS) {
            assert.equals(4, state.boards[wall].length, wall);
            assert.equals(4, new Set(state.boards[wall].map((m) => m.templateId)).size, `${wall} 有重複模板`);
            for (const m of state.boards[wall]) {
                assert.equals('OPEN', m.status);
                assert.equals(50, m.intel);
                assert.equals(2, m.expireSeason);
                assert.isFalse(/範例資料|待企劃提供/.test(m.title + m.brief + m.detail));
            }
        }
        const ids = HALL_MISSION_WALLS.flatMap((w) => state.boards[w].map((m) => m.id));
        assert.equals(ids.length, new Set(ids).size, '任務代號重複');
    });

    suite.test('官階 1 只抽得到簡單；官階 5 五級都會出現；權重 3／4／2', () => {
        assert.equals(1, visibleHallDifficulties(1).length);
        assert.equals(5, visibleHallDifficulties(5).length);
        const seen = new Set<string>();
        for (let seed = 1; seed <= 40; seed += 1) {
            const s = refillHallBoards(emptyHallMissionState(seed), templates, balance, 0, 5);
            for (const w of HALL_MISSION_WALLS) for (const m of s.boards[w]) seen.add(m.difficulty);
            const low = refillHallBoards(emptyHallMissionState(seed), templates, balance, 0, 1);
            for (const w of HALL_MISSION_WALLS) for (const m of low.boards[w]) assert.equals('EASY', m.difficulty);
        }
        assert.equals(5, seen.size, `官階 5 只出現 ${[...seen].join(',')}`);
        const visible = visibleHallDifficulties(5);
        assert.equals(3, hallDifficultyWeight(visible, 'HELL', balance));
        assert.equals(4, hallDifficultyWeight(visible, 'ADVANCED', balance));
        assert.equals(2, hallDifficultyWeight(visible, 'ELITE', balance));
        assert.equals(2, hallDifficultyWeight(visible, 'EASY', balance));
    });

    suite.test('同種子結果完全相同（讀檔重進不洗牌）；不同種子通常不同', () => {
        const a = refillHallBoards(emptyHallMissionState(77), templates, balance, 0, 3);
        const b = refillHallBoards(emptyHallMissionState(77), templates, balance, 0, 3);
        assert.equals(JSON.stringify(a), JSON.stringify(b));
        const c = refillHallBoards(emptyHallMissionState(78), templates, balance, 0, 3);
        assert.isTrue(JSON.stringify(a.boards) !== JSON.stringify(c.boards));
    });

    suite.test('獎勵與耗費照第 4 節查表：軍事不耗黃金、內政不耗兵源、沙盤給黃金與經驗', () => {
        const byWall = (wall: string) => templates.find((t) => t.wall === wall && t.difficulty === 'NORMAL')!;
        const mil = createHallMission(byWall('Military'), balance, 'M', 0);
        assert.equals(200, mil.rewards.grain); assert.equals(0, mil.rewards.silver); assert.equals(70, mil.rewards.generalExp);
        assert.equals(60, mil.costs.grain); assert.equals(80, mil.costs.troops); assert.equals(0, mil.costs.silver);
        assert.equals(20, mil.energyCost); assert.equals(200, mil.powerRequired); assert.equals(1, mil.durationSeasons);
        const dom = createHallMission(byWall('Domestic'), balance, 'D', 0);
        assert.equals(100, dom.rewards.grain); assert.equals(140, dom.rewards.silver); assert.equals(0, dom.rewards.generalExp);
        assert.equals(0, dom.costs.troops); assert.equals(50, dom.costs.silver); assert.equals(10, dom.energyCost);
        const exp = createHallMission(byWall('Expedition'), balance, 'E', 0);
        assert.equals(0, exp.rewards.grain); assert.equals(140, exp.rewards.silver); assert.equals(70, exp.rewards.generalExp);
    });

    suite.test('過期：到期季早於新季才移除、進行中不動；補新後未接取回到 4 筆且進行中不佔名額', () => {
        let state = refillHallBoards(emptyHallMissionState(5), templates, balance, 0, 1);
        const active = { ...state.boards.Military[0], status: 'ACTIVE' as const, generalId: 'g', generalName: 'G', successRate: 0.5, returnSeason: 5 };
        state.boards.Military[0] = active;
        assert.equals(3, openHallMissionCount(state, 'Military'));
        assert.equals(4, expireHallMissions(state, 2).boards.Domestic.length, '到期季 = 2，第 2 季還在');
        const gone = expireHallMissions(state, 3);
        assert.equals(0, gone.boards.Domestic.length, '第 3 季消失');
        assert.equals(1, gone.boards.Military.length, '進行中的不過期');
        state = refillHallBoards(gone, templates, balance, 3, 1);
        assert.equals(4, openHallMissionCount(state, 'Military'));
        assert.equals(5, state.boards.Military.length);
        assert.equals(5, state.boards.Military[1].expireSeason, '新任務到期季 = 產生當季 + 2');
    });

    return suite;
}
