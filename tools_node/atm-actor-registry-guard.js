'use strict';

/**
 * atm-actor-registry-guard.js
 *
 * 問題：ATM 框架每次有代理使用身分（上鎖、續租、adopt）時，都會重寫
 * `.atm/catalog/registry/actors.json`，把檔頭 `generatedAt` 與該身分的
 * `updatedAt` 改成現在時間。內容實質沒變，卻讓追蹤檔常駐未提交狀態，
 * 擋住 `git merge --ff-only` 同步，也讓多個 Agent 互相衝突。
 *
 * 作法（通用規則，不特判任何身分）：
 *   1. 行程開始時先快照 registry 的原始位元組。
 *   2. 行程結束時，若現況與快照只差 volatile 時間戳（頂層 generatedAt、
 *      各 actor 的 updatedAt），就把原始位元組寫回去，檔案不產生差異。
 *   3. 若有實質變化（新增身分、改 displayName、改 capabilities…），保留框架寫入的結果。
 *
 * 「最後使用時間」不再寫進追蹤檔；框架既有的 `.atm/runtime/identity/*`
 * 已在 .gitignore 內，會持續記錄 updatedAt。
 *
 * 上游問題說明見 PR 說明（writeActorRegistry 無條件寫檔）。
 *
 * 暫時解法：等 ATM 上游修好（寫檔前比對、忽略時間戳）並同步到本 repo 後，撤除本檔與 atm.mjs 的守衛。
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_RELATIVE_PATH = '.atm/catalog/registry/actors.json';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

/** 移除只會因使用而變動的時間戳欄位，回傳可比較的正規化文件。 */
function stripVolatileFields(doc) {
  const { generatedAt: _ignoredGeneratedAt, actors, ...rest } = doc || {};
  const normalizedActors = Array.isArray(actors)
    ? actors.map((actor) => {
        if (!actor || typeof actor !== 'object') return actor;
        const { updatedAt: _ignoredUpdatedAt, ...stable } = actor;
        return stable;
      })
    : actors;
  return { ...rest, actors: normalizedActors };
}

/** 兩份 registry 文字是否只差 volatile 時間戳（或僅差排版）。解析失敗一律視為有實質變化。 */
function isVolatileOnlyChange(beforeText, afterText) {
  let before;
  let after;
  try {
    before = JSON.parse(beforeText);
    after = JSON.parse(afterText);
  } catch {
    return false;
  }
  const left = JSON.stringify(canonicalize(stripVolatileFields(before)));
  const right = JSON.stringify(canonicalize(stripVolatileFields(after)));
  return left === right;
}

/**
 * 快照 registry；回傳一個 restore 函式。restore() 在只有時間戳變動時寫回原位元組，
 * 回傳 true 表示已還原，false 表示未動或有實質變化。
 */
function guardActorRegistry(repoRoot) {
  const registryPath = path.join(repoRoot, REGISTRY_RELATIVE_PATH);
  if (!fs.existsSync(registryPath)) {
    return () => false;
  }
  const originalBytes = fs.readFileSync(registryPath);
  return function restoreIfVolatileOnly() {
    if (!fs.existsSync(registryPath)) return false;
    const currentBytes = fs.readFileSync(registryPath);
    if (currentBytes.equals(originalBytes)) return false;
    if (!isVolatileOnlyChange(originalBytes.toString('utf8'), currentBytes.toString('utf8'))) {
      return false;
    }
    fs.writeFileSync(registryPath, originalBytes);
    return true;
  };
}

module.exports = {
  REGISTRY_RELATIVE_PATH,
  guardActorRegistry,
  isVolatileOnlyChange,
  stripVolatileFields,
};
