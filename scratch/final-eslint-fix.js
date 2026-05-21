const fs = require('fs');

function fix(file, from, to) {
    if(!fs.existsSync(file)) return;
    let t = fs.readFileSync(file, 'utf8');
    t = t.replace(from, to);
    fs.writeFileSync(file, t, 'utf8');
}

// remove eslint-disable
fix('extensions/cocos-mcp-server/source/panels/default/index.ts', /\/\/ eslint-disable-next-line vue\/one-component-per-file\s*/g, '');
fix('tools_mcp/cocos-mcp-server/source/panels/default/index.ts', /\/\/ eslint-disable-next-line vue\/one-component-per-file\s*/g, '');
fix('tools_node/run-vfx-browser-qa.js', /\/\/ eslint-disable-next-line import\/no-dynamic-require\s*/g, '');

// fix eqeqeq
const files = [
  'tools_node/fix-badge-crop.js',
  'tools_node/fix-header-frame-crop.js',
  'tools_node/gen-ui-formal-assets.js',
  'tools_node/gen-ui-v6-clean-crop.js',
  'tools_node/gen-ui-v7-final-polish.js',
  'tools_node/gen-ui-v8-canonical-match.js',
  'tools_node/gen-ui-v9-finish-asset-pack.js',
  'tools_node/process-header-assets.js',
  'tools_node/process-individual-badges.js'
];
files.forEach(f => {
   fix(f, /process.argv\[2\] == '--test'/g, "process.argv[2] === '--test'");
   fix(f, /process.platform == 'darwin'/g, "process.platform === 'darwin'");
});
