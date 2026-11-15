#!/usr/bin/env node
'use strict';

// PROG-2-9101: task-lock.js lock --files 需同時接受空白與逗號（可混用）分隔。
// 以 node:assert 直接驗證 parseFiles 與 main 傳給 adapter.lock 的檔案清單。

const assert = require('assert');
const path = require('path');
const { parseFiles, main } = require(path.resolve(__dirname, '..', 'tools_node', 'task-lock.js'));

const cases = [
  {
    name: '空白分隔',
    argv: ['lock', 'PROG-2-9101', 'agent', '--files', 'a.ts', 'b.ts', 'c/d.ts'],
    expected: ['a.ts', 'b.ts', 'c/d.ts'],
  },
  {
    name: '逗號分隔',
    argv: ['lock', 'PROG-2-9101', 'agent', '--files', 'a.ts,b.ts,c/d.ts'],
    expected: ['a.ts', 'b.ts', 'c/d.ts'],
  },
  {
    name: '混用（空白與逗號）',
    argv: ['lock', 'PROG-2-9101', 'agent', '--files', 'a.ts,b.ts', 'c/d.ts', 'e.ts,f.ts'],
    expected: ['a.ts', 'b.ts', 'c/d.ts', 'e.ts', 'f.ts'],
  },
  {
    name: '去除空白、空字串與重複',
    argv: ['lock', 'PROG-2-9101', 'agent', '--files', ' a.ts , ,b.ts,,a.ts', ' ', 'b.ts'],
    expected: ['a.ts', 'b.ts'],
  },
  {
    name: '無 --files 時回傳空陣列',
    argv: ['lock', 'PROG-2-9101', 'agent'],
    expected: [],
  },
];

let failed = 0;
for (const testCase of cases) {
  try {
    assert.deepStrictEqual(parseFiles(testCase.argv), testCase.expected);
    console.log(`PASS parseFiles: ${testCase.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL parseFiles: ${testCase.name}`);
    console.error(error.message);
  }
}

// 端到端：main 把拆開後的檔案清單交給 adapter.lock，且每個條目獨立。
const lockCalls = [];
const fakeAdapter = {
  getDefaultAgentName: () => 'claude-code-haiku-5-5',
  lock: (taskId, agentName, files) => {
    lockCalls.push({ taskId, agentName, files });
  },
};
try {
  const exitCode = main(
    ['lock', 'PROG-2-9101', 'claude-code-haiku-5-5', '--files', 'tools_node/task-lock.js,tests/x.cjs', 'docs/y.md'],
    fakeAdapter,
  );
  assert.strictEqual(exitCode, 0);
  assert.strictEqual(lockCalls.length, 1);
  assert.deepStrictEqual(lockCalls[0].files, ['tools_node/task-lock.js', 'tests/x.cjs', 'docs/y.md']);
  console.log('PASS main lock: 混用寫法拆成多個條目');
} catch (error) {
  failed += 1;
  console.error('FAIL main lock: 混用寫法拆成多個條目');
  console.error(error.message);
}

if (failed > 0) {
  console.error(`${failed} 項失敗`);
  process.exit(1);
}
console.log('task-lock parseFiles 測試全部通過');
