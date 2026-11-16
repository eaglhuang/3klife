/**
 * HallMissionActionRouter.test.ts — 任務詳情四鈕按下去的處理與牆面任務卡綁定（PROG-2-9123）
 */
import { Node } from 'cc';
import { assert, TestSuite } from './TestRunner';
import { planHallMissionAction, hallTaskDialogStateOf } from '../assets/scripts/ui/core/HallMissionActionRouter';
import { DETAIL_ACTION_BLOCKED_TEXT } from '../assets/scripts/ui/core/HallDetailActionStates';
import { loadLobbyHub } from '../assets/scripts/core/systems/HallMissionBoardPresenter';
import { readFileSync } from 'fs';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LobbyHallScreenBinder, splitWallNodes } = require('../assets/scripts/ui/core/LobbyHallScreenBinder');

const free = { selectedGeneralId: 'zhang-fei', aiDelegateChecked: false, alreadyAccepted: false };

function ucuf(name: string, id?: string): Node {
    const node = new Node(name);
    if (id) (node as unknown as { _ucufId: string })._ucufId = id;
    return node;
}

function makeWall(id: string, rowCount: number): { root: Node; wall: Node; rows: Node[]; footer: Node } {
    const root = new Node('LobbyHallScreen');
    const wall = ucuf(id, `lobby-hall-screen.${id}`);
    const head = new Node('head');
    const rows = Array.from({ length: rowCount }, (_, i) => new Node(`row${i}`));
    const footer = new Node('footer');
    wall.children.push(head, ...rows, footer);
    root.children.push(wall);
    return { root, wall, rows, footer };
}

export function createHallMissionActionRouterSuite(): TestSuite {
    const suite = new TestSuite('HallMissionActionRouter (大廳任務詳情四鈕與牆面任務卡，PROG-2-9123)');

    suite.test('執行：有選武將就派遣；勾 AI 委任改走委任；都沒有就提示', () => {
        assert.equals(JSON.stringify({ kind: 'dispatch', generalId: 'zhang-fei' }), JSON.stringify(planHallMissionAction('execute', free)));
        assert.equals('assign-ai', planHallMissionAction('execute', { ...free, aiDelegateChecked: true }).kind);
        const none = planHallMissionAction('execute', { ...free, selectedGeneralId: null });
        assert.equals('notice', none.kind);
    });

    suite.test('已接取的任務按執行或委任都只提示，不重複派遣', () => {
        for (const action of ['execute', 'assign'] as const) {
            const plan = planHallMissionAction(action, { ...free, alreadyAccepted: true });
            assert.equals('notice', plan.kind);
        }
    });

    suite.test('委任走 AI 選將；再探與等待沒有規格數值，顯示尚未開放', () => {
        assert.equals('assign-ai', planHallMissionAction('assign', free).kind);
        assert.equals('not-open', planHallMissionAction('re-scout', free).kind);
        assert.equals('not-open', planHallMissionAction('wait', free).kind);
    });

    suite.test('任務資料決定按鈕開放項目與迷霧；停用按鈕有原因文字', () => {
        const state = hallTaskDialogStateOf({ Intel_Reveal_Percent: 0, Available_Actions: ['ASSIGN'] });
        assert.equals('assign', state.availableActions.join(','));
        assert.isTrue(state.intelFogVisible);
        assert.isFalse(hallTaskDialogStateOf({ Intel_Reveal_Percent: 100, Available_Actions: ['EXECUTE'] }).intelFogVisible);
        for (const text of Object.values(DETAIL_ACTION_BLOCKED_TEXT)) assert.isTrue(text.length > 0);
    });

    suite.test('lobby-hub 每張任務都能算出詳情視窗 state，且四個動作都有處理結果', () => {
        const loaded = loadLobbyHub(JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/lobby-hub.json'), 'utf8')));
        if (!loaded.ok) throw new Error('lobby-hub.json 驗證失敗');
        let checked = 0;
        for (const board of Object.values(loaded.hub.Mission_Boards)) {
            for (const task of board?.Tasks ?? []) {
                const state = hallTaskDialogStateOf(task);
                assert.isTrue(state.intelRevealPercent >= 0 && state.intelRevealPercent <= 100);
                for (const action of ['re-scout', 'execute', 'wait', 'assign'] as const) {
                    assert.isTrue(['dispatch', 'assign-ai', 'not-open', 'notice'].includes(planHallMissionAction(action, free).kind));
                }
                checked++;
            }
        }
        assert.isTrue(checked > 0);
    });

    suite.test('splitWallNodes：牆頭、任務列、頁尾依設計稿順序切開', () => {
        const { wall, rows, footer } = makeWall('wall-left', 4);
        const parts = splitWallNodes(wall);
        assert.equals(4, parts.rows.length);
        assert.isTrue(parts.rows[0] === rows[0]);
        assert.isTrue(parts.footer === footer);
        assert.equals(0, splitWallNodes(new Node('empty')).rows.length);
    });

    suite.test('牆上每張任務卡各自回報列號、頁尾回報展開；卡片點擊不再冒泡成開整面牆', () => {
        const left = makeWall('wall-left', 3);
        const right = makeWall('wall-right', 2);
        left.root.children.push(right.wall);
        const seen: string[] = [];
        new LobbyHallScreenBinder(left.root, {
            themeConfig: null,
            fxConfig: null,
            onAdvanceSeason: () => undefined,
            onDock: () => undefined,
            onPanel: (id: string) => seen.push(`panel:${id}`),
            onWallRow: (wall: string, i: number) => seen.push(`row:${wall}:${i}`),
            onWallExpand: (wall: string) => seen.push(`expand:${wall}`),
        });
        const stops: boolean[] = [];
        const tap = (node: Node): void => {
            const event = { propagationStopped: false };
            node.emit(Node.EventType.TOUCH_END, event);
            stops.push(event.propagationStopped);
        };
        left.rows.forEach(tap);
        tap(right.rows[1]);
        tap(left.footer);
        tap(right.footer);
        assert.equals('row:wall-left:0|row:wall-left:1|row:wall-left:2|row:wall-right:1|expand:wall-left|expand:wall-right', seen.join('|'));
        assert.isTrue(stops.every((stopped) => stopped));
        // 整面牆本身仍可點（點牆頭或空白處開牆）
        left.wall.emit(Node.EventType.TOUCH_END);
        assert.equals('panel:wall-left', seen[seen.length - 1]);
    });

    return suite;
}
