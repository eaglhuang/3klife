
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/tools_errors_after_fix.json', 'utf8'));

data.forEach(file => {
    let lines = null;
    let modified = false;

    // We must sort messages by line and column descending so that earlier replacements don't shift columns!
    const msgs = file.messages.filter(msg => msg.ruleId === '@typescript-eslint/no-unused-vars' || msg.ruleId === 'no-unused-vars');
    msgs.sort((a, b) => {
        if (a.line !== b.line) return b.line - a.line;
        return b.column - a.column;
    });

    msgs.forEach(msg => {
        if (!lines) {
            lines = fs.readFileSync(file.filePath, 'utf8').split('\n');
        }
        const lineIdx = msg.line - 1;
        const colIdx = msg.column - 1;
        
        // Ensure the character at colIdx is actually part of the identifier
        const lineStr = lines[lineIdx];
        if (lineStr) {
            // we insert '_' at colIdx
            lines[lineIdx] = lineStr.slice(0, colIdx) + '_' + lineStr.slice(colIdx);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(file.filePath, lines.join('\n'), 'utf8');
    }
});
console.log('Precise auto-fix done.');

