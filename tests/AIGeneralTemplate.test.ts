/**
 * AIGeneralTemplate — AI 武將模板 9 個資料可載入、id 對位（AIS-04；PROG-2-1926）
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { findAIGeneralTemplate, validateAIGeneralTemplates, type AIGeneralTemplate } from '../assets/scripts/core/systems/AIGeneralTemplate';

function readJson(rel: string): any {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data', rel), 'utf8'));
}

export function createAIGeneralTemplateSuite(): TestSuite {
    const suite = new TestSuite('AIGeneralTemplate (AI 武將模板 AIS-04 PROG-2-1926)');

    const templates = readJson('ai-general-templates.json').templates as AIGeneralTemplate[];
    const generalIds = new Set<string>((readJson('generals-index.json').data as Array<{ uid: string }>).map((g) => g.uid));
    const tacticIds = new Set<string>(Object.keys(readJson('tactic-counter-tags.json').tags));

    suite.test('正式資料：9 個模板全部通過驗證', () => {
        assert.equals(9, templates.length);
        assert.equals('', validateAIGeneralTemplates(templates, generalIds, tacticIds).join('；'));
        const lvbu = findAIGeneralTemplate(templates, 'AI_LVBU');
        assert.equals(1.5, lvbu?.Custom_Difficulty_Mod);
        assert.equals('CAVALRY_RUSH', lvbu?.Profile_ID);
        assert.equals(null, findAIGeneralTemplate(templates, 'AI_NOPE'));
    });

    suite.test('壞資料：重複 id、未知 Profile、未登錄武將與戰法、非正數修正都會被擋', () => {
        const base = templates[0];
        const bad = [
            base,
            { ...base, Profile_ID: 'RANDOM' as never, General_ID: 'nobody', Exclusive_Tactics: ['TAC_NOPE'], Custom_Difficulty_Mod: 0 },
        ];
        const errors = validateAIGeneralTemplates(bad, generalIds, tacticIds);
        assert.equals(5, errors.length);
    });

    return suite;
}
