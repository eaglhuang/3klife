/**
 * TacticsTabView.test.ts — 武將技頁三態檢視模型（GDUI-10，PROG-2-1042）
 *
 * 鎖住：已習得／可習得／未解鎖三列表與各自細節文字；同一戰法只出現一次（已習得優先）；
 * 查無定義時顯示 id 而不補資料；主戰法依同一規則判定狀態；三態對應彩色、半透明、灰階。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildTacticsTabView,
    TacticDefinitionView,
    TACTIC_TAB_STATE_STYLE,
    TacticsTabInput,
} from '../assets/scripts/core/systems/TacticsTabView';

const DEFS: Record<string, TacticDefinitionView> = {
    T_FIRE: { name: '火攻', level: 3, tpCost: 30, type: '攻擊', summary: '對單體造成火焰傷害' },
    T_SHIELD: { name: '固守', level: null, tpCost: 20, type: '防禦', summary: '本回合減少受到的傷害' },
    T_LOCK: { name: '斷糧', level: 5, tpCost: 50, type: '謀略', summary: '削弱敵方糧草' },
};

function input(overrides: Partial<TacticsTabInput> = {}): TacticsTabInput {
    return {
        mainTacticId: null,
        learned: [],
        learnable: [],
        locked: [],
        lookup: (id) => DEFS[id],
        ...overrides,
    };
}

export function createTacticsTabViewSuite(): TestSuite {
    const suite = new TestSuite('TacticsTabView (武將技頁三態 GDUI-10)');

    suite.test('三組列表依狀態分組，細節文字依狀態不同', () => {
        const view = buildTacticsTabView(input({
            learned: ['T_FIRE'],
            learnable: ['T_SHIELD'],
            locked: [{ tacticId: 'T_LOCK', reason: '需要 Lv5' }],
        }));
        assert.equals(1, view.learned.length);
        assert.equals('LEARNED', view.learned[0].state);
        assert.equals('對單體造成火焰傷害', view.learned[0].detail);
        assert.equals('需要 TP 40', view.learnable[0].detail, '可習得需求 TP = TP 消耗 × 2');
        assert.equals('需要 Lv5', view.locked[0].detail);
    });

    suite.test('列的 meta 含等級、TP 與類型；沒有等級時省略等級', () => {
        const view = buildTacticsTabView(input({ learned: ['T_FIRE', 'T_SHIELD'] }));
        assert.equals('火攻', view.learned[0].name);
        assert.equals('Lv3 · TP 30 · 攻擊', view.learned[0].meta);
        assert.equals('TP 20 · 防禦', view.learned[1].meta);
    });

    suite.test('同一戰法只出現一次：已習得優先，其次可習得，最後未解鎖', () => {
        const view = buildTacticsTabView(input({
            learned: ['T_FIRE', 'T_FIRE'],
            learnable: ['T_FIRE', 'T_SHIELD', 'T_SHIELD'],
            locked: [{ tacticId: 'T_SHIELD', reason: 'x' }, { tacticId: 'T_LOCK', reason: '需要 Lv5' }, { tacticId: 'T_LOCK', reason: '重複' }],
        }));
        assert.equals(1, view.learned.length);
        assert.equals(1, view.learnable.length);
        assert.equals('T_SHIELD', view.learnable[0].tacticId);
        assert.equals(1, view.locked.length);
        assert.equals('需要 Lv5', view.locked[0].detail, '未解鎖重複 id 保留第一筆理由');
    });

    suite.test('查無定義時名稱退回 id、meta 為空，不補假資料', () => {
        const view = buildTacticsTabView(input({ learned: ['T_UNKNOWN'] }));
        assert.equals('T_UNKNOWN', view.learned[0].name);
        assert.equals('', view.learned[0].meta);
    });

    suite.test('主戰法：已習得為彩色、可習得為半透明、未在列表中視為未解鎖（理由為空）', () => {
        const learned = buildTacticsTabView(input({ mainTacticId: 'T_FIRE', learned: ['T_FIRE'] }));
        assert.equals('LEARNED', learned.main?.state ?? '');
        const learnable = buildTacticsTabView(input({ mainTacticId: 'T_SHIELD', learnable: ['T_SHIELD'] }));
        assert.equals('LEARNABLE', learnable.main?.state ?? '');
        const missing = buildTacticsTabView(input({ mainTacticId: 'T_LOCK' }));
        assert.equals('LOCKED', missing.main?.state ?? '');
        assert.equals('', missing.main?.detail ?? 'x');
    });

    suite.test('沒有主戰法時 main 為 null', () => {
        assert.isTrue(buildTacticsTabView(input()).main === null);
    });

    suite.test('三態對應彩色、半透明、灰階', () => {
        assert.equals('color', TACTIC_TAB_STATE_STYLE.LEARNED);
        assert.equals('translucent', TACTIC_TAB_STATE_STYLE.LEARNABLE);
        assert.equals('grayscale', TACTIC_TAB_STATE_STYLE.LOCKED);
    });

    return suite;
}
