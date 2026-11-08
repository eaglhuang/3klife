/**
 * 教官卡四大原型（FORM-04；PROG-2-2087）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { SupportCardDef } from '../assets/scripts/core/models/MentorSupportSchema';
import { parseSupportCatalog } from '../assets/scripts/core/systems/MentorSupportCatalog';
import {
    classifyMentorArchetype, MENTOR_ARCHETYPE_DEFS, MENTOR_ARCHETYPES, mentorArchetypeCounts,
} from '../assets/scripts/core/systems/MentorArchetype';

const base = {
    statBonus: { str: 10, lea: 3 },
    tacticInspireEvents: [{}],
    trainingSlotAffinity: ['str'],
    synergyPartners: [] as string[],
    synergyEventId: undefined as string | undefined,
};
const card = (patch: Partial<typeof base>) => ({ ...base, ...patch }) as unknown as SupportCardDef;

export function createMentorArchetypeSuite(): TestSuite {
    const suite = new TestSuite('MentorArchetype (教官卡四大原型 FORM-04 PROG-2-2087)');

    suite.test('四原型判定：連動事件→集團、無專精→資源、多啟發低屬性→戰法、其餘→數值', () => {
        assert.equals('GROUP', classifyMentorArchetype(card({ synergyPartners: ['SUP_A'], synergyEventId: 'EV_TAOYUAN' })));
        assert.equals('RESOURCE', classifyMentorArchetype(card({ trainingSlotAffinity: [] })));
        assert.equals('SKILL_BANK', classifyMentorArchetype(card({ statBonus: { int: 3 }, tacticInspireEvents: [{}, {}, {}] } as never)));
        assert.equals('STAT_STICK', classifyMentorArchetype(card({})));
    });

    suite.test('只有夥伴、沒有連動事件不算集團型', () => {
        assert.equals('STAT_STICK', classifyMentorArchetype(card({ synergyPartners: ['SUP_A'] })));
    });

    suite.test('每個原型都有說明、干預欄位與範例卡', () => {
        for (const id of MENTOR_ARCHETYPES) {
            const def = MENTOR_ARCHETYPE_DEFS[id];
            assert.equals(id, def.id);
            assert.isTrue(def.label.length > 0 && def.logic.length > 0 && def.example.length > 0);
            assert.isTrue(def.interventionFields.length > 0);
        }
    });

    suite.test('現有支援卡全部可分類，分布總數等於卡數', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/resources/data/mentor-support-cards.json'), 'utf8'));
        const defs = [...parseSupportCatalog(raw).byGeneralId.values()];
        const counts = mentorArchetypeCounts(defs);
        assert.equals(defs.length, MENTOR_ARCHETYPES.reduce((sum, id) => sum + counts[id], 0));
        assert.isTrue(defs.length > 0);
    });

    return suite;
}
