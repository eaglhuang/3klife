import { assert, TestSuite } from './TestRunner';
import { buildHallBoardRows, loadLobbyHub } from '../assets/scripts/core/systems/HallMissionBoardPresenter';

function task(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        Task_ID: id,
        Task_Title: `任務${id}`,
        Task_Brief: '簡述',
        Task_Detail: '詳述',
        Difficulty: 'ELITE',
        Required_Rank: 0,
        Intel_Reveal_Percent: 50,
        Selected_General_UID: null,
        Is_Accepted: false,
        Suggested_General_UID: null,
        Volunteer_General_UIDs: [],
        AI_Assign_Enabled: false,
        Available_Actions: ['ASSIGN'],
        Rewards: {
            Base: [{ Type: 'GRAIN', Amount: 1200 }, { Type: 'SILVER', Amount: 300 }],
            Perfect_Bonus: [],
        },
        Costs: { GRAIN: 0, TROOPS: 0, SILVER: 0, TIME_MINUTES: 0 },
        ...overrides,
    };
}

function sampleHub(military: Record<string, unknown>[]): Record<string, unknown> {
    return {
        Lobby_Hub: {
            Current_Theme: {
                Theme_ID: 'DEFAULT_DAY',
                Day_Night_Mode: 'DAY',
                Festival_Theme_ID: 'NONE',
                Background_ID: 'HALL_BG_DAY_01',
                Overlay_Tint: '#F4D9A5',
            },
            Mission_Boards: {
                Military: { Tasks: military, Last_Refresh_At: '2026-04-11T06:00:00' },
                Domestic: { Tasks: [task('D1', { Required_Rank: 0 })], Last_Refresh_At: '2026-04-11T06:00:00' },
            },
        },
    };
}

export function createHallMissionBoardPresenterSuite(): TestSuite {
    const suite = new TestSuite('HallMissionBoardPresenter (HALL-01/03 大廳任務牆列資料)');

    suite.test('驗證失敗：回傳 issues 且不產生 hub', () => {
        const result = loadLobbyHub({});
        assert.equals(false, result.ok);
        assert.equals(true, !result.ok && result.issues.length > 0);
    });

    suite.test('驗證通過：回傳強型別 hub', () => {
        const result = loadLobbyHub(sampleHub([task('M1')]));
        assert.equals(true, result.ok);
        assert.equals(1, result.ok ? result.hub.Mission_Boards.Military.Tasks.length : -1);
    });

    suite.test('官階不足的任務不出現在列中；已接取置頂且不可再接', () => {
        const loaded = loadLobbyHub(sampleHub([
            task('A', { Required_Rank: 4 }),
            task('B', { Required_Rank: 0 }),
            task('C', { Required_Rank: 1, Is_Accepted: true }),
        ]));
        if (!loaded.ok) throw new Error('fixture should validate');
        const rows = buildHallBoardRows(loaded.hub, 'Military', { rankTier: 3, worldStage: 0, intel: 100 });
        assert.equals(2, rows.length);
        assert.equals('C', rows[0].taskId);
        assert.equals(true, rows[0].accepted);
        assert.equals(false, rows[0].canAccept);
        assert.equals('B', rows[1].taskId);
        assert.equals(true, rows[1].canAccept);
    });

    suite.test('列文字：難度、官階需求、獎勵依暫定對照表產生', () => {
        const loaded = loadLobbyHub(sampleHub([task('B', { Required_Rank: 2 })]));
        if (!loaded.ok) throw new Error('fixture should validate');
        const [row] = buildHallBoardRows(loaded.hub, 'Military', { rankTier: 3, worldStage: 0, intel: 100 });
        assert.equals('精英', row.difficultyText);
        assert.equals('官階 2 以上', row.requiredRankText);
        assert.equals('糧草 +1200、黃金 +300', row.rewardText);
        assert.equals('任務B', row.title);
    });

    suite.test('軍事牆依情報度過濾，內政牆不看情報', () => {
        const loaded = loadLobbyHub(sampleHub([task('I', { Required_Intel: 60 })]));
        if (!loaded.ok) throw new Error('fixture should validate');
        const player = { rankTier: 3, worldStage: 0, intel: 10 };
        assert.equals(0, buildHallBoardRows(loaded.hub, 'Military', player).length);
        assert.equals(1, buildHallBoardRows(loaded.hub, 'Domestic', player).length);
    });

    return suite;
}
