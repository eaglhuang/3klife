const fs = require('fs');
const path = require('path');

const files = [
    'assets/scripts/ui/scenes/LobbyScene.ts',
    'assets/scripts/ui/scenes/LoadingScene.ts',
    'assets/scripts/battle/views/BattleSceneFlow.ts',
    'assets/scripts/battle/views/BattleScene.ts'
];

function update(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    const oldPaths = [
        /import (type )?{.*(BattleEntryParams|IBattleEntryParams|formatBattleEntryLog|DEFAULT_BATTLE_ENTRY_PARAMS).*} from ['"](\.\.\/)*battle\/models\/BattleEntryParams['"]/g,
        /import (type )?{.*(BattleEntryParams|IBattleEntryParams|formatBattleEntryLog|DEFAULT_BATTLE_ENTRY_PARAMS).*} from ['"](\.\.\/)*models\/BattleEntryParams['"]/g,
        /import (type )?{.*(BattleEntryParams|IBattleEntryParams|formatBattleEntryLog|DEFAULT_BATTLE_ENTRY_PARAMS).*} from ['"](\.\.\/)*shared\/interfaces\/IBattleEntryParams['"]/g
    ];

    const fileDir = path.dirname(path.resolve(filePath)).replace(/\\/g, '/');
    const targetPath = path.resolve('assets/scripts/shared/BattleEntryParams').replace(/\\/g, '/');
    let relPath = path.relative(fileDir, targetPath).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) relPath = './' + relPath;

    let changed = false;
    for (const regex of oldPaths) {
        const matches = content.match(regex);
        if (matches) {
            matches.forEach(match => {
                let newMatch = match.replace(/BattleEntryParams(?![A-Za-z])/g, 'IBattleEntryParams');
                newMatch = newMatch.replace(/from ['"].*['"]/, `from '${relPath}'`);
                content = content.replace(match, newMatch);
                changed = true;
            });
        }
    }

    if (changed) {
        content = content.replace(/(?<![A-Za-z])BattleEntryParams(?![A-Za-z])/g, 'IBattleEntryParams');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated import and usage in: ${filePath}`);
    }
}

files.forEach(update);
