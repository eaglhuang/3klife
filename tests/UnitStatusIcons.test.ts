/**
 * UnitStatusIcons.test.ts — 單位頭頂 buff／debuff 圖示盤點與排序（PROG-2-9399）
 *
 * Unity 對照：EditMode 測試 Buff 圖示列 ViewModel 的內容、排序、上限與溢出。
 */
import { StatusEffect } from '../assets/scripts/shared/CommonEnums';
import {
    buildUnitStatusContext, computeUnitStatusIcons, emptyStatusContext, gainedTones, newlyGainedKinds,
    STATUS_ICON_MAX_VISIBLE, type UnitStatusSource,
} from '../assets/scripts/battle/shared/UnitStatusIcons';
import { TestSuite, assert } from './TestRunner';

const plain = (): UnitStatusSource => ({ attackBonus: 0, maxHpBonus: 0, shield: 0, morale: 0, moraleTurns: 0 });

export function createUnitStatusIconsSuite(): TestSuite {
    const suite = new TestSuite('UnitStatusIcons (頭頂狀態圖示 PROG-2-9399)');

    suite.test('沒有任何狀態：不出圖示、無溢出', () => {
        const r = computeUnitStatusIcons(plain(), emptyStatusContext());
        assert.equals(0, r.icons.length);
        assert.equals(0, r.overflow);
        assert.equals('', r.overflowText);
    });

    suite.test('攻擊加成為正是增益、為負是減益（含吃到地形 buff 格的結果）', () => {
        const up = computeUnitStatusIcons({ ...plain(), attackBonus: 10 }, emptyStatusContext());
        assert.equals('attack-up', up.icons[0].kind);
        assert.equals(false, up.icons[0].isDebuff);
        assert.equals('攻', up.icons[0].glyph);
        const down = computeUnitStatusIcons({ ...plain(), attackBonus: -5 }, emptyStatusContext());
        assert.equals('attack-down', down.icons[0].kind);
        assert.equals(true, down.icons[0].isDebuff);
    });

    suite.test('生命上限加成、護盾、士氣各自出圖示，士氣帶剩餘回合', () => {
        const r = computeUnitStatusIcons({ attackBonus: 0, maxHpBonus: 20, shield: 8, morale: 10, moraleTurns: 2 }, emptyStatusContext());
        const kinds = r.icons.map((i) => i.kind);
        assert.equals(true, kinds.indexOf('hp-up') >= 0);
        assert.equals(true, kinds.indexOf('shield') >= 0);
        const morale = r.icons.find((i) => i.kind === 'morale-up');
        assert.equals(2, morale?.turns);
    });

    suite.test('BuffSystem 狀態：暈眩、定身、緩速、虛弱、封射為減益；疾行、無敵、堅盾為增益', () => {
        const ctx = {
            ...emptyStatusContext(),
            effects: [
                { effect: StatusEffect.Stun, remainingTurns: 1 },
                { effect: StatusEffect.Rooted, remainingTurns: 2 },
                { effect: StatusEffect.Haste, remainingTurns: 3 },
                { effect: StatusEffect.Fortified, remainingTurns: 2 },
            ],
        };
        // 只驗分類，不受頭頂格數上限影響
        const r = computeUnitStatusIcons(plain(), ctx, 8);
        const byKind = new Map(r.icons.map((i) => [i.kind, i]));
        assert.equals(true, byKind.get('stun')?.isDebuff);
        assert.equals(true, byKind.get('rooted')?.isDebuff);
        assert.equals(false, byKind.get('haste')?.isDebuff);
        assert.equals(false, byKind.get('defense-up')?.isDebuff);
        assert.equals(1, byKind.get('stun')?.turns);
    });

    suite.test('回合為 0 的狀態不出圖示；未知狀態略過', () => {
        const ctx = { ...emptyStatusContext(), effects: [{ effect: StatusEffect.Stun, remainingTurns: 0 }, { effect: 'mystery', remainingTurns: 3 }] };
        assert.equals(0, computeUnitStatusIcons(plain(), ctx).icons.length);
    });

    suite.test('毒箭、被控制、全隊 aura、全體減益、自身爆發、單挑加成都能盤點', () => {
        const ctx = {
            ...emptyStatusContext(),
            dot: { remainingTurns: 2 },
            controlled: { turnsLeft: 1 },
            teamAura: { remainingTurns: 3, attackMultiplier: 1.3, defenseMultiplier: 1.4, damageReduction: 0 },
            massDebuff: { turnsLeft: 2, accuracyPenalty: 0.25, critPenalty: 0, attackMultiplier: 0.8, damageTakenMultiplier: 1.25, dotPct: 0 },
            selfBurst: { remainingTurns: 2, attackMultiplier: 1.5, critRateBonus: 0.3 },
            duelVictory: { critBonus: 0.15, remainingTurns: 2 },
        };
        const r = computeUnitStatusIcons(plain(), ctx, 99);
        const kinds = new Set(r.allKinds);
        for (const k of ['poison', 'controlled', 'attack-up', 'defense-up', 'attack-down', 'defense-down', 'accuracy-down', 'crit-up']) {
            assert.equals(true, kinds.has(k as never), `缺少 ${k}`);
        }
    });

    suite.test('同種類多來源只留一個，回合取較長；永久來源視為最長', () => {
        const ctx = {
            ...emptyStatusContext(),
            teamAura: { remainingTurns: 3, attackMultiplier: 1.3, defenseMultiplier: 1, damageReduction: 0 },
            selfBurst: { remainingTurns: 2, attackMultiplier: 1.5, critRateBonus: 0 },
        };
        const r = computeUnitStatusIcons(plain(), ctx);
        assert.equals(1, r.icons.length);
        assert.equals(3, r.icons[0].turns);
        const permanent = computeUnitStatusIcons({ ...plain(), attackBonus: 5 }, ctx);
        assert.equals(null, permanent.icons[0].turns);
    });

    suite.test('排序：減益在增益之前，控制類最前', () => {
        const ctx = {
            ...emptyStatusContext(),
            effects: [
                { effect: StatusEffect.Haste, remainingTurns: 2 },
                { effect: StatusEffect.Stun, remainingTurns: 1 },
                { effect: StatusEffect.Weak, remainingTurns: 1 },
            ],
        };
        const r = computeUnitStatusIcons({ ...plain(), attackBonus: 4 }, ctx, 8);
        assert.equals('stun,weak,attack-up,haste', r.icons.map((i) => i.kind).join(','));
    });

    suite.test('最多顯示 STATUS_ICON_MAX_VISIBLE 個，超過以「+N」表示，且保留完整種類清單', () => {
        const ctx = {
            ...emptyStatusContext(),
            effects: [
                { effect: StatusEffect.Stun, remainingTurns: 1 },
                { effect: StatusEffect.Slow, remainingTurns: 1 },
                { effect: StatusEffect.Weak, remainingTurns: 1 },
                { effect: StatusEffect.Haste, remainingTurns: 1 },
                { effect: StatusEffect.Invincible, remainingTurns: 1 },
            ],
            dot: { remainingTurns: 1 },
        };
        const r = computeUnitStatusIcons({ ...plain(), shield: 3 }, ctx);
        assert.equals(STATUS_ICON_MAX_VISIBLE, r.icons.length);
        assert.equals(7 - STATUS_ICON_MAX_VISIBLE, r.overflow);
        assert.equals(`+${7 - STATUS_ICON_MAX_VISIBLE}`, r.overflowText);
        assert.equals(7, r.allKinds.length);
    });

    suite.test('簽名：內容相同不變，狀態或回合改變就變', () => {
        const a = computeUnitStatusIcons({ ...plain(), attackBonus: 3 }, emptyStatusContext());
        const b = computeUnitStatusIcons({ ...plain(), attackBonus: 9 }, emptyStatusContext());
        assert.equals(a.signature, b.signature);
        const c = computeUnitStatusIcons({ ...plain(), attackBonus: 3 }, { ...emptyStatusContext(), dot: { remainingTurns: 2 } });
        assert.equals(false, a.signature === c.signature);
    });

    suite.test('新增判定：第一次畫不算新增；之後多出來的種類才算，並分出增益／減益', () => {
        assert.equals(0, newlyGainedKinds(null, ['attack-up']).length);
        const gained = newlyGainedKinds(['attack-up'], ['attack-up', 'stun']);
        assert.equals('stun', gained.join(','));
        assert.equals(true, gainedTones(gained).debuff);
        assert.equals(false, gainedTones(gained).buff);
        assert.equals(0, newlyGainedKinds(['stun'], []).length);
    });

    suite.test('buildUnitStatusContext：依陣營取 aura／減益，依單位 id 取毒箭與控制', () => {
        const state = {
            unitDots: new Map([['u1', { remainingTurns: 2 }]]),
            teamAuras: new Map([['player', { remainingTurns: 2, attackMultiplier: 1.2, defenseMultiplier: 1, damageReduction: 0 }]]),
            controlledUnits: new Map([['u2', { turnsLeft: 1 }]]),
        };
        const p = buildUnitStatusContext({ id: 'u1', faction: 'player' }, state, []);
        assert.equals(2, p.dot?.remainingTurns);
        assert.equals(true, p.teamAura !== null);
        assert.equals(true, p.controlled === null);
        const e = buildUnitStatusContext({ id: 'u2', faction: 'enemy' }, state, []);
        assert.equals(true, e.teamAura === null);
        assert.equals(1, e.controlled?.turnsLeft);
        assert.equals(true, buildUnitStatusContext({ id: 'x', faction: 'player' }, null, []).dot === null);
    });

    return suite;
}
