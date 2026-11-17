/**
 * HallMissionData — 大廳任務模板庫、數值表與存檔還原（PROG-2-9130，doc_spec_1178 §3、§4、§10）
 */
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
    HALL_MISSION_DIFFICULTIES, HALL_MISSION_WALLS, cloneHallMissionState, emptyHallMissionState, hallSeedFromText,
    nextHallRandom, normalizeHallMissionState, parseHallMissionBalance, parseHallMissionTemplates,
} from '../assets/scripts/core/systems/HallMissionData';

function readData(name: string): unknown {
    return JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data', name), 'utf8'));
}

export function createHallMissionDataSuite(): TestSuite {
    const suite = new TestSuite('HallMissionData (模板庫／數值表／存檔還原，PROG-2-9130)');

    suite.test('模板庫：不少於 30 筆、每面牆每個難度至少 2 筆、沒有佔位文字', () => {
        const parsed = parseHallMissionTemplates(readData('hall-mission-templates.json'));
        assert.isTrue(parsed.ok, JSON.stringify(parsed.issues));
        if (parsed.ok === false) return;
        assert.isTrue(parsed.value.length >= 30, `只有 ${parsed.value.length} 筆`);
        for (const wall of HALL_MISSION_WALLS) {
            for (const difficulty of HALL_MISSION_DIFFICULTIES) {
                const count = parsed.value.filter((t) => t.wall === wall && t.difficulty === difficulty).length;
                assert.isTrue(count >= 2, `${wall}/${difficulty} 只有 ${count} 筆`);
            }
        }
        for (const t of parsed.value) {
            for (const text of [t.title, t.brief, t.detail]) {
                assert.isFalse(/範例資料|待企劃提供|佔位|TODO/.test(text), `${t.templateId} 含佔位字樣`);
            }
            if (t.wall !== 'Domestic') assert.isTrue(t.enemyHint.length > 0, `${t.templateId} 缺敵方說明`);
        }
    });

    suite.test('模板驗證：壞資料回報全部問題、重複代號與佔位字樣被擋', () => {
        const bad = parseHallMissionTemplates({ Templates: [
            { Template_ID: 'A', Wall: 'MILITARY', Difficulty: 'EASY', Task_Title: '範例資料', Task_Brief: 'x', Task_Detail: 'x', Key_Stat: 'str', Enemy_Hint: 'x' },
            { Template_ID: 'A', Wall: 'NOPE', Difficulty: 'EASY', Task_Title: 't', Task_Brief: 'x', Task_Detail: 'x', Key_Stat: 'str' },
        ] });
        assert.isFalse(bad.ok);
        assert.isTrue(bad.issues.length >= 3, `只回報 ${bad.issues.length} 項`);
        assert.isFalse(parseHallMissionTemplates({}).ok);
    });

    suite.test('數值表：照規格 §4 的首版數字', () => {
        const parsed = parseHallMissionBalance(readData('hall-mission-balance.json'));
        assert.isTrue(parsed.ok, JSON.stringify(parsed.issues));
        if (parsed.ok === false) return;
        const b = parsed.value;
        assert.equals(4, b.wallTargetCount);
        assert.equals(2, b.expireSeasons);
        assert.equals(50, b.reconCostGrain);
        assert.equals(100, b.difficulties.EASY.powerRequired);
        assert.equals(400, b.difficulties.HELL.powerRequired);
        assert.equals(3, b.difficulties.HELL.durationSeasons);
        assert.equals(1000, b.difficulties.HELL.rewardGrain);
        assert.equals(20, b.energyCost.Military);
        assert.equals(10, b.energyCost.Domestic);
        assert.equals(5000, b.caps.silver);
        assert.isFalse(parseHallMissionBalance({}).ok);
    });

    suite.test('亂數：同種子同序列、值在 [0,1)、種子文字雜湊固定', () => {
        let a = 12345; let b = 12345;
        for (let i = 0; i < 20; i += 1) {
            const x = nextHallRandom(a); const y = nextHallRandom(b);
            assert.equals(x.value, y.value);
            assert.isTrue(x.value >= 0 && x.value < 1);
            a = x.seed; b = y.seed;
        }
        assert.equals(hallSeedFromText('abc'), hallSeedFromText('abc'));
        assert.isTrue(hallSeedFromText('abc') !== hallSeedFromText('abd'));
    });

    suite.test('存檔還原：壞資料回 null、空狀態來回不變、複本不共用參考', () => {
        assert.isTrue(normalizeHallMissionState(undefined) === null);
        assert.isTrue(normalizeHallMissionState({ boards: 1 }) === null);
        const empty = emptyHallMissionState(9);
        const restored = normalizeHallMissionState(JSON.parse(JSON.stringify(empty)));
        assert.isTrue(restored !== null);
        assert.equals(9, restored!.seed);
        const copy = cloneHallMissionState(empty);
        copy.boards.Military.push({} as never);
        assert.equals(0, empty.boards.Military.length);
    });

    return suite;
}
