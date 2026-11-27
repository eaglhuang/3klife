/**
 * SpineUnitPool — 戰場 Spine 小兵節點物件池（PROG-2-9706）
 * 重點：被打過的單位回收後，下次取出必須是乾淨的（閃白歸零、顏色白、動作與造型還原）。
 */
import { assert, TestSuite } from './TestRunner';
import { SPINE_UNIT_POOL_MAX_PER_PATH, SpineUnitOverlay } from '../assets/scripts/battle/views/SpineGeneralOverlay';
import { battleTroopPreloadList, soldierSpineConfig } from '../assets/scripts/battle/shared/UnitPresentationConfig';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cc: Any = require('cc');

let siblingCalls = 0; // PROG-2-10155：計算兄弟索引重排次數
class FakeNode {
  public isValid = true; public active = true; public layer = 0; public parent: FakeNode | null = null;
  public children: FakeNode[] = []; public index = 0; public scale = { x: 1, y: 1 }; public position = { x: 0, y: 0 };
  private readonly components = new Map<unknown, unknown>();
  constructor(public name: string) {}
  addChild(node: FakeNode): void { node.parent = this; this.children.push(node); }
  getSiblingIndex(): number { return this.parent ? this.parent.children.indexOf(this) : 0; }
  addComponent(Type: new () => unknown): unknown { const c = new Type(); this.components.set(Type, c); return c; }
  getComponent(Type: unknown): Any { return this.components.get(Type) ?? null; }
  setPosition(x: number, y: number): void { this.position = { x, y }; }
  setScale(x: number, y: number): void { this.scale = { x, y }; }
  /** 與 Cocos 相同：在父節點 children 內真的移動位置 */
  setSiblingIndex(i: number): void {
    siblingCalls += 1;
    this.index = i;
    const list = this.parent?.children; if (!list) return;
    list.splice(list.indexOf(this), 1); list.splice(Math.max(0, Math.min(i, list.length)), 0, this);
  }
  destroy(): void { this.isValid = false; }
}
class FakeColor {
  static WHITE = new FakeColor(255, 255, 255, 255);
  constructor(public r = 255, public g = 255, public b = 255, public a = 255) {}
  set(r: number, g: number, b: number, a: number): void { this.r = r; this.g = g; this.b = b; this.a = a; }
}
class FakeVec4 {
  constructor(public x = 0, public y = 0, public z = 0, public w = 0) {}
  set(x: number, y: number, z: number, w: number): void { this.x = x; this.y = y; this.z = z; this.w = w; }
}
class FakeInstance { public flash = -1; setProperty(_n: string, v: FakeVec4): void { this.flash = v.x; } }
class FakeMaterial { initialize(): void { /* 測試替身 */ } }
class FakeEffectAsset {}
class FakeSkeleton {
  public timeScale = 1; public color: FakeColor = new FakeColor(); public skin = 'default'; public skeletonData: unknown = null;
  public customMaterial: unknown = null; public premultipliedAlpha = true; public tracksCleared = 0; public setupPoseCount = 0;
  public _materialCache: Record<string, FakeInstance> = { a: new FakeInstance(), b: new FakeInstance() };
  setAnimation(): { trackTime: number; delay: number } { return { trackTime: 0, delay: 0 }; }
  setSkin(name: string): void { this.skin = name; }
  clearTracks(): void { this.tracksCleared += 1; }
  setToSetupPose(): void { this.setupPoseCount += 1; }
  getCurrent(): null { return null; }
}
class FakeSkeletonData {}
let addRefs = 0, decRefs = 0;
const skeletonData = { addRef: () => { addRefs += 1; }, decRef: () => { decRefs += 1; }, getRuntimeData: () => ({ findAnimation: (name: string) => ({ name }), findSkin: (name: string) => ({ name }) }) };

/** 暫時把全域 cc 替身換成可驗疊層的版本，跑完還原，不影響其他 suite。 */
function withStub<T>(fn: () => T): T {
  const keys = ['Node', 'Color', 'Vec4', 'Material', 'EffectAsset', 'UITransform', 'sp', 'resources'];
  const saved: Record<string, unknown> = {};
  for (const k of keys) saved[k] = cc[k];
  cc.Node = FakeNode; cc.Color = FakeColor; cc.Vec4 = FakeVec4; cc.Material = FakeMaterial; cc.EffectAsset = FakeEffectAsset;
  cc.UITransform = class {}; cc.sp = { Skeleton: FakeSkeleton, SkeletonData: FakeSkeletonData };
  cc.resources = {
    load(path: string, _type: unknown, cb: (e: unknown, d: unknown) => void): void {
      if (path === 'effects/spine-hit-flash') cb(null, {});
      else if (path.startsWith('data/')) cb(null, null);
      else cb(null, skeletonData);
    },
  };
  try { return fn(); } finally { for (const k of keys) cc[k] = saved[k]; }
}

const flashesOf = (skel: FakeSkeleton): number[] => Object.values(skel._materialCache).map(i => i.flash);

export function createSpineUnitPoolSuite(): TestSuite {
  const suite = new TestSuite('SpineUnitPool (戰場 Spine 節點物件池 PROG-2-9706)');
  const squadCfg = soldierSpineConfig(false);
  const cfg = { ...squadCfg, squad: [] }; // 單人（無隊員）設定，節點數 = 單位數

  suite.test('被打到閃白的單位回收後，同 path 新單位重用同一節點且乾淨', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    assert.isTrue(overlay.sync('a', cfg, 0, 0, 1, false, 0, true, 1));
    overlay.update(0);
    const node = root.children.find(n => n.name === 'SpineUnit_a') as FakeNode;
    const skel = node.getComponent(cc.sp.Skeleton) as FakeSkeleton;
    assert.isTrue(skel.customMaterial instanceof FakeMaterial, '閃白材質已套上');
    // 打到閃白：強度 > 0、顏色與造型被弄髒
    assert.isTrue(overlay.hit('a', 6, true, 10));
    overlay.update(1 / 60);
    const painted = flashesOf(skel);
    assert.isTrue(painted.every(f => f > 0), '受擊閃白強度應大於 0，實際 ' + painted.join(','));
    skel.color = new FakeColor(255, 120, 110, 255); skel.timeScale = 0; skel.skin = 'hand_mirror';
    node.setScale(-0.5, 0.5);
    overlay.remove('a');
    assert.isFalse(overlay.exists('a'));
    assert.equals(1, overlay.pooledCount(cfg.path), '回收進池');
    assert.isFalse(node.active, '池內節點隱藏');
    assert.isTrue(node.isValid, '沒有被銷毀');
    // 新單位取同一節點
    assert.isTrue(overlay.sync('b', cfg, 0, 0, 1, false, 0, true, 1));
    assert.equals(0, overlay.pooledCount(cfg.path));
    const reused = root.children.find(n => n.name === 'SpineUnit_b');
    assert.isTrue(reused === node, '同 path 重用同一節點');
    assert.equals(1, root.children.length, '沒有多建節點');
    assert.isTrue(flashesOf(skel).every(f => f === 0), 'u_flash 應歸零，實際 ' + flashesOf(skel).join(','));
    assert.isTrue(skel.color.r === 255 && skel.color.g === 255 && skel.color.b === 255, '顏色為白');
    assert.equals(1, skel.timeScale, 'timeScale 已還原');
    assert.equals('default', skel.skin);
    assert.isTrue(skel.tracksCleared >= 1 && skel.setupPoseCount >= 1, '動作清空並回到初始姿勢');
    assert.isTrue(node.active, '取出後啟用');
    overlay.update(0);
    assert.isTrue(flashesOf(skel).every(f => f === 0), '再畫一格仍不殘留閃白');
    overlay.clear();
  }));

  suite.test('戰前預載（PROG-2-10078）：載好骨架、預建一整隊節點進池、單位上場直接取用', async () => {
    const root = new FakeNode('root');
    let overlay: SpineUnitOverlay = null as unknown as SpineUnitOverlay;
    addRefs = 0; decRefs = 0;
    await withStub(() => { overlay = new SpineUnitOverlay(() => root as Any, () => 1); return overlay.preload([squadCfg, squadCfg]); });
    assert.equals(1, overlay.preloadedCount(), '同路徑只載一份');
    assert.equals(1, addRefs, '持有一份引用');
    assert.equals(3, overlay.pooledCount(squadCfg.path), '帶頭者＋兩名隊員的節點已進池');
    assert.isTrue(root.children.every(n => !n.active), '池內節點隱藏');
  });

  suite.test('預載後單位上場從池取節點、不多建；clear 釋放預載引用', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    addRefs = 0; decRefs = 0;
    void overlay.preload([squadCfg]);
    const pooled = [...root.children];
    assert.equals(3, pooled.length);
    overlay.sync('p1', squadCfg, 0, 0, 1, false, 0, true, 3); overlay.update(0);
    assert.equals(3, root.children.length, '沒有多建節點');
    assert.isTrue(pooled.every(n => n.active), '取出後啟用');
    assert.equals(0, overlay.pooledCount(squadCfg.path));
    overlay.clear();
    assert.equals(1, decRefs, 'clear 釋放預載引用');
    assert.equals(0, overlay.preloadedCount());
  }));

  suite.test('預載載入失敗不標記失敗、也不拋錯', async () => {
    const root = new FakeNode('root');
    let overlay: SpineUnitOverlay = null as unknown as SpineUnitOverlay;
    await withStub(() => {
      overlay = new SpineUnitOverlay(() => root as Any, () => 1);
      cc.resources = { load: (_p: string, _t: unknown, cb: (e: unknown, d: unknown) => void) => cb(new Error('缺檔'), null) };
      return overlay.preload([squadCfg]);
    });
    assert.isFalse(overlay.hasFailed(squadCfg.path), '交給實際單位載入時再判斷後備');
    assert.equals(0, overlay.preloadedCount());
  });

  suite.test('預載清單：敵方取 AI 兵種池、我方取手牌，同素材只留一筆（PROG-2-10078）', () => {
    const list = battleTroopPreloadList(['cavalry', 'infantry', 'infantry'], [
      { unitType: 'Cavalry', tacticId: 'tiger-tally-cavalry' }, { unitType: 'infantry', tacticId: 'tiger-tally-xian-zhen' }, { unitType: '' }, {},
    ]);
    const key = (t: { troop: string; isEnemy: boolean }): string => `${t.isEnemy ? 'e' : 'p'}:${t.troop}`;
    assert.equals(['e:cavalry', 'e:infantry', 'p:cavalry', 'p:infantry'].join(), list.map(key).join(), '敵我各自一份、空卡略過');
    assert.equals('tiger-tally-xian-zhen', list.find(t => key(t) === 'p:infantry')?.tallyTemplateId, '精銳外觀模板 id 帶進來');
  });

  suite.test('小隊隊員一起回收與重用', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    overlay.sync('s1', squadCfg, 0, 0, 1, false, 0, true, 3); overlay.update(0);
    const nodes = [...root.children];
    assert.equals(3, nodes.length);
    overlay.hit('s1', 4, true, 0); overlay.update(1 / 60);
    overlay.remove('s1');
    assert.equals(3, overlay.pooledCount(squadCfg.path));
    overlay.sync('s2', squadCfg, 0, 0, 1, false, 0, true, 3); overlay.update(0);
    assert.equals(3, root.children.length, '隊員節點全數重用');
    assert.isTrue(nodes.every(n => root.children.includes(n)));
    for (const n of nodes) assert.isTrue(flashesOf(n.getComponent(cc.sp.Skeleton)).every(f => f === 0));
    overlay.clear();
  }));

  suite.test('池上限生效：超過的節點直接銷毀', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    const total = SPINE_UNIT_POOL_MAX_PER_PATH + 6;
    for (let i = 0; i < total; i += 1) overlay.sync('u' + i, cfg, 0, 0, 1, false, 0, true, 1);
    const all = [...root.children];
    assert.equals(total, all.length);
    for (let i = 0; i < total; i += 1) overlay.remove('u' + i);
    assert.equals(SPINE_UNIT_POOL_MAX_PER_PATH, overlay.pooledCount(cfg.path));
    assert.equals(6, all.filter(n => !n.isValid).length, '超出上限的被銷毀');
    overlay.clear();
  }));

  suite.test('clear 後池清空、池內節點全部銷毀；失效的池內節點被丟棄', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    overlay.sync('a', cfg, 0, 0, 1, false, 0, true, 1);
    overlay.sync('b', cfg, 0, 0, 1, false, 0, true, 1);
    const all = [...root.children];
    overlay.remove('a');
    assert.equals(1, overlay.pooledCount());
    overlay.clear();
    assert.equals(0, overlay.pooledCount());
    assert.isTrue(all.every(n => !n.isValid), 'clear 後沒有存活節點');
    // 場景切換：池內節點失效後不可再被取出
    const overlay2 = new SpineUnitOverlay(() => root as Any, () => 1);
    overlay2.sync('c', cfg, 0, 0, 1, false, 0, true, 1);
    const stale = root.children.find(n => n.name === 'SpineUnit_c') as FakeNode;
    overlay2.remove('c');
    stale.isValid = false; // 模擬父節點被銷毀連帶失效
    overlay2.sync('d', cfg, 0, 0, 1, false, 0, true, 1);
    const fresh = root.children.find(n => n.name === 'SpineUnit_d') as FakeNode;
    assert.isTrue(fresh !== stale && fresh.isValid, '失效節點被丟棄，改新建');
    overlay2.clear();
  }));

  suite.test('前後排序不把小兵塞到格子 buff 標記底下（PROG-2-9708）', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    overlay.sync('far', cfg, 0, 100, 1, false, 0, true, 1);
    overlay.sync('near', cfg, 0, -100, 1, false, 0, true, 1);
    overlay.update(0);
    const idx = (name: string) => root.children.findIndex(n => n.name === name);
    // 格子 buff 標記與揚塵建立時壓到 index 0
    const marker = new FakeNode('TileBuffMarker'); root.addChild(marker); marker.setSiblingIndex(0);
    const dust = new FakeNode('DeployDust'); root.addChild(dust); dust.setSiblingIndex(0);
    overlay.setGroundNodes(() => [marker as Any, dust as Any]);
    // 之後才部署的新小兵建立時會插到 index 0（實機行為），不能把地面層壓在下面
    overlay.sync('late', cfg, 0, 0, 1, false, 0, true, 1);
    root.children.find(n => n.name === 'SpineUnit_late')?.setSiblingIndex(0);
    for (let i = 0; i < 3; i += 1) overlay.update(1 / 60);
    assert.isTrue(idx('TileBuffMarker') < idx('SpineUnit_late'), '後部署的小兵也要在標記上面');
    assert.equals(0, idx('TileBuffMarker'), '標記在最底');
    assert.equals(1, idx('DeployDust'), '揚塵在標記之上');
    assert.isTrue(idx('TileBuffMarker') < idx('SpineUnit_far') && idx('TileBuffMarker') < idx('SpineUnit_near'), '標記要在小兵底下，實際順序 ' + root.children.map(n => n.name).join(','));
    assert.isTrue(idx('DeployDust') < idx('SpineUnit_far'), '揚塵要在小兵底下');
    assert.isTrue(idx('SpineUnit_far') < idx('SpineUnit_near'), '畫面下方（靠近鏡頭）的小兵蓋在上面');
    overlay.clear();
  }));

  suite.test('兄弟索引：順序沒變就不碰 setSiblingIndex；順序變了才重排且結果依落腳 y 由大到小', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    const ys: Record<string, number> = { a: 300, b: 200, c: 100, d: 150 };
    const sync = (): void => { for (const id of Object.keys(ys)) overlay.sync(id, cfg, 0, ys[id], 1, false, 0, true, 1); };
    sync(); overlay.update(0);
    const order = (): string => root.children.map(n => n.name.replace('SpineUnit_', '')).join('');
    const expected = (): string => Object.keys(ys).sort((p, q) => ys[q] - ys[p]).join('');
    assert.equals(expected(), order());
    siblingCalls = 0;
    for (let i = 0; i < 30; i++) { sync(); overlay.update(1 / 60); }
    assert.equals(0, siblingCalls, '順序沒變時 30 幀都不該呼叫 setSiblingIndex');
    assert.equals(expected(), order());
    // 兩個單位對調高度：必須重排
    ys.c = 260; ys.d = 20;
    sync(); overlay.update(1 / 60);
    assert.isTrue(siblingCalls > 0, '順序變了要重排');
    assert.equals(expected(), order());
    siblingCalls = 0;
    for (let i = 0; i < 10; i++) { sync(); overlay.update(1 / 60); }
    assert.equals(0, siblingCalls, '重排後再次穩定又不碰');
    // 移除單位：集合改變也要正確
    overlay.remove('a');
    overlay.update(1 / 60);
    assert.isTrue(!root.children.some(n => n.name === 'SpineUnit_a' && n.isValid && n.active), '移除的單位不在場上');
    overlay.clear();
  }));

  suite.test('兄弟索引：外部動過順序時，定期對齊（SORT_RESYNC_FRAMES）會拉回正確順序', () => withStub(() => {
    const root = new FakeNode('root');
    const overlay = new SpineUnitOverlay(() => root as Any, () => 1);
    overlay.sync('a', cfg, 0, 300, 1, false, 0, true, 1);
    overlay.sync('b', cfg, 0, 100, 1, false, 0, true, 1);
    overlay.update(0);
    const first = root.children[0];
    first.setSiblingIndex(1); // 外部把順序弄反
    for (let i = 0; i < 130; i++) overlay.update(1 / 60);
    assert.equals('SpineUnit_a', root.children[0].name, '定期對齊後恢復 y 由大到小');
    overlay.clear();
  }));

  return suite;
}
