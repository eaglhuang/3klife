/**
 * BloodlineResonance.test.ts — PROG-2-9170 培育中段血脈共鳴事件（R12 & R24）單元測試
 */
import { assert, TestSuite } from './TestRunner';
import {
    BLOODLINE_RESONANCE_RULES_JSON,
    computeBloodlineResonanceRates,
    computeResonanceStatBonus,
    configureBloodlineResonanceRules,
    dueResonanceRound,
    performBloodlineResonance,
    resetBloodlineResonanceRules,
    resonanceNoticeLine,
    RESONANCE_TOAST_LINE,
} from '../assets/scripts/core/systems/BloodlineResonance';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { NurtureFlowController } from '../assets/scripts/ui/core/NurtureFlowController';
import { Faction } from '../assets/scripts/core/config/Constants';
import type { UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import * as fs from 'fs';
import * as path from 'path';

type LineageGeneralConfig = GeneralConfig & { fatherId?: string; motherId?: string };

function makeGeneral(id: string, extra: Partial<LineageGeneralConfig> = {}): LineageGeneralConfig {
    return {
        id,
        name: id,
        faction: Faction.Player,
        gender: '男',
        hp: 100,
        str: 70,
        int: 60,
        lea: 65,
        pol: 55,
        cha: 60,
        luk: 50,
        stats: { str: 70, int: 60, lea: 65, pol: 55, cha: 60, luk: 50 },
        troopAptitude: { cavalry: 'B', infantry: 'C', archer: 'C' },
        genes: [],
        ...extra,
    };
}

function makeUnveiledChild(id: string, extra: Partial<UnveilingGeneral & LineageGeneralConfig> = {}): UnveilingGeneral & LineageGeneralConfig {
    return {
        ...makeGeneral(id),
        age: 12,
        fate: { recommended: 'Warrior' as never, choice: 'accept' },
        stats: { str: 72, int: 60, lea: 68, pol: 55, cha: 60, luk: 50 },
        ...extra,
    };
}

export function createBloodlineResonanceSuite(): TestSuite {
    const suite = new TestSuite('BloodlineResonance (PROG-2-9170)');

    suite.test('JSON 規則檔載入與公式邊界值（K=0 與上限鉗制）', () => {
        resetBloodlineResonanceRules();
        const jsonPath = path.resolve(__dirname, `../assets/resources/${BLOODLINE_RESONANCE_RULES_JSON}.json`);
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        configureBloodlineResonanceRules(raw);

        // K=0, R=0, S=0 下限檢查
        const low = computeBloodlineResonanceRates(0, 0, 0);
        assert.isTrue(Math.abs(low.triggerRate - 0.35) < 1e-6, `K=0 觸發率應為 0.35，實際 ${low.triggerRate}`);
        assert.isTrue(Math.abs(low.goldRate - 0.05) < 1e-6, `K=0 黃金率應為 0.05，實際 ${low.goldRate}`);
        assert.equals(4, computeResonanceStatBonus(0, false));
        assert.equals(6, computeResonanceStatBonus(0, true));

        // 算例 B：K=9, R=3, S=2 -> P_res=0.68, P_gold=0.29, bonus=6 / 10
        const mid = computeBloodlineResonanceRates(9, 3, 2);
        assert.isTrue(Math.abs(mid.triggerRate - 0.68) < 1e-6);
        assert.isTrue(Math.abs(mid.goldRate - 0.29) < 1e-6);
        assert.equals(6, computeResonanceStatBonus(9, false));
        assert.equals(10, computeResonanceStatBonus(9, true));

        // 極端溢出上限鉗制：K=30, R=99, S=99 -> P_res<=0.95, P_gold<=0.50, bonus<=8 / 12
        const cap = computeBloodlineResonanceRates(30, 99, 99);
        assert.isTrue(Math.abs(cap.triggerRate - 0.95) < 1e-6);
        assert.isTrue(Math.abs(cap.goldRate - 0.50) < 1e-6);
        assert.equals(8, computeResonanceStatBonus(30, false));
        assert.equals(12, computeResonanceStatBonus(30, true));

        resetBloodlineResonanceRules();
    });

    suite.test('一般與黃金共鳴結算：屬性跳升、因子繼承升星（上限 3★）、適性突破上限維持 S', () => {
        const father = makeGeneral('father_1', {
            name: '關羽',
            str: 98,
            lea: 94,
            stats: { str: 98, lea: 94, int: 75, pol: 65, cha: 85, luk: 70 },
            troopAptitude: { cavalry: 'S', infantry: 'A' },
            genes: [
                { id: 'gene_str_blue', displayName: '萬夫莫當', type: '戰鬥', level: 2, isLocked: false },
                { id: 'gene_cav_pink', displayName: '神駒突騎', type: '兵種', level: 3, isLocked: false },
            ],
        });
        const child = makeGeneral('child_1', {
            name: '關興',
            fatherId: 'father_1',
            str: 72,
            lea: 68,
            stats: { str: 72, lea: 68, int: 60, pol: 55, cha: 60, luk: 50 },
            troopAptitude: { cavalry: 'A', infantry: 'C' },
            genes: [
                { id: 'gene_str_blue', displayName: '萬夫莫當', type: '戰鬥', level: 2, isLocked: false },
            ],
        });

        // 測試黃金共鳴（兩次 random 皆 0.01 < triggerRate & goldRate）
        const goldRes = performBloodlineResonance(child, 12, {
            lookup: (id) => (id === 'father_1' ? father : undefined),
            compatibilityK: 15,
            random: () => 0.01,
        });
        assert.isTrue(goldRes !== null);
        assert.isTrue(goldRes!.triggered);
        assert.equals('gold', goldRes!.tier);
        // K=15 黃金雙維各 +12（父親最強為 str, lea）
        assert.equals(84, goldRes!.general.stats!.str);
        assert.equals(80, goldRes!.general.stats!.lea);
        // 同名因子從 2★ 升至 3★
        const upgraded = goldRes!.general.genes!.find((g) => g.id === 'gene_str_blue');
        assert.equals(3, upgraded?.level);
        // 適性從 C/A 選差距最大的 infantry (C vs A -> C->B)
        assert.equals('B', goldRes!.general.troopAptitude!.infantry);

        // 若子嗣已是 S 階，不會突破成 S+
        const childAtS = makeGeneral('child_s', {
            fatherId: 'father_1',
            troopAptitude: { cavalry: 'S', infantry: 'S' },
        });
        const goldAtS = performBloodlineResonance(childAtS, 24, {
            lookup: (id) => (id === 'father_1' ? father : undefined),
            compatibilityK: 15,
            random: () => 0.01,
        });
        assert.isTrue(goldAtS!.triggered);
        assert.equals(undefined, goldAtS!.aptitudeBreakthrough);
        assert.equals('S', goldAtS!.general.troopAptitude!.cavalry);
    });

    suite.test('放棄培育本體不變、重修重播首次鎖定結果（防刷）、讀檔一致、畢業才寫回名冊', () => {
        assert.equals(null, dueResonanceRound(11, undefined, undefined));
        assert.equals(12, dueResonanceRound(12, undefined, undefined));
        assert.equals(null, dueResonanceRound(12, [12], undefined));
        assert.equals(null, dueResonanceRound(24, [12, 24], undefined));

        const father = makeGeneral('f_persist', {
            name: '張飛',
            str: 96,
            lea: 92,
            stats: { str: 96, lea: 92 },
            troopAptitude: { cavalry: 'S', infantry: 'A' },
            genes: [{ id: 'gene_zhang_str', displayName: '萬人敵', type: '戰鬥', level: 2, isLocked: false }],
        });
        const child = makeUnveiledChild('c_persist', {
            fatherId: 'f_persist',
            troopAptitude: { cavalry: 'B', infantry: 'C' },
            genes: [],
        });
        const roster = new InMemoryRosterStore([father, child]);

        // 使用可切換的 RNG：0.08 高於開蒙禮形成率(0.0591)避免開蒙禮干擾，同時低於共鳴黃金率(0.50)必出黃金共鳴
        let rngValue = 0.08;
        const service = new NurtureService(roster, {
            random: () => rngValue,
            currentSeason: () => 1,
            currentMode: () => GameTimeMode.Nurture,
            requireNurtureMode: false,
            compatibilityBonusForChild: () => 15,
        });
        service.start('c_persist', []);

        let r12FirstHit: string | undefined;
        for (let i = 0; i < 12; i++) {
            const res = service.train('c_persist', i % 4 === 3 ? 'rest' : 'str');
            if (res.bloodlineResonance?.triggered) r12FirstHit = res.bloodlineResonance.tier;
        }
        assert.equals('gold', r12FirstHit, '第 1 場 R12 應觸發黃金共鳴');

        // 驗證培育期間名冊本體共鳴因子與適性尚未被寫入（開蒙禮因子不在共鳴檢查範圍，精準檢查 gene_zhang_str）
        const duringNurture = roster.getAll().find((g) => g.id === 'c_persist')!;
        assert.equals(false, (duringNurture.genes ?? []).some((g) => g.id === 'gene_zhang_str'), '培育期間名冊不應提前寫入共鳴因子 gene_zhang_str');
        assert.equals('B', duringNurture.troopAptitude?.cavalry, '培育期間名冊 troopAptitude.cavalry 不應提前寫入');
        assert.equals('C', duringNurture.troopAptitude?.infantry, '培育期間名冊 troopAptitude.infantry 不應提前寫入');

        // 模擬存讀檔還原 NurtureService 與名冊
        const savedState = service.getState();
        const savedRoster = roster.getAll();
        const restoredRoster = new InMemoryRosterStore(savedRoster);
        const restoredService = new NurtureService(restoredRoster, {
            random: () => rngValue,
            currentSeason: () => 1,
            currentMode: () => GameTimeMode.Nurture,
            requireNurtureMode: false,
            compatibilityBonusForChild: () => 15,
        });
        restoredService.restoreState(savedState);

        // 讀檔後於同回合不重複觸發
        assert.equals(null, restoredService.performDueBloodlineResonance('c_persist'));

        // 放棄培育：名冊本體不殘留共鳴因子、troopAptitude、stats 必須維持原狀
        restoredService.abandon('c_persist');
        const afterAbandon = restoredRoster.getAll().find((g) => g.id === 'c_persist')!;
        assert.equals(false, (afterAbandon.genes ?? []).some((g) => g.id === 'gene_zhang_str'), '放棄培育後名冊不應殘留共鳴因子 gene_zhang_str');
        assert.equals('B', afterAbandon.troopAptitude?.cavalry, '放棄培育後名冊 troopAptitude.cavalry 應維持不變');
        assert.equals('C', afterAbandon.troopAptitude?.infantry, '放棄培育後名冊 troopAptitude.infantry 應維持不變');
        assert.equals(72, afterAbandon.stats?.str, '放棄培育後名冊 stats.str 應維持不變');

        // 切換 rngValue = 0.99（正常必 miss）後重新培育，測試 R12 是否重播第一次鎖定的黃金結果（防刷）
        rngValue = 0.99;
        restoredService.start('c_persist', []);
        let replayR12Tier: string | undefined;
        let r24Triggered = false;
        for (let i = 0; i < 36; i++) {
            const res = restoredService.train('c_persist', i % 4 === 3 ? 'rest' : 'str');
            if (res.session.round === 12 && res.bloodlineResonance?.triggered) {
                replayR12Tier = res.bloodlineResonance.tier;
            }
            if (res.session.round === 24 && res.bloodlineResonance?.triggered) {
                r24Triggered = true;
            }
        }
        assert.equals('gold', replayR12Tier, '重修到達 R12 應重播首次鎖定的黃金共鳴結果，不重新擲骰');
        assert.equals(false, r24Triggered, '首次未檢定過的 R24 依新亂數 0.99 應不觸發');

        // 畢業後，R12 鎖定的共鳴因子與兵種適性突破才正式寫回名冊！（father cavalry=S vs child B gap=2，先突破 cavalry B->A）
        const grad = restoredService.graduate('c_persist');
        assert.isTrue((grad.general.genes ?? []).some((g) => g.id === 'gene_zhang_str'), '畢業後應將共鳴因子寫回名冊');
        assert.equals('A', grad.general.troopAptitude?.cavalry, '畢業後應將黃金共鳴適性突破寫回名冊');
    });

    suite.test('NurtureFlowController 沿用既有 showToast 與 _notice 呈現血脈共鳴', async () => {
        const father = makeGeneral('f_ui', {
            name: '趙雲',
            str: 96,
            stats: { str: 96, lea: 90 },
            genes: [{ id: 'g_ui', displayName: '一身是膽', type: '戰鬥', level: 3, isLocked: false }],
        });
        const child = makeUnveiledChild('c_ui', { name: '趙統', fatherId: 'f_ui' });
        const roster = new InMemoryRosterStore([father, child]);
        const service = new NurtureService(roster, {
            random: () => 0.01,
            currentSeason: () => 1,
            currentMode: () => GameTimeMode.Nurture,
            requireNurtureMode: false,
            compatibilityBonusForChild: () => 15,
        });
        service.start('c_ui', []);

        const toasts: string[] = [];
        const controller = new NurtureFlowController({
            unveiling: new UnveilingService(roster),
            nurture: service,
            roster,
            loadMentorCards: async () => [],
            showToast: (msg) => toasts.push(msg),
        });
        controller.select('c_ui');

        for (let i = 0; i < 12; i++) {
            await controller.train(i % 4 === 3 ? 'rest' : 'str');
        }
        assert.isTrue(toasts.includes(RESONANCE_TOAST_LINE.gold), '第 12 回合黃金共鳴應發出 showToast');
        const notice = controller.getView().texts.flowNotice ?? '';
        assert.isTrue(notice.includes('【黃金共鳴】') && notice.includes('趙雲'), `主提示列應含共鳴與先祖姓名，實際：${notice}`);
        assert.equals('', resonanceNoticeLine({
            round: 12,
            triggered: false,
            triggerRate: 0.5,
            goldRate: 0.1,
            compatibilityK: 0,
            general: child,
            lockedOutcome: {
                round: 12,
                triggered: false,
                triggerRate: 0.5,
                goldRate: 0.1,
                compatibilityK: 0,
            },
        }));
    });

    return suite;
}
