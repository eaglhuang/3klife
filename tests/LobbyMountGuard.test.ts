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
        assert.isTrue(/try \{\s*await mounts\[index\]\(\);\s*\} catch/.test(run), '背景掛載要逐項 try/catch');
    });
    return suite;
}
