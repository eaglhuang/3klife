/**
 * NpcContextKeys.test.ts — 核心武將的情境鍵清單（NPC-02 / PROG-2-1016）
 *
 * Unity 對照：像對 Localization 表做一次 Build 驗證：每位核心武將都有足夠的選項、
 * 鍵不重複、顯示文字不超過欄寬，並且張飛的選項確實來自本地關鍵字資料。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';

const CORE_GENERALS = ['liu-bei', 'guan-yu', 'zhang-fei', 'zhuge-liang', 'zhao-yun', 'cao-cao'];
const ALLOWED_CATEGORIES = ['event', 'person', 'location', 'item', 'creature'];
const MIN_KEYS_PER_GENERAL = 3;

interface ContextKeyRow {
    Context_Key: string;
    Category: string;
    Label: string;
    Max_Label_Chars: number;
    Source: string;
}

function readTable(): Record<string, { Content_Status: string; Context_Keys: ContextKeyRow[] }> {
    const raw = JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/npc-context-keys.json'), 'utf8'));
    return raw.Npc_Context_Keys;
}

export function createNpcContextKeysSuite(): TestSuite {
    const suite = new TestSuite('NpcContextKeys (NPC-02 情境鍵清單)');

    suite.test('六位核心武將都有至少 3 個情境鍵，且鍵在同一武將內不重複', () => {
        const table = readTable();
        for (const id of CORE_GENERALS) {
            const rows = table[id]?.Context_Keys ?? [];
            assert.isTrue(rows.length >= MIN_KEYS_PER_GENERAL, `${id} 情境鍵不足 ${MIN_KEYS_PER_GENERAL} 個`);
            const keys = rows.map((row) => row.Context_Key);
            assert.equals(keys.length, new Set(keys).size, `${id} 情境鍵重複`);
        }
    });

    suite.test('每個情境鍵的類別合法、顯示文字不超過欄寬、來源已標註', () => {
        const table = readTable();
        for (const id of CORE_GENERALS) {
            for (const row of table[id].Context_Keys) {
                assert.isTrue(ALLOWED_CATEGORIES.includes(row.Category), `${id}/${row.Context_Key} 類別不合法`);
                assert.isTrue([...row.Label].length <= row.Max_Label_Chars, `${id}/${row.Context_Key} 文字超出欄寬：${row.Label}`);
                assert.isTrue(row.Source === 'LOCAL_KEYWORD_OPTIONS' || row.Source === 'PROVISIONAL_DRAFT', `${id}/${row.Context_Key} 來源未標註`);
            }
        }
    });

    suite.test('張飛的情境鍵來自本地關鍵字資料，且含長坂橋；其他武將標為暫定草稿', () => {
        const table = readTable();
        const zhang = table['zhang-fei'];
        assert.equals('LOCAL_DATA', zhang.Content_Status);
        assert.isTrue(zhang.Context_Keys.some((row) => row.Context_Key === 'changban-bridge' && row.Source === 'LOCAL_KEYWORD_OPTIONS'));
        for (const id of CORE_GENERALS.filter((g) => g !== 'zhang-fei')) {
            assert.isTrue(table[id].Context_Keys.every((row) => row.Source === 'PROVISIONAL_DRAFT'), `${id} 應為暫定草稿`);
        }
    });

    return suite;
}
