import { TestSuite, assert } from './TestRunner';

// 結緣字串（PROG-2-0525 / BRD-14）。規格：結緣系統（配種）§H。
// Unity 對照：像 Localization Table 的單元測試，確認每個 key 存在、佔位符數量正確、代入後文字正確。

function readZhTw(): Record<string, string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const file = path.resolve(__dirname, '..', 'assets/resources/i18n/zh-TW.json');
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
}

/** 與 I18nSystem.t 相同的代入規則：依序替換 {0}、{1}… */
function fill(template: string, args: string[]): string {
    let out = template;
    args.forEach((arg, i) => { out = out.replace(`{${i}}`, arg); });
    return out;
}

const BREED_KEYS: Array<{ key: string; placeholders: number }> = [
    { key: 'ui.breed.confirm', placeholders: 4 },
    { key: 'ui.breed.preg_status', placeholders: 2 },
    { key: 'ui.breed.child_born', placeholders: 3 },
    { key: 'ui.breed.unveil_5', placeholders: 1 },
    { key: 'ui.breed.daqi', placeholders: 0 },
    { key: 'ui.breed.ep_display', placeholders: 2 },
];

export function createBreedingStringsSuite(): TestSuite {
    const suite = new TestSuite('BreedingStrings (BRD-14 結緣字串 6 組)');

    suite.test('六組結緣 key 都存在於 zh-TW 語系檔', () => {
        const table = readZhTw();
        for (const { key } of BREED_KEYS) {
            assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `缺少 ${key}`);
        }
    });

    suite.test('每個字串的佔位符數量與規格一致，且連號不跳號', () => {
        const table = readZhTw();
        for (const { key, placeholders } of BREED_KEYS) {
            const found = (table[key].match(/\{\d+\}/g) ?? []).length;
            assert.equals(placeholders, found, `${key} 佔位符數`);
            for (let i = 0; i < placeholders; i++) {
                assert.isTrue(table[key].includes(`{${i}}`), `${key} 缺 {${i}}`);
            }
        }
    });

    suite.test('UI_BREED_CONFIRM 代入後與規格一致（男 50、女 100 由參數帶入）', () => {
        const table = readZhTw();
        const text = fill(table['ui.breed.confirm'], ['周瑜', '50', '小喬', '100']);
        assert.equals('消耗 周瑜 精力 50 與 小喬 精力 100，確認結緣？', text);
    });

    suite.test('待產與誕下字串代入後與規格一致', () => {
        const table = readZhTw();
        assert.equals('小喬 已進入待產期，預計 4 季後誕下子嗣', fill(table['ui.breed.preg_status'], ['小喬', '4']));
        assert.equals('恭喜主公！周瑜 與 小喬 喜獲 男！', fill(table['ui.breed.child_born'], ['周瑜', '小喬', '男']));
    });

    suite.test('開獎、大器與 EP 顯示字串代入後與規格一致', () => {
        const table = readZhTw();
        assert.equals('天命開獎！曹丕 五維資質揭曉：', fill(table['ui.breed.unveil_5'], ['曹丕']));
        assert.equals('名士嘆：此子潛龍在淵，天機不可洩漏。', table['ui.breed.daqi']);
        assert.equals('預估爆發力：1200（A）', fill(table['ui.breed.ep_display'], ['1200', 'A']));
    });

    return suite;
}
