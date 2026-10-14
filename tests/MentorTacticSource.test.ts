/**
 * MentorTacticSource — 戰場端 Mentor 戰法來源轉換（MENT-16，PROG-2-0612）回歸測試
 */
import { TestSuite, assert } from './TestRunner';
import { MentorTacticAdapter } from '../assets/scripts/battle/skills/adapters/MentorTacticAdapter';
import type { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { SkillSourceType, type CanonicalTacticDefinition } from '../assets/scripts/shared/SkillRuntimeContract';

const definitions = new Map<string, CanonicalTacticDefinition>([
    ['tac-seed', { id: 'tac-seed', battleSkillId: 'skill-seed' } as unknown as CanonicalTacticDefinition],
    ['tac-mentor', { id: 'tac-mentor', battleSkillId: 'skill-mentor' } as unknown as CanonicalTacticDefinition],
]);

function generalWith(slots: Array<{ slotId: string; tacticId: string; source: string }>): GeneralUnit {
    return { id: 'gen-test', tacticSlots: slots } as unknown as GeneralUnit;
}

export function createMentorTacticSourceSuite(): TestSuite {
    const suite = new TestSuite('MentorTacticSource (戰場 Mentor 來源 MENT-16)');

    suite.test('awakened 槽在第二格、未指定戰法時仍建出 Mentor 來源請求', () => {
        const general = generalWith([
            { slotId: 's1', tacticId: 'tac-seed', source: 'seed' },
            { slotId: 's2', tacticId: 'tac-mentor', source: 'awakened' },
        ]);
        const request = new MentorTacticAdapter(definitions).buildRequest(general, 'owner-1');
        assert.isTrue(request !== null, '應建出請求');
        assert.equals(SkillSourceType.Mentor, request?.sourceType ?? '');
        assert.equals('tac-mentor', request?.tacticId ?? '');
    });

    suite.test('指定的是普通種子戰法時不轉為 Mentor', () => {
        const general = generalWith([
            { slotId: 's1', tacticId: 'tac-seed', source: 'seed' },
            { slotId: 's2', tacticId: 'tac-mentor', source: 'awakened' },
        ]);
        const request = new MentorTacticAdapter(definitions).buildRequest(general, 'owner-1', { tacticId: 'tac-seed' });
        assert.isTrue(request === null, '普通戰法不應進入 Mentor 來源');
    });

    suite.test('沒有 awakened 槽時回傳 null', () => {
        const general = generalWith([{ slotId: 's1', tacticId: 'tac-seed', source: 'seed' }]);
        assert.isTrue(new MentorTacticAdapter(definitions).buildRequest(general, 'owner-1') === null);
    });

    suite.test('指定 awakened 戰法時轉為 Mentor 來源', () => {
        const general = generalWith([
            { slotId: 's1', tacticId: 'tac-seed', source: 'seed' },
            { slotId: 's2', tacticId: 'tac-mentor', source: 'awakened' },
        ]);
        const request = new MentorTacticAdapter(definitions).buildRequest(general, 'owner-1', { tacticId: 'tac-mentor' });
        assert.equals(SkillSourceType.Mentor, request?.sourceType ?? '');
    });

    return suite;
}
