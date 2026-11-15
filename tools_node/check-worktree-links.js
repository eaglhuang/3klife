// @spec-source → PROG-2-9100：工作樹不得以 junction／symlink 共用主目錄套件。
// 掃描所有 git 工作樹，列出指向本 repo 以外位置的 node_modules 連結。
// 這種連結遇到「自動清理工作樹」（Codex app、封存 Claude session、git worktree remove --force）
// 會被遞迴穿透，把主目錄 node_modules 整個清空（2026-11-16 實際發生）。
// 用法：node tools_node/check-worktree-links.js [--json]；有連結時 exit 1。
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

/** 會被共用的套件目錄：主目錄與 Cocos 外掛各一份 */
const LINK_CANDIDATES = ['node_modules', 'extensions/cocos-mcp-server/node_modules'];

function listWorktrees(cwd) {
    const out = cp.execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd, encoding: 'utf8' });
    return out.split(/\r?\n/).filter((l) => l.startsWith('worktree ')).map((l) => l.slice('worktree '.length).trim());
}

/** 只用 lstat 判斷，不跟進連結，也不讀取目標內容 */
function findLinks(worktrees) {
    const found = [];
    for (const wt of worktrees) {
        for (const rel of LINK_CANDIDATES) {
            const p = path.join(wt, rel);
            let st;
            try { st = fs.lstatSync(p); } catch { continue; }
            if (!st.isSymbolicLink()) continue; // Windows junction 在 Node 也回報為 symbolic link
            let target = '';
            try { target = fs.readlinkSync(p); } catch { /* 目標讀不到仍算危險連結 */ }
            found.push({ worktree: wt, link: p, target });
        }
    }
    return found;
}

if (require.main === module) {
    const links = findLinks(listWorktrees(process.cwd()));
    if (process.argv.includes('--json')) {
        console.log(JSON.stringify({ links }, null, 2));
    } else if (links.length === 0) {
        console.log('沒有工作樹以連結共用套件目錄。');
    } else {
        console.log(`發現 ${links.length} 個套件目錄連結（自動清理工作樹時會清空連結目標）：`);
        for (const l of links) console.log(`  ${l.link} -> ${l.target || '(無法讀取)'}`);
        console.log('拆除方式（只刪連結本身）：PowerShell 單獨執行 (Get-Item -LiteralPath <連結>).Delete()，');
        console.log('確認 Test-Path 為 False 後，在工作樹內改用 npm ci --prefer-offline。');
    }
    process.exitCode = links.length > 0 ? 1 : 0;
}

module.exports = { LINK_CANDIDATES, findLinks, listWorktrees };
