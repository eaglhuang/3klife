/**
 * GeneralSortieRules.test.ts — 主將出陣規則（PROG-2-9719，使用者 11/22 裁決）
 * Q1=B 單挑移到場邊、演完回格；Q4=A 只能從出兵口 depth 0 衝出；Q5=A 主將倒下全軍加倍消失、不做撤回。
 * Q3=B（小兵攻擊範圍內優先打主將）已由 BattleCombatRegression 鎖住，這裡只確認範圍沒擴大到打旁路小兵。
 */
import * as fs from 'fs';
import * as path from 'path';
import { Faction, GAME_CONFIG, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { applyGeneralSortieBoost, clearGeneralSortieBoost, isGeneralSortieDepth } from '../assets/scripts/battle/shared/GeneralSortieBoost';
import { TestSuite, assert } from './TestRunner';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

function createGeneral(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({ id, name: id, faction, hp: 1000, maxSp: 100, str: 100, int: 90, lea: 90, luk: 0, skillId: 'none' });
}

function troop(id: string, faction: Faction, attack: number): TroopUnit {
    return new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack, defense: 10, moveRange: 1, attackRange: 1 });
}

export function createGeneralSortieRulesSuite(): TestSuite {
    const suite = new TestSuite('GeneralSortieRules (主將出陣規則 PROG-2-9719)');

    suite.test('Q5：出陣加倍有紀錄、不重複加；清除只扣回加倍量、不動其他加成', () => {
        const u = troop('u', Faction.Player, 30);
        u.attackBonus = 5; // 其他來源的加成
        applyGeneralSortieBoost(u);
        applyGeneralSortieBoost(u);
        assert.equals(35, u.attackBonus, '只加一次');
        assert.equals(1, clearGeneralSortieBoost([u, troop('e', Faction.Enemy, 20)], Faction.Player));
        assert.equals(5, u.attackBonus, '扣回後保留其他加成');
        assert.equals(0, clearGeneralSortieBoost([u], Faction.Player), '再清一次不會多扣');
        assert.equals(5, u.attackBonus);
    });

    suite.test('Q5：主將化身倒下 → 全軍加倍消失，之後新部署的小兵也不再加倍', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(createGeneral('pg', Faction.Player), createGeneral('eg', Faction.Enemy));
        const before = ctrl.deployTroop(TroopType.Infantry, 1);
        assert.isDefined(before);
        const base = before!.attackBonus;
        assert.equals('ok', ctrl.startGeneralDuel());
        const gen = ctrl.placeGeneralOnBoard(2, 0);
        assert.isDefined(gen);
        assert.equals(base + before!.attack, before!.attackBonus, '出陣時加倍');
        before!.moveTo(1, 1);
        const during = ctrl.deployTroop(TroopType.Infantry, 3);
        assert.isDefined(during);
        assert.equals(during!.attack, during!.attackBonus, '出陣期間新部署也加倍');

        gen!.currentHp = 0;
        (ctrl as unknown as { combatResolver: { onGeneralUnitKilled(f: Faction, s: unknown): void } }).combatResolver.onGeneralUnitKilled(Faction.Player, services());
        assert.equals(null, ctrl.playerGeneralUnitId);
        assert.equals(base, before!.attackBonus, '倒下後加倍消失');
        assert.equals(0, during!.attackBonus);
        during!.moveTo(3, 1);
        const after = ctrl.deployTroop(TroopType.Infantry, 4);
        assert.isDefined(after);
        assert.equals(0, after!.attackBonus, '倒下後新部署不加倍');
    });

    suite.test('Q5：單挑流程的武將倒下（duelFlow）也清除加倍', () => {
        const src = read('assets/scripts/battle/runtime/BattleGeneralDuelFlow.ts');
        const fn = src.slice(src.indexOf('public onGeneralUnitKilled'), src.indexOf('private resolveAcceptedGeneralDuel'));
        assert.isTrue(fn.includes('clearGeneralSortieBoost(this.context.state.units.values(), faction)'));
        assert.isFalse(src.includes('u.attackBonus += u.attack;'), '出陣加倍一律走 applyGeneralSortieBoost');
        assert.isFalse(read('assets/scripts/battle/runtime/BattleUnitSpawner.ts').includes('unit.attackBonus += unit.attack;'));
    });

    suite.test('Q4：玩家點格出陣只接受出兵口 depth 0，其他格提示', () => {
        assert.isTrue(isGeneralSortieDepth(0));
        assert.isFalse(isGeneralSortieDepth(1));
        assert.isFalse(isGeneralSortieDepth(7));
        const src = read('assets/scripts/battle/views/TurnFlowManager.ts');
        const i = src.indexOf('if (c.ctrl?.isWaitingDuelPlacement)');
        const block = src.slice(i, src.indexOf('placeGeneralOnBoard(cell.lane, cell.depth)', i));
        assert.isTrue(block.includes("if (!isGeneralSortieDepth(cell.depth)) { c.deployRuntime?.showToast('主將只能從出兵口出陣'"));
        assert.isTrue(src.includes('ctrl.placeGeneralOnBoard(lane, 0)'), '自動代打也放出兵口');
    });

    suite.test('Q1：單挑到場邊演出（棋盤外側），演完各自走回出發腳點（主將回格子）', () => {
        const ur = read('assets/scripts/battle/views/UnitRenderer.ts');
        assert.isTrue(ur.includes('winner, fallen, exchanges, this.duelSidelineArena());'));
        const fn = ur.slice(ur.indexOf('private duelSidelineArena'), ur.indexOf('private duelSidelineArena') + 1500);
        assert.isTrue(fn.includes('DUEL_SIDELINE_LANES'), '往棋盤外側延伸');
        const ov = read('assets/scripts/battle/views/SpineGeneralOverlay.ts');
        assert.isTrue(ov.includes('const midpoint = arenaCenter ?'));
        assert.isTrue(ov.includes('{ unit: first.core, sideline: left,'), '回程目標是出發時的腳點');
    });

    suite.test('Q3：小兵仍不打旁路小兵（五路對撞不變）', () => {
        assert.isFalse(!!(GAME_CONFIG as unknown as { troopEngageAdjacent?: boolean }).troopEngageAdjacent, 'troopEngageAdjacent 維持關閉');
    });

    return suite;
}
