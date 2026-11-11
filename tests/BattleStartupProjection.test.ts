// @spec-source → Issue #2086；PROG-2-2235
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';
import { TroopType } from '../assets/scripts/shared/CommonEnums';
const { UnitRenderer } = require('../assets/scripts/battle/views/UnitRenderer');
export function createBattleStartupProjectionSuite(): TestSuite {
 const suite = new TestSuite('BattleStartupProjection');
 suite.test('每次單位投影共用世界座標暫存，不 clone、不改世界座標', () => {
   const source = { x: 2, y: 3, z: 4 }; const scratch = {}; const buffer = {};
   const received: any[] = []; let placed: any;
   const renderer: any = { uiRoot: {}, canvasNode: {}, labelWorldPosBuf: scratch, uiProjectionBuffer: buffer,
     worldCamera: { convertToUINode: (p: any, _root: any, out: any) => { received.push(p); out.y = p.y; } } };
   const node = { getWorldPosition: (out: any) => { assert.equals(scratch, out); return Object.assign(out, source); },
     worldPosition: { clone: () => { throw new Error('不應逐幀 clone'); } } };
   for (let i = 0; i < 120; i++) UnitRenderer.prototype['projectWorldLabel'].call(renderer, node, { setPosition: (p: any) => { placed = p; } }, 0.55);
   assert.equals(scratch, received[0]); assert.equals(scratch, received[119]);
   assert.equals(3, source.y); assert.equals(3.55, (buffer as any).y); assert.equals(buffer, placed);
 });
 suite.test('Buff 採同一引擎投影，不逐標籤搜尋相機子樹', () => {
   let calls = 0; const buffer = {}; const input = { x: 4, y: 5, z: 6 }; let placed: any;
   const renderer = { uiRoot: {}, canvasNode: { getComponentInChildren: () => { throw new Error('不可逐幀樹搜尋'); } },
     uiProjectionBuffer: buffer, worldCamera: { convertToUINode: (p: any) => { assert.equals(input, p); calls++; } } };
   UnitRenderer.prototype['projectWorldPoint'].call(renderer, input, { setPosition: (p: any) => { placed = p; } });
   assert.equals(1, calls); assert.equals(buffer, placed);
 });
 suite.test('首次冷載入不露工程方塊，並行要求共用任務，完成立即換模型', async () => {
   let resolve!: (p: any) => void; let loads = 0; let builds = 0;
   const pending = new Promise(r => { resolve = r; });
   const view: any = { worldNode: { isValid: true }, bodyNode: { active: true }, accentNode: { active: true },
     formationRoot: { children: [] }, bottomNameLabel: { string: '' }, usingTroopFormation: false };
   const renderer = { isGeneralAvatarUnit: () => false, loadTroopPrefab: () => { loads++; return pending; },
     buildTroopFormation: (v: any) => { builds++; v.usingTroopFormation = true; } };
   const ensure = UnitRenderer.prototype['ensureTroopFormation'];
   const unit = { type: TroopType.Infantry, name: '大戟士' };
   const first = ensure.call(renderer, view, unit); const second = ensure.call(renderer, view, unit);
   assert.equals(first, second); assert.equals(1, loads); assert.isTrue(view.formationLoading);
   assert.isFalse(view.bodyNode.active); assert.isFalse(view.accentNode.active); assert.contains(view.bottomNameLabel.string, '模型載入中');
   resolve({}); await first;
   assert.equals(1, builds); assert.isFalse(view.formationLoading); assert.isFalse(view.bodyNode.active);
   assert.equals('大戟士', view.bottomNameLabel.string);
 });
 suite.test('模型缺失仍有明示的戰術棋子；節點已離場不建構遲到模型', async () => {
   for (const valid of [true, false]) {
     const view: any = { worldNode: { isValid: valid }, bodyNode: { active: true }, accentNode: { active: true },
       formationRoot: { children: [] }, bottomNameLabel: { string: '' }, usingTroopFormation: false };
     let builds = 0;
     await UnitRenderer.prototype['ensureTroopFormation'].call({ isGeneralAvatarUnit: () => false,
       loadTroopPrefab: async () => valid ? null : {}, buildTroopFormation: () => { builds++; } }, view, { type: TroopType.Infantry, name: '士兵' });
     assert.equals(0, builds); assert.isFalse(view.formationLoading);
     if (valid) { assert.isTrue(view.bodyNode.active); assert.equals('士兵（戰術棋子）', view.bottomNameLabel.string); }
   }
 });
 suite.test('boot 提示先於引擎，失敗有回饋，ready 後移除錯誤監聽', () => {
   const html = readFileSync(join(__dirname, '../build-templates/web-desktop/index.ejs'), 'utf8');
   assert.isTrue(html.indexOf('id="web-boot-progress"') < html.indexOf('include(cocosTemplate'));
   const listeners = new Map<string, Function>(); const status = { textContent: '' };
   const win = { addEventListener: (name: string, fn: Function) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) };
   const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
   runInNewContext(script, { window: win, document: { getElementById: () => status } });
   listeners.get('error')!(); assert.contains(status.textContent, '啟動遇到問題');
   listeners.get('3klife-boot-ready')!(); assert.isFalse(listeners.has('error')); assert.isFalse(listeners.has('unhandledrejection'));
 });
 suite.test('標題可用或 fallback 後移除 boot DOM，原生平台無 document 也安全', () => {
   const src = readFileSync(join(__dirname, '../assets/scripts/ui/scenes/LoginScene.ts'), 'utf8');
   const finishBoot = new Function(src.match(/private _finishWebBoot\(\): void \{([\s\S]*?)\n    \}/)![1]);
   const global: any = globalThis; const oldDocument = global.document; const oldWindow = global.window;
   let removed = 0; let dispatched = '';
   try {
     global.document = { getElementById: () => ({ remove: () => { removed++; } }) };
     global.window = { dispatchEvent: (e: Event) => { dispatched = e.type; } };
     finishBoot(); assert.equals(1, removed); assert.equals('3klife-boot-ready', dispatched);
     delete global.document; finishBoot();
     assert.contains(src, 'hostNode.destroy();\n            this._finishWebBoot();');
     assert.contains(src, 'hostNode.active = true;\n        this._finishWebBoot();');
   } finally { global.document = oldDocument; global.window = oldWindow; }
 });
 return suite;
}
