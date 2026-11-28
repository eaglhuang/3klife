/**
 * LifeDuel.test.ts — 生活層 Q 頭切磋：模擬、結算、邀約、呈現時間軸（PROG-2-10231）
 */
import { TestSuite, assert } from './TestRunner';
import { DEFAULT_DUEL_CONFIG, classifyLoss, duelIdempotencyKey, simulateDuel } from '../assets/scripts/core/life/duel/DuelSim';
import { checkDuelInvite, startDuel } from '../assets/scripts/core/life/duel/DuelInvite';
import type { DuelFighter, DuelInput } from '../assets/scripts/core/life/duel/DuelTypes';
import { InteractionQuota } from '../assets/scripts/ui/life/InteractionQuota';
import { buildDuelTimeline, createDuelFrame, sampleDuel } from '../assets/scripts/shared/presentation/duel/DuelPlayback';

const cfg = DEFAULT_DUEL_CONFIG;
const guan: DuelFighter = { id: 'guanyu', force: 97, intellect: 75 };
const zhang: DuelFighter = { id: 'zhangfei', force: 98, intellect: 30 };
const weak: DuelFighter = { id: 'weak', force: 40, intellect: 40 };

function input(over: Partial<DuelInput> = {}): DuelInput {
    return { a: guan, b: zhang, mode: 'serious', seed: 1234, ...over };
}

export function createLifeDuelSuite(): TestSuite {
    const suite = new TestSuite('LifeDuel 生活層切磋 (PROG-2-10231)');

    suite.test('同 seed 同過程；不同 seed 過程不同', () => {
        const r1 = simulateDuel(input());
        const r2 = simulateDuel(input());
        assert.equals(JSON.stringify(r1), JSON.stringify(r2));
        const diff = Array.from({ length: 20 }, (_, i) => JSON.stringify(simulateDuel(input({ seed: i + 1 })).events));
        assert.isTrue(new Set(diff).size > 10, '不同 seed 應產生多種過程');
    });

    suite.test('12 回合內結束、血量不為負、事件帶雙方血量', () => {
        for (let s = 1; s <= 200; s++) {
            const r = simulateDuel(input({ seed: s }));
            assert.isTrue(r.rounds >= 1 && r.rounds <= cfg.roundLimit, `回合數 ${r.rounds}`);
            assert.isTrue(r.hpLeft.a >= 0 && r.hpLeft.b >= 0);
            assert.isTrue(r.events.length > 0);
        }
    });

    suite.test('點到為止：血量 30% 收手＝draw，無傷勢無被擒', () => {
        let stops = 0;
        for (let s = 1; s <= 200; s++) {
            const r = simulateDuel(input({ mode: 'friendly', seed: s }));
            assert.isFalse(r.ko, '點到為止不會 KO');
            assert.equals('draw', r.outcomeTier);
            assert.isTrue(r.injury === null && r.capturedId === null);
            const lowest = Math.min(r.hpLeft.a / r.hpMax.a, r.hpLeft.b / r.hpMax.b);
            if (r.events.some((e) => e.kind === 'stop')) {
                stops++;
                assert.isTrue(lowest <= 0.3 + 1e-9, '收手時至少一方 <=30%');
                assert.isTrue(lowest > 0.3 - 0.2, '不會一擊打穿很多');
            }
        }
        assert.isTrue(stops > 100, '多數點到為止會收手');
    });

    suite.test('認真切磋：有 ko 時輸方血量 0、輸方輕傷（首次）', () => {
        let kos = 0;
        for (let s = 1; s <= 300; s++) {
            const r = simulateDuel(input({ seed: s, a: guan, b: weak }));
            if (!r.ko) continue;
            kos++;
            const loserSide = r.winner === 'a' ? 'b' : 'a';
            assert.equals(0, r.hpLeft[loserSide]);
            assert.equals('lightInjury', r.outcomeTier);
            assert.equals('light', r.injury!.level);
            assert.equals(loserSide === 'a' ? 'guanyu' : 'weak', r.injury!.targetId);
        }
        assert.isTrue(kos > 50, `強弱對打應常 KO（${kos}）`);
    });

    suite.test('武力高者勝率明顯較高', () => {
        let strongWins = 0;
        for (let s = 1; s <= 300; s++) {
            if (simulateDuel(input({ seed: s, a: guan, b: weak })).winner === 'a') strongWins++;
        }
        assert.isTrue(strongWins > 240, `強者勝 ${strongWins}/300`);
    });

    suite.test('傷勢分級：首次輕傷、輕傷中再敗或連敗升重傷、已重傷維持、當季已升過不再升', () => {
        assert.equals('lightInjury', classifyLoss({ ...weak }, 'serious').tier);
        assert.equals('severeInjury', classifyLoss({ ...weak, injury: 'light' }, 'serious').tier);
        assert.equals('severeInjury', classifyLoss({ ...weak, lostLastDuel: true }, 'serious').tier);
        assert.equals('severeInjury', classifyLoss({ ...weak, injury: 'severe' }, 'serious').tier);
        assert.equals('lightInjury', classifyLoss({ ...weak, injury: 'light', severeUpgradedThisQuarter: true }, 'serious').tier);
        // 永遠不產生比重傷更重的傷勢等級
        assert.equals('severe', classifyLoss({ ...weak, injury: 'severe' }, 'serious').injury!.level);
    });

    suite.test('宿敵死鬥：輸方 captured、不陣亡、不寫傷勢；模組沒有任何 death 結果', () => {
        const r = simulateDuel(input({ mode: 'deathmatch', a: guan, b: weak, seed: 7 }));
        if (r.winner) {
            assert.equals('captured', r.outcomeTier);
            assert.equals('weak', r.capturedId!);
            assert.isTrue(r.injury === null);
        }
        const tiers = new Set<string>();
        for (let s = 1; s <= 100; s++) tiers.add(simulateDuel(input({ seed: s, mode: 'deathmatch' })).outcomeTier);
        for (const t of tiers) assert.isTrue(t === 'draw' || t === 'captured', `未預期 ${t}`);
    });

    suite.test('主角不受傷：落敗只演出暈，無傷勢無被擒', () => {
        const hero: DuelFighter = { id: 'hero', force: 30, intellect: 30, isProtagonist: true };
        let stunned = 0;
        for (const mode of ['serious', 'deathmatch'] as const) {
            for (let s = 1; s <= 100; s++) {
                const r = simulateDuel({ a: hero, b: zhang, mode, seed: s });
                if (r.winner === 'b') {
                    stunned++;
                    assert.isTrue(r.protagonistStunned);
                    assert.isTrue(r.injury === null && r.capturedId === null);
                    assert.equals('draw', r.outcomeTier);
                }
                assert.isTrue(r.injury === null || r.injury.targetId !== 'hero');
            }
        }
        assert.isTrue(stunned > 50);
    });

    suite.test('家臣代打：代打家臣落敗由家臣承擔傷勢', () => {
        const proxy: DuelFighter = { id: 'retainer', force: 20, intellect: 20 };
        const r = simulateDuel({ a: proxy, b: zhang, mode: 'serious', seed: 3 });
        assert.equals('b', r.winner!);
        assert.equals('retainer', r.injury!.targetId);
    });

    suite.test('高將階血量 x1.2', () => {
        const r = simulateDuel(input({ a: { ...guan, highRank: true } }));
        assert.equals(120, r.hpMax.a);
        assert.equals(100, r.hpMax.b);
    });

    suite.test('冪等鍵格式', () => {
        assert.equals('duel:1234:5', duelIdempotencyKey(1234, 5));
    });

    suite.test('邀約資格：出征／重傷拒絕、輕傷 -20%、演武場 +20%、季上限、非宿敵無死鬥', () => {
        assert.equals('unavailable', checkDuelInvite({ id: 'x', unavailable: true }, 'serious', false).reason!);
        assert.equals('severeInjured', checkDuelInvite({ id: 'x', injury: 'severe' }, 'serious', false).reason!);
        assert.equals('quarterCap', checkDuelInvite({ id: 'x', duelsThisQuarter: 3 }, 'serious', false).reason!);
        assert.equals('notRival', checkDuelInvite({ id: 'x' }, 'deathmatch', false).reason!);
        assert.isTrue(checkDuelInvite({ id: 'x', isRival: true }, 'deathmatch', false).ok);
        assert.isTrue(Math.abs(checkDuelInvite({ id: 'x', injury: 'light' }, 'serious', false).acceptDelta + 0.2) < 1e-9);
        assert.isTrue(Math.abs(checkDuelInvite({ id: 'x' }, 'serious', true).acceptDelta - 0.2) < 1e-9);
        // 演武場的點到為止不計入被單挑 3 次上限
        assert.isTrue(checkDuelInvite({ id: 'x', duelsThisQuarter: 3 }, 'friendly', true).ok);
    });

    suite.test('互動次數：扣 InteractionQuota，每季 6 次免費，第 7 次要買、不開打', () => {
        const quota = new InteractionQuota();
        for (let i = 0; i < 6; i++) {
            const o = startDuel(input({ seed: i + 1 }), { id: 'zhangfei' }, false, quota);
            assert.isTrue(o.started && o.quota === 'free' && !!o.result);
        }
        const blocked = startDuel(input(), { id: 'zhangfei' }, false, quota);
        assert.isFalse(blocked.started);
        assert.equals('needPurchase', blocked.reason!);
        assert.equals(0, quota.freeRemaining);
    });

    suite.test('被資格擋下的邀約不扣互動次數', () => {
        const quota = new InteractionQuota();
        const o = startDuel(input(), { id: 'zhangfei', injury: 'severe' }, false, quota);
        assert.isFalse(o.started);
        assert.equals(6, quota.freeRemaining);
    });

    suite.test('呈現時間軸：每個出手一拍、時間遞增、跳字與血條前後條', () => {
        const r = simulateDuel(input({ seed: 9 }));
        const tl = buildDuelTimeline(r, cfg.playback);
        const swings = r.events.filter((e) => e.kind === 'hit' || e.kind === 'crit' || e.kind === 'dodge').length;
        assert.equals(swings, tl.beats.length);
        for (let i = 1; i < tl.beats.length; i++) assert.isTrue(tl.beats[i].start >= tl.beats[i - 1].end - 1e-9);
        assert.isTrue(tl.total > tl.fightEnd);
        const frame = createDuelFrame();
        const hit = tl.beats.find((b) => b.kind !== 'dodge')!;
        sampleDuel(tl, hit.tHit + 0.02, frame);
        assert.equals(1, frame.floats.length);
        assert.equals(hit.damage, frame.floats[0].damage);
        const f = hit.defender === 'a' ? frame.hp.aFront : frame.hp.bFront;
        const b = hit.defender === 'a' ? frame.hp.aBack : frame.hp.bBack;
        assert.isTrue(b > f, '後條在 0.4 秒內追上前，剛命中時後條較長');
        assert.equals(1, (hit.defender === 'a' ? frame.a : frame.b).flash, '命中停格白閃');
        sampleDuel(tl, tl.total + 1, frame);
        assert.isTrue(frame.done);
        assert.equals(0, frame.floats.length);
    });

    suite.test('呈現取樣：蓄力往後退、衝撞前進到接觸、結束後勝者跳敗者暈', () => {
        const r = simulateDuel(input({ seed: 4, a: guan, b: weak }));
        const tl = buildDuelTimeline(r, cfg.playback);
        const beat = tl.beats[0];
        const frame = createDuelFrame();
        sampleDuel(tl, beat.start + cfg.playback.chargeSec * 0.99, frame);
        const atk = beat.attacker === 'a' ? frame.a : frame.b;
        assert.isTrue(atk.x < -0.3, `蓄力後退 ${atk.x}`);
        sampleDuel(tl, beat.tHit, frame);
        const atk2 = beat.attacker === 'a' ? frame.a : frame.b;
        assert.isTrue(Math.abs(atk2.x - (cfg.playback.standoffH - 1)) < 1e-6, '衝撞到接觸距離');
        sampleDuel(tl, tl.fightEnd + 0.2, frame);
        const w = r.winner === 'a' ? frame.a : frame.b;
        const l = r.winner === 'a' ? frame.b : frame.a;
        assert.equals('win', w.pose);
        assert.equals('stun', l.pose);
    });

    return suite;
}
