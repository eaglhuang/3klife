const fs = require('fs');
const path = require('path');

const files = [
    'assets/scripts/tools/VfxComposerTool.ts',
    'assets/scripts/core/systems/EffectSystem.ts',
    'assets/scripts/battle/views/BattleSceneLoader.ts',
    'assets/scripts/core/config/vfx-usage-table.ts'
];

function updateImport(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Match both tools/vfx-block-registry and ./vfx-block-registry (if in tools)
    const oldPath = /['"](\.\.\/)*tools\/vfx-block-registry['"]|['"]\.\/vfx-block-registry['"]/g;
    
    const fileDir = path.dirname(path.resolve(filePath)).replace(/\\/g, '/');
    const targetPath = path.resolve('assets/scripts/core/config/vfx-block-registry').replace(/\\/g, '/');
    let relPath = path.relative(fileDir, targetPath).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) relPath = './' + relPath;
    
    const newContent = content.replace(oldPath, `'${relPath}'`);
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated import in: ${filePath}`);
    }
}

files.forEach(updateImport);

const files2 = [
    'assets/scripts/tools/VfxComposerTool.ts',
    'assets/scripts/core/systems/EffectSystem.ts'
];

function updateImport2(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const oldPath = /['"](\.\.\/)*tools\/vfx-usage-table['"]|['"]\.\/vfx-usage-table['"]/g;
    
    const fileDir = path.dirname(path.resolve(filePath)).replace(/\\/g, '/');
    const targetPath = path.resolve('assets/scripts/core/config/vfx-usage-table').replace(/\\/g, '/');
    let relPath = path.relative(fileDir, targetPath).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) relPath = './' + relPath;
    
    const newContent = content.replace(oldPath, `'${relPath}'`);
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated usage-table import in: ${filePath}`);
    }
}
files2.forEach(updateImport2);
