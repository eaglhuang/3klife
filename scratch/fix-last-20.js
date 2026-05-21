const fs = require('fs');

function replace(file, search, rep) {
    if(!fs.existsSync(file)) return;
    let text = fs.readFileSync(file, 'utf8');
    text = text.replace(search, rep);
    fs.writeFileSync(file, text, 'utf8');
}

// prefer-const & unused
replace('extensions/cocos-mcp-server/TestScript.js', /let c =/g, 'const c =');
replace('tools_mcp/cocos-mcp-server/TestScript.js', /let c =/g, 'const c =');
replace('tools_node/dump-hud4.js', /let _eSideNode =/g, 'const _eSideNode =');
replace('tools_node/dump-hud4.js', /let _ePortrait =/g, 'const _ePortrait =');
replace('tools_node/lib/dom-to-ui/performance.js', /let _totalNodeCount =/g, 'const _totalNodeCount =');

// eqeqeq 
replace('tools_node/fix-badge-crop.js', /process.argv\[2\] == '--test'/g, "process.argv[2] === '--test'");
replace('tools_node/fix-header-frame-crop.js', /process.argv\[2\] == '--test'/g, "process.argv[2] === '--test'");
replace('tools_node/gen-ui-formal-assets.js', /process.argv\[2\] == '--test'/g, "process.argv[2] === '--test'");
replace('tools_node/gen-ui-v6-clean-crop.js', /process.argv\[2\] == '--test'/g, "process.argv[2] === '--test'");
replace('tools_node/gen-ui-v7-final-polish.js', /process.argv\[2\] == '--test'/g, "process.argv[2] === '--test'");
replace('tools_node/gen-ui-v8-canonical-match.js', /process.argv\[2\] == '--test'/g, "process.argv[2] === '--test'");
replace('tools_node/gen-ui-v9-finish-asset-pack.js', /process.argv\[2\] == '--test'/g, "process.argv[2] === '--test'");
replace('tools_node/process-header-assets.js', /process.argv\[2\] == '--test'/g, "process.argv[2] === '--test'");
replace('tools_node/process-individual-badges.js', /process.argv\[2\] == '--test'/g, "process.argv[2] === '--test'");

// unused vars
replace('tools_node/lib/dom-to-ui/draft-builder-core.js', /let fixedCount = 0;/g, 'let _fixedCount = 0;');
replace('tools_node/validate-generals-data.js', /let rarityThresholds =/g, 'const _rarityThresholds =');

// eslint-disable removals
replace('extensions/cocos-mcp-server/source/panels/default/index.ts', /\/\/ eslint-disable-next-line vue\/one-component-per-file\r?\n/g, '');
replace('tools_mcp/cocos-mcp-server/source/panels/default/index.ts', /\/\/ eslint-disable-next-line vue\/one-component-per-file\r?\n/g, '');
replace('tools_node/run-vfx-browser-qa.js', /\/\/ eslint-disable-next-line import\/no-dynamic-require\r?\n/g, '');

console.log('Fixed last 20 errors.');
