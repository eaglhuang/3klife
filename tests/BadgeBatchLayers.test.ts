/**
 * BadgeBatchLayers.test.ts — 部隊頭頂徽章分層合批（PROG-2-9713）
 * 底框／圓章進 bg 層、文字進 text 層（BITMAP 點陣快取）、圖示進 icon 層；徽章節點銷毀時代理一併清除。
 */
import * as fs from 'fs';
import * as path from 'path';
import { Node } from 'cc';
import { TestSuite, assert } from './TestRunner';
import { BadgeBatchLayers } from '../assets/scripts/battle/views/BadgeBatchLayers';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

/** 測試用 cc stub 的 Node 沒有樹狀 API；這裡暫時補上最小行為，測完還原，不影響其他測試 */
function withNodeApi(fn: () => void): void {
    const proto = (Node as unknown as { prototype: Record<string, unknown> }).prototype;
    const added: string[] = [];
    const def = (k: string, v: unknown): void => { if (!(k in proto)) { proto[k] = v; added.push(k); } };
    def('addChild', function (this: any, c: any) { c.parent = this; this.children.push(c); });
    def('destroy', function (this: any) {
        if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
        this.parent = null; this._destroyed = true; return true;
    });
    def('setPosition', function (this: any, p: any) { this._pos = p; });
    def('setScale', function (this: any, p: any) { this._scale = p; });
    def('getSiblingIndex', function (this: any) { return this.parent ? this.parent.children.indexOf(this) : 0; });
    def('setSiblingIndex', function () { /* stub */ });
    const getters: Array<[string, (this: any) => unknown]> = [
        ['isValid', function (this: any) { return !this._destroyed; }],
        ['activeInHierarchy', function (this: any) { return this.active !== false; }],
        ['position', function (this: any) { return this._pos ?? { x: 0, y: 0, z: 0 }; }],
        ['scale', function (this: any) { return this._scale ?? { x: 1, y: 1, z: 1 }; }],
    ];
    for (const [k, g] of getters) {
        if (!(k in proto)) { Object.defineProperty(proto, k, { get: g, configurable: true }); added.push(k); }
    }
    try { fn(); } finally { for (const k of added) delete proto[k]; }
}

export function createBadgeBatchLayersSuite(): TestSuite {
    const suite = new TestSuite('BadgeBatchLayers (徽章分層合批 PROG-2-9713)');

    suite.test('圖層依序為底圖、圖示、文字，且都掛在 uiRoot 下', () => withNodeApi(() => {
        const root = new Node('UnitOverlayRoot');
        const layers = new BadgeBatchLayers(root, 1);
        assert.equals(3, root.children.length);
        assert.equals('BadgeBgLayer', root.children[0].name);
        assert.equals('BadgeIconLayer', root.children[1].name);
        assert.equals('BadgeTextLayer', root.children[2].name);
        assert.isTrue(layers.isValid);
    }));

    suite.test('proxyFor 把代理節點放進對應圖層；同一徽章只算一筆連結', () => withNodeApi(() => {
        const root = new Node('UnitOverlayRoot');
        const layers = new BadgeBatchLayers(root, 1);
        const anchor = new Node('UnitLabel_a');
        root.addChild(anchor);
        const bg = layers.proxyFor(anchor, 'bg');
        const text = layers.proxyFor(anchor, 'text');
        const icon = layers.proxyFor(anchor, 'icon');
        assert.isTrue(bg.parent === layers.bg);
        assert.isTrue(text.parent === layers.text);
        assert.isTrue(icon.parent === layers.icon);
        assert.equals(1, layers.linkCount);
    }));

    suite.test('徽章節點銷毀後 sync 清掉連結與代理節點', () => withNodeApi(() => {
        const root = new Node('UnitOverlayRoot');
        const layers = new BadgeBatchLayers(root, 1);
        const anchor = new Node('UnitLabel_b');
        root.addChild(anchor);
        const bg = layers.proxyFor(anchor, 'bg');
        const text = layers.proxyFor(anchor, 'text');
        layers.sync();
        assert.equals(1, layers.linkCount);
        anchor.destroy();
        layers.sync();
        assert.equals(0, layers.linkCount);
        assert.isTrue(bg.parent === null && text.parent === null);
        assert.equals(0, layers.bg.children.length);
    }));

    suite.test('UnitRenderer：部隊徽章走合批圖層、文字 BITMAP 點陣快取、位置更新後才 sync', () => {
        const src = read('assets/scripts/battle/views/UnitRenderer.ts');
        assert.isTrue(src.includes('this.buildBadge(labelNode, 170, 34, unit.type, badgeLayers)'));
        // 武將名牌維持 Graphics 版（不傳 layers）
        assert.isTrue(src.includes('this.buildBadge(labelNode, GENERAL_PLATE_WIDTH, GENERAL_PLATE_HEIGHT)'));
        assert.equals(2, src.split('cacheMode = Label.CacheMode.BITMAP').length - 1);
        // 快取模式要在 SHRINK 之後才切，否則節點會先被縮成空字串的寬度
        const shrinkHp = src.indexOf('this.shrinkToFit(hpLabel);');
        assert.isTrue(shrinkHp > 0 && src.indexOf('for (const l of [attackLabel, typeLabel, hpLabel]) l.cacheMode = Label.CacheMode.BITMAP;') > shrinkHp);
        const late = src.slice(src.indexOf('  lateUpdate(dt = 0): void {'));
        assert.isTrue(late.indexOf('this.badgeLayers?.sync()') > late.indexOf('this.tileBuffMarkers.update(dt)'));
        assert.isTrue(late.indexOf('this.badgeLayers?.sync()') > late.indexOf('this.avoidGeneralPlates(dt)'));
        // 圖層要在徽章節點之前建立
        const create = src.indexOf('const badgeLayers = this.ensureBadgeLayers();');
        assert.isTrue(create > 0 && create < src.indexOf('const labelNode = new Node(`UnitLabel_${unit.id}`);'));
    });

    suite.test('徽章底圖 160x80、不打包進動態圖集、不裁切', () => {
        const meta = JSON.parse(read('assets/resources/sprites/battle/battle_badge_atlas.png.meta'));
        const sf = Object.values(meta.subMetas as Record<string, { importer: string; userData: Record<string, unknown> }>)
            .find(m => m.importer === 'sprite-frame')!;
        assert.equals(160, sf.userData.width);
        assert.equals(80, sf.userData.height);
        assert.equals(false, sf.userData.packable);
        assert.equals('none', sf.userData.trimType);
    });

    return suite;
}
