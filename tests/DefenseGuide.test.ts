// @spec-source → PROG-2-10019 年終守城玩家引導（進場提示、部署橫幅、未部署閘門）
import * as fs from 'fs';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 100, int: 90, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

/** 玩家守城＋出征帳本；food／troops 可壓低來模擬沒卡或糧草不足 */
function defenseBattle(sortie: { food: number; troops: number }, defending = true): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0);
    const ctrl = new BattleController();
    ctrl.initBattle(general('lord', Faction.Player), general('foe', Faction.Enemy));
    if (defending) ctrl.configureSiegeDefender(Faction.Player);
    ctrl.configureSortie({ commandCapacity: 9000, cityTroops: 9000, stageSortieCap: 9000, food: sortie.food });
    // 帳本有最低保證兵力，直接把可用軍勢壓到指定值來模擬「軍勢耗盡」
    const ledger = ctrl as unknown as { sortie: { poolCurrent: number } };
    ledger.sortie = { ...ledger.sortie, poolCurrent: sortie.troops };
    return ctrl;
}

function playerUnits(ctrl: BattleController): number {
    let n = 0;
    ctrl.state.units.forEach(u => { if (u.faction === Faction.Player) n += 1; });
    return n;
}
import { DEFENSE_GUIDE_TEXT_FALLBACK_ZH_TW, defenseBannerKey, fallbackDefenseGuideText, guardTicketApplies, guardTicketJustUsed, isDefenseDeployBlocked, withDefenseGuideFallback } from '../assets/scripts/core/systems/DefenseGuide';

export function createDefenseGuideSuite(): TestSuite {
    const suite = new TestSuite('DefenseGuide');
    const langs = ['zh-TW', 'zh-CN', 'en', 'ja'];

    suite.test('四語鍵齊全且非空，entry 帶 {0} 回合數參數', () => {
        for (const lang of langs) {
            const table = JSON.parse(fs.readFileSync(`assets/resources/i18n/${lang}.json`, 'utf8')) as Record<string, string>;
            for (const key of Object.keys(DEFENSE_GUIDE_TEXT_FALLBACK_ZH_TW)) assert.isTrue((table[key] ?? '').length > 0, `${lang}:${key}`);
            assert.isTrue(table['ui.battle.defense.entry'].includes('{0}'), `${lang} entry 缺 {0}`);
            assert.isTrue(table['ui.battle.defense.guard_granted'].includes('{0}'), `${lang} guard_granted 缺 {0}`);
        }
    });

    suite.test('zh-TW 語系表與程式內預設一致', () => {
        const table = JSON.parse(fs.readFileSync('assets/resources/i18n/zh-TW.json', 'utf8')) as Record<string, string>;
        for (const key of Object.keys(DEFENSE_GUIDE_TEXT_FALLBACK_ZH_TW)) assert.equals(DEFENSE_GUIDE_TEXT_FALLBACK_ZH_TW[key], table[key], key);
    });

    suite.test('文字：位置參數代入；語系缺 key 退回預設', () => {
        assert.isTrue(fallbackDefenseGuideText('ui.battle.defense.entry', '12').includes('12 回合'));
        assert.equals('x', withDefenseGuideFallback(() => 'x')('ui.battle.defense.entry'));
        assert.isTrue(withDefenseGuideFallback(k => k)('ui.battle.defense.banner_deploy').includes('結束回合'));
    });

    suite.test('橫幅：未部署顯示部署說明，部署後顯示開戰說明', () => {
        assert.equals('ui.battle.defense.banner_deploy', defenseBannerKey(0));
        assert.equals('ui.battle.defense.banner_ready', defenseBannerKey(2));
    });

    suite.test('閘門：守城且未部署才擋；已部署或非守城不擋', () => {
        assert.isTrue(isDefenseDeployBlocked(true, 0));
        assert.isFalse(isDefenseDeployBlocked(true, 1));
        assert.isFalse(isDefenseDeployBlocked(false, 0));
    });

    suite.test('閘門：自動代打中放行（AI 代為部署），手動結束回合仍擋；部署過一次後放行不變', () => {
        assert.isFalse(isDefenseDeployBlocked(true, 0, true), '自動代打放行');
        assert.isTrue(isDefenseDeployBlocked(true, 0, false), '手動結束回合仍擋');
        assert.isFalse(isDefenseDeployBlocked(true, 2, false), '已部署放行');
    });

    suite.test('保底兵：沒有兵力可部署時發一張，免糧草免軍勢，部署成功且閘門條件解除', () => {
        const ctrl = defenseBattle({ food: 1000, troops: 0 });
        assert.isTrue(ctrl.grantDefenseGuardInfantry(), '應發保底兵');
        assert.isTrue(ctrl.hasDefenseGuardInfantry);
        const food = ctrl.getSortieState()!.food;
        const pool = ctrl.getSortieState()!.poolCurrent;
        const outcome = ctrl.tryDeployTroop(TroopType.Infantry, 2);
        assert.isTrue(outcome.ok, '保底步兵可部署');
        assert.equals(food, ctrl.getSortieState()!.food, '不扣糧草');
        assert.equals(pool, ctrl.getSortieState()!.poolCurrent, '不扣軍勢');
        assert.equals(1, playerUnits(ctrl));
        assert.isFalse(ctrl.hasDefenseGuardInfantry, '券已用掉');
    });

    suite.test('保底兵：糧草不足以部署任何一張時發；每場只發一次', () => {
        const ctrl = defenseBattle({ food: 0, troops: 9000 });
        assert.isTrue(ctrl.grantDefenseGuardInfantry());
        assert.isFalse(ctrl.grantDefenseGuardInfantry(), '第二次不再發');
        assert.isTrue(ctrl.tryDeployTroop(TroopType.Infantry, 1).ok);
        assert.isFalse(ctrl.grantDefenseGuardInfantry(), '用掉後也不再補發');
        assert.isFalse(ctrl.tryDeployTroop(TroopType.Infantry, 3).ok, '沒券後回到原本的糧草檢查');
    });

    suite.test('保底兵：有可部署的卡時不發；非守城不發；保底券只換步兵', () => {
        assert.isFalse(defenseBattle({ food: 1000, troops: 9000 }).grantDefenseGuardInfantry(), '有卡不發');
        assert.isFalse(defenseBattle({ food: 0, troops: 0 }, false).grantDefenseGuardInfantry(), '非守城不發');
        const ctrl = defenseBattle({ food: 0, troops: 0 });
        ctrl.grantDefenseGuardInfantry();
        assert.isFalse(ctrl.tryDeployTroop(TroopType.Cavalry, 2).ok, '騎兵不能用保底券');
        assert.isTrue(ctrl.hasDefenseGuardInfantry, '券未被消耗');
    });

    suite.test('自動代打：AI 在守城會部署（有卡時部署一般兵種，無卡時用保底步兵）', () => {
        const rich = defenseBattle({ food: 1000, troops: 9000 });
        rich.enableDelegateFromGeneral();
        rich.runPlayerDelegateDeployPhase();
        assert.isTrue(playerUnits(rich) >= 1, '有卡：AI 部署');
        const poor = defenseBattle({ food: 0, troops: 0 });
        assert.isTrue(poor.grantDefenseGuardInfantry());
        poor.enableDelegateFromGeneral();
        poor.runPlayerDelegateDeployPhase();
        assert.isTrue(playerUnits(poor) >= 1, '無卡：AI 用保底步兵部署');
        assert.isFalse(poor.hasDefenseGuardInfantry);
    });

    suite.test('接線：只有結束回合過閘門（自動代打不再擋），BattleScene 進場發保底兵並掛提示與橫幅', () => {
        const turn = fs.readFileSync('assets/scripts/battle/views/TurnFlowManager.ts', 'utf8');
        const bridge = fs.readFileSync('assets/scripts/battle/views/BattleUIBridge.ts', 'utf8');
        const scene = fs.readFileSync('assets/scripts/battle/views/BattleScene.ts', 'utf8');
        assert.isTrue(turn.includes("blockIfDefenseUndeployed?.('end_turn')"));
        assert.isFalse(bridge.includes("blockIfDefenseUndeployed('auto')"), '自動代打不可再被閘門擋');
        assert.isTrue(bridge.includes('this.autoPlay.active);'), '閘門讀取自動代打狀態');
        assert.isTrue(scene.includes('new DefenseDeployGuide(') && scene.includes("'ui.battle.defense.entry'"));
        assert.isTrue(scene.includes('grantDefenseGuardInfantry()') && scene.includes("'ui.battle.defense.guard_granted'"));
    });

    suite.test('保底券標示（PROG-2-10041）：Toast 指明兵種、卡面小標與用券提示走四語 key', () => {
        for (const lang of langs) {
            const table = JSON.parse(fs.readFileSync(`assets/resources/i18n/${lang}.json`, 'utf8')) as Record<string, string>;
            assert.isTrue((table['ui.battle.defense.guard_badge'] ?? '').length > 0, `${lang} guard_badge`);
            assert.isTrue((table['ui.battle.defense.guard_used'] ?? '').length > 0, `${lang} guard_used`);
        }
        assert.isTrue(fallbackDefenseGuideText('ui.battle.defense.guard_granted', '步兵').includes('保底券：只能用在步兵卡'));
        assert.equals('已使用保底券', fallbackDefenseGuideText('ui.battle.defense.guard_used'));
        assert.isTrue(guardTicketApplies('infantry', 'infantry'));
        assert.isFalse(guardTicketApplies('infantry', 'archer'), '只有步兵卡有小標');
        assert.isFalse(guardTicketApplies(null, 'infantry'), '沒券不標');
        assert.isTrue(guardTicketJustUsed(true, false));
        assert.isFalse(guardTicketJustUsed(true, true));
        assert.isFalse(guardTicketJustUsed(false, false));
        const scene = fs.readFileSync('assets/scripts/battle/views/BattleScene.ts', 'utf8');
        const tally = fs.readFileSync('assets/scripts/ui/components/TigerTallyComposite.ts', 'utf8');
        assert.isTrue(scene.includes('setGuardTicket?.(TroopType.Infantry)') && scene.includes("'ui.battle.defense.guard_used'"));
        assert.isTrue(tally.includes('GuardTicketBadge') && tally.includes('isAbsoluteTop = false'), '小標用相對錨點');
    });

    return suite;
}
