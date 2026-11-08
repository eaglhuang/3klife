/**
 * 教官卡四大原型（FORM-04；PROG-2-2087；依特徵分流 PROG-2-2092）
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
    passiveEffects: [{ effect: 'TP_Bonus', value: 0.15, minStar: 0 }],
    tacticInspireEvents: [{ baseRate: 0.3 }],
    trainingSlotAffinity: ['str'],
    synergyPartners: [] as string[],
    synergyEventId: undefined as string | undefined,
};
const card = (patch: object) => ({ ...base, ...patch }) as unknown as SupportCardDef;

export function createMentorArchetypeSuite(): TestSuite {
    const suite = new TestSuite('MentorArchetype (教官卡四大原型 FORM-04 PROG-2-2087/2092)');

    suite.test('資源調度：體力減免或無專精設施', () => {
        assert.equals('RESOURCE', classifyMentorArchetype(card({ passiveEffects: [{ effect: 'VITALITY_SAVE', value: 0.25, minStar: 0 }] })));
        assert.equals('RESOURCE', classifyMentorArchetype(card({ trainingSlotAffinity: [] })));
    });

    suite.test('戰法大核：金戰法啟發率 ≥ 20% 或 TP 折扣 ≥ 30%', () => {
        assert.equals('SKILL_BANK', classifyMentorArchetype(card({ tacticInspireEvents: [{ baseRate: 0.2, bloodlineRequired: 'GUO' }] })));
        assert.equals('SKILL_BANK', classifyMentorArchetype(card({ passiveEffects: [{ effect: 'TP_Bonus', value: 0.3, minStar: 0 }] })));
        assert.equals('STAT_STICK', classifyMentorArchetype(card({ tacticInspireEvents: [{ baseRate: 0.19, bloodlineRequired: 'GUO' }] })));
        assert.equals('STAT_STICK', classifyMentorArchetype(card({ tacticInspireEvents: [{ baseRate: 0.4 }] })), '一般戰法啟發率高不算金戰法');
    });

    suite.test('集團體系：至少 2 位夥伴或有連動事件；只有 1 位夥伴不算', () => {
        assert.equals('GROUP', classifyMentorArchetype(card({ synergyPartners: ['SUP_A', 'SUP_B'] })));
        assert.equals('GROUP', classifyMentorArchetype(card({ synergyEventId: 'EV_TAOYUAN' })));
        assert.equals('STAT_STICK', classifyMentorArchetype(card({ synergyPartners: ['SUP_A'] })));
    });

    suite.test('屬性總值不影響判定；特徵重疊時依裁決順序', () => {
        assert.equals('STAT_STICK', classifyMentorArchetype(card({ statBonus: { int: 1 } })));
        assert.equals('RESOURCE', classifyMentorArchetype(card({ trainingSlotAffinity: [], synergyEventId: 'EV_TAOYUAN' })));
    });

    suite.test('每個原型都有說明、干預欄位與範例卡', () => {
        for (const id of MENTOR_ARCHETYPES) {
            const def = MENTOR_ARCHETYPE_DEFS[id];
            assert.equals(id, def.id);
            assert.isTrue(def.label.length > 0 && def.logic.length > 0 && def.example.length > 0);
            assert.isTrue(def.interventionFields.length > 0);
        }
    });

    suite.test('現有支援卡全部可分類：呂布是數值炮台、關羽是集團體系', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/resources/data/mentor-support-cards.json'), 'utf8'));
        const defs = [...parseSupportCatalog(raw).byGeneralId.values()];
        const counts = mentorArchetypeCounts(defs);
        assert.equals(defs.length, MENTOR_ARCHETYPES.reduce((sum, id) => sum + counts[id], 0));
        assert.isTrue(defs.length > 0);
        assert.equals('STAT_STICK', classifyMentorArchetype(defs.find((def) => def.name === '呂布')!));
        assert.equals('GROUP', classifyMentorArchetype(defs.find((def) => def.name === '關羽')!));
    });

    suite.test('裁決 2026-11-08 第 4 項：指定教官卡落在指定原型', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/resources/data/mentor-support-cards.json'), 'utf8'));
        const defs = [...parseSupportCatalog(raw).byGeneralId.values()];
        const expected: Array<[string, string]> = [
            ['荀彧', 'RESOURCE'], ['郭嘉', 'SKILL_BANK'], ['關羽', 'GROUP'], ['劉備', 'GROUP'], ['呂布', 'STAT_STICK'], ['張飛', 'STAT_STICK'],
        ];
        for (const [name, archetype] of expected) {
            assert.equals(archetype, classifyMentorArchetype(defs.find((def) => def.name === name)!), name);
        }
    });

    return suite;
}
