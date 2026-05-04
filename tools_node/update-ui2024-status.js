const cp = require('child_process');
const path = require('path');

const target = path.join(__dirname, 'sync-task-briefs-from-cards.js');

console.warn('[update-ui2024-status] 已棄用；改委派給 sync-task-briefs-from-cards.js');
cp.execFileSync(process.execPath, [target, '--write', '--sync-progress', '--ids', 'UI-2-0024'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
});
