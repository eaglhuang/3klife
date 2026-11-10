import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
export function createWebVideoFixtureIsolationSuite(): TestSuite {
    const suite = new TestSuite('網頁測試影片隔離 PROG-2-2210');
    const root = join(__dirname, '..');
    suite.test('測試影片保留在 assets 外，resources 不再收進建置', () => {
        assert.isFalse(existsSync(join(root, 'assets/resources/趙雲發大招.mp4')));
        assert.isTrue(statSync(join(root, 'tools/test-fixtures/video/zhao-ultimate.mp4')).size > 17000000);
    });
    suite.test('戰場不再靜態引用測試影片，元件仍保留可設定的本地與遠端來源', () => {
        const scene = readFileSync(join(root, 'assets/scenes/BattleScene.scene'), 'utf8');
        assert.isFalse(scene.includes('fdd29d18-9502-4664-bd4b-cd79462db922'));
        const src = readFileSync(join(root, 'assets/scripts/tools/VideoPlayerTest.ts'), 'utf8');
        assert.contains(src, 'if (!DEV) { onComplete?.(); return; }');
        assert.contains(src, 'http://127.0.0.1:8789/zhao-ultimate.mp4');
        assert.contains(src, 'public localClip: VideoClip | null');
    });
    suite.test('來源資產統計按位元組分組，不把副本或壓縮大小混為下載量', () => {
        const { summarize } = require('../tools_node/audit-web-source-assets');
        const result = summarize([{ path: 'assets/resources/a/x.png', bytes: 12 }, { path: 'assets/resources/a/y.png', bytes: 8 }]);
        assert.equals(20, result.bytes); assert.equals(2, result.files);
        assert.equals(20, result.groups[0].bytes); assert.equals(12, result.largest[0].bytes);
    });
    return suite;
}
