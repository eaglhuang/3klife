/**
 * IterableSpreadGuard.test.ts — 禁止在 assets/scripts 展開 Set / Map / 迭代器（PROG-2-1080）
 *
 * Cocos 打包用 Babel 寬鬆模式：`[...new Set(x)]` 會被轉成 `[].concat(new Set(x))`，
 * 得到「裝著一個 Set 的陣列」。Node 跑單元測試是原生語法所以抓不到，實機卻壞掉
 * （例：宿命轉蛋永遠 pool-too-small，新玩家抽不到第一位武將）。請改用 Array.from(...)。
 * 展開 Set 變數（`[...seen]`）無法用文字比對抓到，可用
 * `tsc -p tsconfig.cc-check.json --noEmit --target es5` 找 TS2802 中屬於展開的位置。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const ROOT = path.join(__dirname, '../assets/scripts');
const PATTERN = /\.\.\.(new (Set|Map)\(|[A-Za-z_$][\w$.]*\.(values|keys|entries)\(\))/;

function walk(dir: string, out: string[]): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (entry.name.endsWith('.ts')) out.push(full);
    }
    return out;
}

export function createIterableSpreadGuardSuite(): TestSuite {
    const suite = new TestSuite('IterableSpreadGuard');

    suite.test('assets/scripts 不直接展開 Set/Map 或 .values()/.keys()/.entries()', () => {
        const hits: string[] = [];
        for (const file of walk(ROOT, [])) {
            fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
                if (PATTERN.test(line) && !/Object\.(values|keys|entries)\(/.test(line.match(PATTERN)![0])) {
                    hits.push(`${path.relative(ROOT, file)}:${i + 1}`);
                }
            });
        }
        assert.equals('', hits.join('\n'), '改用 Array.from(...)，Cocos 寬鬆模式會把展開轉成 [].concat');
    });

    return suite;
}
