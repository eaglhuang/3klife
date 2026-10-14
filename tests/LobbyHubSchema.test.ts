import { assert, TestSuite } from './TestRunner';
import { validateLobbyHub, HALL_DIFFICULTIES } from '../assets/scripts/core/systems/LobbyHubSchema';

function sampleTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        Task_ID: 'HALL_MIL_001',
        Task_Title: '邊境伏擊',
        Task_Brief: '探子回報邊境糧道異動，仍有五成情報未明。',
        Task_Detail: '探子回報邊境糧道異動，疑有伏兵與偽裝補給線。',
        Difficulty: 'ELITE',
        Required_Rank: 3,
        Required_Intel: 40,
        Intel_Reveal_Percent: 50,
        Selected_General_UID: null,
        Is_Accepted: false,
        Suggested_General_UID: 'G021',
        Volunteer_General_UIDs: ['G021'],
        AI_Assign_Enabled: true,
        Available_Actions: ['RECON', 'EXECUTE', 'WAIT', 'ASSIGN'],
        Rewards: {
            Base: [{ Type: 'GRAIN', Amount: 1200 }, { Type: 'SILVER', Amount: 300 }],
            Perfect_Bonus: [{ Type: 'GENERAL_EXP', Amount: 80 }],
        },
        Costs: { GRAIN: 200, TROOPS: 80, SILVER: 150, TIME_MINUTES: 180 },
        ...overrides,
    };
}

function sampleHub(tasks: Record<string, unknown>[] = [sampleTask()]): Record<string, unknown> {
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
                Military: { Tasks: tasks, Last_Refresh_At: '2026-04-11T06:00:00' },
                Domestic: { Tasks: [], Last_Refresh_At: '2026-04-11T06:00:00' },
            },
        },
    };
}

function firstIssue(raw: unknown): string {
    return validateLobbyHub(raw).issues[0]?.path ?? '';
}

export function createLobbyHubSchemaSuite(): TestSuite {
    const suite = new TestSuite('LobbyHubSchema (HALL-01 大廳資料模型)');

    suite.test('規格範例資料通過驗證', () => {
        const result = validateLobbyHub(sampleHub());
        assert.isTrue(result.ok);
        assert.equals(0, result.issues.length);
    });

    suite.test('難度為五級', () => {
        assert.equals(5, HALL_DIFFICULTIES.length);
    });

    suite.test('缺少 Lobby_Hub 物件：回報路徑 Lobby_Hub', () => {
        assert.equals('Lobby_Hub', firstIssue({}));
    });

    suite.test('任務牆缺少 Domestic：回報缺少此任務牆', () => {
        const raw = sampleHub() as { Lobby_Hub: { Mission_Boards: Record<string, unknown> } };
        delete raw.Lobby_Hub.Mission_Boards.Domestic;
        assert.equals('Lobby_Hub.Mission_Boards.Domestic', firstIssue(raw));
    });

    suite.test('未知難度與未知行動都會被擋下', () => {
        assert.isFalse(validateLobbyHub(sampleHub([sampleTask({ Difficulty: 'SUPER' })])).ok);
        assert.isFalse(validateLobbyHub(sampleHub([sampleTask({ Available_Actions: ['FLY'] })])).ok);
    });

    suite.test('情報度超出 0~100 與負數耗費會被擋下', () => {
        assert.equals('Lobby_Hub.Mission_Boards.Military.Tasks[0].Intel_Reveal_Percent', firstIssue(sampleHub([sampleTask({ Intel_Reveal_Percent: 120 })])));
        assert.equals('Lobby_Hub.Mission_Boards.Military.Tasks[0].Costs.GRAIN', firstIssue(sampleHub([sampleTask({ Costs: { GRAIN: -1, TROOPS: 0, SILVER: 0, TIME_MINUTES: 0 } })])));
    });

    suite.test('Overlay_Tint 必須為 #RRGGBB', () => {
        const raw = sampleHub() as { Lobby_Hub: { Current_Theme: Record<string, unknown> } };
        raw.Lobby_Hub.Current_Theme.Overlay_Tint = 'red';
        assert.equals('Lobby_Hub.Current_Theme.Overlay_Tint', firstIssue(raw));
    });

    suite.test('驗證不改輸入', () => {
        const raw = sampleHub([sampleTask({ Difficulty: 'SUPER' })]);
        const before = JSON.stringify(raw);
        validateLobbyHub(raw);
        assert.equals(before, JSON.stringify(raw));
    });

    return suite;
}
