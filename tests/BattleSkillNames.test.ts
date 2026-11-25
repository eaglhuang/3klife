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
    battleSkillCategoryIds,
    battleSkillCategoryKey,
    battleSkillEffectKey,
    battleSkillNameKey,
    battleSkillPresentationIds,
    getBattleSkillPresentation,
    setBattleSkillNameTranslator,
} from '../assets/scripts/shared/BattleSkillPresentation';

const CJK_IDEOGRAPH = /[一-鿿]/;

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

    suite.test('效果說明與類別標籤鍵四語系齊全（含 fallback）', () => {
        for (const locale of LOCALES) {
            const table = localeTable(locale);
            for (const id of battleSkillPresentationIds()) {
                const key = battleSkillEffectKey(id);
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺 ${key}`);
            }
            for (const cat of battleSkillCategoryIds()) {
                const key = battleSkillCategoryKey(cat);
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺 ${key}`);
            }
            assert.isTrue(typeof table['battle.skill_effect.fallback'] === 'string', `${locale} 缺 battle.skill_effect.fallback`);
        }
    });

    suite.test('四語系效果說明與類別標籤都解得出；zh-CN／en／ja 效果不同於 zh-TW；en 無漢字殘留', () => {
        const zh = localeTable('zh-TW');
        for (const locale of LOCALES) {
            const table = localeTable(locale);
            setBattleSkillNameTranslator((key) => table[key] ?? key);
            try {
                for (const id of battleSkillPresentationIds()) {
                    const p = getBattleSkillPresentation(id);
                    assert.isTrue(p.effectStatus.length > 0 && p.categoryTag.length > 0, `${locale} ${id} 效果或類別為空`);
                    if (locale !== 'zh-TW') {
                        assert.isTrue(p.effectStatus !== zh[battleSkillEffectKey(id)], `${locale} ${id} 效果與 zh-TW 相同`);
                    }
                    if (locale === 'en') {
                        assert.isTrue(!CJK_IDEOGRAPH.test(p.effectStatus), `en ${id} 效果殘留漢字：${p.effectStatus}`);
                        assert.isTrue(!CJK_IDEOGRAPH.test(p.categoryTag), `en ${id} 類別殘留漢字：${p.categoryTag}`);
                    }
                }
            } finally {
                setBattleSkillNameTranslator(null);
            }
        }
    });

    suite.test('zh-TW 效果說明與類別維持原文（顯示不變）', () => {
        const zh = localeTable('zh-TW');
        setBattleSkillNameTranslator((key) => zh[key] ?? key);
        try {
            const inferno = getBattleSkillPresentation('zhou-yu-inferno');
            assert.equals('火攻', inferno.categoryTag);
            assert.equals('【火攻】周瑜炎陣：點燃敵軍所在格', inferno.effectStatus);
            assert.equals('【無敵】白馬銀槍·不滅：全屏範圍攻擊，獲得 1 回合無敵，全體士氣拉滿', getBattleSkillPresentation('zhao-yun-immortal').effectStatus);
        } finally {
            setBattleSkillNameTranslator(null);
        }
    });

    suite.test('未掛上 translator 時類別與效果退回繁中原文（純邏輯測試不受影響）', () => {
        setBattleSkillNameTranslator(null);
        const p = getBattleSkillPresentation('sow-discord');
        assert.equals('離間', p.categoryTag);
        assert.equals('離間', p.categoryZh);
        const unknown = getBattleSkillPresentation('no-such-skill');
        assert.equals('【戰術】no-such-skill 生效', unknown.effectStatus);
        assert.equals('戰術', unknown.categoryZh);
    });

    return suite;
}
