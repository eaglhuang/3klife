#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { TextDecoder } = require('util');

const files = process.argv.slice(2).reduce((result, argument, index, argv) => {
  if (argument === '--files') {
    result.push(...argv[index + 1].split(/[,;]/).map((value) => value.trim()).filter(Boolean));
  }
  return result;
}, []);

if (files.length === 0) {
  console.error('Usage: node tools_node/validate-skill-encoding.js --files <path>[,<path>...]');
  process.exit(2);
}

const decoder = new TextDecoder('utf-8', { fatal: true });
const c2 = String.fromCharCode(0x00c2);
const c3 = String.fromCharCode(0x00c3);
const e2 = String.fromCharCode(0x00e2);
const ef = String.fromCharCode(0x00ef);
const mojibake = new RegExp('(?:' + c3 + '[\\u0080-\\u00bf]|' + c2 + '[\\u0080-\\u00bf]|' + e2 + '\\u0080[\\u0080-\\u00bf]|' + ef + '\\u00bb\\u00bf)');let failed = false;

for (const file of files) {
  const bytes = fs.readFileSync(file);
  const hasBom = bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]));
  let text = '';
  let validUtf8 = true;
  try {
    text = decoder.decode(bytes);
  } catch {
    validUtf8 = false;
  }
  const hasReplacement = text.includes('\uFFFD');
  const hasMojibake = mojibake.test(text);
  const ok = validUtf8 && !hasBom && !hasReplacement && !hasMojibake;
  console.log(JSON.stringify({ file, bytes: bytes.length, validUtf8, hasBom, hasReplacement, hasMojibake, ok }));
  failed ||= !ok;
}

process.exit(failed ? 1 : 0);
