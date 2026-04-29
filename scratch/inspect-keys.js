const fs = require('fs');
const d = JSON.parse(fs.readFileSync('assets/resources/ui-spec/layouts/character-ds3-main.json', 'utf8'));
console.log('top keys:', Object.keys(d));
console.log('root type:', typeof d.root);
if (d.root) {
    console.log('root keys:', Object.keys(d.root));
    console.log('root.children len:', (d.root.children || []).length);
    if (d.root.children && d.root.children[0]) {
        console.log('first child keys:', Object.keys(d.root.children[0]));
        console.log('first child:', JSON.stringify(d.root.children[0], null, 2).slice(0, 500));
    }
}
