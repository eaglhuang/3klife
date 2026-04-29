const fs = require('fs');
const d = JSON.parse(fs.readFileSync('assets/resources/ui-spec/layouts/character-ds3-main.json', 'utf8'));
function walk(n, depth = 0, parent = '') {
    const txt = (n.props && (n.props.text || n.props.string)) || n.text || n.string || '';
    const t = n.type || '';
    if (txt || t === 'sprite' || t === 'label') {
        console.log(' '.repeat(depth) + `[${n.name}] type=${t} parent=${parent} text="${String(txt).slice(0, 60)}"`);
    }
    if (n.children) for (const c of n.children) walk(c, depth + 1, n.name);
}
walk(d.root);
