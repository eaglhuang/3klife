/**
 * UltimateEffectAudit — 張飛／趙雲／關羽／呂布 奧義「選單名／演出名／效果說明／實際效果」查核。
 *
 * 起因：線上實打，張飛第 3 回合放奧義（選單「當陽怒吼」，演出「震軍怒喝」，說明「敵軍全體暈眩，盾牆瓦解」），敵隊損血 0。
 * 這份測試只記錄「現況」，不修正式程式。與說明不符之處標〔待裁決〕，斷言寫的是現在的行為；
 * 之後有人改了行為，這裡會失敗，請連同說明文字一起更新。
 *
 * 呼叫鏈（以張飛為例）：
 *   選單：BattleSceneLoader.buildUltimateSkills（label = ultimate-definitions.json 的 name；skillId = battleSkillId）
 *   → BattleSkillTargetingFlow.beginPlayerSkillFlow（目標模式 enemy-all 免選目標）
 *   → BattleController.triggerPlayerBattleSkill（SP 在此歸零）
 *   → BattleSkillDispatcher.dispatchDirectBattleSkill → executeBattleSkillRequest（每場每招限用 1 次、精力閘門）
 *   → BattleSkillExecutor → BuffDebuffSkillResolver（profile.effectKind === 'control'：全敵掛暈眩 1 回合、isShieldWallActive=false，不造成傷害）
 *   → 回到 dispatchDirectBattleSkill：startSelfBurst／applyTeamRecover／startTeamAura／applyEnemyMassDebuff／applyUltimateSpecialRule（依 family）
 */
import * as fs from 'fs';
import { useZhTwSkillNames } from './zhTwSkillNames';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { buildUltimateSkills, seedUltimateDataForHeadless } from '../assets/scripts/battle/views/BattleSceneLoader';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { getBattleSkillPresentation } from '../assets/scripts/shared/BattleSkillPresentation';
import { Faction, StatusEffect, TroopType } from '../assets/scripts/core/config/Constants';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { SkillSourceType, type CanonicalUltimateDefinition } from '../assets/scripts/shared/SkillRuntimeContract';

const DATA_DIR = path.join(__dirname, '..', 'assets', 'resources', 'data');
const readJson = <T>(...parts: string[]): T => JSON.parse(fs.readFileSync(path.join(DATA_DIR, ...parts), 'utf-8')) as T;

const ULTIMATES = readJson<{ data: CanonicalUltimateDefinition[] }>('master', 'ultimate-definitions.json').data;
const GENERALS = readJson<GeneralConfig[]>('generals.json');
const SKILLS = readJson<Array<{ id: string; label: string; description: string }>>('skills.json');
const TACTICS = readJson<{ data: Array<{ id: string; displayName: string; battleSkillId?: string }> }>('master', 'tactic-library.json').data;

type Internals = { turnManager: { isUnitDeployedThisTurn(id: string): boolean } };

function playerGeneral(generalId: string, rebirthCount = 1): GeneralUnit {
    const config = GENERALS.find((g) => g.id === generalId) as GeneralConfig;
    return new GeneralUnit({ ...config, faction: Faction.Player, rebirthCount } as unknown as GeneralConfig);
}

function enemyGeneral(): GeneralUnit {
    return new GeneralUnit({
        id: 'e', name: 'e', faction: Faction.Enemy, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60,
        skillId: 'none', battlePrimarySkillId: 'none', tacticSlots: [],
    } as unknown as GeneralConfig);
}

/** 不會動、不會攻擊的我方誘餌（attackRange 0），專門拿來看敵人有沒有打過來 */
function bait(id: string, lane: number, depth: number, hp = 100000): TroopUnit {
    const u = new TroopUnit(id, TroopType.Infantry, Faction.Player, { hp, attack: 10, defense: 0, moveRange: 0, attackRange: 0 });
    u.moveTo(lane, depth);
    return u;
}

function foe(id: string, type: TroopType, lane: number, depth: number, hp = 100000): TroopUnit {
    const u = new TroopUnit(id, type, Faction.Enemy, { hp, attack: 30, defense: 10, moveRange: 1, attackRange: 1 });
    u.moveTo(lane, depth);
    return u;
}

function setup(generalId: string, rebirthCount = 1) {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    seedUltimateDataForHeadless(ULTIMATES, {});
    const ctrl = new BattleController();
    ctrl.initBattle(playerGeneral(generalId, rebirthCount), enemyGeneral());
    // initBattle 會把雙方 SP 重設為 0（開戰從 0 累積），這裡直接補滿代表「已經蓄滿」
    ctrl.state.playerGeneral!.currentSp = ctrl.state.playerGeneral!.maxSp;
    return ctrl;
}

function cast(ctrl: BattleController, ultimateId: string): boolean {
    const def = ULTIMATES.find((u) => u.id === ultimateId) as CanonicalUltimateDefinition;
    return ctrl.triggerPlayerBattleSkill(def.battleSkillId as string, SkillSourceType.Ultimate, { targetMode: def.targetMode as never, ultimateId });
}

function stunTurns(unitId: string): number {
    return services().buff.getBuffs(unitId).filter((b) => b.effect === StatusEffect.Stun).reduce((m, b) => Math.max(m, b.remainingTurns), 0);
}

/** 走完一個完整回合（我方 → 敵方 → 結算回合末） */
function fullTurn(ctrl: BattleController): void {
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

function hpOf(ctrl: BattleController, id: string): number {
    return ctrl.state.units.get(id)?.currentHp ?? -1;
}

export function createUltimateEffectAuditSuite(): TestSuite {
    const suite = new TestSuite('UltimateEffectAudit (張飛／趙雲／關羽／呂布 奧義名稱與實際效果查核)');

    // ───────────────────────── 張飛：名稱與資料來源 ─────────────────────────

    suite.test('張飛名稱：選單「當陽怒吼」來自奧義定義、演出「震軍怒喝」來自技能 id 表，兩份資料互不相連', () => {
        useZhTwSkillNames();
        services().initialize();
        seedUltimateDataForHeadless(ULTIMATES, {});
        const def = ULTIMATES.find((u) => u.id === 'ult-zhang-fei-1') as CanonicalUltimateDefinition;
        assert.equals('當陽怒吼', def.name);
        assert.equals('zhang-fei-roar', def.battleSkillId);
        assert.equals('震退前方敵軍並附加 1 回合暈眩。', def.description);
        // 演出文字：BattleSkillPresentation 以 battleSkillId 為鍵，與奧義定義無關
        const pres = getBattleSkillPresentation('zhang-fei-roar');
        assert.equals('震軍怒喝', pres.name);
        assert.equals('【控制】震軍怒喝：敵軍全體暈眩，盾牆瓦解', pres.effectStatus);
        // 選單：buildUltimateSkills 用奧義定義的 name 當 label
        const items = buildUltimateSkills(playerGeneral('zhang-fei', 1));
        assert.equals(1, items.length);
        assert.equals('當陽怒吼', items[0].label);
        assert.equals('zhang-fei-roar', items[0].skillId);
        // 第三個名字：skills.json（ActionSystem 技能表）叫「虎嘯」，只在選單查不到奧義定義時才會用到
        assert.equals('虎嘯', SKILLS.find((s) => s.id === 'zhang-fei-roar')?.label);
        // 戰法庫的「震軍怒喝」是 tactic-battle-roar（同一個 battleSkillId），displayName 剛好與演出名一致
        const tactic = TACTICS.find((t) => t.id === 'tactic-battle-roar');
        assert.equals('震軍怒喝', tactic?.displayName);
        assert.equals('zhang-fei-roar', tactic?.battleSkillId);
    });

    suite.test('張飛名稱〔待裁決〕：五個奧義槽全指到同一個 battleSkillId，演出名／效果說明一律「震軍怒喝」，與各槽自己的名稱和說明脫鉤', () => {
        useZhTwSkillNames();
        const slots = ULTIMATES.filter((u) => u.templateId === 'GEN_SHU_ZHANG_FEI');
        assert.equals(5, slots.length);
        assert.equals('當陽怒吼,萬夫莫敵,蛇矛裂陣,燕人威喝,長坂戰神', slots.map((s) => s.name).join(','));
        for (const s of slots) assert.equals('zhang-fei-roar', s.battleSkillId, s.id);
        // 演出名只有一個
        assert.equals('震軍怒喝', getBattleSkillPresentation('zhang-fei-roar').name);
        // 完整轉生後選單有 5 個，點哪一個實際都走同一個控制效果（見下一則）
        services().initialize();
        seedUltimateDataForHeadless(ULTIMATES, {});
        const items = buildUltimateSkills(playerGeneral('zhang-fei', 5));
        assert.equals(5, items.length);
        assert.isTrue(items.every((i) => i.skillId === 'zhang-fei-roar'));
    });

    suite.test('張飛招式資料：profile 是 control（係數 0、暈眩 1 回合、敵方全體），沒有位移欄位也沒有傷害係數', () => {
        const p = resolveBattleSkillProfile('zhang-fei-roar');
        assert.equals('control', p?.effectKind);
        assert.equals(0, p?.coefficient);
        assert.equals(StatusEffect.Stun, p?.statusEffect);
        assert.equals(1, p?.statusTurns);
        assert.equals('enemy-all', p?.targetMode);
        // 奧義說明寫「震退前方敵軍」，但 profile 沒有 pushSteps／push 類 effectKind
        assert.isTrue(p?.pushSteps === undefined);
    });

    // ───────────────────────── 張飛：實際施放 ─────────────────────────

    function bigBoard(ctrl: BattleController) {
        const mine = bait('mine', 2, 0);
        ctrl.state.addUnit(mine);
        const enemies = [
            foe('e-shield', TroopType.Shield, 0, 6),
            foe('e-inf', TroopType.Infantry, 1, 6),
            foe('e-archer', TroopType.Archer, 3, 6),
            foe('e-cav', TroopType.Cavalry, 4, 6),
            foe('e-gen', TroopType.Infantry, 2, 7),
        ];
        for (const e of enemies) ctrl.state.addUnit(e);
        ctrl.enemyGeneralUnitId = 'e-gen';
        return { mine, enemies };
    }

    suite.test('張飛施放：全部敵軍（含站在場上的敵方主將棋子）都被掛暈眩 1 回合，損血 0，敵方 GeneralUnit 本體血量不變', () => {
        const ctrl = setup('zhang-fei');
        const { enemies } = bigBoard(ctrl);
        const generalHp = ctrl.state.enemyGeneral!.currentHp;
        assert.isTrue(cast(ctrl, 'ult-zhang-fei-1'), '施放成功');
        for (const e of enemies) {
            assert.equals(1, stunTurns(e.id), `${e.id} 暈眩剩餘回合`);
            assert.equals(100000, hpOf(ctrl, e.id), `${e.id} 損血為 0（效果說明只有暈眩，確實沒有傷害）`);
        }
        assert.equals(generalHp, ctrl.state.enemyGeneral!.currentHp);
        // 我方不受影響
        assert.equals(0, stunTurns('mine'));
    });

    suite.test('張飛施放：SP 歸零、精力扣 5%；SP 補滿後同一招同場不能再放（ultimate-used）', () => {
        const ctrl = setup('zhang-fei');
        bigBoard(ctrl);
        const general = ctrl.state.playerGeneral!;
        const vitBefore = general.vitality;
        assert.equals(100, general.currentSp);
        assert.isTrue(cast(ctrl, 'ult-zhang-fei-1'));
        assert.equals(0, general.currentSp, 'SP 歸零');
        assert.isTrue(general.vitality < vitBefore, '精力有扣');
        assert.equals(vitBefore - Math.round(general.maxVitality * 0.05), general.vitality, '精力扣 vitalityCostPct 5%');
        assert.isFalse(cast(ctrl, 'ult-zhang-fei-1'), 'SP 為 0 不能放');
        general.currentSp = general.maxSp;
        assert.isFalse(cast(ctrl, 'ult-zhang-fei-1'), 'SP 滿了也不能再放：每場每個奧義限用 1 次');
        assert.equals(general.maxSp, general.currentSp, '被擋下不扣 SP');
    });

    suite.test('張飛暈眩：下一個敵方回合被暈的敵軍不移動、不攻擊；對照組（不放奧義）會前進並打到誘餌', () => {
        // 對照組
        const control = setup('zhang-fei');
        control.state.addUnit(bait('mine', 1, 3));
        control.state.addUnit(foe('e-near', TroopType.Infantry, 1, 4));
        control.state.addUnit(foe('e-far', TroopType.Infantry, 3, 6));
        fullTurn(control);
        const controlBait = hpOf(control, 'mine');
        assert.isTrue(controlBait < 100000, '對照組：敵人前方有我方誘餌時會攻擊');
        assert.isTrue(control.state.units.get('e-far')!.depth < 6, '對照組：敵人會前進');

        // 實驗組
        const ctrl = setup('zhang-fei');
        ctrl.state.addUnit(bait('mine', 1, 3));
        ctrl.state.addUnit(foe('e-near', TroopType.Infantry, 1, 4));
        ctrl.state.addUnit(foe('e-far', TroopType.Infantry, 3, 6));
        assert.isTrue(cast(ctrl, 'ult-zhang-fei-1'));
        fullTurn(ctrl);
        assert.equals(100000, hpOf(ctrl, 'mine'), '暈眩的敵軍沒有攻擊');
        assert.equals(6, ctrl.state.units.get('e-far')!.depth, '暈眩的敵軍沒有移動');
        assert.equals(4, ctrl.state.units.get('e-near')!.depth);
    });

    suite.test('張飛暈眩持續：只擋「施放當回合」的敵方階段；回合結算 tickBuff 後解除，下一回合敵軍恢復移動與攻擊', () => {
        const ctrl = setup('zhang-fei');
        ctrl.state.addUnit(bait('mine', 1, 3));
        ctrl.state.addUnit(foe('e-near', TroopType.Infantry, 1, 4));
        ctrl.state.addUnit(foe('e-far', TroopType.Infantry, 3, 6));
        assert.isTrue(cast(ctrl, 'ult-zhang-fei-1'));
        assert.equals(1, stunTurns('e-far'));
        fullTurn(ctrl); // 第 1 個回合：暈眩有效
        assert.equals(0, stunTurns('e-far'), '一個回合結算後暈眩解除（共擋 1 個敵方階段）');
        assert.equals(0, stunTurns('e-near'));
        assert.equals(100000, hpOf(ctrl, 'mine'));
        fullTurn(ctrl); // 第 2 個回合：恢復
        assert.isTrue(ctrl.state.units.get('e-far')!.depth < 6, '恢復後敵軍前進');
        assert.isTrue(hpOf(ctrl, 'mine') < 100000, '恢復後敵軍開始攻擊');
    });

    suite.test('張飛暈眩的副作用：被暈的敵方主將棋子同樣不動；但 GeneralUnit 本體的奧義施放不看這個暈眩（敵將 AI 路徑未驗證）', () => {
        const ctrl = setup('zhang-fei');
        const { enemies } = bigBoard(ctrl);
        const gen = enemies.find((e) => e.id === 'e-gen')!;
        assert.isTrue(cast(ctrl, 'ult-zhang-fei-1'));
        assert.equals(1, stunTurns(gen.id), '敵方主將棋子被暈');
        const depthBefore = gen.depth;
        fullTurn(ctrl);
        assert.equals(depthBefore, gen.depth, '被暈的敵將棋子不動');
    });

    suite.test('盾牆瓦解〔待裁決〕：對應的是 TroopUnit.isShieldWallActive（防禦 ×2 旗標）。旗標每個戰鬥階段結束就被清掉，所以「施放時清除」實際上是空操作', () => {
        const ctrl = setup('zhang-fei');
        const shield = foe('e-shield', TroopType.Shield, 2, 4);
        const blocker = bait('mine', 2, 3);
        ctrl.state.addUnit(blocker);
        ctrl.state.addUnit(shield);
        // 手動把旗標打開，施放後會被清掉（程式確實有清，BuffDebuffSkillResolver 第 54-56 行）
        shield.isShieldWallActive = true;
        assert.isTrue(cast(ctrl, 'ult-zhang-fei-1'));
        assert.isFalse(shield.isShieldWallActive, '施放後旗標為 false');
        // 但正常流程裡，旗標只在「敵方移動階段，盾兵被敵軍擋住」時才打開，並在同陣營戰鬥階段結束清掉。
        // 我方施放奧義的時間點（玩家階段開始前）旗標本來就是 false。
        const probe = setup('zhang-fei');
        const s2 = foe('e-shield', TroopType.Shield, 2, 4);
        probe.state.addUnit(bait('mine', 2, 3));
        probe.state.addUnit(s2);
        fullTurn(probe);
        assert.isFalse(s2.isShieldWallActive, '一個完整回合後旗標必為 false：任何奧義施放點都碰不到「開著」的盾牆');
    });

    suite.test('盾牆瓦解：被暈的盾兵在敵方移動階段直接 return，不會開盾牆；沒被暈的同位置盾兵在移動階段會開盾牆（防禦 ×2 只存在於該回合敵方戰鬥階段）', () => {
        const run = (stunned: boolean) => {
            const ctrl = setup('zhang-fei');
            const shield = foe('e-shield', TroopType.Shield, 2, 4);
            ctrl.state.addUnit(bait('mine', 2, 3));
            ctrl.state.addUnit(shield);
            if (stunned) assert.isTrue(cast(ctrl, 'ult-zhang-fei-1'));
            let sawWall = false;
            const original = (ctrl as unknown as { executeRuntimePhase(n: string): unknown }).executeRuntimePhase.bind(ctrl);
            (ctrl as unknown as { executeRuntimePhase(n: string): unknown }).executeRuntimePhase = (name: string) => {
                const out = original(name);
                if (name === 'enemy-auto-move' && shield.isShieldWallActive) sawWall = true;
                return out;
            };
            ctrl.resolvePlayerTurn();
            ctrl.resolveEnemyTurn();
            return sawWall;
        };
        assert.isTrue(run(false), '沒被暈：移動階段結束時盾牆開著');
        assert.isFalse(run(true), '被暈：盾牆沒開，這是「盾牆瓦解」唯一有實質效果的地方（敵方戰鬥階段不加倍防禦）');
    });

    suite.test('張飛奧義槽 2／3／4／5〔待裁決〕：說明各不相同，但實際都會先對敵方全體掛暈眩 1 回合（與說明不符，因為共用 zhang-fei-roar）', () => {
        for (const ultimateId of ['ult-zhang-fei-2', 'ult-zhang-fei-3', 'ult-zhang-fei-4', 'ult-zhang-fei-5']) {
            const ctrl = setup('zhang-fei', 5);
            bigBoard(ctrl);
            assert.isTrue(cast(ctrl, ultimateId), ultimateId);
            assert.equals(1, stunTurns('e-inf'), `${ultimateId} 敵軍被暈`);
            assert.equals(100000, hpOf(ctrl, 'e-inf'), `${ultimateId} 沒有任何傷害（說明寫了穿刺／震盪傷害）`);
        }
    });

    suite.test('張飛奧義槽 2 萬夫莫敵：家族 self-burst 另外開出自身加成窗口（說明寫的部分有做），窗口 2 回合', () => {
        const ctrl = setup('zhang-fei', 2);
        bigBoard(ctrl);
        assert.isTrue(cast(ctrl, 'ult-zhang-fei-2'));
        const burst = ctrl.state.getSelfBurst(Faction.Player);
        assert.isTrue(burst !== null && burst !== undefined, '有 selfBurst 窗口');
        assert.equals(2, burst?.remainingTurns);
    });

    // ───────────────────────── 趙雲 ─────────────────────────

    suite.test('趙雲名稱統一為「龍膽·破軍」：定義與演出表一致，說明（武力 +50% 免疫控制 2 回合）與演出說明（自動貫穿最佳列）講的是兩件事', () => {
        const def = ULTIMATES.find((u) => u.id === 'ult-zhao-yun-1') as CanonicalUltimateDefinition;
        assert.equals('龍膽·破軍', def.name);
        assert.equals('武力 +50%，免疫控制 2 回合。', def.description);
        assert.equals('zhao-yun-pierce', def.battleSkillId);
        const pres = getBattleSkillPresentation('zhao-yun-pierce');
        assert.equals('【突擊】龍膽·破軍：自動貫穿最佳列', pres.effectStatus);
        assert.equals('龍魂突刺', TACTICS.find((t) => t.id === 'tactic-dragon-pierce')?.displayName);
        services().initialize();
        seedUltimateDataForHeadless(ULTIMATES, {});
        assert.equals('龍膽·破軍', buildUltimateSkills(playerGeneral('zhao-yun', 1))[0].label);
    });

    suite.test('趙雲實際效果：施放後直線敵軍受三連擊傷害（說明沒寫），並開出 2 回合自身爆發窗口（說明有寫）', () => {
        const ctrl = setup('zhao-yun');
        ctrl.state.addUnit(bait('mine', 2, 0));
        const front = foe('e-front', TroopType.Infantry, 2, 5, 5000);
        const mid = foe('e-mid', TroopType.Infantry, 2, 6, 5000);
        const side = foe('e-side', TroopType.Infantry, 4, 5, 5000);
        for (const e of [front, mid, side]) ctrl.state.addUnit(e);
        assert.isTrue(cast(ctrl, 'ult-zhao-yun-1'));
        const burst = ctrl.state.getSelfBurst(Faction.Player);
        assert.equals(2, burst?.remainingTurns, '自身爆發窗口 2 回合');
        assert.isTrue(hpOf(ctrl, 'e-front') < 5000 && hpOf(ctrl, 'e-mid') < 5000, '〔待裁決〕說明只寫增益免控，實際同列兩隊都受貫穿傷害');
        assert.equals(true, ctrl.state.getSelfBurst(Faction.Player)?.controlImmune, '免疫控制有開');
        assert.equals(1.5, ctrl.state.getSelfBurst(Faction.Player)?.attackMultiplier, '攻擊 ×1.5（說明 武力 +50%）');
        assert.equals(5000, hpOf(ctrl, 'e-side'), '不在選中那一列的敵軍不受傷');
        assert.equals(0, stunTurns('e-front'));
    });

    // ───────────────────────── 關羽 ─────────────────────────

    suite.test('關羽名稱：選單「青龍偃月」／演出「月牙刀斬」；說明「前方扇形」但招式資料是直線（Line，長 3），與說明不符', () => {
        useZhTwSkillNames();
        const def = ULTIMATES.find((u) => u.id === 'ult-guan-yu-1') as CanonicalUltimateDefinition;
        assert.equals('青龍偃月', def.name);
        assert.equals('前方扇形大範圍斬擊。', def.description);
        assert.equals('guan-yu-slash', def.battleSkillId);
        const pres = getBattleSkillPresentation('guan-yu-slash');
        assert.equals('月牙刀斬', pres.name);
        assert.equals('【斬擊】月牙刀斬：最佳直線斬擊展開', pres.effectStatus);
        const p = resolveBattleSkillProfile('guan-yu-slash');
        assert.equals('line', p?.targetMode, '〔待裁決〕資料是直線，說明寫扇形');
        assert.equals(3, p?.lineLength);
        assert.equals(3, p?.maxTargets);
        assert.equals('青龍偃月', SKILLS.find((s) => s.id === 'guan-yu-slash')?.label, 'skills.json 的 label 剛好與選單名一致');
        // 戰法庫裡 guan-yu-slash 掛在「箭雨齊發」底下，與關羽無關
        assert.equals('箭雨齊發', TACTICS.find((t) => t.battleSkillId === 'guan-yu-slash')?.displayName);
    });

    suite.test('關羽實際效果：只打同一列（直線）上的敵軍，旁邊並排的敵軍不受傷（沒有扇形展開）', () => {
        const ctrl = setup('guan-yu');
        ctrl.state.addUnit(bait('mine', 2, 0));
        const line1 = foe('e-l1', TroopType.Infantry, 2, 4, 5000);
        const line2 = foe('e-l2', TroopType.Infantry, 2, 5, 5000);
        const left = foe('e-left', TroopType.Infantry, 1, 4, 5000);
        const right = foe('e-right', TroopType.Infantry, 3, 4, 5000);
        for (const e of [line1, line2, left, right]) ctrl.state.addUnit(e);
        assert.isTrue(cast(ctrl, 'ult-guan-yu-1'));
        const lost = (id: string) => 5000 - hpOf(ctrl, id);
        assert.isTrue(lost('e-l1') > lost('e-l2') && lost('e-l2') > 0, '同一列受傷，越遠越低（linear-step）');
        assert.equals(5000, hpOf(ctrl, 'e-left'), '〔待裁決〕說明寫扇形，但左鄰路沒受傷');
        assert.equals(5000, hpOf(ctrl, 'e-right'), '〔待裁決〕說明寫扇形，但右鄰路沒受傷');
    });

    // ───────────────────────── 呂布 ─────────────────────────

    suite.test('呂布名稱：選單「方天畫戟」／演出「天下無雙」；演出名正好是第 5 槽的奧義名，與第 1 槽說明（三連擊、穿透 2 格）不符', () => {
        useZhTwSkillNames();
        const def = ULTIMATES.find((u) => u.id === 'ult-lu-bu-1') as CanonicalUltimateDefinition;
        assert.equals('方天畫戟', def.name);
        assert.equals('三連擊，每擊穿透 2 格。', def.description);
        assert.equals('lu-bu-rampage', def.battleSkillId);
        const pres = getBattleSkillPresentation('lu-bu-rampage');
        assert.equals('天下無雙', pres.name);
        assert.equals('【爆發】天下無雙：最佳扇形壓制', pres.effectStatus);
        assert.equals('天下無雙', ULTIMATES.find((u) => u.id === 'ult-lu-bu-5')?.name, '〔待裁決〕第 5 槽才是「天下無雙」，且說明是單體 80% 最大 HP 純傷害');
        services().initialize();
        seedUltimateDataForHeadless(ULTIMATES, {});
        assert.equals('方天畫戟', buildUltimateSkills(playerGeneral('lu-bu', 1))[0].label);
        const p = resolveBattleSkillProfile('lu-bu-rampage');
        assert.equals('fan', p?.targetMode);
        assert.isTrue(p?.hitStageMultipliers === undefined, '〔待裁決〕沒有三段擊欄位（趙雲才有 hitStageMultipliers）');
        assert.equals(4, p?.maxTargets);
    });

    suite.test('呂布實際效果：前方扇形內的敵軍各被結算一次（不是三連擊、也沒有穿透加成），扇形外不受傷', () => {
        const ctrl = setup('lu-bu');
        ctrl.state.addUnit(bait('mine', 2, 0));
        for (const e of [foe('e-a', TroopType.Infantry, 2, 4, 5000), foe('e-b', TroopType.Infantry, 1, 5, 5000), foe('e-far', TroopType.Infantry, 0, 6, 5000)]) ctrl.state.addUnit(e);
        assert.isTrue(cast(ctrl, 'ult-lu-bu-1'));
        const lost = (id: string) => 5000 - hpOf(ctrl, id);
        assert.isTrue(lost('e-a') > 0 && lost('e-b') > 0, '扇形內受傷');
        assert.isTrue(lost('e-a') > lost('e-b'), '遠一格的傷害較低（linear-step 遞減）');
        assert.equals(0, lost('e-far'), '扇形外的不受傷');
        // 〔待裁決〕說明寫「三連擊」：單目標損血只有一次結算的量級（遠低於防禦 10 的小兵血量 5000 的 3%）
        assert.isTrue(lost('e-a') < 5000 * 0.05, '單目標損血量級為一次結算');
    });

    suite.test('呂布第 5 槽天下無雙〔待裁決〕：說明「單一目標最大 HP 80% 純傷害」，實際與第 1 槽方天畫戟的傷害完全相同，沒有 80% 最大 HP 效果', () => {
        const damageOf = (ultimateId: string): number => {
            const ctrl = setup('lu-bu', 5);
            ctrl.state.addUnit(bait('mine', 2, 0));
            ctrl.state.addUnit(foe('e-a', TroopType.Infantry, 2, 4, 5000));
            assert.isTrue(cast(ctrl, ultimateId), ultimateId);
            return 5000 - hpOf(ctrl, 'e-a');
        };
        const slot1 = damageOf('ult-lu-bu-1');
        const slot5 = damageOf('ult-lu-bu-5');
        assert.equals(slot1, slot5, '兩槽同一個 lu-bu-rampage，傷害一樣');
        assert.isTrue(slot5 < 5000 * 0.8, '遠低於最大 HP 的 80%（4000）');
    });

    return suite;
}
