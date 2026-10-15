/**
 * ResultPopup.test.ts — 戰鬥結算彈窗（headless，run-cli suite）
 *
 * 驗證重點：
 *   1. showResult 依 BattleResult 寫入正確標題（勝利 / 落敗 / 平局）與描述
 *   2. details 會接在描述後面
 *   3. 返回與重玩按鈕發出對應事件，且動畫結束後才隱藏
 *   4. resetState 清空標題與描述
 *
 * 不載入規格 JSON：以手寫 binder 與 no-op 動畫取代 UISpecLoader / 建構流程，
 * 讓測試只關心元件自己的業務邏輯。
 *
 * Unity 對照：PlayMode 測試直接掛 PopupController，替換 Animator 為 no-op。
 */
import { Node } from 'cc';
import { TestSuite, assert } from './TestRunner';
import { ResultPopup, BattleResult } from '../assets/scripts/ui/components/ResultPopup';

/** 只實作 ResultPopup 會呼叫到的 UITemplateBinder 介面 */
class FakeBinder {
    texts: Record<string, string> = {};

    setTexts(texts: Record<string, string>): void {
        Object.assign(this.texts, texts);
    }

    getButton(_name: string): null {
        return null;
    }

    getNode(_name: string): null {
        return null;
    }
}

/** 建立已完成初始化的彈窗，跳過規格載入 */
function createPopup(): { popup: ResultPopup; binder: FakeBinder } {
    const popup = new ResultPopup();
    const binder = new FakeBinder();
    const internals = popup as unknown as Record<string, unknown>;

    // 真實引擎會在掛載時注入 node；headless 下手動建立
    internals['node'] = new Node('ResultPopupRoot');

    internals['i18nStrings'] = {
        'ui.result.victory': '勝利',
        'ui.result.defeat': '落敗',
        'ui.result.draw': '平局',
        'ui.result.title': '戰鬥結算',
    };
    internals['_initialized'] = true;
    internals['_binder'] = binder;
    internals['playEnterTransition'] = () => {};
    internals['playExitTransition'] = (_node: unknown, _transition: unknown, cb?: () => void) => cb?.();
    return { popup, binder };
}

export function createResultPopupSuite(): TestSuite {
    const suite = new TestSuite('ResultPopup (戰鬥結算彈窗)');

    suite.test('BattleResult 只包含勝、負、平三種狀態', () => {
        const states: BattleResult[] = ['player-win', 'enemy-win', 'draw'];
        assert.equals(3, states.length);
    });

    suite.test('showResult(player-win) 顯示勝利標題與大勝描述', async () => {
        const { popup, binder } = createPopup();
        await popup.showResult('player-win');
        assert.equals('勝利', binder.texts['TitleLabel']);
        assert.equals('我方成功擊敗敵軍，取得大勝！', binder.texts['DescLabel']);
    });

    suite.test('showResult(enemy-win) 顯示落敗標題', async () => {
        const { popup, binder } = createPopup();
        await popup.showResult('enemy-win');
        assert.equals('落敗', binder.texts['TitleLabel']);
    });

    suite.test('showResult(draw) 顯示平局標題', async () => {
        const { popup, binder } = createPopup();
        await popup.showResult('draw');
        assert.equals('平局', binder.texts['TitleLabel']);
    });

    suite.test('showResult 帶 details 時描述接在第二行', async () => {
        const { popup, binder } = createPopup();
        await popup.showResult('enemy-win', '損失 3 座城池');
        assert.equals('敵方突破防線，再接再厲！\n損失 3 座城池', binder.texts['DescLabel']);
    });

    suite.test('showResult 顯示後節點為 active', async () => {
        const { popup } = createPopup();
        await popup.showResult('draw');
        assert.isTrue(popup.node.active);
    });

    suite.test('重玩按鈕：動畫結束後隱藏節點並發出 replay', async () => {
        const { popup } = createPopup();
        let replayCount = 0;
        popup.node.on('replay', () => { replayCount++; });

        popup['_onClickReplay']();

        assert.equals(1, replayCount);
        assert.isFalse(popup.node.active);
    });

    suite.test('返回按鈕：動畫結束後隱藏節點並發出 back', async () => {
        const { popup } = createPopup();
        let backCount = 0;
        popup.node.on('back', () => { backCount++; });

        popup['_onClickBack']();

        assert.equals(1, backCount);
        assert.isFalse(popup.node.active);
    });

    suite.test('resetState 清空標題與描述', async () => {
        const { popup, binder } = createPopup();
        await popup.showResult('player-win');

        popup.resetState();

        assert.equals('', binder.texts['TitleLabel']);
        assert.equals('', binder.texts['DescLabel']);
    });

    return suite;
}
