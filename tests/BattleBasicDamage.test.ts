/**
 * BattleBasicDamage — 戰場「攻擊交互、傷害數值、回合階段順序」最基本整合測試。
 *
 * 規格依據：數值系統.md E-3（傷害公式）、E-4（剋制表）、F-1（偽代碼）、E-14（閃躲）；
 *           戰場大回合推進狀態機與階段生命週期規格書 §2（階段順序）。
 * 手算約定：平原、晴天、武將適性全為 B（修正 0）、無虎符、無戰法、命中率 100%（不擲命中）。
 *   小兵打小兵 = max(1, floor(攻 × 剋制倍率 − 守))
 *   小兵打主將 = max(保底, floor(攻 × 1.5 − 主將統率 × 0.3))，保底 = max(1, round(攻 × 0.2))，暴擊再 ×1.5 取整（見 (d)）
 * 兵種數值取 assets/resources/data/troops.json：
 *   騎 hp100 攻40 防20｜步 hp120 攻35 防25｜盾 hp150 攻20 防35｜弓 hp80 攻30 防15（射程2）｜槍 hp110 攻32 防22｜工 hp80 攻15 防10
 *
 * 標〔待裁決〕的斷言：記錄「現況」，程式與規格不一致或數值有疑慮，由使用者裁決後再改。
 */
import { EVENT_NAMES, Faction, GAME_CONFIG, TerrainType, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { executeBattleCombatPhase } from '../assets/scripts/battle/runtime/phases/BattleCombatPhase';
import { DEFAULT_TROOP_STATS } from '../assets/scripts/battle/runtime/BattleUnitSpawner';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

// ─── 共用工具 ────────────────────────────────────────────────────────────────

/** 亂數序列：依序吐出 queue 的值，用完後固定吐 0.99（不閃躲、不暴擊、不觸發機率事件） */
function useRandom(queue: number[] = []): void {
    const q = [...queue];
    services().session.setRandomSource(() => (q.length > 0 ? q.shift()! : 0.99));
}

function makeGeneral(id: string, faction: Faction, opts: { hp?: number; lea?: number; str?: number; luk?: number; int?: number } = {}): GeneralUnit {
    return new GeneralUnit({
        id,
        name: id,
        faction,
        hp: opts.hp ?? 1000,
        maxSp: 100,
        initialSp: 0,
        str: opts.str ?? 50,
        int: opts.int ?? 50,
        lea: opts.lea ?? 60,
        luk: opts.luk ?? 0,
        skillId: 'none',
        battlePrimarySkillId: 'none',
    });
}

let serial = 0;
function makeTroop(type: TroopType, faction: Faction, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(`${faction}-${type}-${++serial}`, type, faction, DEFAULT_TROOP_STATS[type]);
    unit.moveTo(lane, depth);
    return unit;
}

interface World {
    state: BattleState;
    resolver: BattleCombatResolver;
    playerGeneral: GeneralUnit;
    enemyGeneral: GeneralUnit;
}

/** 輕量戰場：只有 BattleState + 解算器（不含移動階段），用來單獨驗證交戰數值 */
function makeWorld(genOpts: { enemyLea?: number; enemyHp?: number; playerStr?: number } = {}): World {
    services().initialize();
    useRandom();
    const state = new BattleState();
    const playerGeneral = makeGeneral('p-gen', Faction.Player, { str: genOpts.playerStr });
    const enemyGeneral = makeGeneral('e-gen', Faction.Enemy, { lea: genOpts.enemyLea, hp: genOpts.enemyHp });
    state.reset(playerGeneral, enemyGeneral);
    const resolver = new BattleCombatResolver({
        state,
        getPlayerGeneralUnitId: () => null,
        getEnemyGeneralUnitId: () => null,
        setPlayerGeneralUnitId: () => {},
        setEnemyGeneralUnitId: () => {},
    });
    return { state, resolver, playerGeneral, enemyGeneral };
}

/** 跑一個陣營的戰鬥階段（與 BattleController 的接線相同） */
function runCombatPhase(w: World, faction: Faction): void {
    const r = w.resolver;
    executeBattleCombatPhase({
        state: w.state,
        actingFaction: faction,
        playerGeneralUnitId: null,
        enemyGeneralUnitId: null,
        buildAttackAction: (u, o) => r.buildAttackAction(u, o),
        damageEnemyGeneral: (a, svc) => r.damageEnemyGeneral(a, svc),
        resolveCombat: (a, d, svc) => r.resolveCombat(a, d, svc),
        advanceAfterKill: (u, svc) => r.advanceAfterKill(u, svc),
        resolveActionResetAfterAttack: (u, k, acts) => r.resolveActionResetAfterAttack(u, k, acts),
        onGeneralUnitKilled: (f, svc) => r.onGeneralUnitKilled(f, svc),
        onUnitKilled: (u, k, svc) => r.onUnitKilled(u, k, svc),
    });
}

/** 規格 E-3／E-4 的手算：獨立於程式常數，只用規格寫的數字 */
function specCounterMod(att: TroopType, def: TroopType): number {
    // 五角：騎剋盾、盾剋弓、弓剋步、步剋槍、槍剋騎，各 ×1.3；反向 ×0.8；機械（工兵）被近戰 ×1.5
    const beats: Partial<Record<TroopType, TroopType>> = {
        [TroopType.Cavalry]: TroopType.Shield,
        [TroopType.Shield]: TroopType.Archer,
        [TroopType.Archer]: TroopType.Infantry,
        [TroopType.Infantry]: TroopType.Pikeman,
        [TroopType.Pikeman]: TroopType.Cavalry,
    };
    const melee = [TroopType.Cavalry, TroopType.Infantry, TroopType.Pikeman, TroopType.Shield];
    if (def === TroopType.Engineer && melee.includes(att)) return 1.5;
    if (beats[att] === def) return 1.3;
    if (beats[def] === att) return 0.8;
    return 1;
}
function specUnitDamage(att: TroopType, def: TroopType): number {
    const a = DEFAULT_TROOP_STATS[att].attack;
    const d = DEFAULT_TROOP_STATS[def].defense;
    return Math.max(1, Math.floor(a * specCounterMod(att, def) - d));
}

const NAME: Record<string, string> = {
    cavalry: '騎', infantry: '步', shield: '盾', archer: '弓', pikeman: '槍', engineer: '工',
};
const MATRIX_TYPES: TroopType[] = [TroopType.Cavalry, TroopType.Infantry, TroopType.Shield, TroopType.Archer, TroopType.Pikeman, TroopType.Engineer];

/** 對外輸出數字表（測試結果裡看得到） */
function printTable(title: string, lines: string[]): void {
    // eslint-disable-next-line no-console
    console.log(`\n[數字表] ${title}\n${lines.join('\n')}`);
}

/** 單次部隊打部隊：回傳防守方實際扣的血 */
function hitOnce(att: TroopType, def: TroopType): number {
    const w = makeWorld();
    const a = makeTroop(att, Faction.Player, 2, 3);
    const d = makeTroop(def, Faction.Enemy, 2, 4);
    w.state.addUnit(a);
    w.state.addUnit(d);
    const before = d.currentHp;
    w.resolver.resolveCombat(a, d, services());
    return before - d.currentHp;
}

/** 單次部隊打主將：回傳 { 扣血, 暴擊, 閃躲 } */
function hitGeneral(att: TroopType, opts: { enemyLea?: number; spurtStr?: number; random?: number[] } = {}): { damage: number; isCrit: boolean; dodged: boolean; hpBefore: number } {
    const w = makeWorld({ enemyLea: opts.enemyLea, playerStr: opts.spurtStr });
    if (opts.spurtStr !== undefined) w.state.lastSpurtMode = true;
    const a = makeTroop(att, Faction.Player, 2, 7);
    w.state.addUnit(a);
    let isCrit = false;
    let dodged = false;
    const off = services().event.on(EVENT_NAMES.GeneralDamaged, (d?: { isCrit?: boolean; wasDodged?: boolean }) => {
        isCrit = !!d?.isCrit;
        dodged = !!d?.wasDodged;
    });
    useRandom(opts.random ?? []);
    const hpBefore = w.enemyGeneral.currentHp;
    w.resolver.damageEnemyGeneral(a, services());
    off();
    return { damage: hpBefore - w.enemyGeneral.currentHp, isCrit, dodged, hpBefore };
}

// ─── 完整控制器情境用 ────────────────────────────────────────────────────────

function newController(): { ctrl: BattleController; pg: GeneralUnit; eg: GeneralUnit } {
    services().initialize();
    useRandom();
    const ctrl = new BattleController();
    const pg = makeGeneral('p-gen', Faction.Player);
    const eg = makeGeneral('e-gen', Faction.Enemy);
    ctrl.initBattle(pg, eg);
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    ctrl.state.tileBuffs.clear();
    return { ctrl, pg, eg };
}

/** 與 TurnFlowManager 相同的一整回合：我方回合 → 敵方回合 → 收尾（回合數 +1） */
function playFullTurn(ctrl: BattleController): void {
    ctrl.state.tileBuffs.clear();
    const r = ctrl.resolvePlayerTurn();
    if (r !== 'ongoing') return;
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
    ctrl.state.tileBuffs.clear();
}

// ─── 測試 ────────────────────────────────────────────────────────────────────

export function createBattleBasicDamageSuite(): TestSuite {
    const suite = new TestSuite('BattleBasicDamage');

    suite.test('資料：troops.json 與 DEFAULT_TROOP_STATS 一致（手算基準可信）', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs') as typeof import('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path') as typeof import('path');
        const json = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/data/troops.json'), 'utf8'));
        for (const t of MATRIX_TYPES) {
            const d = DEFAULT_TROOP_STATS[t];
            assert.equals(json[t].hp, d.hp, `${t} hp`);
            assert.equals(json[t].attack, d.attack, `${t} attack`);
            assert.equals(json[t].defense, d.defense, `${t} defense`);
        }
    });

    // (a) 各兵種兩兩對打：實際扣血 = 規格公式手算
    suite.test('(a) 兵種兩兩對打 6×6：實際扣血 = floor(攻×剋制−守)，至少 1', () => {
        const rows: string[] = ['攻\\守  ' + MATRIX_TYPES.map((t) => NAME[t].padStart(4)).join('')];
        for (const att of MATRIX_TYPES) {
            let row = NAME[att] + '     ';
            for (const def of MATRIX_TYPES) {
                const actual = hitOnce(att, def);
                const expected = specUnitDamage(att, def);
                assert.equals(expected, actual, `${att} 打 ${def}`);
                row += String(actual).padStart(4);
            }
            rows.push(row);
        }
        printTable('(a) 單次傷害矩陣（列=攻方，欄=守方；平原晴天、B 適性、無暴擊）', rows);
    });

    suite.test('(a) 手算範例：騎打盾 40×1.3−35=17、盾打騎 20×0.8−20=−4→保底 1、槍打騎 32×1.3−20=21、步打工 35×1.5−10=42', () => {
        assert.equals(17, hitOnce(TroopType.Cavalry, TroopType.Shield));
        assert.equals(1, hitOnce(TroopType.Shield, TroopType.Cavalry));
        assert.equals(21, hitOnce(TroopType.Pikeman, TroopType.Cavalry));
        assert.equals(42, hitOnce(TroopType.Infantry, TroopType.Engineer));
        // 弓打工兵：弓不是近戰，工兵弱點 ×1.5 不套用 → 30−10=20
        assert.equals(20, hitOnce(TroopType.Archer, TroopType.Engineer));
    });

    // (b) 剋制與被剋差距
    suite.test('(b) 剋制 vs 被剋：槍打騎 21、騎打槍 40×0.8−22=10；同兵種互打無倍率', () => {
        const counter = hitOnce(TroopType.Pikeman, TroopType.Cavalry);   // 32×1.3−20 = 21.6 → 21
        const disadv = hitOnce(TroopType.Cavalry, TroopType.Pikeman);    // 40×0.8−22 = 10
        const neutral = hitOnce(TroopType.Infantry, TroopType.Infantry); // 35−25 = 10
        assert.equals(21, counter);
        assert.equals(10, disadv);
        assert.equals(10, neutral);
        assert.isTrue(counter > disadv, '剋制方傷害應大於被剋方');
        // 五組剋制：攻方打被剋者必定比被剋者反打更痛（以攻×倍率比較，扣防前）
        const pairs: Array<[TroopType, TroopType]> = [
            [TroopType.Cavalry, TroopType.Shield], [TroopType.Shield, TroopType.Archer], [TroopType.Archer, TroopType.Infantry],
            [TroopType.Infantry, TroopType.Pikeman], [TroopType.Pikeman, TroopType.Cavalry],
        ];
        for (const [a, d] of pairs) {
            assert.equals(1.3, specCounterMod(a, d));
            assert.equals(0.8, specCounterMod(d, a));
            assert.equals(specUnitDamage(a, d), hitOnce(a, d), `${a} 剋 ${d}`);
            assert.equals(specUnitDamage(d, a), hitOnce(d, a), `${d} 被 ${a} 剋`);
        }
    });

    suite.test('(b) 地形與適性：山地步兵被騎兵打 40−25×1.3×1.15=2（兵種地形 +30% 與地形 +15% 相乘）；S 級兵種適性攻 ×1.2', () => {
        // 山地防守：兵種×地形規則（步兵山地防禦 +30%）= 25×1.3=32.5；calculateDamage 再乘地形防禦 1.15 → 37.375；40−37.375=2.625→2
        const w = makeWorld();
        const a = makeTroop(TroopType.Cavalry, Faction.Player, 2, 3);
        const d = makeTroop(TroopType.Infantry, Faction.Enemy, 2, 4);
        w.state.addUnit(a);
        w.state.addUnit(d);
        w.state.getCell(2, 4)!.terrain = TerrainType.Mountain;
        w.resolver.resolveCombat(a, d, services());
        assert.equals(2, 120 - d.currentHp, '山地步兵：兩層地形防禦相乘（規格 E-3 只寫單一 terrain_def_mod，〔待裁決〕是否刻意疊加）');

        // 沙漠攻方 +15%：騎打騎 40×1.15−20=26
        const w2 = makeWorld();
        const a2 = makeTroop(TroopType.Cavalry, Faction.Player, 2, 3);
        const d2 = makeTroop(TroopType.Cavalry, Faction.Enemy, 2, 4);
        w2.state.addUnit(a2);
        w2.state.addUnit(d2);
        w2.state.getCell(2, 3)!.terrain = TerrainType.Desert;
        w2.resolver.resolveCombat(a2, d2, services());
        assert.equals(26, 100 - d2.currentHp, '沙漠攻方 +15%');

        // 我方主將騎兵適性 S：攻 ×1.2 → 40×1.2−20=28
        const w3 = makeWorld();
        const sGen = new GeneralUnit({
            id: 'p-s', name: 'p-s', faction: Faction.Player, hp: 1000, str: 50, int: 50, lea: 60, luk: 0,
            troopAptitude: { CAVALRY: 'S' }, skillId: 'none', battlePrimarySkillId: 'none',
        });
        w3.state.reset(sGen, w3.enemyGeneral);
        const a3 = makeTroop(TroopType.Cavalry, Faction.Player, 2, 3);
        const d3 = makeTroop(TroopType.Cavalry, Faction.Enemy, 2, 4);
        w3.state.addUnit(a3);
        w3.state.addUnit(d3);
        w3.resolver.resolveCombat(a3, d3, services());
        assert.equals(28, 100 - d3.currentHp, 'S 級兵種適性攻擊 ×1.2');
    });

    // (c) 反擊與同回合互打
    suite.test('(c) 沒有被動反擊：我方先打、敵方在自己的階段才還手，各一次（步vs步 各 −10）', () => {
        const w = makeWorld();
        const p = makeTroop(TroopType.Infantry, Faction.Player, 2, 3);
        const e = makeTroop(TroopType.Infantry, Faction.Enemy, 2, 4);
        w.state.addUnit(p);
        w.state.addUnit(e);
        runCombatPhase(w, Faction.Player);
        // 手算：35−25=10
        assert.equals(110, e.currentHp, '我方階段後敵方 120−10');
        assert.equals(120, p.currentHp, '我方階段內不會被反擊（無自動反擊）');
        runCombatPhase(w, Faction.Enemy);
        assert.equals(110, p.currentHp, '敵方階段還手 120−10');
        assert.equals(110, e.currentHp, '敵方自己不會再被打');
    });

    suite.test('(c) 先手擊殺：被打死的一方不能還手（敵方只剩 5 血，我方滿血無損）', () => {
        const w = makeWorld();
        const p = makeTroop(TroopType.Cavalry, Faction.Player, 2, 3);
        const e = makeTroop(TroopType.Infantry, Faction.Enemy, 2, 4);
        e.currentHp = 5;
        w.state.addUnit(p);
        w.state.addUnit(e);
        runCombatPhase(w, Faction.Player);   // 40−25=15 ≥ 5
        assert.isFalse(w.state.units.has(e.id), '敵方陣亡移出戰場');
        runCombatPhase(w, Faction.Enemy);
        assert.equals(100, p.currentHp, '死者不還手，我方滿血');
    });

    suite.test('(c) 被動反擊戰法（counterReaction）：發動率過關才反擊，傷害 = floor(守方攻×比例×剋制−攻方防)', () => {
        const w = makeWorld();
        // 敵方主將 int=100 → 發動率 1−90/100=0.1
        const eGen = makeGeneral('e-gen2', Faction.Enemy, { int: 100 });
        w.state.reset(w.playerGeneral, eGen);
        const p = makeTroop(TroopType.Infantry, Faction.Player, 2, 3);
        const e = makeTroop(TroopType.Infantry, Faction.Enemy, 2, 4);
        w.state.addUnit(p);
        w.state.addUnit(e);
        w.state.setCounterReaction({ unitUid: e.id, battleSkillId: 'test-counter', counterRatio: 2, statusTurns: 1, remainingTriggers: 1, meleeOnly: false });
        // 亂數：暴擊擲骰 0.99（不暴擊）、反擊發動率擲骰 0.05 < 0.1（發動）
        useRandom([0.99, 0.05]);
        w.resolver.resolveCombat(p, e, services());
        // 我方打敵方 10 → 敵方 110；反擊：floor(35×2)=70 −25 = 45 → 我方 120−45=75
        assert.equals(110, e.currentHp);
        assert.equals(75, p.currentHp);
    });

    // (d) 小兵打主將
    suite.test('(d) 無殘局、無暴擊：打主將 = max(保底, floor(攻×1.5−統率×0.3))；主將統率 60→防 18', () => {
        // 手算（防=60×0.3=18；加成 1.5）：騎 60−18=42｜步 52.5−18=34.5→34｜盾 30−18=12｜弓 45−18=27｜槍 48−18=30｜工 22.5−18=4.5→4（保底 round(3)=3）
        const expected: Array<[TroopType, number]> = [
            [TroopType.Cavalry, 42], [TroopType.Infantry, 34], [TroopType.Shield, 12],
            [TroopType.Archer, 27], [TroopType.Pikeman, 30], [TroopType.Engineer, 4],
        ];
        const rows: string[] = [];
        for (const [t, exp] of expected) {
            const r = hitGeneral(t);
            assert.equals(exp, r.damage, `${t} 打主將`);
            assert.isFalse(r.isCrit);
            rows.push(`${NAME[t]}兵(攻${DEFAULT_TROOP_STATS[t].attack}) → 主將 −${r.damage}（${(r.damage / r.hpBefore * 100).toFixed(1)}% of ${r.hpBefore}）`);
        }
        printTable('(d) 小兵打主將，無殘局無暴擊（主將統率 60，HP 1000）', rows);
    });

    suite.test('(d) 保底：高統率主將（統率 96→防 28.8）盾兵 30−28.8=1 → 保底 round(20×0.2)=4', () => {
        const r = hitGeneral(TroopType.Shield, { enemyLea: 96 });
        assert.equals(4, r.damage);
        // 保底在騎兵不生效：60−28.8=31.2→31（>保底 8）
        assert.equals(31, hitGeneral(TroopType.Cavalry, { enemyLea: 96 }).damage);
    });

    suite.test('(d) 殘局爆發：我方主將 STR100 → 傷害 ×√(1000/500)=1.414；步兵 34→floor(34×1.4142)=48', () => {
        const normal = hitGeneral(TroopType.Infantry);
        const spurt = hitGeneral(TroopType.Infantry, { spurtStr: 100 });
        assert.equals(34, normal.damage);
        assert.equals(48, spurt.damage);
        // STR50 → √(500/500)=1.0，殘局無加成
        assert.equals(34, hitGeneral(TroopType.Infantry, { spurtStr: 50 }).damage);
    });

    suite.test('(d) 暴擊：亂數序列 [閃躲 0.99, 暴擊 0.0] → 步兵 34 → floor(34×1.5)=51，事件 isCrit=true', () => {
        const r = hitGeneral(TroopType.Infantry, { random: [0.99, 0.0] });
        assert.isTrue(r.isCrit);
        assert.equals(51, r.damage);
        // 殘局 + 暴擊：48 → floor(48×1.5)=72
        const both = hitGeneral(TroopType.Infantry, { spurtStr: 100, random: [0.99, 0.0] });
        assert.equals(72, both.damage);
    });

    suite.test('(d) 閃躲：亂數 0.0 < 3%（統率無關、運氣 0 的基礎閃躲）→ 主將 0 傷害，事件 wasDodged', () => {
        const r = hitGeneral(TroopType.Cavalry, { random: [0.0] });
        assert.isTrue(r.dodged);
        assert.equals(0, r.damage);
    });

    suite.test('(d)〔待裁決〕部隊暴擊順序：現況 floor((攻×倍率−守)×1.5)；規格 F-1 為 floor(攻×倍率×1.5−守)', () => {
        // 步打步：現況 (35−25)=10 → ×1.5=15；規格 F-1 偽代碼 35×1.5−25=27.5→27
        const w = makeWorld();
        const a = makeTroop(TroopType.Infantry, Faction.Player, 2, 3);
        const d = makeTroop(TroopType.Infantry, Faction.Enemy, 2, 4);
        w.state.addUnit(a);
        w.state.addUnit(d);
        useRandom([0.0]); // 暴擊
        w.resolver.resolveCombat(a, d, services());
        const actual = 120 - d.currentHp;
        assert.equals(15, actual, '現況：先扣防再 ×1.5');
        // 規格值 27 與現況 15 不同：待使用者裁決暴擊該乘在扣防前還是後
    });

    suite.test('(d)〔待裁決〕暴擊率：現況固定 5%（運氣不影響），規格 E-3／F-1 為 base_crit + LUK/200', () => {
        // 運氣 100 的我方主將：規格暴擊率應 = 5% + 50% = 55%；現況仍是 5%
        const w = makeWorld();
        const lucky = makeGeneral('p-lucky', Faction.Player, { luk: 100 });
        w.state.reset(lucky, w.enemyGeneral);
        const a = makeTroop(TroopType.Infantry, Faction.Player, 2, 3);
        const d = makeTroop(TroopType.Infantry, Faction.Enemy, 2, 4);
        w.state.addUnit(a);
        w.state.addUnit(d);
        useRandom([0.3]); // 0.3：規格(55%)會暴擊、現況(5%)不暴擊
        w.resolver.resolveCombat(a, d, services());
        assert.equals(10, 120 - d.currentHp, '現況：LUK 不影響暴擊，0.3 擲不出暴擊');
    });

    // (e) 一整個回合的階段順序
    suite.test('(e) 一整回合階段順序：我方移動→地塊→戰鬥→特殊→勝負；敵方移動→地塊→戰鬥→特殊→部署→勝負', () => {
        const { ctrl } = newController();
        // 敵方有糧草才會在 enemy-deploy 出兵
        (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 30;
        const phases: string[] = [];
        const trace: string[] = [];
        let current = '-';
        const original = (ctrl as unknown as { executeRuntimePhase: (n: string) => unknown }).executeRuntimePhase.bind(ctrl);
        (ctrl as unknown as { executeRuntimePhase: (n: string) => unknown }).executeRuntimePhase = (name: string) => {
            current = name;
            phases.push(name);
            return original(name);
        };
        const evs = [EVENT_NAMES.UnitMoved, EVENT_NAMES.UnitDamaged, EVENT_NAMES.UnitDeployed, EVENT_NAMES.GeneralDamaged, EVENT_NAMES.UnitDied];
        const offs = evs.map((n) => services().event.on(n, () => { trace.push(`${current}:${n}`); }));

        // 我方在最前排放一隻已就位的騎兵（不是本回合部署），敵方一隻步兵在前方，走位後交戰
        const pc = makeTroop(TroopType.Cavalry, Faction.Player, 2, 2);
        const ei = makeTroop(TroopType.Infantry, Faction.Enemy, 2, 5);
        ctrl.state.addUnit(pc);
        ctrl.state.addUnit(ei);
        // 本回合我方新部署一隻（不該移動也不該攻擊）
        const fresh = ctrl.deployTroop(TroopType.Archer, 0);
        assert.isTrue(!!fresh, '玩家可部署');

        playFullTurn(ctrl);
        offs.forEach((off) => off());

        assert.equals(
            [
                'player-auto-move', 'player-tile-effect', 'player-combat-resolve', 'player-special-resolve', 'victory-check',
                'enemy-auto-move', 'enemy-tile-effect', 'enemy-combat-resolve', 'enemy-special-resolve', 'enemy-deploy', 'victory-check',
            ].join(' > '),
            phases.join(' > '),
            '階段順序',
        );
        // 事件歸屬：移動在移動階段、傷害在戰鬥階段、部署在 enemy-deploy
        assert.isTrue(trace.some((t) => t === 'player-auto-move:' + EVENT_NAMES.UnitMoved), '我方移動事件在 player-auto-move');
        assert.isTrue(trace.some((t) => t === 'player-combat-resolve:' + EVENT_NAMES.UnitDamaged), '我方傷害在 player-combat-resolve');
        assert.isTrue(trace.some((t) => t === 'enemy-combat-resolve:' + EVENT_NAMES.UnitDamaged), '敵方還手傷害在 enemy-combat-resolve');
        assert.isTrue(trace.some((t) => t === 'enemy-deploy:' + EVENT_NAMES.UnitDeployed), '敵方出兵在 enemy-deploy（最後）');
        // 當回合部署的我方弓兵：不移動
        assert.equals(0, fresh!.depth, '本回合新部署的我方部隊當回合不移動');
        assert.equals(fresh!.maxHp, fresh!.currentHp, '新部署部隊沒被打');
        // 我方先動先打：事件序列裡第一個傷害屬於我方戰鬥階段，早於敵方戰鬥階段
        const firstPlayerHit = trace.findIndex((t) => t.startsWith('player-combat-resolve:' + EVENT_NAMES.UnitDamaged));
        const firstEnemyHit = trace.findIndex((t) => t.startsWith('enemy-combat-resolve:' + EVENT_NAMES.UnitDamaged));
        assert.isTrue(firstPlayerHit >= 0 && firstEnemyHit > firstPlayerHit, '我方戰鬥先於敵方戰鬥');
        printTable('(e) 單回合實際階段順序', [phases.join(' → '), '事件軌跡：' + trace.join(' | ')]);
    });

    suite.test('(e) 回合結束收尾：回合數 +1、部署額度與已移動標記清空', () => {
        const { ctrl } = newController();
        const before = services().battle.getSnapshot().turn;
        ctrl.deployTroop(TroopType.Infantry, 1);
        playFullTurn(ctrl);
        assert.equals(before + 1, services().battle.getSnapshot().turn, '回合數 +1');
        const tm = (ctrl as unknown as { turnManager: { playerDeployCountThisTurn: number; movedUnitIdsThisTurn: Set<string>; deployedUnitIdsThisTurn: Set<string> } }).turnManager;
        assert.equals(0, tm.playerDeployCountThisTurn);
        assert.equals(0, tm.movedUnitIdsThisTurn.size);
        assert.equals(0, tm.deployedUnitIdsThisTurn.size);
    });

    // (f) 連續 3 回合我方一隊對敵方一隊
    suite.test('(f) 連續 3 回合：我方騎兵+後面步兵 vs 敵方弓兵（60 血，縱深突襲）；逐回合血量表、先死者、格子清空、後排前進', () => {
        const { ctrl } = newController();
        const cav = makeTroop(TroopType.Cavalry, Faction.Player, 2, 3);
        const inf = makeTroop(TroopType.Infantry, Faction.Player, 2, 2);
        const arc = makeTroop(TroopType.Archer, Faction.Enemy, 2, 5);
        arc.currentHp = 60;
        ctrl.state.addUnit(cav);
        ctrl.state.addUnit(inf);
        ctrl.state.addUnit(arc);
        const rows: string[] = ['回合 | 騎兵(HP,深) | 步兵(深) | 敵弓(HP,深)'];
        const snap = (label: string): void => {
            const alive = (u: TroopUnit): boolean => ctrl.state.units.has(u.id);
            rows.push(`${label} | ${cav.currentHp},d${cav.depth} | d${inf.depth} | ${alive(arc) ? arc.currentHp + ',d' + arc.depth : '陣亡'}`);
        };
        snap('開局');

        // 一般戰鬥啟用兵種動態相剋（doc_spec_0309 §3，PROG-2-9368）：騎兵打弓兵＝縱深突襲，傷害 ×1.35 再必暴 ×1.5，弓兵下回合不能射擊
        // 第 1 回合：騎兵(移動2) 走到 d4 貼住弓兵 d5；我方先打 floor(floor(25×1.35)×1.5)=49 → 弓 11；弓兵被封射不能還手 → 騎 100
        playFullTurn(ctrl);
        snap('T1');
        assert.equals(4, cav.depth, 'T1 騎兵前進到貼敵');
        assert.equals(11, arc.currentHp, 'T1 弓 60−49（縱深突襲）');
        assert.equals(100, cav.currentHp, 'T1 弓兵被封射，騎兵不扣血');
        assert.equals(3, inf.depth, 'T1 步兵跟進 1 格（被騎兵擋在後面）');
        // 第 2 回合：我方先手 49 ≥ 11 → 弓陣亡，不能還手；騎兵擊殺後前進一格佔掉原敵格
        const arcCell = { lane: arc.lane, depth: arc.depth };
        playFullTurn(ctrl);
        snap('T2');
        assert.isFalse(ctrl.state.units.has(arc.id), 'T2 敵弓陣亡且移出 units');
        assert.equals(100, cav.currentHp, 'T2 死者不還手，騎兵血量不變');
        assert.equals(null, ctrl.state.getCell(arcCell.lane, arcCell.depth)?.occupantId === arc.id ? arc.id : null, '陣亡者不再佔格');
        assert.equals(cav.id, ctrl.state.getCell(arcCell.lane, arcCell.depth)?.occupantId ?? null, '擊殺後騎兵前進一格進入死者格');
        assert.equals(null, ctrl.state.getCell(2, 4)?.occupantId ?? null, '騎兵原本的格子已清空');
        // 清空的格子讓後面的步兵能往前：T3 步兵繼續前進
        const infBefore = inf.depth;
        playFullTurn(ctrl);
        snap('T3');
        assert.isTrue(inf.depth > infBefore, '死者清空後後排步兵可以前進');
        printTable('(f) 對打血量表（先手方我方；T3 為後排前進確認）', rows);
    });

    // (g) 走到底後打主將、主將歸零後結束
    suite.test('(g) 部隊走到底排後才打主將；主將血歸零 → 戰鬥結束 player-win，且只發一次 BattleEnded', () => {
        const { ctrl, eg } = newController();
        eg.currentHp = 40;                       // 手算：步兵每擊 34（統率 60 → 防 18），2 擊倒
        const inf = makeTroop(TroopType.Infantry, Faction.Player, 2, 5);
        ctrl.state.addUnit(inf);
        let ended = 0;
        const off = services().event.on(EVENT_NAMES.BattleEnded, () => { ended += 1; });
        const log: string[] = [];

        // 步兵移動力 1：d5→d6（T1，d6 距敵主將 2，射程 1 打不到）
        playFullTurn(ctrl);
        log.push(`T1 depth=${inf.depth} 主將HP=${eg.currentHp}`);
        assert.equals(6, inf.depth);
        assert.equals(40, eg.currentHp, '還沒走到底排不能打主將');
        // T2：d6→d7，同回合戰鬥階段 d7 距主將 1 → 打主將 40−34=6
        playFullTurn(ctrl);
        log.push(`T2 depth=${inf.depth} 主將HP=${eg.currentHp}`);
        assert.equals(7, inf.depth);
        assert.equals(6, eg.currentHp, 'T2 走到底排當回合即可打主將 −34');
        // T3：再打 34 ≥ 6 → 主將歸零，我方戰鬥階段後 victory-check 判勝
        ctrl.state.tileBuffs.clear();
        const result = ctrl.resolvePlayerTurn();
        log.push(`T3 結果=${result} 主將HP=${eg.currentHp}`);
        off();
        assert.equals(0, eg.currentHp, '主將血歸零');
        assert.equals('player-win', result, '主將歸零 → 我方勝');
        assert.equals(1, ended, 'BattleEnded 只發一次');
        printTable('(g) 走到底排打主將', log);
    });

    suite.test('(g) 敵方部隊打我方主將對稱：敵步兵在 depth 0 打我方主將，扣血同公式（統率 60→防 18，34）', () => {
        const w = makeWorld();
        const e = makeTroop(TroopType.Infantry, Faction.Enemy, 2, 0);
        w.state.addUnit(e);
        const before = w.playerGeneral.currentHp;
        runCombatPhase(w, Faction.Enemy);
        assert.equals(34, before - w.playerGeneral.currentHp);
    });

    suite.test('(g)〔待裁決〕深度 d 的部隊對主將：只有 GRID_DEPTH 外一格才打得到（射程 1）；弓兵射程 2 從倒數第二排就打', () => {
        const wMelee = makeWorld();
        const inf = makeTroop(TroopType.Infantry, Faction.Player, 2, GAME_CONFIG.GRID_DEPTH - 2);
        wMelee.state.addUnit(inf);
        runCombatPhase(wMelee, Faction.Player);
        assert.equals(wMelee.enemyGeneral.maxHp, wMelee.enemyGeneral.currentHp, '步兵在倒數第二排打不到主將');

        const wArcher = makeWorld();
        const arc = makeTroop(TroopType.Archer, Faction.Player, 2, GAME_CONFIG.GRID_DEPTH - 2);
        wArcher.state.addUnit(arc);
        runCombatPhase(wArcher, Faction.Player);
        // 弓 30×1.5=45−18=27
        assert.equals(27, wArcher.enemyGeneral.maxHp - wArcher.enemyGeneral.currentHp, '弓兵射程 2 可從倒數第二排打主將');
    });

    suite.test('攻擊對象：只打同路正面，旁邊路的敵人不打（小兵），正面有友軍擋住時不越過（近戰）', () => {
        const w = makeWorld();
        const p = makeTroop(TroopType.Infantry, Faction.Player, 2, 3);
        const sideEnemy = makeTroop(TroopType.Infantry, Faction.Enemy, 1, 4);   // 斜前方
        const sameRowEnemy = makeTroop(TroopType.Infantry, Faction.Enemy, 3, 3); // 同排旁邊
        w.state.addUnit(p);
        w.state.addUnit(sideEnemy);
        w.state.addUnit(sameRowEnemy);
        runCombatPhase(w, Faction.Player);
        assert.equals(sideEnemy.maxHp, sideEnemy.currentHp, '斜前方敵軍不被小兵打');
        assert.equals(sameRowEnemy.maxHp, sameRowEnemy.currentHp, '同排側面敵軍不被小兵打');

        // 近戰被己方擋住：後面的步兵打不到前面敵人
        const w2 = makeWorld();
        const front = makeTroop(TroopType.Shield, Faction.Player, 2, 3);
        const back = makeTroop(TroopType.Infantry, Faction.Player, 2, 2);
        const foe = makeTroop(TroopType.Infantry, Faction.Enemy, 2, 4);
        w2.state.addUnit(front);
        w2.state.addUnit(back);
        w2.state.addUnit(foe);
        runCombatPhase(w2, Faction.Player);
        // 只有盾兵打得到：盾 20−25 → 保底 1
        assert.equals(foe.maxHp - 1, foe.currentHp, '只有最前面的盾兵出手（20−25→1）；後排步兵被擋住不出手');
    });

    suite.test('攻擊對象：弓兵（射程2）隔一格打、同路友軍不擋弓；武將棋子例外可打側面（GAME_CONFIG 現況）', () => {
        const w = makeWorld();
        const arc = makeTroop(TroopType.Archer, Faction.Player, 2, 3);
        const ally = makeTroop(TroopType.Shield, Faction.Player, 2, 4);
        const foe = makeTroop(TroopType.Infantry, Faction.Enemy, 2, 5);
        w.state.addUnit(arc);
        w.state.addUnit(ally);
        w.state.addUnit(foe);
        runCombatPhase(w, Faction.Player);
        // 弓打步（剋制 ×1.3）：30×1.3−25 = 14；盾兵也在 d4 貼敵 d5：20−25→1
        assert.equals(foe.maxHp - 14 - 1, foe.currentHp, '弓兵隔著友軍打 14 + 盾兵 1');
        assert.isFalse(GAME_CONFIG.troopEngageAdjacent, '小兵側面接敵關閉');
        assert.isTrue(GAME_CONFIG.troopEngageAdjacentGeneral, '武將棋子側面接敵開啟');
    });

    return suite;
}
