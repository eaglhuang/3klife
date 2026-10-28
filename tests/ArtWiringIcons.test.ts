/**
 * ArtWiringIcons.test.ts — 武將人物介面美術接線清單 icon 槽位檢核（GDART-10，PROG-2-1386）
 *
 * 鎖住：icon 路徑能被正確抓出並去重；格式錯誤（.. / 反斜線 / 空白）判失敗；
 * 未落地的圖只列缺口、不判失敗；真實規格檔可解析出槽位。
 * Unity 對照：像 Addressables 的 Build 前檢查，列出哪些 Sprite 還沒匯入、路徑寫錯就直接報錯。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
const artWiring: {
    parseArtWiringIconSlots: (markdown: string) => string[];
    checkArtWiringIcons: (markdown: string, resolveImage: (slot: string) => boolean) => {
        slots: string[];
        malformed: string[];
        missing: string[];
    };
    makeResourceResolver: (root: string, existsSync: (path: string) => boolean) => (slot: string) => boolean;
} = require('../tools_node/validate-art-wiring');

const REAL_SPEC_PATH = join(__dirname, '..', 'docs', '遊戲規格文件', '系統規格書', '武將人物介面美術接線清單.md');

const SAMPLE = [
    '| `StrValue` | label | L5-2 | `sprites/ui/general-detail/icon_str/spriteFrame` | `str` | 武力 |',
    '| `IntValue` | label | L5-2 | `sprites/ui/general-detail/icon_int/spriteFrame` | `int` | 智力 |',
    '| `StrHint` | label | L5-2 | `sprites/ui/general-detail/icon_str/spriteFrame` | `str` | 重複 |',
    '| `Bg` | sprite | L0 | `sprites/common/popup_card_bg` | — | 非 icon，不算槽位 |',
].join('\n');

function assertJson(expected: unknown, actual: unknown): void {
    assert.equals(JSON.stringify(expected), JSON.stringify(actual));
}

export function createArtWiringIconsSuite(): TestSuite {
    const suite = new TestSuite('ArtWiringIcons (美術接線 icon 槽位 GDART-10)');

    suite.test('只抓 spriteFrame 路徑並依出現順序去重', () => {
        const slots = artWiring.parseArtWiringIconSlots(SAMPLE);
        assertJson(slots, [
            'sprites/ui/general-detail/icon_str/spriteFrame',
            'sprites/ui/general-detail/icon_int/spriteFrame',
        ]);
    });

    suite.test('圖檔未落地只列缺口，不判失敗', () => {
        const result = artWiring.checkArtWiringIcons(SAMPLE, (slot) => slot.includes('icon_str'));
        assertJson(result.malformed, []);
        assertJson(result.missing, ['sprites/ui/general-detail/icon_int/spriteFrame']);
    });

    suite.test('格式錯誤的路徑判為 malformed（.. / 反斜線 / 空白）', () => {
        const bad = [
            '`sprites/ui/../secret/spriteFrame`',
            '`sprites/ui\\icon/spriteFrame`',
            '`sprites/ui/icon x/spriteFrame`',
        ].join('\n');
        const result = artWiring.checkArtWiringIcons(bad, () => true);
        assert.equals(3, result.malformed.length);
        assertJson(result.missing, []);
    });

    suite.test('resource resolver 依 png/jpg/webp 找圖並去掉 spriteFrame 後綴', () => {
        const existing = new Set(['/res/sprites/ui/a/icon.webp']);
        const resolve = artWiring.makeResourceResolver('/res', (p) => existing.has(p));
        assert.isTrue(resolve('sprites/ui/a/icon/spriteFrame'));
        assert.isFalse(resolve('sprites/ui/a/other/spriteFrame'));
    });

    suite.test('真實規格檔可解析出 icon 槽位，且沒有格式錯誤', () => {
        const markdown = readFileSync(REAL_SPEC_PATH, 'utf8');
        const result = artWiring.checkArtWiringIcons(markdown, () => true);
        assert.isTrue(result.slots.length > 0);
        assertJson(result.malformed, []);
    });

    return suite;
}
