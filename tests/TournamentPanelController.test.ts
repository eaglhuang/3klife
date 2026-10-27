/**
 * TournamentPanelController.test.ts — 名將挑戰賽彈窗：賽季卡文字、按鈕可用、報名與參戰訊息（PROG-2-1191）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { TOURNAMENT_DAY_MS } from '../assets/scripts/core/systems/TournamentLocal';
import { seriesText, TournamentPanelController } from '../assets/scripts/ui/core/TournamentPanelController';

const D = TOURNAMENT_DAY_MS;

function hero(id: string, name: string, str: number): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str, int: 60, lea: 60, pol: 60, cha: 60 } as unknown as GeneralConfig;
}

function setup(gold: number): { panel: TournamentPanelController; clock: { now: number }; wallet: { gold: number } } {
    const session = new GameSession(1);
    session.enrollGenerals([hero('x', '甲', 90), hero('y', '乙', 80)]);
    const clock = { now: 0 };
    const wallet = { gold };
    const names: Record<string, string> = { x: '甲', y: '乙' };
    const panel = new TournamentPanelController({
        now: () => clock.now,
        status: (nowMs) => session.tournamentStatus(nowMs),
        register: (nowMs) => session.registerTournament(nowMs),
        play: (nowMs) => session.playTournament(nowMs, (cost) => {
            if (wallet.gold < cost) return false;
            wallet.gold -= cost;
            return true;
        }),
        generalName: (id) => names[id],
    });
    return { panel, clock, wallet };
}

export function createTournamentPanelControllerSuite(): TestSuite {
    const suite = new TestSuite('TournamentPanelController (PROG-2-1191 名將挑戰賽彈窗)');

    suite.test('培育期：顯示季與相位，參戰鈕停用，報名後顯示陣容', () => {
        const { panel } = setup(0);
        let view = panel.getFlowView();
        assert.equals('第 1 季｜培育期｜剩 14 日', view.texts.trnSeasonLabel);
        assert.equals('積分 0｜青銅', view.texts.trnRankLabel);
        assert.equals('競賽期才能參戰', view.texts.trnEntriesLabel);
        assert.isTrue(!view.enabled.btnPlay && view.enabled.btnRegister);
        assert.isTrue(!view.actives.trnResultLabel);
        assert.isTrue(panel.register());
        view = panel.getFlowView();
        assert.equals('出戰：甲、乙（戰力 ' + view.texts.trnTeamLabel.split('戰力 ')[1], view.texts.trnTeamLabel);
        assert.equals('重新報名', view.texts.btnRegisterLabel);
        assert.isTrue(!panel.register());
        assert.equals('培育期每天只能重新報名 1 次。', panel.getFlowView().texts.trnResultLabel);
    });

    suite.test('競賽期：免費一次後改顯示付費，金錢不足提示', () => {
        const { panel, clock, wallet } = setup(30);
        panel.getFlowView();
        clock.now = 7 * D;
        assert.equals('今日剩 5 次（免費 1 次）', panel.getFlowView().texts.trnEntriesLabel);
        assert.isTrue(panel.play());
        let view = panel.getFlowView();
        assert.equals('今日剩 4 次（每次 30 金）', view.texts.trnEntriesLabel);
        assert.equals('參戰（30 金）', view.texts.btnPlayLabel);
        assert.isTrue(view.actives.trnResultLabel && /積分/.test(view.texts.trnResultLabel));
        assert.isTrue(panel.play());
        assert.equals(0, wallet.gold);
        assert.isTrue(!panel.play());
        assert.equals('金錢不足，無法額外參戰。', panel.message);
        panel.reset();
        assert.equals('', panel.getFlowView().texts.trnResultLabel);
    });

    suite.test('系列賽結果文字：勝負、比分、積分變化與花費', () => {
        assert.equals('勝 3:1｜積分 +16 → 1016（白銀）｜花費 30 金', seriesText({
            win: true, games: [true, false, true, true], opponentPower: 100, opponentPoints: 1000,
            pointsDelta: 16, pointsAfter: 1016, tierAfter: 'SILVER', paidExtra: true,
        }));
        assert.equals('敗 0:3｜積分 -16 → 0（青銅）', seriesText({
            win: false, games: [false, false, false], opponentPower: 100, opponentPoints: 0,
            pointsDelta: -16, pointsAfter: 0, tierAfter: 'BRONZE', paidExtra: false,
        }));
    });

    return suite;
}
