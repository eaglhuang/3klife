// @spec-source → PROG-2-9049：工作樹不得以 junction 共用主目錄套件
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { findLinks, LINK_CANDIDATES } = require('../tools_node/check-worktree-links.js');

export function createCheckWorktreeLinksSuite(): TestSuite {
    const suite = new TestSuite('CheckWorktreeLinks');
    suite.test('掃描主目錄與 Cocos 外掛兩處套件目錄', () => {
        assert.isTrue(LINK_CANDIDATES.includes('node_modules'));
        assert.isTrue(LINK_CANDIDATES.includes('extensions/cocos-mcp-server/node_modules'));
    });
    suite.test('junction 被抓出；實體目錄不算；不跟進也不刪除目標', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-links-'));
        const target = path.join(root, 'main-node_modules');
        const linked = path.join(root, 'wt-linked');
        const real = path.join(root, 'wt-real');
        try {
            fs.mkdirSync(target); fs.writeFileSync(path.join(target, 'keep.txt'), 'x');
            fs.mkdirSync(linked); fs.symlinkSync(target, path.join(linked, 'node_modules'), 'junction');
            fs.mkdirSync(path.join(real, 'node_modules'), { recursive: true });
            const found = findLinks([linked, real]);
            assert.equals(1, found.length);
            assert.equals(path.join(linked, 'node_modules'), found[0].link);
            assert.isTrue(fs.existsSync(path.join(target, 'keep.txt')));
        } finally {
            // 先只拆連結本身，再刪暫存目錄，示範正確順序
            try { fs.unlinkSync(path.join(linked, 'node_modules')); } catch { fs.rmdirSync(path.join(linked, 'node_modules')); }
            fs.rmSync(root, { recursive: true, force: true });
        }
    });
    return suite;
}
