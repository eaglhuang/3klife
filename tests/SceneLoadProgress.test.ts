// @spec-source → Issue #2074；PROG-2-2216
import { assert, TestSuite } from './TestRunner';
import { LoadProgressState, SCENE_LOAD_PROGRESS_CSS, sceneLoadState, SceneLoadProgress } from '../assets/scripts/shared/SceneLoadProgress';
import { readFileSync } from 'fs';
import { join } from 'path';
export function createSceneLoadProgressSuite(): TestSuite {
    const suite = new TestSuite('SceneLoadProgress');
    suite.test('資源 callback 使用真實完成量，不靠計時器', () => {
        const p = new LoadProgressState(); p.begin('場景資源'); p.report(3, 8);
        assert.equals(3, p.completed); assert.equals(8, p.total); assert.contains(p.text, '37%');
    });
    suite.test('零總數、NaN callback 不造假百分比；未知總數保留完成計數', () => {
        const p = new LoadProgressState(); p.begin('大廳'); p.report(1, 0); p.report(NaN, 10); p.step();
        assert.equals(null, p.total); assert.equals(1, p.completed);
        assert.contains(p.text, '已完成 1 個介面'); assert.isFalse(p.text.includes('%'));
    });
    suite.test('已知階段的完成進度夾在0–100%，下一階段重新計數', () => {
        const p = new LoadProgressState(); p.begin('資源', 2); p.report(8, 2);
        assert.contains(p.text, '100%'); p.begin('戰鬥', 7); p.step();
        assert.contains(p.text, '14%'); assert.equals(1, p.completed);
    });
    suite.test('失敗保留明確錯誤、不再吃進度，重試才重設', () => {
        const p = new LoadProgressState(); p.begin('場景'); p.failed = true; p.step(); p.report(4, 4);
        assert.equals(0, p.completed); assert.contains(p.text, '載入失敗');
        p.begin('重試', 1); assert.isFalse(p.failed);
    });
    suite.test('沒有 document 的 native/headless 呼叫不拋錯且可以退場', () => {
        SceneLoadProgress.begin('測試', 7); SceneLoadProgress.step(); SceneLoadProgress.complete();
        assert.isFalse(sceneLoadState.active); SceneLoadProgress.step(); assert.equals(1, sceneLoadState.completed);
    });
    suite.test('DOM覆蓋層跨階段重用，未知總數為 indeterminate，ready 才移除', () => {
        const g = globalThis as any; const oldDocument = g.document;
        let attached = 0, removed = 0;
        const elements: any[] = [];
        g.document = { body: { appendChild() { attached++; } }, createElement(tag: string) {
            const el: any = { tag, style: {}, attrs: {}, append() {}, appendChild() {},
                setAttribute(k: string, v: string) { this.attrs[k] = v; },
                removeAttribute(k: string) { delete this[k]; }, remove() { removed++; } };
            elements.push(el); return el;
        } };
        try {
            SceneLoadProgress.begin('資源'); SceneLoadProgress.report(2, 4);
            const root = elements.find(e => e.id === 'scene-load-progress');
            const fill = elements.find(e => e.className === 'slp-fill');
            assert.equals('determinate', root.attrs['data-mode']); assert.equals('50%', fill.style.width);
            SceneLoadProgress.begin('大廳'); SceneLoadProgress.step();
            assert.equals(1, attached); assert.equals('indeterminate', root.attrs['data-mode']); assert.equals('', fill.style.width);
            SceneLoadProgress.complete(); assert.equals(1, removed);
        } finally { SceneLoadProgress.complete(); g.document = oldDocument; }
    });
    suite.test('精緻框＋漸層光棒：細框、6px 光棒、金色漸層與掃光，不用瀏覽器原生白底與 progress 元件 PROG-2-2230', () => {
        const css = SCENE_LOAD_PROGRESS_CSS;
        assert.contains(css, 'border:1px solid rgba(212,175,55');
        assert.contains(css, '.slp-track{position:relative;height:6px');
        assert.contains(css, 'linear-gradient(90deg,#7A5A12,#D4AF37');
        assert.contains(css, 'animation:slp-sweep');
        assert.contains(css, '[data-mode="indeterminate"] .slp-fill');
        const src = readFileSync(join(__dirname, '../assets/scripts/shared/SceneLoadProgress.ts'), 'utf8');
        assert.isFalse(src.includes("createElement('progress')"));
        assert.isFalse(src.includes("background: 'Canvas'"));
    });
    suite.test('場景接線覆蓋開始遊戲、真預載、大廳完成及戰鬥遮罩退場', () => {
        const read = (p: string) => readFileSync(join(__dirname, '../assets/scripts', p), 'utf8');
        assert.contains(read('core/managers/SceneManager.ts'), "SceneLoadProgress.begin('正在準備載入場景')");
        assert.contains(read('ui/scenes/LoadingScene.ts'), 'SceneLoadProgress.report(completedCount, totalCount)');
        assert.contains(read('ui/scenes/LobbyScene.ts'), "SceneLoadProgress.begin('正在準備大廳')");
        assert.contains(read('ui/scenes/LobbyScene.ts'), 'SceneLoadProgress.step()');
        const battle = read('battle/views/BattleScene.ts');
        assert.contains(battle, "SceneLoadProgress.begin('正在準備戰鬥', 7)");
        assert.isTrue(battle.indexOf('SceneLoadProgress.complete()') < battle.indexOf('this._startupOpacity.opacity = 255'));
    });
    return suite;
}
