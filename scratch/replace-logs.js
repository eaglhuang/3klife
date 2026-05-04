const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
const category = process.argv[3] || 'LogCategory.UI';

if (!targetDir) {
  console.error('Usage: node replace-logs.js <dir> <category>');
  process.exit(1);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('UCUFLogger.ts')) return;

  let changed = false;
  
  // Replace console calls
  const regex = /(?<!\w)console\.(log|warn|error|debug)\s*\(([\s\S]*?)\);/g;
  content = content.replace(regex, (match, level, args) => {
    changed = true;
    const method = level === 'log' ? 'info' : level;
    return `UCUFLogger.${method}(${category}, ${args});`;
  });

  // Ensure import
  if (content.includes('UCUFLogger') && !content.includes('import { UCUFLogger')) {
    const loggerPath = path.resolve('assets/scripts/ui/core/UCUFLogger').replace(/\\/g, '/');
    const fileDir = path.dirname(path.resolve(filePath)).replace(/\\/g, '/');
    let relPath = path.relative(fileDir, loggerPath).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) relPath = './' + relPath;
    
    const importLine = `import { UCUFLogger, LogCategory } from '${relPath}';\n`;
    content = importLine + content;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

walk(targetDir);
