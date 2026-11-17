/**
 * HallMissionRules — 成功率、完美條件、候選排序、委任選將、耗費不足（PROG-2-9130，doc_spec_1178 §7.1、§7.2、§8）
 */
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseHallMissionBalance, type HallMission, type HallMissionBalance } from '../assets/scripts/core/systems/HallMissionData';
import {
    hallGeneralBlockOf, hallPerfectEligible, hallRatePreview, hallRateText, hallShortagesOf, hallSuccessRateOf,
    pickDelegateGeneral, rankHallCandidates, type HallGeneralFacts,
} from '../assets/scripts/core/systems/HallMissionRules';

function balanceOf(): HallMissionBalance {
    const raw = JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/hall-mission-balance.json'), 'utf8'));
    const parsed = parseHallMissionBalance(raw);
    if (parsed.ok === false) throw new Error('數值表驗證失敗');
    return parsed.value;
}

function missionOf(over: Partial<HallMission> = {}): HallMission {
    return {
        id: 'HM-M0001', templateId: 'T', wall: 'Military', difficulty: 'NORMAL', title: '測試任務', brief: 'b', detail: 'd', keyStat: 'str',
        enemyHint: '敵', durationSeasons: 1, powerRequired: 200, rewards: { grain: 200, silver: 0, generalExp: 70 },
        costs: { grain: 60, troops: 80, silver: 0 }, energyCost: 20, intel: 50, createdSeason: 0, expireSeason: 2, waited: false, status: 'OPEN',
        ...over,
    };
}

function gen(id: string, power: number, over: Partial<HallGeneralFacts> = {}): HallGeneralFacts {
    return { id, name: id, power, vitality: 100, stats: { str: 70 }, block: null, ...over };
}

export function createHallMissionRulesSuite(): TestSuite {
    const suite = new TestSuite('HallMissionRules (成功率／候選／委任，PROG-2-9130)');
    const balance = balanceOf();

    suite.test('成功率：戰力等於門檻 → 50%；高於門檻上升、低於下降，夾在 5%～95%', () => {
        const m = missionOf();
        assert.equals(0.5, hallSuccessRateOf(m, gen('a', 200), balance).final);
        assert.isTrue(hallSuccessRateOf(m, gen('a', 260), balance).final > 0.5);
        assert.isTrue(hallSuccessRateOf(m, gen('a', 140), balance).final < 0.5);
        assert.equals(0.95, hallSuccessRateOf(m, gen('a', 99999), balance).final);
        assert.equals(0.05, hallSuccessRateOf(m, gen('a', 0), balance).final);
        assert.equals(0.05, hallSuccessRateOf(m, gen('a', Number.NaN), balance).final);
    });

    suite.test('重點屬性修正：高於 70 加、低於 70 減，並夾在 -6%～+9%；沒有該屬性不修正', () => {
        const m = missionOf();
        const at = (str: number | undefined) => hallSuccessRateOf(m, gen('a', 200, { stats: { str } }), balance);
        assert.equals(0, at(70).keyStatAdjust);
        assert.isTrue(Math.abs(at(80).keyStatAdjust - 0.03) < 1e-9);
        assert.isTrue(Math.abs(at(1).keyStatAdjust - -0.06) < 1e-9, '下限 -6%');
        assert.isTrue(Math.abs(at(200).keyStatAdjust - 0.09) < 1e-9, '上限 +9%');
        assert.equals(0, at(undefined).keyStatAdjust);
    });

    suite.test('自告奮勇 +50%，最終成功率最高 100%', () => {
        const m = missionOf();
        assert.isTrue(Math.abs(hallSuccessRateOf(m, gen('a', 200, { volunteer: true }), balance).final - 1) < 1e-9);
        assert.equals(1, hallSuccessRateOf(m, gen('a', 400, { volunteer: true }), balance).final);
    });

    suite.test('預覽區間：情報未滿顯示 ±15% 並取整 5%；情報 100 顯示確切百分比', () => {
        assert.equals('45%～75%', hallRatePreview(0.6, balance).text);
        assert.equals('45%～75%', hallRateText(0.6, 50, balance));
        assert.equals('60%', hallRateText(0.6, 100, balance));
        assert.equals(0, hallRatePreview(0.05, balance).low);
        assert.equals(100, hallRatePreview(1, balance).high);
    });

    suite.test('完美條件：自告奮勇、重點屬性 ≥ 85、或情報已 100 其一', () => {
        const m = missionOf();
        assert.isFalse(hallPerfectEligible(m, gen('a', 200), balance));
        assert.isTrue(hallPerfectEligible(m, gen('a', 200, { volunteer: true }), balance));
        assert.isTrue(hallPerfectEligible(m, gen('a', 200, { stats: { str: 85 } }), balance));
        assert.isTrue(hallPerfectEligible(missionOf({ intel: 100 }), gen('a', 200), balance));
    });

    suite.test('可派判定：原因優先於精力；精力不足 low-energy；剛好等於耗費可派', () => {
        const m = missionOf();
        assert.equals('on-mission', hallGeneralBlockOf(m, { block: 'on-mission', vitality: 100 }));
        assert.equals('low-energy', hallGeneralBlockOf(m, { block: null, vitality: 19 }));
        assert.isTrue(hallGeneralBlockOf(m, { block: null, vitality: 20 }) === null);
    });

    suite.test('候選排序：可派在前、自告奮勇優先、成功率高到低；不可派排最後', () => {
        const m = missionOf();
        const rows = rankHallCandidates(m, [
            gen('weak', 150), gen('busy', 900, { block: 'on-mission' }), gen('strong', 300), gen('vol', 100, { volunteer: true }),
        ], balance);
        assert.equals('vol,strong,weak,busy', rows.map((r) => r.id).join(','));
    });

    suite.test('委任選將：選最終成功率最高的可派者；同分取精力高，再取代號小；無人可派回 null', () => {
        const m = missionOf();
        assert.equals('b', pickDelegateGeneral(m, [gen('a', 150), gen('b', 300), gen('c', 900, { block: 'dead' })], balance));
        assert.equals('y', pickDelegateGeneral(m, [gen('x', 300, { vitality: 50 }), gen('y', 300, { vitality: 90 })], balance));
        assert.equals('a', pickDelegateGeneral(m, [gen('b', 300), gen('a', 300)], balance));
        assert.isTrue(pickDelegateGeneral(m, [gen('a', 300, { block: 'nurturing' })], balance) === null);
        assert.isTrue(pickDelegateGeneral(m, [], balance) === null);
    });

    suite.test('耗費不足：列出每一項缺少的資源，剛好夠不算缺', () => {
        const costs = { grain: 60, troops: 80, silver: 50 };
        assert.equals(0, hallShortagesOf(costs, { grain: 60, troops: 80, silver: 50 }).length);
        const s = hallShortagesOf(costs, { grain: 10, troops: 80, silver: 0 });
        assert.equals('grain,silver', s.map((x) => x.resource).join(','));
        assert.equals(10, s[0].have);
    });

    return suite;
}
