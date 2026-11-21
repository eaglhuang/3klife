// @spec-source → PROG-2-9035：大廳單一面板掛載失敗不可卡住「幕府大堂整備中」遮罩
import { TestSuite, assert } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';

export function createLobbyMountGuardSuite(): TestSuite {
    const suite = new TestSuite('LobbyMountGuard');
    suite.test('大廳掛載迴圈逐一包 try/catch，失敗只記錄並繼續', () => {
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf-8');
        const loop = src.match(/for \(let index = 0; index < mounts\.length; index\+\+\) \{([\s\S]*?)\n        \}/);
        assert.isTrue(!!loop, '找不到掛載迴圈');
        const body = loop![1];
        assert.isTrue(/try \{\s*await mount\(\);\s*\} catch/.test(body), 'await mount() 必須包在 try/catch 內');
        assert.isTrue(body.includes('UCUFLogger.error'), '掛載失敗要記錄錯誤');
    });
    suite.test('非必要面板移到大廳出現後背景掛載，且背景掛載也逐項防護（PROG-2-9040）', () => {
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf-8');
        const startIdx = src.indexOf('const mounts: Array<() => Promise<void>> = [');
        const critical = src.slice(startIdx, src.indexOf('];', startIdx));
        assert.isTrue(!critical.includes('this._mountWarehouse()'), '倉庫等彈窗不應擋在載入遮罩前');
        assert.isTrue(src.includes('this._mountWarehouse()'), '倉庫仍要在背景掛載');
        const completeIdx = src.indexOf('SceneLoadProgress.complete();');
        assert.isTrue(src.indexOf('void this._runDeferredMounts();') > completeIdx, '背景掛載要在載入遮罩收起之後才開始');
        const run = src.slice(src.indexOf('private async _runDeferredMounts'), src.indexOf('private async _setupRivalOfficers'));
        // 逐項防護改由排程器負責（PROG-2-9196）：runAll 內逐項 try/catch，失敗交 onError 記錄
        assert.isTrue(/scheduler\.runAll\(\(id, error\) => \{[\s\S]*UCUFLogger\.error/.test(run), '背景掛載失敗要記錄錯誤');
        const sched = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/core/LobbyMountScheduler.ts'), 'utf-8');
        assert.isTrue(/try \{\s*await this\._start\(entry\);\s*\} catch/.test(sched), '排程器要逐項 try/catch');
    });
    suite.test('大廳啟動途中場景被銷毀：每個 await 後檢查節點有效並安靜中止（PROG-2-9196）', () => {
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf-8');
        const start = src.slice(src.indexOf('async start() {'), src.indexOf('private async _runDeferredMounts'));
        const loop = start.slice(start.indexOf('for (let index = 0; index < mounts.length; index++) {'), start.indexOf('this._registerUIControllers();'));
        const catchAt = loop.indexOf('} catch (error) {');
        assert.isTrue(catchAt >= 0 && loop.indexOf('if (!this.node?.isValid) return;', catchAt) > catchAt
            && loop.indexOf('if (!this.node?.isValid) return;', catchAt) < loop.indexOf('UCUFLogger.error', catchAt), '掛載失敗的 catch 先判斷節點已銷毀就直接返回，不記錄錯誤');
        assert.isTrue(loop.split('if (!this.node?.isValid) return;').length - 1 >= 2, '每項掛載後也檢查節點有效');
        const guards = start.split('if (!this.node?.isValid) return').length - 1;
        assert.isTrue(guards >= 6, `start() 內的銷毀檢查至少 6 處，實際 ${guards}`);
        const destroyAt = src.indexOf('protected onDestroy(): void {');
        assert.isTrue(src.slice(destroyAt, destroyAt + 120).includes('this._cancelMountScheduler();'), 'onDestroy 取消背景排程');
    });
    suite.test('開場面板拉回最上層時，少年挑選排在宿命池之後，不被結果面板蓋住（PROG-2-9214）', () => {
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf-8');
        const fn = src.slice(src.indexOf('private _keepOpeningOnTop(): void {'));
        const line = fn.slice(0, fn.indexOf('for (const node of nodes)'));
        const destinyAt = line.indexOf('activeHostNodes()');
        const youthAt = line.indexOf('this._youthPickHost?.node');
        assert.isTrue(destinyAt >= 0 && youthAt > destinyAt, '少年挑選宿主必須排在宿命池節點之後（最後拉到最上層）');
    });
    return suite;
}
