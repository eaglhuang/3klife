/**
 * LegendaryMentoring.test.ts — 名將傳道（MENT-15，PROG-2-0547）headless 測試
 *
 * Unity 對照：像一次性消耗品的 EditMode 測試，驗判定順序、扣道具與一生一次。
 */
import { TestSuite, assert } from './TestRunner';
import { chooseFate, unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { createNurtureSession, type NurtureSession } from '../assets/scripts/core/systems/NurtureSystem';
import {
    checkLegendaryMentoring,
    performLegendaryMentoring,
    type LegendaryMentoringInput,
} from '../assets/scripts/core/systems/LegendaryMentoring';

function activeSession(): NurtureSession {
    const child = chooseFate(unveilGeneral({
        id: 'lm-child', name: 'lm-child', faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [],
    } as unknown as UnveilingGeneral).general, 'accept');
    return createNurtureSession({ sessionId: 'lm', child, mentors: [], startSeason: 0, random: () => 0.5 });
}

function input(overrides: Partial<LegendaryMentoringInput> = {}): LegendaryMentoringInput {
    return {
        generalId: 'SPIRIT_ZHAO_01',
        exclusiveSkillId: 'SKILL_ZHAO_EXCLUSIVE',
        tickets: 1,
        usedGeneralIds: [],
        session: activeSession(),
        ...overrides,
    };
}

export function createLegendaryMentoringSuite(): TestSuite {
    const suite = new TestSuite('LegendaryMentoring (名將傳道 MENT-15 PROG-2-0547)');

    suite.test('可傳道：有傳道令、有奧義、會話進行中、未傳道過', () => {
        assert.isTrue(checkLegendaryMentoring(input()).ok);
    });

    suite.test('判定順序：沒有培育會話 → NOT_NURTURING；會話已結束 → SESSION_ENDED', () => {
        assert.equals('NOT_NURTURING', checkLegendaryMentoring(input({ session: undefined })).blocked!);
        const ended = { ...activeSession(), status: 'completed' as const };
        assert.equals('SESSION_ENDED', checkLegendaryMentoring(input({ session: ended })).blocked!);
    });

    suite.test('沒有專屬奧義 → NO_EXCLUSIVE_SKILL；沒有傳道令 → NO_TICKET', () => {
        assert.equals('NO_EXCLUSIVE_SKILL', checkLegendaryMentoring(input({ exclusiveSkillId: undefined })).blocked!);
        assert.equals('NO_TICKET', checkLegendaryMentoring(input({ tickets: 0 })).blocked!);
    });

    suite.test('一生一次：同一名將再次傳道 → ALREADY_USED，不同名將不受影響', () => {
        assert.equals('ALREADY_USED', checkLegendaryMentoring(input({ usedGeneralIds: ['SPIRIT_ZHAO_01'] })).blocked!);
        assert.isTrue(checkLegendaryMentoring(input({ usedGeneralIds: ['SPIRIT_GUAN_01'] })).ok);
    });

    suite.test('傳道成功：扣 1 張傳道令、記一生一次、寫入 Legendary_Mentoring 紀錄、100% 傳授', () => {
        const outcome = performLegendaryMentoring(input({ tickets: 2 }))!;
        assert.equals(1, outcome.tickets);
        assert.equals(JSON.stringify(['SPIRIT_ZHAO_01']), JSON.stringify(outcome.usedGeneralIds));
        assert.equals('SKILL_ZHAO_EXCLUSIVE', outcome.skillId);
        assert.isTrue(outcome.guaranteed);
        const entry = outcome.session.mentoringModeLog![0];
        assert.equals('Legendary_Mentoring', entry.mode);
        assert.equals('SPIRIT_ZHAO_01', entry.sourceId);
        assert.equals('SKILL_ZHAO_EXCLUSIVE', entry.skillId!);
    });

    suite.test('判定失敗時 perform 回傳 null，不扣道具也不寫紀錄', () => {
        assert.equals(null, performLegendaryMentoring(input({ tickets: 0 })));
        assert.equals(null, performLegendaryMentoring(input({ usedGeneralIds: ['SPIRIT_ZHAO_01'] })));
    });

    return suite;
}
