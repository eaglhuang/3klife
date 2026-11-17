/**
 * HallMissionView — 任務轉任務牆資料、列狀態文字、詳情視窗內容與停用原因（PROG-2-9130，doc_spec_1178 §5、§6）
 */
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
import { emptyHallMissionState, parseHallMissionBalance, type HallMission, type HallMissionBalance } from '../assets/scripts/core/systems/HallMissionData';
import type { HallCandidate } from '../assets/scripts/core/systems/HallMissionRules';
import {
    HALL_MASK_TEXT, HALL_NO_CANDIDATE_TEXT, hallMissionDialogState, hallMissionToTask, hallMissionsToHub, hallRemainingExpiry,
    hallRowStatusText,
} from '../assets/scripts/ui/core/HallMissionView';

function balanceOf(): HallMissionBalance {
    const raw = JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/hall-mission-balance.json'), 'utf8'));
    const parsed = parseHallMissionBalance(raw);
    if (parsed.ok === false) throw new Error('數值表驗證失敗');
    return parsed.value;
}

function missionOf(over: Partial<HallMission> = {}): HallMission {
    return {
        id: 'HM-M0001', templateId: 'T', wall: 'Military', difficulty: 'NORMAL', title: '清剿山道流寇', brief: '簡述', detail: '完整情報', keyStat: 'str',
        enemyHint: '流寇約五十人', durationSeasons: 1, powerRequired: 200, rewards: { grain: 200, silver: 0, generalExp: 70 },
        costs: { grain: 60, troops: 80, silver: 0 }, energyCost: 20, intel: 50, createdSeason: 0, expireSeason: 2, waited: false, status: 'OPEN',
        ...over,
    };
}

const cand = (id: string, rate: number, block: HallCandidate['block'] = null): HallCandidate =>
    ({ id, name: id, rate, volunteer: false, block, vitality: 100 });
const STOCK = { grain: 500, silver: 500, troops: 500 };

export function createHallMissionViewSuite(): TestSuite {
    const suite = new TestSuite('HallMissionView (任務牆資料／詳情視窗內容，PROG-2-9130)');
    const balance = balanceOf();
    const ctx = (over: Record<string, unknown> = {}) => ({ season: 1, stock: STOCK, balance, candidates: [cand('a', 0.6)], selectedGeneralId: 'a', ...over });

    suite.test('任務牆列：未接取為空字串，進行中顯示「進行中，還有 N 季・武將名」，委任加註', () => {
        assert.equals('', hallRowStatusText(missionOf(), 1));
        const active = missionOf({ status: 'ACTIVE', generalId: 'g', generalName: '張飛', returnSeason: 3, successRate: 0.5 });
        assert.equals('進行中，還有 2 季・張飛', hallRowStatusText(active, 1));
        assert.equals('進行中，還有 2 季・張飛（委任）', hallRowStatusText({ ...active, delegated: true }, 1));
    });

    suite.test('轉任務牆資料：代號、標題、已接取旗標；hub 的三面牆全換成真實任務', () => {
        const task = hallMissionToTask(missionOf({ status: 'ACTIVE', generalId: 'g', generalName: '張飛', returnSeason: 3, successRate: 0.5 }));
        assert.equals('HM-M0001', task.Task_ID);
        assert.equals('清剿山道流寇', task.Task_Title);
        assert.isTrue(task.Is_Accepted === true);
        const state = emptyHallMissionState(1);
        state.boards.Military.push(missionOf());
        const hub = hallMissionsToHub({ Current_Theme: 'x', Mission_Boards: {} } as never, state);
        assert.equals(1, hub.Mission_Boards.Military.Tasks.length);
        assert.equals(0, hub.Mission_Boards.Domestic.Tasks.length);
    });

    suite.test('剩餘期限：到期季 − 目前季 + 1', () => {
        assert.equals(2, hallRemainingExpiry({ expireSeason: 2 }, 1));
        assert.equals(1, hallRemainingExpiry({ expireSeason: 2 }, 2));
    });

    suite.test('情報未滿：敵情與完美加成遮成 ???，成功率顯示區間；情報滿顯示全部與確切百分比', () => {
        const half = hallMissionDialogState(missionOf(), ctx());
        assert.isTrue(half.envScoutTerrainLine.includes(HALL_MASK_TEXT));
        assert.isFalse(half.envScoutTerrainLine.includes('流寇'));
        assert.equals(HALL_MASK_TEXT, half.rewardPerfectLabel);
        assert.isTrue(half.generalSelectHintLabel.includes('45%～75%'));
        assert.isTrue(half.intelFogVisible);
        const full = hallMissionDialogState(missionOf({ intel: 100 }), ctx());
        assert.isTrue(full.envScoutTerrainLine.includes('流寇約五十人'));
        assert.isTrue(full.generalSelectHintLabel.includes('60%'));
        assert.isFalse(full.generalSelectHintLabel.includes('～'));
        assert.isFalse(full.intelFogVisible);
    });

    suite.test('內容來自任務本身：標題、獎勵、耗費、期限與重點屬性；內政任務沒有敵情', () => {
        const s = hallMissionDialogState(missionOf(), ctx());
        assert.equals('清剿山道流寇', s.missionTitle);
        assert.equals('糧草 +200、武將經驗 +70', s.rewardBaseLabel);
        assert.equals('60', s.costFoodValueLabel);
        assert.equals('1 季', s.costTimeValueLabel);
        assert.isTrue(s.envScoutWeatherLine.includes('武力'));
        assert.isTrue(s.envScoutWeatherLine.includes('剩餘期限 2 季'));
        const dom = hallMissionDialogState(missionOf({ wall: 'Domestic' }), ctx());
        assert.equals('本任務無敵情', dom.envScoutTerrainLine);
    });

    suite.test('四鈕停用原因：糧草不足不能再探、已等待不能等待、資源不足與無武將不能執行／委任', () => {
        const base = hallMissionDialogState(missionOf(), ctx());
        assert.equals(4, base.availableActions.length);
        assert.equals(0, Object.keys(base.actionBlockedText).length);
        const poor = hallMissionDialogState(missionOf({ waited: true }), ctx({ stock: { grain: 30, silver: 0, troops: 500 } }));
        assert.isTrue((poor.actionBlockedText['re-scout'] as string).includes('糧草不足'));
        assert.equals('此任務已等待過', poor.actionBlockedText.wait);
        assert.isTrue((poor.actionBlockedText.execute as string).includes('糧草不足'));
        assert.isTrue(poor.costFoodValueLabel.includes('不足'));
        const none = hallMissionDialogState(missionOf({ intel: 100 }), ctx({ candidates: [cand('a', 0.6, 'on-mission')] }));
        assert.equals('情報已完整', none.actionBlockedText['re-scout']);
        assert.equals(HALL_NO_CANDIDATE_TEXT, none.actionBlockedText.execute);
        assert.equals(HALL_NO_CANDIDATE_TEXT, none.actionBlockedText.assign);
    });

    suite.test('進行中的任務：四鈕全停用，原因為任務進行中', () => {
        const s = hallMissionDialogState(missionOf({ status: 'ACTIVE', generalId: 'g', generalName: '張飛', returnSeason: 3, successRate: 0.5 }), ctx());
        assert.equals(0, s.availableActions.length);
        for (const key of ['re-scout', 'wait', 'execute', 'assign'] as const) assert.equals('任務進行中', s.actionBlockedText[key]);
    });

    return suite;
}
