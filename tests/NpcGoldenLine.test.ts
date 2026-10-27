/**
 * NpcGoldenLine.test.ts — 核心武將錨點台詞不可覆蓋 headless 測試（NPC-07 / PROG-2-0948）
 *
 * 鎖住：Golden_Lines 內的台詞不會被生成結果取代；非錨點台詞可以被取代；
 * 錨點佔比以 20% 為上限；驗收樣本取自 npc-persona-cards.json 的真實核心武將卡。
 *
 * Unity 對照：像 [ReadOnly] 欄位加一道 OnValidate 守門，寫入時先檢查，受保護的值不被改掉。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { validateNpcPersonaCards, type NpcPersonaCard } from '../assets/scripts/core/systems/NpcPersonaCard';
import { anchorShareOk, GOLDEN_LINE_MAX_SHARE, isGoldenLine, protectGoldenLine } from '../assets/scripts/core/systems/NpcGoldenLine';

const CARDS_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'npc-persona-cards.json');

function loadCards(): Record<string, NpcPersonaCard> {
    const raw = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8')) as { Npc_Persona_Cards: Record<string, NpcPersonaCard> };
    return raw.Npc_Persona_Cards;
}

export function createNpcGoldenLineSuite(): TestSuite {
    const suite = new TestSuite('NpcGoldenLine (錨點台詞不可覆蓋 NPC-07 / PROG-2-0948)');

    suite.test('驗收樣本：張飛的錨點台詞「燕人張翼德在此！」不被中台結果取代', () => {
        const zhangFei = loadCards()['zhang-fei'];
        assert.isTrue(zhangFei.Golden_Lines.includes('燕人張翼德在此！'));
        const kept = protectGoldenLine(zhangFei.Golden_Lines, '燕人張翼德在此！', '俺就是張飛！');
        assert.equals('燕人張翼德在此！', kept);
    });

    suite.test('非錨點台詞可以被取代', () => {
        const zhangFei = loadCards()['zhang-fei'];
        const replaced = protectGoldenLine(zhangFei.Golden_Lines, '此事俺記下了。', '此事俺記下了，待有眉目再說。');
        assert.equals('此事俺記下了，待有眉目再說。', replaced);
    });

    suite.test('資料檔仍通過人格卡驗證（守門不改變結構）', () => {
        const raw = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));
        const result = validateNpcPersonaCards(raw);
        assert.isTrue(result.ok, JSON.stringify(result.issues));
    });

    suite.test('錨點佔比：20% 以內通過；超過、總數為 0、數值不合理都不通過', () => {
        assert.isTrue(anchorShareOk(1, 5), '1/5 = 20% 應通過');
        assert.isTrue(!anchorShareOk(2, 5), '2/5 = 40% 應不通過');
        assert.isTrue(!anchorShareOk(0, 0), '總數為 0 不通過');
        assert.isTrue(!anchorShareOk(-1, 5), '負數不通過');
        assert.isTrue(!anchorShareOk(6, 5), '錨點超過總數不通過');
        assert.equals(0.2, GOLDEN_LINE_MAX_SHARE);
    });

    suite.test('isGoldenLine：只有完全相同的字串才算錨點', () => {
        assert.isTrue(isGoldenLine(['燕人張翼德在此！'], '燕人張翼德在此！'));
        assert.isTrue(!isGoldenLine(['燕人張翼德在此！'], '燕人張翼德在此'));
    });

    return suite;
}
