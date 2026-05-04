const fs = require('fs');
const path = require('path');

const battleDir = 'assets/scripts/battle';
const interfaceImport = "import { IBattleHUDLike, IBattleLogLike, IDuelChallengeLike, IResultPopupLike, IDeployRuntimeLike, IBattleScenePanelLike } from '../../shared/interfaces/IBattleUIComponents';";

function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath);
        } else if (entry.name.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('../../ui/')) return;

    let changed = false;
    
    // Remove UI imports
    const uiImportRegex = /import\s+.*?from\s+['"]\.\.\/\.\.\/ui\/.*?['"];?/g;
    if (uiImportRegex.test(content)) {
        content = content.replace(uiImportRegex, '');
        changed = true;
    }

    // Replace types
    const typeMap = {
        'BattleHUDComposite': 'IBattleHUDLike',
        'BattleLogComposite': 'IBattleLogLike',
        'DuelChallengePanel': 'IDuelChallengeLike',
        'ResultPopupComposite': 'IResultPopupLike',
        'DeployRuntimeApi': 'IDeployRuntimeLike',
        'DeployRuntimeLike': 'IDeployRuntimeLike',
        'BattleScenePanel': 'IBattleScenePanelLike'
    };

    for (const [oldType, newType] of Object.entries(typeMap)) {
        const regex = new RegExp(`(?<!['"])\\b${oldType}\\b`, 'g');
        if (regex.test(content)) {
            content = content.replace(regex, newType);
            changed = true;
        }
    }

    if (changed) {
        // Add shared interface import if not present
        if (!content.includes('IBattleUIComponents')) {
            // Calculate correct relative path to shared/interfaces/IBattleUIComponents
            const fileDir = path.dirname(path.resolve(filePath)).replace(/\\/g, '/');
            const targetPath = path.resolve('assets/scripts/shared/interfaces/IBattleUIComponents').replace(/\\/g, '/');
            let relPath = path.relative(fileDir, targetPath).replace(/\\/g, '/');
            if (!relPath.startsWith('.')) relPath = './' + relPath;
            
            const newImport = `import { IBattleHUDLike, IBattleLogLike, IDuelChallengeLike, IResultPopupLike, IDeployRuntimeLike, IBattleScenePanelLike } from '${relPath}';\n`;
            content = newImport + content;
        }
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed boundaries: ${filePath}`);
    }
}

walk(battleDir);
