const fs = require('fs');
const path = require('path');

const files = [
    'assets/scripts/ui/components/BattleHUDComposite.ts',
    'assets/scripts/ui/components/BattleHUD.ts',
    'assets/scripts/battle/views/BattleSkillTargetingFlow.ts',
    'assets/scripts/battle/views/BattleUIBridge.ts',
    'assets/scripts/shared/BattleSkillPresentation.ts'
];

function update(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (filePath.endsWith('BattleSkillPresentation.ts')) {
        content = content.replace(/import { Faction } from '\.\.\/\.\.\/core\/config\/Constants';/, "import { Faction } from './CommonEnums';");
        fs.writeFileSync(filePath, content, 'utf8');
        return;
    }

    // Match both relative and absolute-ish paths
    const oldPaths = [
        /['"](\.\.\/)*battle\/skills\/BattleSkillPresentation['"]/g,
        /['"]\.\.\/skills\/BattleSkillPresentation['"]/g
    ];
    
    const fileDir = path.dirname(path.resolve(filePath)).replace(/\\/g, '/');
    const targetPath = path.resolve('assets/scripts/shared/BattleSkillPresentation').replace(/\\/g, '/');
    let relPath = path.relative(fileDir, targetPath).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) relPath = './' + relPath;
    
    let changed = false;
    for (const regex of oldPaths) {
        const next = content.replace(regex, `'${relPath}'`);
        if (next !== content) {
            content = next;
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated import in: ${filePath}`);
    }
}

files.forEach(update);
