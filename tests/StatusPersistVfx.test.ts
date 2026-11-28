/**
 * StatusPersistVfx — 減益持續視覺、恐懼狀態、減益上限 6、三招新 profile（PROG-2-10253；doc_spec_1360／1361）
 *
 * 覆蓋：
 *  - 主減益選擇（優先序、毒燃跳過）、名額取捨（主將 > 控制 > 近中央）、預算讓位、槽位淡入淡出與換主減益、陣亡立即回收；
 *  - 表完整性（group 皆有配方、粒子 ≤ 上限、tint 幅度小）；
 *  - 恐懼：獨立 StatusEffect、攻擊 ×0.8、與虛弱相乘、圖示「懼」、極性、淨化清單；
 *  - 減益上限 6：BuffSystem 與圖示盤點；
 *  - 三招新 profile：遺計（虛弱 2 回合、全體 4 目標）、國色（士氣 +15、無狀態）、穩固（定身 1 回合）＋特效分組＋四語系名稱。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { FEAR_ATTACK_MULTIPLIER, StatusEffect, WEAK_ATTACK_MULTIPLIER } from '../assets/scripts/core/config/Constants';
import { BuffSystem } from '../assets/scripts/core/systems/BuffSystem';
import { applyAttackerStatusPenalty } from '../assets/scripts/battle/shared/AttackerStatusPenalty';
import { MAX_DEBUFFS_PER_UNIT, planDebuffAdmission } from '../assets/scripts/battle/shared/StatusDebuffCap';
import {
    LOOP_FADE_IN_SEC, MAX_LOOP_PARTICLES, MAX_LOOP_UNITS, MAX_PARTICLES_PER_UNIT, PersistLoopSlots, STATUS_PERSIST_VFX,
    grantLoopCount, pickPersistKind, selectLoopUnits, type LoopCandidate,
} from '../assets/scripts/battle/shared/StatusPersistVfx';
import { STATUS_ICON_DEFS, computeUnitStatusIcons, emptyStatusContext, type StatusIconKind } from '../assets/scripts/battle/shared/UnitStatusIcons';
import { TACTIC_VFX_BUDGET, TACTIC_VFX_RECIPES, tacticVfxGroupOf } from '../assets/scripts/battle/shared/TacticVfxGroups';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { statusPolarityOf } from '../assets/scripts/battle/shared/StatusApplyFeedback';
import { statusEffectFloatText } from '../assets/scripts/battle/shared/StatusEffectLabel';
import { TEAM_RECOVER_CLEANSE_ORDER } from '../assets/scripts/battle/shared/TeamRecover';

const unitSource = { attackBonus: 0, maxHpBonus: 0, shield: 0, morale: 0, moraleTurns: 0 };

export function createStatusPersistVfxSuite(): TestSuite {
    const suite = new TestSuite('StatusPersistVfx (減益持續視覺／恐懼／減益上限 PROG-2-10253)');

    // ───────── 主減益與名額 ─────────
    suite.test('主減益：取圖示清單中第一個有表的減益；毒燃沒表會跳過；只有增益回 null', () => {
        assert.equals('stun', pickPersistKind(['stun', 'weak', 'slow']));
        assert.equals('weak', pickPersistKind(['poison', 'weak', 'slow']));
        assert.equals('slow', pickPersistKind(['burn', 'slow', 'attack-up']));
        assert.equals(null, pickPersistKind(['poison', 'burn', 'attack-down']));
        assert.equals(null, pickPersistKind(['attack-up', 'shield', 'haste']));
        assert.equals(null, pickPersistKind([]));
    });

    suite.test('名額：最多 6 個；我方主將 > 敵方主將 > 控制類 > 近中央；同級 id 小者先', () => {
        const c = (id: string, kind: StatusIconKind, generalOf: LoopCandidate['generalOf'], centerDist: number): LoopCandidate => ({ id, kind, generalOf, centerDist });
        const picked = selectLoopUnits([
            c('t-far', 'weak', null, 6), c('t-near', 'weak', null, 1), c('ctrl-far', 'stun', null, 8),
            c('enemy-gen', 'slow', 'enemy', 9), c('player-gen', 'fear', 'player', 9), c('t-mid', 'slow', null, 3),
            c('t-mid2', 'no-shoot', null, 3), c('t-last', 'weak', null, 7),
        ]);
        assert.equals(MAX_LOOP_UNITS, picked.length);
        assert.equals('player-gen,enemy-gen,ctrl-far,t-near,t-mid,t-mid2', picked.join(','));
        assert.equals(2, selectLoopUnits([c('b', 'weak', null, 1), c('a', 'weak', null, 1), c('c', 'weak', null, 2)], 2).length);
        assert.equals('a,b', selectLoopUnits([c('b', 'weak', null, 1), c('a', 'weak', null, 1), c('c', 'weak', null, 2)], 2).join(','));
    });

    suite.test('預算：施放特效優先、循環讓位；全場循環粒子 ≤ 32；預算吃緊歸零', () => {
        const fx = TACTIC_VFX_BUDGET.maxFx;
        const pt = TACTIC_VFX_BUDGET.maxParticles;
        assert.equals(6, grantLoopCount(6, 0, 0, fx, pt, 4));
        assert.equals(2, grantLoopCount(6, 8, 130, fx, pt, 4), '剩 10 粒子只夠 2 個');
        assert.equals(0, grantLoopCount(6, 14, 0, fx, pt, 4), 'fx 已滿');
        assert.equals(0, grantLoopCount(6, 3, 138, fx, pt, 4), '粒子已滿');
        assert.equals(Math.floor(MAX_LOOP_PARTICLES / 4), grantLoopCount(20, 0, 0, fx, pt, 4), '循環粒子上限 32 → 8 個以內');
        assert.isTrue(MAX_LOOP_UNITS * MAX_PARTICLES_PER_UNIT <= MAX_LOOP_PARTICLES, '6 隻同時帶減益的循環粒子不超過全場循環上限');
    });

    // ───────── 槽位狀態機 ─────────
    suite.test('槽位：新單位淡入、不 offer 淡出後回收；回收後可重用，槽數固定', () => {
        const slots = new PersistLoopSlots();
        assert.equals(MAX_LOOP_UNITS, slots.slots.length);
        slots.begin(); slots.offer('u1', 'weak', 10, 20, 1, 1); slots.end();
        assert.equals(1, slots.activeCount());
        slots.step(LOOP_FADE_IN_SEC / 2);
        assert.isTrue(slots.slots[0].fade > 0.4 && slots.slots[0].fade < 0.6, `淡入中 ${slots.slots[0].fade}`);
        slots.begin(); slots.offer('u1', 'weak', 11, 20, 1, 1); slots.end(); slots.step(LOOP_FADE_IN_SEC);
        assert.equals(1, slots.slots[0].fade);
        // 狀態到期：不再 offer → 0.3 秒淡出後清空
        slots.begin(); slots.end(); slots.step(0.15);
        assert.isTrue(slots.slots[0].fade > 0 && slots.slots[0].fade < 1, '淡出中');
        slots.begin(); slots.end(); slots.step(0.2);
        assert.equals(0, slots.activeCount(), '淡完回收，無殘留');
        assert.equals(null, slots.slots[0].key);
        slots.begin(); slots.offer('u2', 'slow', 0, 0, 1, 1); slots.end();
        assert.equals('u2', slots.slots[0].key, '空槽重用');
        assert.equals(MAX_LOOP_UNITS, slots.slots.length);
    });

    suite.test('槽位：換主減益先淡出舊的再淡入新的；陣亡立即回收；超過槽數回 false', () => {
        const slots = new PersistLoopSlots();
        slots.begin(); slots.offer('u1', 'weak', 0, 0, 1, 1); slots.end(); slots.step(0.3);
        assert.equals('weak', slots.slots[0].kind);
        slots.begin(); slots.offer('u1', 'stun', 0, 0, 1, 1); slots.end();
        assert.equals('weak', slots.slots[0].kind, '舊的還在淡出');
        slots.step(0.35);
        assert.equals('stun', slots.slots[0].kind, '淡完換成新種類');
        slots.begin(); slots.offer('u1', 'stun', 0, 0, 1, 1); slots.end(); slots.step(0.3);
        assert.equals(1, slots.slots[0].fade);
        slots.release('u1', true);
        assert.equals(0, slots.activeCount(), '陣亡立即回收');
        slots.begin();
        for (let i = 0; i < MAX_LOOP_UNITS; i++) assert.isTrue(slots.offer(`k${i}`, 'weak', 0, 0, 1, 1));
        assert.isFalse(slots.offer('overflow', 'weak', 0, 0, 1, 1), '第 7 個沒有空槽');
    });

    suite.test('表完整性：group 皆有配方、粒子 ≤ 每單位上限、濾鏡幅度小（每通道 ≥ 200）、淡出 0.2～0.4 秒、只列減益', () => {
        const kinds = Object.keys(STATUS_PERSIST_VFX) as StatusIconKind[];
        assert.isTrue(kinds.length >= 6, `持續表至少 6 種，現有 ${kinds.length}`);
        for (const kind of kinds) {
            const def = STATUS_PERSIST_VFX[kind]!;
            assert.isTrue(STATUS_ICON_DEFS[kind].isDebuff, `${kind} 必須是減益`);
            assert.isTrue(!!TACTIC_VFX_RECIPES[def.group], `${kind} 的 group ${def.group} 沒有配方`);
            assert.isTrue(def.particles >= 2 && def.particles <= MAX_PARTICLES_PER_UNIT, `${kind} 粒子 ${def.particles}`);
            assert.isTrue(def.fadeOutSec >= 0.2 && def.fadeOutSec <= 0.4, `${kind} 淡出 ${def.fadeOutSec}`);
            if (def.tint) for (const ch of def.tint) assert.isTrue(ch >= 200 && ch <= 255, `${kind} 濾鏡幅度過大 ${def.tint.join(',')}`);
        }
        for (const kind of ['stun', 'rooted', 'controlled', 'weak', 'fear', 'slow', 'no-shoot'] as StatusIconKind[]) assert.isTrue(!!STATUS_PERSIST_VFX[kind], `${kind} 缺表`);
        assert.equals(undefined, STATUS_PERSIST_VFX.poison, '毒沿用既有表現，不重做');
        assert.equals(undefined, STATUS_PERSIST_VFX.burn, '燃燒沿用既有表現，不重做');
    });

    // ───────── 恐懼 ─────────
    suite.test('恐懼：獨立狀態；攻擊 ×0.8；與虛弱相乘；至少 1 點；極性減益；飄字「恐懼」；可被淨化', () => {
        assert.equals('fear', StatusEffect.Fear);
        assert.equals(0.8, FEAR_ATTACK_MULTIPLIER);
        const buff = new BuffSystem();
        assert.equals(100, applyAttackerStatusPenalty(buff, 'u', 100));
        buff.applyBuff('u', StatusEffect.Fear, 2);
        assert.equals(80, applyAttackerStatusPenalty(buff, 'u', 100));
        buff.applyBuff('u', StatusEffect.Weak, 2);
        assert.equals(Math.floor(Math.floor(100 * WEAK_ATTACK_MULTIPLIER) * FEAR_ATTACK_MULTIPLIER), applyAttackerStatusPenalty(buff, 'u', 100));
        assert.equals(1, applyAttackerStatusPenalty(buff, 'u', 1), '至少 1 點');
        assert.equals(100, applyAttackerStatusPenalty(buff, 'other', 100), '只影響身上有狀態的單位');
        assert.equals('debuff', statusPolarityOf(StatusEffect.Fear));
        assert.equals('恐懼', statusEffectFloatText(StatusEffect.Fear));
        assert.isTrue(TEAM_RECOVER_CLEANSE_ORDER.includes(StatusEffect.Fear), '淨化清單要含恐懼');
    });

    suite.test('恐懼圖示：字「懼」、減益、與虛弱同級；盤點得到 fear', () => {
        assert.equals('懼', STATUS_ICON_DEFS.fear.glyph);
        assert.isTrue(STATUS_ICON_DEFS.fear.isDebuff);
        assert.equals(STATUS_ICON_DEFS.weak.order, STATUS_ICON_DEFS.fear.order);
        const ctx = { ...emptyStatusContext(), effects: [{ effect: StatusEffect.Fear, remainingTurns: 2 }] };
        const list = computeUnitStatusIcons(unitSource, ctx);
        assert.equals('fear', list.icons[0].kind);
        assert.equals(2, list.icons[0].turns);
    });

    // ───────── 減益上限 6 ─────────
    suite.test('減益上限 6：滿了時新減益比最短者長就取代、否則忽略；同名刷新與增益不受限', () => {
        assert.equals(6, MAX_DEBUFFS_PER_UNIT);
        const six = [
            { effect: StatusEffect.Stun, remainingTurns: 3 }, { effect: StatusEffect.Rooted, remainingTurns: 2 }, { effect: StatusEffect.Slow, remainingTurns: 1 },
            { effect: StatusEffect.Weak, remainingTurns: 3 }, { effect: StatusEffect.NoShoot, remainingTurns: 3 }, { effect: StatusEffect.Fear, remainingTurns: 3 },
            { effect: StatusEffect.Haste, remainingTurns: 1 },
        ];
        assert.isTrue(planDebuffAdmission(six, StatusEffect.Fortified, 1).admit, '增益不受減益上限限制');
        assert.isTrue(planDebuffAdmission(six, StatusEffect.Weak, 1).admit, '同名刷新不占名額');
        // 減益只有 6 種，天然剛好填滿；用 max=2 驗證滿了之後的取捨規則
        const two = [{ effect: StatusEffect.Slow, remainingTurns: 1 }, { effect: StatusEffect.Weak, remainingTurns: 3 }];
        const longer = planDebuffAdmission(two, StatusEffect.Fear, 2, 2);
        assert.isTrue(longer.admit && longer.evictIndex === 0, '比最短（緩速 1 回合）長就取代它');
        const shorter = planDebuffAdmission(two, StatusEffect.Fear, 1, 2);
        assert.isFalse(shorter.admit, '不比最短者長就忽略');
    });

    suite.test('減益上限 6：BuffSystem 六種減益可同時存在；全部上身後再刷新仍是 6 個', () => {
        const buff = new BuffSystem();
        for (const e of [StatusEffect.Stun, StatusEffect.Rooted, StatusEffect.Slow, StatusEffect.Weak, StatusEffect.NoShoot, StatusEffect.Fear]) buff.applyBuff('u', e, 2);
        assert.equals(6, buff.getBuffs('u').length);
        buff.applyBuff('u', StatusEffect.Weak, 3);
        assert.equals(6, buff.getBuffs('u').length);
        buff.applyBuff('u', StatusEffect.Haste, 2);
        assert.equals(7, buff.getBuffs('u').length, '增益不受減益上限限制');
    });

    suite.test('圖示盤點同樣截到 6 個減益（毒燃被控制加上六種狀態時，優先序最低者被擠掉）', () => {
        const ctx = {
            ...emptyStatusContext(),
            effects: [StatusEffect.Stun, StatusEffect.Rooted, StatusEffect.Slow, StatusEffect.Weak, StatusEffect.NoShoot, StatusEffect.Fear].map((effect) => ({ effect, remainingTurns: 2 })),
            dot: { remainingTurns: 2 },
            burn: { remainingTurns: 2 },
            controlled: { turnsLeft: 2 },
        };
        const list = computeUnitStatusIcons(unitSource, ctx, 99);
        const debuffs = list.icons.filter((i) => i.isDebuff);
        assert.equals(6, debuffs.length);
        assert.isFalse(list.allKinds.includes('no-shoot'), '優先序最低的封射被擠掉');
    });

    // ───────── 三招新 profile ─────────
    suite.test('郭嘉遺計：敵方全體、最多 4 目標、距離衰減、虛弱 2 回合、特效 weaken', () => {
        const p = resolveBattleSkillProfile('guo-jia-legacy')!;
        assert.isTrue(!!p);
        assert.equals('control', p.effectKind);
        assert.equals(StatusEffect.Weak, p.statusEffect);
        assert.equals(2, p.statusTurns);
        assert.equals(4, p.maxTargets);
        assert.equals('linear-step', p.falloffRule);
        assert.equals(0, p.coefficient);
        assert.equals('weaken', tacticVfxGroupOf('guo-jia-legacy'));
    });

    suite.test('大喬國色：友軍全體士氣 +15（建議範圍 10～20）、不附狀態、特效 bless', () => {
        const p = resolveBattleSkillProfile('da-qiao-beauty')!;
        assert.isTrue(!!p);
        assert.equals('morale', p.effectKind);
        assert.isTrue((p.moraleBonus ?? 0) >= 10 && (p.moraleBonus ?? 0) <= 20, `士氣 ${p.moraleBonus}`);
        assert.equals(undefined, p.statusEffect);
        assert.equals('bless', tacticVfxGroupOf('da-qiao-beauty'));
    });

    suite.test('曹仁穩固：敵方單體最前排、定身 1 回合；控制組特效 stun（control＋Rooted 也歸 stun）', () => {
        const p = resolveBattleSkillProfile('cao-ren-steadfast')!;
        assert.isTrue(!!p);
        assert.equals('control', p.effectKind);
        assert.equals(StatusEffect.Rooted, p.statusEffect);
        assert.equals(1, p.statusTurns);
        assert.equals(1, p.maxTargets);
        assert.equals('frontmost-enemy', p.autoAimMode);
        assert.equals('stun', tacticVfxGroupOf('cao-ren-steadfast'));
    });

    suite.test('三招與恐懼狀態名在四個語系都有鍵值', () => {
        const root = path.resolve(__dirname, '..');
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/i18n', `${locale}.json`), 'utf8')) as Record<string, string>;
            for (const id of ['guo-jia-legacy', 'da-qiao-beauty', 'cao-ren-steadfast']) {
                assert.isTrue(!!table[`battle.skill_name.${id}`], `${locale} 缺 battle.skill_name.${id}`);
            }
            assert.isTrue(!!table['status.fear'], `${locale} 缺 status.fear`);
        }
    });

    return suite;
}
