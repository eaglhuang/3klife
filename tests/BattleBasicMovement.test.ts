// 基本移動規則逐回合驗證（PROG-2-9351）：小兵每回合該走幾格、哪些情況合法停下、教學戰 12 回合逐隊記錄。
// 規則依據：GAME_CONFIG.maxMoveCellsPerTurn（單回合上限 3）、troopEngageAdjacent=false（小兵不理旁邊小兵）、
// troopEngageAdjacentGeneral=true（走到敵方武將棋子正旁邊就停，PROG-2-9340）、壓制區 FORM-09。
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { executeBattleAutoMovePhase } from '../assets/scripts/battle/runtime/phases/BattleAutoMovePhase';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import type { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { Faction, GAME_CONFIG, StatusEffect, TroopType } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { applyAptitudeMove } from '../assets/scripts/core/systems/BattleAptitude';
import { battleZocField } from '../assets/scripts/battle/shared/ZoneOfControl';

const DIR: Record<string, number> = { [Faction.Player]: 1, [Faction.Enemy]: -1 };
const CAP = GAME_CONFIG.maxMoveCellsPerTurn;

function mkGeneral(id: string, faction: Faction, str = 60): GeneralUnit {
    return new GeneralUnit({ id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str, int: 60, lea: 60,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics', tacticSlots: [] });
}

/** 內部引用（測試專用）：控制器私有的出兵器、回合管理器、戰鬥解算器 */
function internals(ctrl: BattleController) {
    const c = ctrl as any;
    return { spawner: c.unitSpawner, tm: c.turnManager, cr: c.combatResolver };
}

function mkCtrl(pStr = 60, eStr = 60): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(mkGeneral('p', Faction.Player, pStr), mkGeneral('e', Faction.Enemy, eStr));
    return ctrl;
}

function spawn(ctrl: BattleController, faction: Faction, type: TroopType, lane: number, depth: number): TroopUnit {
    return internals(ctrl).spawner.spawnUnit(type, faction, lane, depth);
}

/** 只跑一方的移動階段（不含戰鬥、不部署），驗移動規則本身 */
function runMove(ctrl: BattleController, faction: Faction): void {
    const { tm, cr } = internals(ctrl);
    executeBattleAutoMovePhase({
        state: ctrl.state, actingFaction: faction, turnManager: tm,
        consumeTileBuff: () => {},
        getFactionUnits: (f: Faction) => cr.getFactionUnits(f),
        isCellMovementBlocked: (l: number, d: number) => cr.isCellMovementBlocked(l, d),
        isGeneralUnit: (id: string) => cr.isGeneralUnit(id),
        getAptitudeMoveDelta: (u: TroopUnit) => cr.getUnitMoveDelta(u),
        getAptitudeMoveSetTo: (u: TroopUnit) => cr.getUnitMoveSetTo(u),
    } as any);
}

/** 預期每回合可走格數 = min(上限, 兵種移動力 + 適性／地形修正，至少 1)；騎兵平原有 +2 地形加成所以一回合滿 3 格 */
function expectedSteps(ctrl: BattleController, u: TroopUnit): number {
    const { cr } = internals(ctrl);
    const base = applyAptitudeMove(u.getEffectiveMoveRange(), cr.getUnitMoveDelta(u), cr.getUnitMoveSetTo(u));
    return Math.max(0, Math.min(CAP, base));
}

function removeUnit(ctrl: BattleController, id: string): void { ctrl.state.removeUnit(id); }

// ───────── 教學戰逐回合記錄 ─────────

interface MoveRecord { turn: number; side: string; id: string; type: string; lane: number; from: number; to: number; steps: number; expect: number; reason: string }

/** 在 post（移動階段剛結束）盤面上判斷「沒走滿」有沒有合法停留原因；沒有回傳 ''。 */
function stopReason(ctrl: BattleController, u: TroopUnit, expect: number, steps: number, wasDeployed: boolean): string {
    if (steps >= expect) return steps === 0 && expect === 0 ? '無移動力' : '走滿';
    const { cr } = internals(ctrl);
    const svc = services();
    const dir = DIR[u.faction];
    if (wasDeployed) return '本回合剛部署';
    if (svc.buff.hasBuff(u.id, StatusEffect.Stun)) return '暈眩';
    if (svc.buff.hasBuff(u.id, StatusEffect.Rooted)) return '定身';
    const isGen = cr.isGeneralUnit(u.id);
    // 旁邊（同排左右）有敵方武將棋子
    if (!isGen) {
        for (const dl of [-1, 1]) {
            const o = ctrl.state.getCell(u.lane + dl, u.depth)?.occupantId;
            const ou = o ? ctrl.state.units.get(o) : undefined;
            if (ou && !ou.isDead() && ou.faction !== u.faction && cr.isGeneralUnit(ou.id)) return '旁邊有敵將棋子';
        }
    }
    const next = ctrl.state.getCell(u.lane, u.depth + dir);
    if (!next) return '到底(打主將)';
    if (cr.isCellMovementBlocked(u.lane, u.depth + dir)) return '地塊禁行';
    if (next.occupantId) {
        const o = ctrl.state.units.get(next.occupantId);
        return o && o.faction !== u.faction ? '前方敵軍接戰' : '前方友軍擋住';
    }
    // 壓制區
    const presser = u.faction === Faction.Player ? Faction.Enemy : Faction.Player;
    const sources = cr.getFactionUnits(presser).filter((x: TroopUnit) => !x.isDead() && cr.isGeneralUnit(x.id));
    const zoc = battleZocField(ctrl.state.battleTactic, ctrl.state.getGeneral(presser), ctrl.state.getGeneral(u.faction), sources);
    if (zoc.at(u.lane, u.depth + dir).blocksEntry) return '壓制區禁入';
    // 高成本壓制區：走進去多花移動力，少走一格是合法的
    for (let d = 1; d <= steps + 1; d++) if (zoc.at(u.lane, u.depth + dir * d).extraCost > 0) return '壓制區加成本';
    return '';
}

function runTutorial(withEnemyGeneral: boolean, log: string[]): MoveRecord[] {
    const ctrl = mkCtrl();
    const { tm } = internals(ctrl);
    ctrl.tutorialBattle = true;
    const records: MoveRecord[] = [];
    let turn = 1;
    // 攔截移動階段：移動前後各拍一次快照
    const original = (ctrl as any).executeRuntimePhase.bind(ctrl);
    (ctrl as any).executeRuntimePhase = (name: string) => {
        if (name !== 'player-auto-move' && name !== 'enemy-auto-move') return original(name);
        const faction = name === 'player-auto-move' ? Faction.Player : Faction.Enemy;
        const pre = new Map<string, { lane: number; depth: number; deployed: boolean; expect: number }>();
        ctrl.state.units.forEach((u) => {
            if (u.faction === faction && !u.isDead()) {
                pre.set(u.id, { lane: u.lane, depth: u.depth, deployed: tm.isUnitDeployedThisTurn(u.id), expect: expectedSteps(ctrl, u) });
            }
        });
        const outcome = original(name);
        pre.forEach((p, id) => {
            const u = ctrl.state.units.get(id);
            if (!u || u.isDead()) return;
            const steps = Math.abs(u.depth - p.depth);
            const reason = stopReason(ctrl, u, p.expect, steps, p.deployed);
            records.push({ turn, side: faction === Faction.Player ? '我' : '敵', id, type: u.type, lane: p.lane, from: p.depth, to: u.depth, steps, expect: p.expect, reason });
        });
        return outcome;
    };

    const types = [TroopType.Infantry, TroopType.Cavalry, TroopType.Archer, TroopType.Shield];
    let pickType = 0;
    for (turn = 1; turn <= 12; turn++) {
        // 我方每回合出兵（教學戰每回合 2 隊），逐路找空的起點
        for (let lane = 0; lane < GAME_CONFIG.GRID_LANES; lane++) {
            if (!tm.canDeployPlayer()) break;
            ctrl.deployTroop(types[pickType % types.length], (lane + turn) % GAME_CONFIG.GRID_LANES);
            pickType++;
        }
        // 第 3 回合出武將棋子
        if (turn === 3) {
            const r = ctrl.startGeneralDuel();
            if (r === 'ok') ctrl.placeGeneralOnBoard(2, 0);
        }
        // 敵將棋子（選用）：第 4 回合出現在敵陣最後一排中路，之後正常移動
        if (withEnemyGeneral && turn === 4) {
            const eg = spawn(ctrl, Faction.Enemy, TroopType.Infantry, 2, GAME_CONFIG.GRID_DEPTH - 1);
            ctrl.enemyGeneralUnitId = eg.id;
        }
        if (ctrl.resolvePlayerTurn() !== 'ongoing') break;
        if (ctrl.resolveEnemyTurn() !== 'ongoing') break;
        if (ctrl.finalizeEnemyTurn() !== 'ongoing') break;
    }

    log.push(`── 教學戰逐回合移動表（${withEnemyGeneral ? '含敵將棋子' : '只有我方武將棋子'}）──`);
    log.push('回合 方 兵種 路 起→終 走/預期 說明');
    for (const r of records) {
        log.push(`T${String(r.turn).padStart(2, ' ')} ${r.side} ${r.type.padEnd(8)} L${r.lane} d${r.from}→d${r.to} ${r.steps}/${r.expect} ${r.reason || '【無合法原因卻沒走滿】'}`);
    }
    return records;
}

export function createBattleBasicMovementSuite(): TestSuite {
    const suite = new TestSuite('BattleBasicMovement');

    suite.test('(a) 空路單一小兵：各兵種每回合走的格數（騎兵平原 2+2 取上限 3，其餘 1），多回合累計', () => {
        const cases: Array<[TroopType, number]> = [[TroopType.Cavalry, 3], [TroopType.Infantry, 1], [TroopType.Shield, 1], [TroopType.Archer, 1], [TroopType.Pikeman, 1]];
        for (const [type, step] of cases) {
            for (const faction of [Faction.Player, Faction.Enemy]) {
                const ctrl = mkCtrl();
                const start = faction === Faction.Player ? 0 : GAME_CONFIG.GRID_DEPTH - 1;
                const u = spawn(ctrl, faction, type, 2, start);
                assert.equals(step, expectedSteps(ctrl, u), `${type} 預期格數`);
                for (let t = 1; t <= 2; t++) {
                    const before = u.depth;
                    runMove(ctrl, faction);
                    assert.equals(step, Math.abs(u.depth - before), `${faction} ${type} 第 ${t} 回合走的格數`);
                }
            }
        }
    });

    suite.test('(a2) 單回合上限：移動力加成再高也最多走 3 格；被加成到 5 的騎兵只走 3', () => {
        const ctrl = mkCtrl();
        const u = spawn(ctrl, Faction.Player, TroopType.Cavalry, 1, 0);
        u.moveRangeBonus = 10;
        runMove(ctrl, Faction.Player);
        assert.equals(CAP, u.depth);
    });

    suite.test('(a3) 走到底排（敵方底線）就停，不會走出棋盤', () => {
        const ctrl = mkCtrl();
        const u = spawn(ctrl, Faction.Player, TroopType.Cavalry, 0, GAME_CONFIG.GRID_DEPTH - 2);
        runMove(ctrl, Faction.Player);
        assert.equals(GAME_CONFIG.GRID_DEPTH - 1, u.depth);
        runMove(ctrl, Faction.Player);
        assert.equals(GAME_CONFIG.GRID_DEPTH - 1, u.depth);
    });

    suite.test('(a4) 本回合剛部署的小兵當回合不走，下一回合照常走', () => {
        const ctrl = mkCtrl();
        const { tm } = internals(ctrl);
        const u = spawn(ctrl, Faction.Player, TroopType.Infantry, 0, 0);
        tm.markUnitDeployed(u.id);
        runMove(ctrl, Faction.Player);
        assert.equals(0, u.depth);
        tm.refreshForNextTurn();
        runMove(ctrl, Faction.Player);
        assert.equals(1, u.depth);
    });

    suite.test('(a5) 暈眩、定身的小兵不走；效果過後恢復', () => {
        const ctrl = mkCtrl();
        const svc = services();
        const a = spawn(ctrl, Faction.Player, TroopType.Infantry, 0, 0);
        const b = spawn(ctrl, Faction.Player, TroopType.Infantry, 1, 0);
        svc.buff.applyBuff(a.id, StatusEffect.Stun, 1);
        svc.buff.applyBuff(b.id, StatusEffect.Rooted, 1);
        runMove(ctrl, Faction.Player);
        assert.equals(0, a.depth); assert.equals(0, b.depth);
        svc.buff.tickBuff();
        runMove(ctrl, Faction.Player);
        assert.equals(1, a.depth); assert.equals(1, b.depth);
    });

    suite.test('(b) 同路雙方對撞：相鄰就停，不穿過、不換位', () => {
        const ctrl = mkCtrl();
        const p = spawn(ctrl, Faction.Player, TroopType.Infantry, 2, 3);
        const e = spawn(ctrl, Faction.Enemy, TroopType.Infantry, 2, 5);
        runMove(ctrl, Faction.Player);   // 我方 3→4，與敵方相鄰
        assert.equals(4, p.depth);
        runMove(ctrl, Faction.Enemy);    // 敵方前方就是我方，原地接戰
        assert.equals(5, e.depth);
        runMove(ctrl, Faction.Player);
        assert.equals(4, p.depth);
    });

    suite.test('(b2) 騎兵衝向敵軍：走到敵軍前一格停下', () => {
        const ctrl = mkCtrl();
        const p = spawn(ctrl, Faction.Player, TroopType.Cavalry, 2, 0);
        const e = spawn(ctrl, Faction.Enemy, TroopType.Infantry, 2, 2);
        runMove(ctrl, Faction.Player);
        assert.equals(1, p.depth);
        assert.equals(2, e.depth);
    });

    suite.test('(c) 友軍排隊：後排貼著前排停，前排被敵軍擋住時後排不穿越也不換位', () => {
        const ctrl = mkCtrl();
        const front = spawn(ctrl, Faction.Player, TroopType.Infantry, 1, 3);
        const back = spawn(ctrl, Faction.Player, TroopType.Cavalry, 1, 0);
        // 前排先動（依深度排序）到 d4，後排騎兵 3 格走到 d3 貼住
        runMove(ctrl, Faction.Player);
        assert.equals(4, front.depth);
        assert.equals(3, back.depth);
        // 前排被敵軍擋住不動，後排也原地
        spawn(ctrl, Faction.Enemy, TroopType.Infantry, 1, 5);
        runMove(ctrl, Faction.Player);
        assert.equals(4, front.depth);
        assert.equals(3, back.depth);
        // 後排在較遠處：只走到貼住友軍為止
        const far = spawn(ctrl, Faction.Player, TroopType.Infantry, 1, 0);
        runMove(ctrl, Faction.Player);
        assert.equals(1, far.depth);
    });

    suite.test('(d) 敵軍旁邊路有我方小兵：不該停，照走（小兵不理旁邊小兵）', () => {
        const ctrl = mkCtrl();
        spawn(ctrl, Faction.Player, TroopType.Infantry, 1, 4);   // 旁邊路的我軍小兵
        const e = spawn(ctrl, Faction.Enemy, TroopType.Cavalry, 2, 5);
        runMove(ctrl, Faction.Enemy);
        assert.equals(2, e.depth, '騎兵走滿 3 格，經過旁邊的小兵不停');
        runMove(ctrl, Faction.Enemy);
        assert.equals(0, e.depth, '之後貼底排停住');
    });

    suite.test('(e) 旁邊（同排左右）有敵方武將棋子：該停；斜前方的武將不擋路', () => {
        const ctrl = mkCtrl();
        const g = spawn(ctrl, Faction.Player, TroopType.Infantry, 1, 4);
        ctrl.playerGeneralUnitId = g.id;
        const e = spawn(ctrl, Faction.Enemy, TroopType.Cavalry, 2, 7);
        runMove(ctrl, Faction.Enemy);          // 7→6→5→4：途經斜前方(d5 時武將在 d4)不擋，來到與武將同排(d4)後停下
        assert.equals(4, e.depth);
        runMove(ctrl, Faction.Enemy);          // 武將還在旁邊：不再走
        assert.equals(4, e.depth);
    });

    suite.test('(f) 武將棋子陣亡／被移除／身分解除後，停在旁邊的小兵下一回合恢復前進', () => {
        for (const how of ['killed', 'removed', 'idCleared'] as const) {
            const ctrl = mkCtrl();
            const g = spawn(ctrl, Faction.Player, TroopType.Infantry, 1, 4);
            ctrl.playerGeneralUnitId = g.id;
            const e = spawn(ctrl, Faction.Enemy, TroopType.Infantry, 2, 4);
            runMove(ctrl, Faction.Enemy);
            assert.equals(4, e.depth, `${how}: 與武將同排先停住`);
            if (how === 'killed') { g.currentHp = 0; removeUnit(ctrl, g.id); ctrl.playerGeneralUnitId = null; }
            else if (how === 'removed') { removeUnit(ctrl, g.id); }
            else { ctrl.playerGeneralUnitId = null; }
            runMove(ctrl, Faction.Enemy);
            assert.equals(3, e.depth, `${how}: 下一回合恢復前進`);
        }
    });

    suite.test('(g) 前方敵軍被消滅後下一回合恢復前進', () => {
        const ctrl = mkCtrl();
        const p = spawn(ctrl, Faction.Player, TroopType.Infantry, 2, 3);
        const e = spawn(ctrl, Faction.Enemy, TroopType.Infantry, 2, 4);
        runMove(ctrl, Faction.Player);
        assert.equals(3, p.depth);
        e.currentHp = 0;
        removeUnit(ctrl, e.id);
        runMove(ctrl, Faction.Player);
        assert.equals(4, p.depth);
    });

    suite.test('(g2) 敵軍陣亡後格子不殘留佔位（真實擊殺流程）', () => {
        const ctrl = mkCtrl();
        const p = spawn(ctrl, Faction.Player, TroopType.Infantry, 2, 3);
        const e = spawn(ctrl, Faction.Enemy, TroopType.Infantry, 2, 4);
        const { cr } = internals(ctrl);
        e.currentHp = 0;
        cr.onUnitKilled(e, p, services());
        assert.isFalse(ctrl.state.units.has(e.id));
        assert.equals(null, ctrl.state.getCell(2, 4)!.occupantId);
        runMove(ctrl, Faction.Player);
        assert.equals(4, p.depth);
    });

    suite.test('(h1) 壓制區（STR 差 2 倍）：不能走進敵將周圍空格，離開壓制區後恢復', () => {
        const ctrl = mkCtrl(60, 200);   // 敵方武將 STR 200 壓制我方（抵抗 60），倍率 > 2 → 不可通行
        const g = spawn(ctrl, Faction.Enemy, TroopType.Infantry, 2, 6);
        ctrl.enemyGeneralUnitId = g.id;
        const p = spawn(ctrl, Faction.Player, TroopType.Cavalry, 0, 0);
        const q = spawn(ctrl, Faction.Player, TroopType.Cavalry, 2, 3);
        runMove(ctrl, Faction.Player);
        assert.equals(3, p.depth, '別的路不受影響');
        assert.equals(4, q.depth, '同路走到壓制區前（d5 是武將前一格，在壓制區內）停在 d4');
        removeUnit(ctrl, g.id); ctrl.enemyGeneralUnitId = null;
        runMove(ctrl, Faction.Player);
        assert.equals(7, q.depth, '武將離開後恢復前進（3 格上限，d4→d7）');
    });

    suite.test('(h2) 教學戰逐回合記錄：沒有合法停留原因的部隊都必須前進（只有我方武將棋子）', () => {
        const log: string[] = [];
        const records = runTutorial(false, log);
        console.log(log.join('\n'));
        assert.greaterOrEqual(20, records.length, '記錄筆數太少，流程可能提早結束');
        const bad = records.filter(r => r.reason === '');
        assert.equals(0, bad.length, `無合法原因卻沒走滿：${bad.map(r => `T${r.turn}${r.side}${r.id}L${r.lane}d${r.from}→${r.to}`).join(',')}`);
    });

    suite.test('(h3) 教學戰逐回合記錄：我方與敵方武將棋子都在場', () => {
        const log: string[] = [];
        const records = runTutorial(true, log);
        console.log(log.join('\n'));
        assert.greaterOrEqual(20, records.length);
        const bad = records.filter(r => r.reason === '');
        assert.equals(0, bad.length, `無合法原因卻沒走滿：${bad.map(r => `T${r.turn}${r.side}${r.id}L${r.lane}d${r.from}→${r.to}`).join(',')}`);
    });

    return suite;
}
