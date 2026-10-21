/**
 * SageRemarkLayout.test.ts — 結緣主介面名士批語分欄與求籤令入口（WBS ORAC-05 / PROG-2-1072）headless 測試
 *
 * Unity 對照：EditMode Test。文字與分欄是純函式；版面以讀 layout JSON 的方式鎖住節點 id。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { SageRemark } from '../assets/scripts/core/systems/SageRemarks';
import {
    oracleTokenText,
    sageRemarkColumnText,
    sageRemarkLineText,
    splitSageRemarkColumns,
} from '../assets/scripts/core/systems/SageRemarkLayout';

const ROOT = path.resolve(__dirname, '..');

function remark(sageId: string, color: SageRemark['color'], keyword: string | null): SageRemark {
    return { sageId, color, keyword, isDistorted: false };
}

function collectIds(node: unknown, out: Set<string>): void {
    if (!node || typeof node !== 'object') return;
    const record = node as { id?: string; children?: unknown[] };
    if (typeof record.id === 'string') out.add(record.id);
    for (const child of record.children ?? []) collectIds(child, out);
}

export function createSageRemarkLayoutSuite(): TestSuite {
    const suite = new TestSuite('SageRemarkLayout (ORAC-05 結緣批語分欄與求籤令入口 PROG-2-1072)');

    suite.test('批語依序交替分欄：第 1、3 句在左，第 2 句在右', () => {
        const remarks = [remark('zhuge-liang', 'blue', 'A'), remark('hua-tuo', 'red', 'B'), remark('xu-shao', 'white', null)];
        const columns = splitSageRemarkColumns(remarks);
        assert.equals(2, columns.left.length);
        assert.equals(1, columns.right.length);
        assert.equals('hua-tuo', columns.right[0].sageId);
    });

    suite.test('單句批語文字：有關鍵詞帶括號，沒有關鍵詞只列色系', () => {
        assert.equals('諸葛亮：藍（天機）', sageRemarkLineText(remark('zhuge-liang', 'blue', '天機')));
        assert.equals('諸葛亮：藍', sageRemarkLineText(remark('zhuge-liang', 'blue', null)));
    });

    suite.test('一欄的文字每句一行；空欄為空字串', () => {
        assert.equals('諸葛亮：藍\n華佗：紅', sageRemarkColumnText([remark('zhuge-liang', 'blue', null), remark('hua-tuo', 'red', null)]));
        assert.equals('', sageRemarkColumnText([]));
    });

    suite.test('求籤令數量文字：正整數照顯示，負數、NaN 視為 0，小數無條件捨去', () => {
        assert.equals('求籤令 ×3', oracleTokenText(3));
        assert.equals('求籤令 ×0', oracleTokenText(-1));
        assert.equals('求籤令 ×0', oracleTokenText(Number.NaN));
        assert.equals('求籤令 ×2', oracleTokenText(2.7));
    });

    suite.test('結緣版面有左右批語欄與底部求籤令入口，舊的單欄批語節點已移除', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/bonding-setup-main.json'), 'utf8')) as { root: unknown };
        const ids = new Set<string>();
        collectIds(layout.root, ids);
        for (const id of ['sageRemarkLeft', 'sageRemarkRight', 'oracleTokenLabel', 'btnOpenOracle', 'bondPanel']) {
            assert.isTrue(ids.has(id), `layout 缺少 ${id}`);
        }
        assert.isFalse(ids.has('sageRemarkLines'));
    });

    suite.test('LobbyScene 把求籤令數量接進結緣控制器', () => {
        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes('oracleTokens: () => services().session.oracleCount'));
    });

    return suite;
}
