#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/** 唯一來源是 uid / is_virtual；模板 id 不參與身份判定。缺失或重複不得猜測。 */
function createHistoricalMap(persons) {
  if (!Array.isArray(persons)) throw new Error('registry persons 必須為陣列');
  const map = new Map();
  for (const person of persons) {
    if (!person || typeof person.uid !== 'string' || !person.uid.trim()) {
      throw new Error('registry 人物缺少 uid');
    }
    if (typeof person.is_virtual !== 'boolean') throw new Error(`${person.uid}: 缺少布林 is_virtual`);
    if (map.has(person.uid)) throw new Error(`${person.uid}: registry uid 重複`);
    map.set(person.uid, person.is_virtual === false);
  }
  return map;
}

function compareHistoricalFlags(generals, persons) {
  if (!Array.isArray(generals)) throw new Error('generals 必須為陣列');
  const historical = createHistoricalMap(persons);
  const errors = [];
  const ids = new Set();
  let trueCount = 0;
  let falseCount = 0;
  for (const general of generals) {
    if (!general || typeof general.id !== 'string' || !general.id.trim()) {
      errors.push('武將缺少 id');
      continue;
    }
    if (ids.has(general.id)) errors.push(`${general.id}: generals id 重複`);
    ids.add(general.id);
    if (typeof general.isHistorical !== 'boolean') errors.push(`${general.id}: 缺少布林 isHistorical`);
    else if (general.isHistorical) trueCount++;
    else falseCount++;
    if (!historical.has(general.id)) errors.push(`${general.id}: 找不到 registry uid`);
    else if (general.isHistorical !== historical.get(general.id)) errors.push(`${general.id}: 旗標與 registry 不一致`);
  }
  const registryOnlyHistorical = [...historical].filter(([uid, value]) => value && !ids.has(uid)).map(([uid]) => uid).sort();
  return { total: generals.length, trueCount, falseCount, registryOnlyHistorical, errors };
}

function main() {
  const dataDir = path.resolve(__dirname, '../assets/resources/data');
  const generals = JSON.parse(fs.readFileSync(path.join(dataDir, 'generals.json'), 'utf8'));
  const registry = JSON.parse(fs.readFileSync(path.join(dataDir, 'person-registry.json'), 'utf8'));
  const result = compareHistoricalFlags(generals, registry.persons);
  console.log(`總數: ${result.total}; true: ${result.trueCount}; false: ${result.falseCount}`);
  console.log(`registry 獨有史實人物 (${result.registryOnlyHistorical.length}): ${result.registryOnlyHistorical.join(', ')}`);
  for (const error of result.errors) console.error(error);
  if (result.errors.length) process.exitCode = 1;
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { createHistoricalMap, compareHistoricalFlags };
