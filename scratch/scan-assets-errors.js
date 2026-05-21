/**
 * 只統計 assets/scripts/ 的 Errors，分類輸出
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log('掃描 assets/scripts/ 的 Errors...');
let raw;
try {
  raw = execSync('npx eslint assets/scripts --format json --no-error-on-unmatched-pattern', {
    encoding: 'utf8', maxBuffer: 50 * 1024 * 1024,
  });
} catch (e) { raw = e.stdout || ''; }

const j = raw.indexOf('['), k = raw.lastIndexOf(']');
const results = JSON.parse(raw.substring(j, k + 1));

// 分組分析
const importErrors = [];    // line:1 的 import 未使用
const catchErrors = [];     // catch 變數
const argErrors = [];       // 函式參數
const otherErrors = [];     // 其他

let total = 0;
for (const file of results) {
  const shortPath = file.filePath.replace(/^.*?assets[\\/]scripts[\\/]/, 'assets/scripts/');
  for (const msg of file.messages) {
    if (msg.severity !== 2) continue;
    total++;
    const rule = msg.ruleId || '';
    if (rule !== '@typescript-eslint/no-unused-vars') { otherErrors.push({ file: shortPath, line: msg.line, msg: msg.message }); continue; }
    const m = msg.message;
    if (/Allowed unused caught errors/.test(m)) catchErrors.push({ file: shortPath, line: msg.line, name: m.match(/'(.+?)'/)?.[1] });
    else if (/Allowed unused args/.test(m)) argErrors.push({ file: shortPath, line: msg.line, name: m.match(/'(.+?)'/)?.[1] });
    else importErrors.push({ file: shortPath, line: msg.line, name: m.match(/'(.+?)'/)?.[1] });
  }
}

console.log(`\n=== assets/scripts/ Errors: ${total} ===`);
console.log(`  unused import/var: ${importErrors.length}`);
console.log(`  catch 變數未加底線: ${catchErrors.length}`);
console.log(`  函式參數未加底線: ${argErrors.length}`);
console.log(`  其他規則: ${otherErrors.length}`);

// 輸出 import 問題（前50個）
console.log('\n── 未使用 import/var（前30）:');
for (const e of importErrors.slice(0, 30)) console.log(`  ${e.file}:${e.line} '${e.name}'`);

// 按檔案分組的 import 問題
const byFile = {};
for (const e of importErrors) {
  if (!byFile[e.file]) byFile[e.file] = [];
  byFile[e.file].push(e.name);
}
console.log('\n── 按檔案分組（前20檔）:');
const sorted = Object.entries(byFile).sort((a,b) => b[1].length - a[1].length).slice(0, 20);
for (const [f, names] of sorted) {
  console.log(`  ${f} → ${names.join(', ')}`);
}

console.log('\n── catch 需加底線:');
for (const e of catchErrors) console.log(`  ${e.file}:${e.line} catch (${e.name})`);

console.log('\n── 函式參數需加底線:');
for (const e of argErrors) console.log(`  ${e.file}:${e.line} ${e.name}`);

// 寫出完整 JSON 供後續使用
fs.writeFileSync('scratch/assets-errors.json', JSON.stringify({ importErrors, catchErrors, argErrors, otherErrors }, null, 2), 'utf8');
console.log('\n已寫入 scratch/assets-errors.json');
