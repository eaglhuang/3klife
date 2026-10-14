/**
 * GeneralAging — 武將每季增齡與壽命結算（NUM-08 補缺口，PROG-2-0424）
 *
 * 覆蓋：每季增齡量、死亡率公式與上限、65 歲退役事件只發一次、死亡事件（注入亂數）、
 * 已死亡與無年齡武將略過、不改寫輸入名冊、壽命上限的顯式值與紅因子加成、id 穩定的壽命範圍。
 *
 * Unity 對照：像在測 Service 的純函式，亂數由外部注入，就不用依賴 Random.value 的隨機結果。
 */
import { assert, TestSuite } from './TestRunner';
import {
    AGE_PER_SEASON,
    BASE_LIFESPAN,
    DEATH_CHANCE_PER_OVER_YEAR,
    GENERAL_STATUS_DEAD,
    MAX_DEATH_CHANCE_PER_SEASON,
    ageGeneralsOneSeason,
    deathChancePerSeason,
    resolveMaxLifespan,
    type AgingGeneral,
} from '../assets/scripts/core/systems/GeneralAging';

function general(overrides: Partial<AgingGeneral> & { id: string }): AgingGeneral {
    return { name: '測試', ...overrides } as unknown as AgingGeneral;
}

export function createGeneralAgingSuite(): TestSuite {
    const suite = new TestSuite('GeneralAging (武將增齡與壽命 NUM-08)');

    suite.test('增齡量：每季 +0.25，四季剛好 +1 歲', () => {
        assert.equals(0.25, AGE_PER_SEASON);
        let roster: AgingGeneral[] = [general({ id: 'a', age: 10, maxLifespan: 80 })];
        for (let season = 0; season < 4; season++) {
            roster = ageGeneralsOneSeason(roster, () => 0.99).roster;
        }
        assert.equals(11, roster[0].age);
    });

    suite.test('死亡率：未超過壽命為 0；超過每歲 +0.1；上限 0.8', () => {
        assert.equals(0, deathChancePerSeason(60, 60));
        assert.equals(0, deathChancePerSeason(59, 60));
        assert.equals(DEATH_CHANCE_PER_OVER_YEAR, deathChancePerSeason(61, 60));
        assert.equals(0.5, deathChancePerSeason(65, 60));
        assert.equals(MAX_DEATH_CHANCE_PER_SEASON, deathChancePerSeason(90, 60));
    });

    suite.test('退役事件：跨過 65 歲時只發一次，之後不再重複', () => {
        const first = ageGeneralsOneSeason([general({ id: 'a', age: 64.75, maxLifespan: 80 })], () => 0.99);
        assert.equals(1, first.events.length);
        assert.equals('reached-retirement-age', first.events[0].type);
        assert.equals(65, first.events[0].age);

        const second = ageGeneralsOneSeason(first.roster, () => 0.99);
        assert.equals(0, second.events.length);
    });

    suite.test('死亡事件：亂數低於死亡率時死亡並發事件；高於時存活', () => {
        // 年齡 61.75 → 62，超過壽命 60 兩歲，死亡率 0.2
        const roster = [general({ id: 'b', age: 61.75, maxLifespan: 60 })];

        const died = ageGeneralsOneSeason(roster, () => 0.1);
        assert.equals(GENERAL_STATUS_DEAD, died.roster[0].status);
        assert.equals(1, died.events.filter((e) => e.type === 'died').length);

        const alive = ageGeneralsOneSeason(roster, () => 0.9);
        assert.isTrue(alive.roster[0].status !== GENERAL_STATUS_DEAD);
        assert.equals(0, alive.events.filter((e) => e.type === 'died').length);
    });

    suite.test('略過：已死亡與沒有年齡的武將年齡不變、不發事件', () => {
        const roster = [
            general({ id: 'dead-one', age: 70, maxLifespan: 60, status: GENERAL_STATUS_DEAD }),
            general({ id: 'no-age' }),
        ];
        const result = ageGeneralsOneSeason(roster, () => 0);
        assert.equals(70, result.roster[0].age);
        assert.isTrue(result.roster[1].age === undefined);
        assert.equals(0, result.events.length);
    });

    suite.test('不改寫輸入：回傳的新名冊有變化，原陣列的年齡保持不變', () => {
        const roster = [general({ id: 'c', age: 30, maxLifespan: 80 })];
        const result = ageGeneralsOneSeason(roster, () => 0.99);
        assert.equals(30, roster[0].age);
        assert.equals(30.25, result.roster[0].age);
        assert.isFalse(result.roster[0] === roster[0]);
    });

    suite.test('壽命上限：有顯式值時直接採用，不被 id 雜湊覆蓋', () => {
        assert.equals(72, resolveMaxLifespan(general({ id: 'any-id', maxLifespan: 72 })));
    });

    suite.test('紅因子：每級 +3 歲，同一 id 差值為 2 級 × 3 = 6', () => {
        const plain = resolveMaxLifespan(general({ id: 'red-test' }));
        const withRed = resolveMaxLifespan(general({ id: 'red-test', redGeneLevel: 2 }));
        assert.equals(6, withRed - plain);
    });

    suite.test('壽命範圍：65 + 變異(-5~+10)，落在 60~75，且同一 id 每次結果一致', () => {
        const ids = ['liu-bei', 'guan-yu', 'zhang-fei', 'zhao-yun', 'cao-cao', 'sun-quan', 'lu-bu'];
        for (const id of ids) {
            const first = resolveMaxLifespan(general({ id }));
            const second = resolveMaxLifespan(general({ id }));
            assert.equals(first, second);
            assert.isTrue(first >= BASE_LIFESPAN - 5 && first <= BASE_LIFESPAN + 10);
        }
    });

    return suite;
}
