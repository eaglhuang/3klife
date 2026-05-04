const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = path.resolve(__dirname, '../assets/scripts');
const OLD_LOGGER_PATH = 'ui/core/UCUFLogger';
const NEW_LOGGER_PATH = 'core/utils/UCUFLogger';

function walk(dir, callback) {
    fs.readdirSync(dir).forEach( f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

walk(SCRIPTS_DIR, (filePath) => {
    if (!filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Regex to match import ... from '...UCUFLogger'
    const importRegex = /from\s+(['"])(.*\/)UCUFLogger(['"])/g;

    content = content.replace(importRegex, (match, quote1, relDir, quote2) => {
        // Calculate the absolute path of the target file
        const fileDir = path.dirname(filePath);
        const targetAbsPath = path.resolve(fileDir, relDir + 'UCUFLogger');
        
        // Check if this import was indeed pointing to the old logger location
        // The old logger was at assets/scripts/ui/core/UCUFLogger
        // But since we moved it, we check if the path resolves to where it was OR where it is now.
        // Actually, just replacing any import that ends in UCUFLogger with a new relative path to assets/scripts/core/utils/UCUFLogger is safer.

        const newAbsPath = path.join(SCRIPTS_DIR, NEW_LOGGER_PATH);
        let newRelPath = path.relative(fileDir, newAbsPath).replace(/\\/g, '/');
        
        if (!newRelPath.startsWith('.')) {
            newRelPath = './' + newRelPath;
        }

        console.log(`Updating ${path.relative(SCRIPTS_DIR, filePath)}: ${match} -> from ${quote1}${newRelPath}${quote2}`);
        changed = true;
        return `from ${quote1}${newRelPath}${quote2}`;
    });

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
});
