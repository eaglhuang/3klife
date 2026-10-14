/**
 * MentorSupportSchema.test.ts — 教官支援卡資料結構（MENT-01）headless 測試
 *
 * 驗證規格 §I 的範例 SUP_ZHAO_SSR_01 能解析，且各欄位範圍錯誤會被一次列出。
 * Unity 對照：EditMode Test 驗證 ScriptableObject 的 OnValidate 規則。
 */
import { TestSuite, assert } from './TestRunner';
import {
    activePassiveEffects,
    friendshipBonusFor,
    parseSupportCard,
} from '../assets/scripts/core/models/MentorSupportSchema';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

/** 規格 §I 本機端範例，逐字照抄 */
function zhaoExample(): Record<string, unknown> {
    return {
        Support_ID: 'SUP_ZHAO_SSR_01',
        Name: '趙雲',
        Rarity: 'SSR',
        Teaching_Style: '槍法',
        Stat_Bonus: { STR: 8, AGI: 5 },
        Tactic_Inspire_Events: [
            { Event_ID: 'EVT_ZHAO_01', Tactic_ID: 'TAC_LANCE_THRUST', Trigger_Window: [1, 12], Base_Rate: 0.25, Min_Star: 0 },
            { Event_ID: 'EVT_ZHAO_02', Tactic_ID: 'TAC_CAVALRY_CHARGE', Trigger_Window: [8, 20], Base_Rate: 0.4, Min_Star: 1 },
            { Event_ID: 'EVT_ZHAO_05', Tactic_ID: 'TAC_DRAGON_GALL', Trigger_Window: [28, 36], Base_Rate: 0.15, Min_Star: 4 },
            {
                Event_ID: 'EVT_ZHAO_06', Tactic_ID: 'TAC_ZHAO_SPEAR', Trigger_Window: [1, 36], Base_Rate: 0.1, Min_Star: 5,
                Bloodline_Required: 'ZHAO',
            },
        ],
        Passive_Effects: [
            { Effect: 'TP_Bonus', Value: 0.15, Min_Star: 0 },
            { Effect: 'Training_Rate', Value: 0.05, Min_Star: 0 },
            { Effect: 'Initial_Friendship', Value: 5, Min_Star: 1 },
            { Effect: 'TP_Bonus', Value: 0.1, Min_Star: 4 },
        ],
        Friendship_Bonus: [1.0, 1.1, 1.2, 1.3, 1.4, 1.5],
        Training_Effect: [1.0, 1.05, 1.1, 1.15, 1.2, 1.3],
        Training_Slot_Affinity: ['STR', 'AGI'],
        Slot_Burst_Rate: 0.55,
        Synergy_Partners: ['SUP_ZHUGE_SR_01'],
        Synergy_Event_ID: 'SYN_ZHAO_ZHUGE_01',
        Overflow_Reward: { Type: 'Score_Point', Value: 500 },
        Current_Star: 0,
        Source: 'Gacha',
        Role_Boundary: 'TeachingOnly',
    };
}

function errorsOf(raw: unknown): string[] {
    const result = parseSupportCard(raw);
    assert.isFalse(result.ok, '應該解析失敗');
    return result.ok ? [] : result.errors;
}

function mutate(patch: Record<string, unknown>): Record<string, unknown> {
    return { ...zhaoExample(), ...patch };
}

export function createMentorSupportSchemaSuite(): TestSuite {
    const suite = new TestSuite('MentorSupportSchema (教官支援卡資料結構 MENT-01)');

    suite.test('模組不 import cc（可 headless 測）', () => {
        const text = fs.readFileSync(path.join(ROOT, 'assets/scripts/core/models/MentorSupportSchema.ts'), 'utf8') as string;
        assert.isFalse(/from\s+['"]cc['"]/.test(text));
    });

    suite.test('規格範例 SUP_ZHAO_SSR_01 可解析，欄位對應正確', () => {
        const result = parseSupportCard(zhaoExample());
        assert.isTrue(result.ok);
        if (!result.ok) return;
        const def = result.value;
        assert.equals('SUP_ZHAO_SSR_01', def.supportId);
        assert.equals('槍法', def.teachingStyle);
        assert.equals(8, def.statBonus.str);
        assert.equals(5, def.statBonus.lea, 'AGI 對照到 lea');
        assert.isTrue(def.trainingSlotAffinity.join(',') === 'str,lea');
        assert.equals(4, def.tacticInspireEvents.length);
        assert.equals('ZHAO', def.tacticInspireEvents[3].bloodlineRequired!);
        assert.isTrue(def.tacticInspireEvents[0].bloodlineRequired === undefined);
        assert.equals(0.55, def.slotBurstRate);
        assert.equals('TeachingOnly', def.roleBoundary);
        assert.equals('Gacha', def.source);
    });

    suite.test('解析不改輸入物件（深拷貝）', () => {
        const raw = zhaoExample();
        const before = JSON.stringify(raw);
        const result = parseSupportCard(raw);
        assert.isTrue(result.ok);
        assert.equals(before, JSON.stringify(raw));
    });

    suite.test('錯誤會一次全部列出，不是只報第一個', () => {
        const errors = errorsOf(mutate({ Role_Boundary: 'Bloodline', Source: 'Unknown', Slot_Burst_Rate: 2 }));
        assert.isTrue(errors.some((e) => e.includes('Role_Boundary')));
        assert.isTrue(errors.some((e) => e.includes('Source')));
        assert.isTrue(errors.some((e) => e.includes('Slot_Burst_Rate')));
        assert.isTrue(errors.length >= 3);
    });

    suite.test('Trigger_Window 超出 1~36 或起點大於迄點都會被擋', () => {
        const events = (window: unknown) => [
            { Event_ID: 'E1', Tactic_ID: 'T1', Trigger_Window: window, Base_Rate: 0.1, Min_Star: 0 },
        ];
        assert.isTrue(errorsOf(mutate({ Tactic_Inspire_Events: events([0, 12]) })).some((e) => e.includes('Trigger_Window')));
        assert.isTrue(errorsOf(mutate({ Tactic_Inspire_Events: events([1, 37]) })).some((e) => e.includes('Trigger_Window')));
        assert.isTrue(errorsOf(mutate({ Tactic_Inspire_Events: events([20, 8]) })).some((e) => e.includes('起點')));
    });

    suite.test('Base_Rate 必須在 0~1，Min_Star 必須在 0~5', () => {
        const event = (patch: Record<string, unknown>) => [
            { Event_ID: 'E1', Tactic_ID: 'T1', Trigger_Window: [1, 36], Base_Rate: 0.1, Min_Star: 0, ...patch },
        ];
        assert.isTrue(errorsOf(mutate({ Tactic_Inspire_Events: event({ Base_Rate: 1.5 }) })).some((e) => e.includes('Base_Rate')));
        assert.isTrue(errorsOf(mutate({ Tactic_Inspire_Events: event({ Min_Star: 6 }) })).some((e) => e.includes('Min_Star')));
    });

    suite.test('Event_ID 重複會被擋', () => {
        const dup = zhaoExample().Tactic_Inspire_Events as Record<string, unknown>[];
        const errors = errorsOf(mutate({ Tactic_Inspire_Events: [dup[0], { ...dup[1], Event_ID: 'EVT_ZHAO_01' }] }));
        assert.isTrue(errors.some((e) => e.includes('重複') && e.includes('EVT_ZHAO_01')));
    });

    suite.test('友情／訓練效果必須是 6 格、不小於 1、依星等不遞減', () => {
        assert.isTrue(errorsOf(mutate({ Friendship_Bonus: [1, 1.1, 1.2] })).some((e) => e.includes('Friendship_Bonus')));
        assert.isTrue(errorsOf(mutate({ Training_Effect: [1, 1.1, 1.2, 1.3, 1.4, 0.9] })).some((e) => e.includes('Training_Effect')));
        assert.isTrue(errorsOf(mutate({ Friendship_Bonus: [1, 1.2, 1.1, 1.3, 1.4, 1.5] })).some((e) => e.includes('遞增')));
    });

    suite.test('被動效果：Effect 必須是白名單，Min_Star 範圍檢查', () => {
        const errors = errorsOf(mutate({ Passive_Effects: [{ Effect: 'Luck_Bonus', Value: 1, Min_Star: 7 }] }));
        assert.isTrue(errors.some((e) => e.includes('Passive_Effects[0].Effect')));
        assert.isTrue(errors.some((e) => e.includes('Passive_Effects[0].Min_Star')));
    });

    suite.test('Stat_Bonus 與 Training_Slot_Affinity 不認得的鍵名會報錯', () => {
        assert.isTrue(errorsOf(mutate({ Stat_Bonus: { LUK: 3 } })).some((e) => e.includes('LUK')));
        assert.isTrue(errorsOf(mutate({ Training_Slot_Affinity: ['STR', 'SPD'] })).some((e) => e.includes('SPD')));
    });

    suite.test('Role_Boundary 缺少或不是 TeachingOnly 都會被擋（教官不具血統親傳資格）', () => {
        const raw = zhaoExample();
        delete raw.Role_Boundary;
        assert.isTrue(errorsOf(raw).some((e) => e.includes('TeachingOnly')));
    });

    suite.test('activePassiveEffects 依星等過濾，超出範圍的星等夾住', () => {
        const result = parseSupportCard(zhaoExample());
        assert.isTrue(result.ok);
        if (!result.ok) return;
        const def = result.value;
        assert.equals(2, activePassiveEffects(def, 0).length);
        assert.equals(3, activePassiveEffects(def, 1).length);
        assert.equals(4, activePassiveEffects(def, 4).length);
        assert.equals(4, activePassiveEffects(def, 99).length, '超過 ★5 夾到 ★5');
        assert.equals(2, activePassiveEffects(def, -3).length, '負數夾到 ★0');
    });

    suite.test('friendshipBonusFor：倍率 − 1 換算成靈感引擎的小數，依星等索引', () => {
        const result = parseSupportCard(zhaoExample());
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.isTrue(Math.abs(friendshipBonusFor(result.value, 0)) < 1e-9);
        assert.isTrue(Math.abs(friendshipBonusFor(result.value, 2) - 0.2) < 1e-9);
        assert.isTrue(Math.abs(friendshipBonusFor(result.value, 5) - 0.5) < 1e-9);
    });

    return suite;
}
