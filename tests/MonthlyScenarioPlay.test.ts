/**
 * MonthlyScenarioPlay.test.ts — 月度場景賽參戰：資格篩選、取前 3 計分、同月留最高分、存檔正規化、彈窗「場景賽」鈕（PROG-2-1754）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { monthKeyOf, playMonthlyScenario } from '../assets/scripts/core/systems/MonthlyScenarioCup';
import { createTournamentState, normalizeTournamentState } from '../assets/scripts/core/systems/TournamentLocal';
import { TournamentPanelController } from '../assets/scripts/ui/core/TournamentPanelController';

const JAN = new Date(2026, 0, 15, 12).getTime();
const FEB = new Date(2026, 1, 15, 12).getTime();

function hero(id: string, name: string, str: number, troopAptitude?: Record<string, string>): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str, int: 60, lea: 60, luk: 50, pol: 60, cha: 60, troopAptitude } as unknown as GeneralConfig;
}

export function createMonthlyScenarioPlaySuite(): TestSuite {
    const suite = new TestSuite('MonthlyScenarioPlay (月度場景賽參戰 PROG-2-1754)');

    suite.test('1 月冰天雪地：帶騎兵戰法者排除，其餘取前 3 計分；同月較低分不覆蓋', () => {
        const generals = [
            { id: 'a', str: 90, int: 60, lea: 60, luk: 50 },
            { id: 'b', str: 80, int: 60, lea: 60, luk: 50 },
            { id: 'c', str: 70, int: 60, lea: 60, luk: 50 },
            { id: 'd', str: 60, int: 60, lea: 60, luk: 50 },
            { id: 'e', str: 99, int: 99, lea: 99, luk: 99, tacticTags: ['cavalry'] },
        ];
        const first = playMonthlyScenario([], generals, JAN);
        assert.isTrue(first.ok);
        assert.equals('冰天雪地', first.scenarioName);
        assert.equals('a,b,c', first.memberIds.join(','));
        assert.equals(1, first.rejected);
        assert.equals(first.score, first.best);
        assert.equals(monthKeyOf(JAN), first.history[0].monthKey);
        const weaker = playMonthlyScenario(first.history, generals.slice(2, 4), JAN);
        assert.isTrue(weaker.ok);
        assert.isTrue(weaker.score < first.score);
        assert.equals(first.score, weaker.best);
        assert.equals(first.score, weaker.history[0].score);
    });

    suite.test('2 月赤壁水戰：無水軍／弓兵 A 以上回 no-eligible，歷史不變', () => {
        const r = playMonthlyScenario([], [{ id: 'a', str: 90, troopAptitude: { INFANTRY: 'S', NAVY: 'B' } }], FEB);
        assert.isFalse(r.ok);
        assert.equals('no-eligible', r.reason ?? '');
        assert.equals(0, r.history.length);
        assert.isTrue(playMonthlyScenario([], [{ id: 'b', str: 50, troopAptitude: { ARCHER: 'A' } }], FEB).ok);
    });

    suite.test('存檔正規化保留場景賽歷史、丟掉壞紀錄', () => {
        const raw = { ...createTournamentState(0), monthlyHistory: [{ monthKey: '2026-01', scenarioName: '冰天雪地', score: 500 }, { monthKey: 3 }] };
        const state = normalizeTournamentState(JSON.parse(JSON.stringify(raw)));
        assert.equals(1, state?.monthlyHistory?.length ?? 0);
        assert.equals(500, state?.monthlyHistory?.[0].score ?? 0);
        assert.equals(undefined, normalizeTournamentState(createTournamentState(0))?.monthlyHistory);
    });

    suite.test('彈窗「場景賽」鈕：參戰後訊息列出得分與出戰、月度列附本月最佳，不動主賽積分', () => {
        const session = new GameSession(1);
        session.enrollGenerals([hero('x', '甲', 90), hero('y', '乙', 80)]);
        const names: Record<string, string> = { x: '甲', y: '乙' };
        const deps = {
            now: () => JAN,
            status: (nowMs: number) => session.tournamentStatus(nowMs),
            register: (nowMs: number) => session.registerTournament(nowMs),
            play: (nowMs: number) => session.playTournament(nowMs),
            generalName: (id: string) => names[id],
            pendingRewards: (nowMs: number) => session.pendingTournamentRewards(nowMs),
            claimRewards: (nowMs: number) => session.claimTournamentRewards(nowMs, () => undefined),
        };
        const plain = new TournamentPanelController(deps);
        assert.isFalse(plain.getFlowView().enabled.btnMonthly);
        assert.isFalse(plain.playMonthly());

        const panel = new TournamentPanelController({
            ...deps,
            playMonthly: (nowMs) => session.playMonthlyScenario(nowMs),
            monthlyHistory: () => session.monthlyScenarioHistory,
        });
        let view = panel.getFlowView();
        assert.isTrue(view.enabled.btnMonthly);
        assert.equals('場景賽', view.texts.btnMonthlyLabel);
        assert.isFalse(view.texts.trnMonthlyLabel.includes('本月最佳'));
        assert.isTrue(panel.playMonthly());
        const best = session.monthlyScenarioHistory[0].score;
        assert.isTrue(best > 0);
        assert.equals(`場景賽【冰天雪地】得分 ${best}（本月最佳 ${best}）｜出戰：甲、乙`, panel.message);
        view = panel.getFlowView();
        assert.isTrue(view.texts.trnMonthlyLabel.endsWith(`｜本月最佳 ${best}`));
        assert.equals(0, session.tournamentStatus(JAN).points);
    });

    return suite;
}
