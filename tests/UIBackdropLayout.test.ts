/**
 * 彈窗遮罩的歸屬與層級（PROG-2-9122）
 * 重現情境：推進一季後事件視窗（不在 UIManager 內）與季度戰報（在 UIManager 內）疊開，
 * 戰報的 X 直接 hide() 不經 close，遮罩殘留並壓住事件視窗。
 */
import { TestSuite, assert } from './TestRunner';
import { backdropIndexBelowOwner, isNodeShown, pickBackdropOwnerIndex } from '../assets/scripts/core/managers/UIBackdropLayout';
import { UIManager } from '../assets/scripts/core/managers/UIManager';
import { UIID } from '../assets/scripts/core/config/UIConfig';

/** 模擬 Cocos 節點的子節點順序：回傳設定後的名稱排列 */
function applySetSiblingIndex(order: string[], name: string, index: number): string[] {
    const next = order.filter((item) => item !== name);
    next.splice(Math.min(index, next.length), 0, name);
    return next;
}

/** 最小替身：可被外部關閉並觸發 active 變更事件 */
class FakeNode {
    public isValid = true;
    public active = false;
    public activeInHierarchy = false;
    private _handler: (() => void) | null = null;
    on(_event: unknown, handler: () => void): void { this._handler = handler; }
    setActive(value: boolean): void {
        this.active = value;
        this.activeInHierarchy = value;
        this._handler?.();
    }
}

class FakePanel {
    public node = new FakeNode();
    show(): void { this.node.setActive(true); }
    hide(): void { this.node.setActive(false); }
}

function ownerOf(mgr: UIManager): UIID | null {
    return (mgr as unknown as { _getBackdropOwnerUiId(): UIID | null })._getBackdropOwnerUiId();
}

export function createUIBackdropLayoutSuite(): TestSuite {
    const suite = new TestSuite('UIBackdropLayout (彈窗遮罩歸屬 PROG-2-9122)');

    suite.test('遮罩擁有者是最後一個開啟且顯示中的', () => {
        assert.equals(pickBackdropOwnerIndex([]), -1);
        assert.equals(pickBackdropOwnerIndex([{ open: true, shown: true }, { open: true, shown: true }]), 1);
        // 最上層登記為開啟但節點已被自己關掉：跳過，回到下一個
        assert.equals(pickBackdropOwnerIndex([{ open: true, shown: true }, { open: true, shown: false }]), 0);
        // 全部沒顯示：不該有遮罩
        assert.equals(pickBackdropOwnerIndex([{ open: true, shown: false }, { open: false, shown: true }]), -1);
    });

    suite.test('節點顯示判斷：失效、階層內未啟用都算沒顯示，替身節點視為顯示', () => {
        assert.isFalse(isNodeShown(null));
        assert.isFalse(isNodeShown({ isValid: false, activeInHierarchy: true }));
        assert.isFalse(isNodeShown({ isValid: true, activeInHierarchy: false }));
        assert.isTrue(isNodeShown({ isValid: true, activeInHierarchy: true }));
        assert.isTrue(isNodeShown({}));
    });

    suite.test('遮罩不論原本在擁有者上方或下方，都緊貼擁有者正下方且擁有者相對順序不變', () => {
        for (const backdropStart of ['below', 'above', 'new'] as const) {
            // 子節點順序：A B 擁有者 C；遮罩依情境放在不同位置
            let order = ['A', 'B', 'owner', 'C'];
            if (backdropStart === 'below') order = ['A', 'backdrop', 'B', 'owner', 'C'];
            if (backdropStart === 'above') order = ['A', 'B', 'owner', 'backdrop', 'C'];
            if (backdropStart === 'new') order = ['A', 'B', 'owner', 'C', 'backdrop'];
            const owner = order.indexOf('owner');
            const backdrop = order.indexOf('backdrop');
            const result = applySetSiblingIndex(order, 'backdrop', backdropIndexBelowOwner(owner, backdrop));
            assert.equals(result.indexOf('backdrop') + 1, result.indexOf('owner'), `${backdropStart}：遮罩要在擁有者正下方 ${result.join(',')}`);
            assert.equals(result.filter((item) => item !== 'backdrop').join(','), 'A,B,owner,C', `${backdropStart}：其餘順序不變`);
        }
    });

    suite.test('後來才被帶到最前面的視窗（不在管理器內）仍在遮罩之上', () => {
        // 重現原缺陷順序：事件視窗、戰報；遮罩在戰報下方
        let order = ['Event', 'Report'];
        order = applySetSiblingIndex(order, 'backdrop', backdropIndexBelowOwner(order.indexOf('Report'), 99));
        assert.equals(order.join(','), 'Event,backdrop,Report');
        // 事件視窗之後被 bringToFront：遮罩不會蓋到它
        order = applySetSiblingIndex(order, 'Event', order.length - 1);
        assert.isTrue(order.indexOf('Event') > order.indexOf('backdrop'));
    });

    suite.test('彈窗自己 hide()（不經 close）後：不再是遮罩擁有者，並移出堆疊', async () => {
        const mgr = new UIManager();
        const report = new FakePanel();
        const other = new FakePanel();
        mgr.register(UIID.SeasonReport, report as never);
        mgr.register(UIID.SandtableTerritory, other as never);
        await mgr.open(UIID.SandtableTerritory);
        await mgr.open(UIID.SeasonReport);
        assert.equals(ownerOf(mgr), UIID.SeasonReport);
        assert.equals(mgr.getPopupDepth(), 2);

        report.hide(); // 戰報的 X 直接 hide，沒走 close
        assert.equals(mgr.isOpen(UIID.SeasonReport), false);
        assert.equals(mgr.getPopupDepth(), 1);
        assert.equals(ownerOf(mgr), UIID.SandtableTerritory);

        other.hide();
        assert.equals(mgr.getPopupDepth(), 0);
        assert.equals(ownerOf(mgr), null, '全部關完不該殘留遮罩擁有者');
    });

    suite.test('被外部關掉的彈窗可再次正常開啟與關閉', async () => {
        const mgr = new UIManager();
        const report = new FakePanel();
        mgr.register(UIID.SeasonReport, report as never);
        await mgr.open(UIID.SeasonReport);
        report.hide();
        assert.equals(await mgr.open(UIID.SeasonReport), true);
        assert.equals(mgr.isOpen(UIID.SeasonReport), true);
        assert.equals(ownerOf(mgr), UIID.SeasonReport);
        await mgr.close(UIID.SeasonReport);
        assert.equals(ownerOf(mgr), null);
    });

    suite.test('登記為開啟但節點已隱藏（未收到事件）也不算擁有者', async () => {
        const mgr = new UIManager();
        const report = new FakePanel();
        mgr.register(UIID.SeasonReport, report as never);
        await mgr.open(UIID.SeasonReport);
        report.node.activeInHierarchy = false; // 只改階層狀態，不觸發事件
        assert.equals(ownerOf(mgr), null);
    });

    return suite;
}
