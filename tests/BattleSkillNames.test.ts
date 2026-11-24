/**
 * BattleSkillNames.test.ts — 戰場招式名走 i18n 的 headless 測試
 *
 * 鎖住：
 * - 每個可施放 battleSkillId（戰法表與奧義定義裡的 id）都能解出非 id 的招式名；
 * - 招式表每個 id 在四個語系都有 battle.skill_name.<id> 且有值；
 * - 趙雲奧義統一為「龍膽·破軍」；
 * - 未掛上 i18n 查詢時退回 battleSkillId（不影響純邏輯測試）。
 */
import { assert, TestSuite } from './TestRunner';
import {
    battleSkillNameKey,
    battleSkillPresentationIds,
    getBattleSkillPresentation,
    setBattleSkillNameTranslator,
} from '../assets/scripts/shared/BattleSkillPresentation';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'] as const;

function readJson<T>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf8')) as T;
}

function localeTable(locale: string): Record<string, string> {
    return readJson<Record<string, string>>(`assets/resources/i18n/${locale}.json`);
}

/** 所有可施放的 battleSkillId：戰法表（tactic-library）與奧義定義（ultimate-definitions） */
function castableSkillIds(): string[] {
    const tactics = readJson<{ data: { battleSkillId: string }[] }>('assets/resources/data/master/tactic-library.json').data;
    const ults = readJson<{ data: { battleSkillId: string }[] }>('assets/resources/data/master/ultimate-definitions.json').data;
    return Array.from(new Set([...tactics, ...ults].map((row) => row.battleSkillId))).sort();
}

export function createBattleSkillNamesSuite(): TestSuite {
    const suite = new TestSuite('BattleSkillNames (戰場招式名走 i18n)');

    suite.test('每個可施放 battleSkillId 都能解出非 id 的招式名（zh-TW）', () => {
        const zh = localeTable('zh-TW');
        setBattleSkillNameTranslator((key) => zh[key] ?? key);
        try {
            const ids = castableSkillIds();
            assert.isTrue(ids.length >= 41, `可施放 id 應至少 41 個，實際 ${ids.length}`);
            for (const id of ids) {
                const name = getBattleSkillPresentation(id).name;
                assert.isTrue(name.length > 0, `${id} 招式名為空`);
                assert.isTrue(name !== id, `${id} 招式名退回英文 id`);
            }
        } finally {
            setBattleSkillNameTranslator(null);
        }
    });

    suite.test('招式表每個 id 在四個語系都有 battle.skill_name.<id> 且有值', () => {
        const tables = LOCALES.map((locale) => ({ locale, table: localeTable(locale) }));
        for (const id of battleSkillPresentationIds()) {
            const key = battleSkillNameKey(id);
            for (const { locale, table } of tables) {
                const value = table[key];
                assert.isTrue(typeof value === 'string' && value.length > 0, `${locale} 缺 ${key}`);
            }
        }
    });

    suite.test('四個語系都能經由 translator 解出招式名（非 id、非鍵名）', () => {
        for (const locale of LOCALES) {
            const table = localeTable(locale);
            setBattleSkillNameTranslator((key) => table[key] ?? key);
            try {
                const name = getBattleSkillPresentation('zhou-yu-inferno').name;
                assert.equals(table[battleSkillNameKey('zhou-yu-inferno')], name, `${locale} 解析結果錯`);
            } finally {
                setBattleSkillNameTranslator(null);
            }
        }
    });

    suite.test('趙雲奧義統一為「龍膽·破軍」（定義、分鏡、戰鬥表一致）', () => {
        const zh = localeTable('zh-TW');
        setBattleSkillNameTranslator((key) => zh[key] ?? key);
        try {
            assert.equals('龍膽·破軍', getBattleSkillPresentation('zhao-yun-pierce').name);
        } finally {
            setBattleSkillNameTranslator(null);
        }
        const ult = readJson<{ data: { battleSkillId: string; name: string }[] }>('assets/resources/data/master/ultimate-definitions.json').data;
        const def = ult.find((row) => row.battleSkillId === 'zhao-yun-pierce');
        assert.equals('龍膽·破軍', def?.name);
        const cutin = readJson<{ skillName: string }>('assets/resources/data/ult-cutin/zhao_yun.json');
        assert.equals('龍膽·破軍', cutin.skillName);
    });

    suite.test('未掛上 translator 時招式名退回 battleSkillId（不拋錯）', () => {
        setBattleSkillNameTranslator(null);
        assert.equals('zhou-yu-inferno', getBattleSkillPresentation('zhou-yu-inferno').name);
    });

    return suite;
}
