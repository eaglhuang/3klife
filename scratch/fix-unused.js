
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/tools_errors.json', 'utf8'));

data.forEach(file => {
    let content = null;
    let lines = null;
    let modified = false;

    file.messages.forEach(msg => {
        if (msg.ruleId === '@typescript-eslint/no-unused-vars' || msg.ruleId === 'no-unused-vars') {
            const match = msg.message.match(/'([^']+)' is (defined|assigned a value) but never used/);
            if (match) {
                const varName = match[1];
                if (!content) {
                    content = fs.readFileSync(file.filePath, 'utf8');
                    lines = content.split('\n');
                }
                const lineIdx = msg.line - 1;
                if (lines[lineIdx]) {
                    // Match the word bound by non-word chars, but handle cases where it might be in an object pattern
                    const regex = new RegExp('\\\\b' + varName + '\\\\b');
                    if (regex.test(lines[lineIdx])) {
                        lines[lineIdx] = lines[lineIdx].replace(regex, '_' + varName);
                        modified = true;
                    }
                }
            }
        }
    });

    if (modified) {
        fs.writeFileSync(file.filePath, lines.join('\n'), 'utf8');
    }
});
console.log('Done auto-fixing unused vars.');

