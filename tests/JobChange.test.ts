import { assert, TestSuite } from './TestRunner';
import {
    applyJobChange,
    buildJobChangeChoices,
    checkJobChange,
    formatJobChangeText,
    JobChangeCandidate,
    projectSubClassAbility,
} from '../assets/scripts/core/systems/JobChange';

const ADULT_WARRIOR: JobChangeCandidate = { age: 20, primaryClass: 'Warrior', subClass: null, primaryAbility: 100 };

export function createJobChangeSuite(): TestSuite {
    const suite = new TestSuite('JobChange (FATE-06/07 20 歲轉職)');

    suite.test('滿 20 歲、持有轉職令、副職為空：可追加另一職能', () => {
        const result = applyJobChange(ADULT_WARRIOR, 1, 'Scholar');
        assert.isTrue(result.ok);
        assert.equals('Scholar', result.general.subClass!);
        assert.equals(0, result.ordersAfter);
        assert.equals(60, result.subAbility!);
    });

    suite.test('副職能力 = 主職能力 × 0.6，向下取整', () => {
        assert.equals(60, projectSubClassAbility(100));
        assert.equals(36, projectSubClassAbility(60));
        assert.equals(7, projectSubClassAbility(13));
        assert.equals(0, projectSubClassAbility(0));
    });

    suite.test('未滿 20 歲不可轉職，狀態與轉職令都不變', () => {
        const young = { ...ADULT_WARRIOR, age: 19.9 };
        const result = applyJobChange(young, 3, 'Scholar');
        assert.isFalse(result.ok);
        assert.equals('too-young', result.reason!);
        assert.isTrue(result.general.subClass === null);
        assert.equals(3, result.ordersAfter);
        assert.equals(19.9, young.age);
    });

    suite.test('沒有轉職令不可轉職', () => {
        const result = applyJobChange(ADULT_WARRIOR, 0, 'Scholar');
        assert.isFalse(result.ok);
        assert.equals('no-order', result.reason!);
        assert.isTrue(result.general.subClass === null);
    });

    suite.test('已有副職不可再轉職（只追加一次）', () => {
        const married = { ...ADULT_WARRIOR, subClass: 'Scholar' as const };
        const result = applyJobChange(married, 5, 'Warrior');
        assert.isFalse(result.ok);
        assert.equals('already-has-sub', result.reason!);
        assert.equals(5, result.ordersAfter);
    });

    suite.test('副職與主職相同被拒絕', () => {
        const result = applyJobChange(ADULT_WARRIOR, 1, 'Warrior');
        assert.isFalse(result.ok);
        assert.equals('same-class', result.reason!);
    });

    suite.test('檢查順序：年齡優先於轉職令', () => {
        const reason = checkJobChange({ ...ADULT_WARRIOR, age: 18 }, 0, 'Scholar');
        assert.equals('too-young', reason!);
    });

    suite.test('文案 UI_JOB_CHANGE 代入副職名稱', () => {
        assert.equals('消耗轉職令 ×1，追加副職能：文官', formatJobChangeText('Scholar'));
        assert.equals('消耗轉職令 ×1，追加副職能：武官', formatJobChangeText('Warrior'));
    });

    suite.test('FATE-07 選項只列出與主職不同的副職，並附文案與預估能力', () => {
        const choices = buildJobChangeChoices(ADULT_WARRIOR);
        assert.equals(1, choices.length);
        assert.equals('Scholar', choices[0].subClass);
        assert.equals('消耗轉職令 ×1，追加副職能：文官', choices[0].label);
        assert.equals(60, choices[0].projectedSubAbility);
    });

    return suite;
}
