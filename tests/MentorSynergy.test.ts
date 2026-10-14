/**
 * MentorSynergy.test.ts — 師友羈絆（MENT-12，PROG-2-0545）headless 測試
 *
 * Unity 對照：像 Trigger 的 EditMode 測試，逐條驗條件的邊界值與一次性。
 */
import { TestSuite, assert } from './TestRunner';
import {
    DEFAULT_SYNERGY_GROUPS,
    SYNERGY_DEFAULT_MIN_FRIENDSHIP,
    SYNERGY_TRIGGER_ROUND_LIMIT,
    findTriggeredSynergy,
    synergyInspirationBonus,
    synergyTpBonus,
} from '../assets/scripts/core/systems/MentorSynergy';

const ZHAO_ZHUGE = DEFAULT_SYNERGY_GROUPS.find((g) => g.id === 'SYN_ZHAO_ZHUGE_01')!;
const GUAN_ZHANG = DEFAULT_SYNERGY_GROUPS.find((g) => g.id === 'SYN_GUAN_ZHANG_01')!;

function input(overrides: Partial<Parameters<typeof findTriggeredSynergy>[0]> = {}) {
    return {
        round: 3,
        mentorIds: ['SUP_ZHUGE_SSR_01', 'SUP_PANG_SSR_01'],
        friendship: { SUP_ZHUGE_SSR_01: 30, SUP_PANG_SSR_01: 0 },
        triggered: [] as string[],
        ...overrides,
    };
}

export function createMentorSynergySuite(): TestSuite {
    const suite = new TestSuite('MentorSynergy (師友羈絆 MENT-12 PROG-2-0545)');

    suite.test('預設羈絆表載入五組，id 與羈絆對皆不重複', () => {
        assert.equals(5, DEFAULT_SYNERGY_GROUPS.length);
        const ids = new Set(DEFAULT_SYNERGY_GROUPS.map((g) => g.id));
        assert.equals(5, ids.size);
        for (const group of DEFAULT_SYNERGY_GROUPS) {
            assert.isTrue(group.partners[0] !== group.partners[1], `${group.id} 兩張卡不可相同`);
        }
    });

    suite.test('兩張卡在場、友情達門檻（剛好 30）、回合內 → 觸發', () => {
        assert.equals(SYNERGY_DEFAULT_MIN_FRIENDSHIP, ZHAO_ZHUGE.minFriendship);
        const hit = findTriggeredSynergy(input({ groups: [ZHAO_ZHUGE] }));
        assert.equals('SYN_ZHAO_ZHUGE_01', hit!.id);
    });

    suite.test('友情差 1（29）不觸發；兩張卡只要其中一張友情達標即可', () => {
        assert.equals(null, findTriggeredSynergy(input({ groups: [ZHAO_ZHUGE], friendship: { SUP_ZHUGE_SSR_01: 29, SUP_PANG_SSR_01: 0 } })));
        assert.notEquals(null, findTriggeredSynergy(input({ groups: [ZHAO_ZHUGE], friendship: { SUP_ZHUGE_SSR_01: 0, SUP_PANG_SSR_01: 30 } })));
    });

    suite.test('只有一張羈絆卡在場不觸發', () => {
        assert.equals(null, findTriggeredSynergy(input({ groups: [ZHAO_ZHUGE], mentorIds: ['SUP_ZHUGE_SSR_01'] })));
    });

    suite.test('回合上限：第 12 回合（含）內可觸發，第 13 回合起不觸發', () => {
        assert.equals(12, SYNERGY_TRIGGER_ROUND_LIMIT);
        assert.notEquals(null, findTriggeredSynergy(input({ groups: [ZHAO_ZHUGE], round: 12 })));
        assert.equals(null, findTriggeredSynergy(input({ groups: [ZHAO_ZHUGE], round: 13 })));
    });

    suite.test('一次性：已觸發過的群組不再觸發', () => {
        assert.equals(null, findTriggeredSynergy(input({ groups: [ZHAO_ZHUGE], triggered: ['SYN_ZHAO_ZHUGE_01'] })));
    });

    suite.test('效果彙總：TP 與靈感率只計對應類型（桃園遺烈 TP +50、靈感 +15%）', () => {
        assert.equals(50, synergyTpBonus(GUAN_ZHANG));
        assert.equals(0.15, synergyInspirationBonus(GUAN_ZHANG));
        assert.equals(0, synergyTpBonus(ZHAO_ZHUGE));
    });

    return suite;
}
