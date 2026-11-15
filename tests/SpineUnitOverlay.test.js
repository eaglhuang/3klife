// 用最小引擎替身驗證同一接層的載入、步態同步、單挑與資源缺失退回。
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
class Node {
  constructor(name) { this.name = name; this.isValid = true; this.active = true; this.children = []; this.components = new Map(); }
  addChild(node) { node.parent = this; this.children.push(node); }
  addComponent(Type) { const component = new Type(); this.components.set(Type, component); return component; }
  getComponent(Type) { return this.components.get(Type) || null; }
  setPosition(x, y) { this.position = { x, y }; }
  setScale(x, y) { this.scale = { x, y }; }
  setSiblingIndex(index) { this.index = index; }
  destroy() { this.isValid = false; }
}
class Skeleton {
  constructor() { this.calls = []; this.timeScale = 1; }
  setAnimation(_track, name, loop) { this.calls.push({ name, loop }); }
  setSkin(name) { this.skin = name; }
}
class SkeletonData {}
const loadCounts = new Map();
const pendingLoads = new Map();
const dataFor = missing => ({ getRuntimeData: () => ({
  findAnimation: name => missing && name === 'fall' ? null : { name },
  findSkin: name => ({ name }),
}) });
const cc = {
  Node, UITransform: class {}, sp: { Skeleton, SkeletonData },
  resources: { load(path, _type, callback) {
    loadCounts.set(path, (loadCounts.get(path) || 0) + 1);
    if (path.startsWith('async')) { pendingLoads.set(path, callback); return; }
    callback(null, dataFor(path.includes('missing')));
  } },
};
Module._load = function(request, parent, isMain) {
  return request === 'cc' ? cc : originalLoad.apply(this, arguments);
};
require('ts-node').register({ project: require('node:path').resolve(__dirname, '../tsconfig.test.json'), transpileOnly: true });
const { SpineUnitOverlay } = require('../assets/scripts/battle/views/SpineGeneralOverlay');
const { generalSpineConfig, soldierSpineConfig } = require('../assets/scripts/battle/shared/UnitPresentationConfig');

(async () => {
  const root = new Node('root');
  const overlay = new SpineUnitOverlay(() => root, () => 1);
  const general = generalSpineConfig('zhao-yun');
  const soldier = soldierSpineConfig(false);
  assert.equal(overlay.sync('general', general, 0, 0, 1, false, 0), true);
  assert.equal(overlay.sync('soldier', soldier, 200, 0, -1, false, 0), true);
  const generalNode = root.children.find(node => node.name === 'SpineUnit_general');
  const soldierNode = root.children.find(node => node.name === 'SpineUnit_soldier');
  const generalSkel = generalNode.getComponent(Skeleton);
  const soldierSkel = soldierNode.getComponent(Skeleton);
  assert.equal(soldierSkel.skin, 'hand_mirror');
  overlay.sync('soldier', soldier, 218, 0, -1, true, 1);
  overlay.update(1);
  assert.equal(soldierSkel.timeScale, 1);
  assert.equal(soldierNode.position.x, 218 - 4 * 0.18);
  overlay.sync('soldier', soldier, 218, 0, 1, false, 0, false);
  overlay.update(0);
  assert.equal(soldierNode.active, false);
  overlay.sync('soldier', soldier, 200, 0, -1, false, 0);
  overlay.update(0);
  assert.equal(soldierNode.active, true);
  const duel = overlay.playDuel('general', 'soldier', 0, true, [
    { attacker: 0, dodged: true }, { attacker: 1, dodged: false },
  ]);
  await Promise.resolve(); await Promise.resolve();
  overlay.remove('soldier');
  assert.equal(overlay.exists('soldier'), true);
  let done = false; void duel.then(() => { done = true; });
  for (let i = 0; i < 300 && !done; i++) { overlay.update(0.1); await Promise.resolve(); }
  assert.equal(done, true);
  assert.ok(generalSkel.calls.some(call => call.name === 'dash_in'));
  assert.ok(generalSkel.calls.some(call => call.name === 'duel_attack'));
  assert.ok(generalSkel.calls.some(call => call.name === 'retreat'));
  assert.ok(soldierSkel.calls.some(call => call.name === 'dodge'));
  assert.ok(soldierSkel.calls.some(call => call.name === 'fall'));
  assert.equal(overlay.exists('soldier'), false);
  const missing = { ...soldier, path: 'missing' };
  assert.equal(overlay.sync('missing', missing, 0, 0, 1, false, 0), false);
  assert.equal(overlay.sync('missing', missing, 0, 0, 1, false, 0), false);
  assert.equal(loadCounts.get('missing'), 1);
  overlay.clear();
  assert.equal(generalNode.isValid, false);
  const asyncOverlay = new SpineUnitOverlay(() => root, () => 1);
  const asyncA = { ...general, path: 'async-a' }, asyncB = { ...general, path: 'async-b' };
  assert.equal(asyncOverlay.sync('a', asyncA, 0, 0, 1, false, 0), false);
  assert.equal(asyncOverlay.sync('b', asyncB, 200, 0, -1, false, 0), false);
  const asyncDuel = asyncOverlay.playDuel('a', 'b', null, false, [{ attacker: 0, dodged: false }]);
  pendingLoads.get('async-a')(null, dataFor(false));
  pendingLoads.get('async-b')(null, dataFor(false));
  let asyncDone = false; void asyncDuel.then(() => { asyncDone = true; });
  for (let i = 0; i < 300 && !asyncDone; i++) { await Promise.resolve(); asyncOverlay.update(0.1); }
  assert.equal(asyncDone, true);
  assert.ok(root.children.find(node => node.name === 'SpineUnit_a').getComponent(Skeleton).calls.some(call => call.name === 'duel_attack'));
  asyncOverlay.clear();
  const vertical = new SpineUnitOverlay(() => root, () => 1);
  vertical.sync('v1', general, 50, 0, 1, false, 0);
  vertical.sync('v2', general, 50, 100, -1, false, 0);
  const verticalDuel = vertical.playDuel('v1', 'v2', null, false, [{ attacker: 0, dodged: false }]);
  await Promise.resolve(); await Promise.resolve();
  for (let i = 0; i < 25; i++) vertical.update(0.1);
  const v1 = root.children.find(node => node.name === 'SpineUnit_v1');
  const v2 = root.children.find(node => node.name === 'SpineUnit_v2');
  assert.ok(Math.hypot(v1.position.x - v2.position.x, v1.position.y - v2.position.y) >= 75);
  vertical.clear(); await verticalDuel;
  const cancelOverlay = new SpineUnitOverlay(() => root, () => 1);
  cancelOverlay.sync('a', { ...general, path: 'async-c' }, 0, 0, 1, false, 0);
  cancelOverlay.sync('b', { ...general, path: 'async-d' }, 10, 0, -1, false, 0);
  const cancelled = cancelOverlay.playDuel('a', 'b', null, false, []);
  cancelOverlay.clear();
  await cancelled;
  pendingLoads.get('async-c')(null, dataFor(false));
  assert.equal(cancelOverlay.exists('a'), false);
  process.stdout.write('PASS 共用 Spine 接層：載入、步態、單挑、缺素材與清理（1 案）\n');
})().catch(error => { process.stderr.write(String(error.stack || error) + '\n'); process.exitCode = 1; });
