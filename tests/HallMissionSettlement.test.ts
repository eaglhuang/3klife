/**
 * HallMissionSettlement — 大廳任務結算轉官職經驗與晉升提示（OFC-08 最小可行）的 headless 測試
 *
 * 鎖住：難度與任務牆對應、無對應不入帳、結算入帳經驗、晉升時發出 OfficerPromoted 事件、
 * 晉升文案逐階一行。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, GAME_SESSION_EVENTS } from '../assets/scripts/core/managers/GameSession';
import { hallMissionToOfficerTask, officerPromotionNoticeOf } from '../assets/scripts/core/systems/HallMissionSettlement';

export function createHallMissionSettlementSuite(): TestSuite {
    const suite = new TestSuite('HallMissionSettlement (大廳任務結算 OFC-08)');

    suite.test('難度與任務牆對應：EASY→EASY、HELL→HELL、Military→MILITARY', () => {
        const task = hallMissionToOfficerTask({ difficulty: 'HELL', board: 'Military', success: true });
        assert.equals('HELL', task?.difficulty ?? '');
        assert.equals('MILITARY', task?.boardType ?? '');
        assert.equals('EASY', hallMissionToOfficerTask({ difficulty: 'EASY', board: 'Domestic', success: false })?.difficulty ?? '');
    });

    suite.test('無對應（未知難度或 Expedition 牆）回傳 null', () => {
        assert.isTrue(hallMissionToOfficerTask({ difficulty: 'LEGENDARY', board: 'Military', success: true }) === null);
        assert.isTrue(hallMissionToOfficerTask({ difficulty: 'NORMAL', board: 'Expedition', success: true }) === null);
    });

    suite.test('結算入帳經驗；失敗也入帳（0.4 倍）', () => {
        const session = new GameSession();
        session.settleHallMission({ difficulty: 'NORMAL', board: 'Domestic', success: true });
        assert.equals(18, session.officerState.officerExp);
        session.settleHallMission({ difficulty: 'NORMAL', board: 'Domestic', success: false });
        assert.equals(25, session.officerState.officerExp);
    });

    suite.test('結算造成晉升時發出 OfficerPromoted，且 tiers 為新解鎖的階位', () => {
        const emitted: Array<{ name: string; payload: unknown }> = [];
        const session = new GameSession();
        session.setEventEmitter({ emit: (name, payload) => emitted.push({ name, payload }) });
        assert.equals(0, session.settleHallMission({ difficulty: 'HELL', board: 'Military', success: true }).length, '79 經驗不足 100');
        const promoted = session.settleHallMission({ difficulty: 'HELL', board: 'Military', success: true });
        assert.equals(2, promoted[0] ?? -1);
        const event = emitted.find((e) => e.name === GAME_SESSION_EVENTS.OfficerPromoted);
        assert.isTrue(event !== undefined);
        assert.equals(2, (event?.payload as { tiers: number[] }).tiers[0] ?? -1);
    });

    suite.test('沒有晉升時不發事件', () => {
        const emitted: string[] = [];
        const session = new GameSession();
        session.setEventEmitter({ emit: (name) => emitted.push(name) });
        session.settleHallMission({ difficulty: 'EASY', board: 'Domestic', success: false });
        assert.isFalse(emitted.includes(GAME_SESSION_EVENTS.OfficerPromoted));
    });

    suite.test('晉升文案逐階一行，附階位名稱', () => {
        const lines = officerPromotionNoticeOf([2, 3], [{ tier: 2, title: '縣府佐官' }, { tier: 3, title: '郡守' }]);
        assert.equals('晉升 縣府佐官', lines[0] ?? '');
        assert.equals('晉升 郡守', lines[1] ?? '');
        assert.equals(0, officerPromotionNoticeOf([]).length);
    });

    return suite;
}
