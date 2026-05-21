
const fs = require('fs');
const path = require('path');

function walk(dir, cb) {
    if(!fs.existsSync(dir)) return;
    const stat = fs.statSync(dir);
    if(stat.isFile()) return cb(dir);
    if(stat.isDirectory()) {
        fs.readdirSync(dir).forEach(child => walk(path.join(dir, child), cb));
    }
}

const dirs = ['extensions', 'tools_mcp', 'tools_node', 'tests', 'scripts', '.github', 'server', 'dump.js', 'scratch'];
dirs.forEach(d => walk(d, file => {
    if(!file.endsWith('.js') && !file.endsWith('.ts') && !file.endsWith('.json')) return;
    try {
        const buf = fs.readFileSync(file);
        if(buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
            fs.writeFileSync(file, buf.slice(3));
            console.log('stripped BOM: ' + file);
        }
    }catch(e){}
}));

console.log('BOM stripped.');

