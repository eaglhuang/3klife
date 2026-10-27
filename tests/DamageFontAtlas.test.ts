/**
 * DamageFontAtlas.test.ts — 傷害數字字型的貼圖必須存在
 *
 * 2026-05 的「歸檔未使用資產」誤刪了 dmgFont 的 *_0.png，戰場載入字型時 spriteFrame 全缺。
 * 每個 .fnt 的 page file 與 .fnt.meta 的 textureUuid 都要對得到貼圖。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const DIR = path.join(__dirname, '../assets/resources/dmgFont/bmfont');

export function createDamageFontAtlasSuite(): TestSuite {
    const suite = new TestSuite('DamageFontAtlas');

    suite.test('每個 .fnt 的貼圖檔存在且 uuid 與字型 meta 一致', () => {
        const fonts = fs.readdirSync(DIR).filter((f) => f.endsWith('.fnt'));
        assert.equals(true, fonts.length > 0, '應至少有一個傷害字型');
        for (const fnt of fonts) {
            const page = /page id=0 file="([^"]+)"/.exec(fs.readFileSync(path.join(DIR, fnt), 'utf8'))?.[1] ?? '';
            assert.equals(true, fs.existsSync(path.join(DIR, page)), `${fnt} 的貼圖 ${page} 應存在`);
            const textureUuid = JSON.parse(fs.readFileSync(path.join(DIR, `${fnt}.meta`), 'utf8')).userData?.textureUuid;
            const pngUuid = JSON.parse(fs.readFileSync(path.join(DIR, `${page}.meta`), 'utf8')).uuid;
            assert.equals(pngUuid, textureUuid, `${fnt} 的 textureUuid 應指向 ${page}`);
        }
    });

    return suite;
}
