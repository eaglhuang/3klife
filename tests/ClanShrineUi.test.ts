/**
 * ClanShrineUi.test.ts — 祠堂聲望畫面（PROG-2-1958）：檢視模型與控制器
 */
import { TestSuite, assert } from './TestRunner';
import { clanShrineBenefitLines, clanShrineView } from '../assets/scripts/ui/core/ClanShrineView';
import { ClanShrineController } from '../assets/scripts/ui/core/ClanShrineController';
import type { ClanShrineView } from '../assets/scripts/ui/core/ClanShrineView';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';

function setup(opts: { prestige?: number; tier?: number; claimable?: boolean; granted?: number } = {}) {
    let bindings: MentorHoldingsButtonBinding[] = [];
    const host = { node: { active: true }, binder: null };
    const applied: ClanShrineView[] = [];
    const toasts: string[] = [];
    const state = { prestige: opts.prestige ?? 0, tier: opts.tier ?? 1, claimable: opts.claimable ?? false };
    let claimCalls = 0;
    const ctrl = new ClanShrineController({
        mountHost: async (b) => { bindings = b; return host; },
        apply: (_h, v) => { applied.push(v); },
        prestige: () => state.prestige,
        tier: () => state.tier,
        canClaim: () => state.claimable,
        claim: async () => { claimCalls++; if (state.claimable) { state.claimable = false; return opts.granted ?? 1; } return 0; },
        offeringPills: 1,
        now: () => 1000,
        toast: (m) => { toasts.push(m); },
    });
    return { ctrl, host, applied, toasts, state, click: (id: string) => bindings.find((b) => b.buttonId === id)?.handler(), claimCalls: () => claimCalls };
}

export function createClanShrineUiSuite(): TestSuite {
    const suite = new TestSuite('ClanShrineUi (祠堂聲望畫面 PROG-2-1958)');

    suite.test('檢視：Lv.1 顯示稱號、差額、尚無福祉，供奉鈕灰掉並說明解鎖條件', () => {
        const v = clanShrineView({ prestige: 300, tier: 1, canClaim: false, offeringPills: 1 });
        assert.equals('家族聲望 300', v.texts.shrinePrestige);
        assert.equals('Lv.1　鄉野寒門', v.texts.shrineTier);
        assert.equals('距 Lv.2「鄉梓郡望」還差 1200', v.texts.shrineProgress);
        assert.equals('目前福祉\n尚無福祉', v.texts.shrineBenefits);
        assert.isFalse(v.enabled.btnClaimShrine);
        assert.equals('聲望達 Lv.5 解鎖每日供奉', v.texts.shrineClaimLabel);
    });

    suite.test('檢視：Lv.5 最高階福祉齊全，可領與已領的按鈕狀態不同', () => {
        const can = clanShrineView({ prestige: 30000, tier: 5, canClaim: true, offeringPills: 1 });
        assert.equals('已達最高階', can.texts.shrineProgress);
        assert.isTrue(can.enabled.btnClaimShrine);
        assert.equals('領取供奉（補元散 ×1）', can.texts.shrineClaimLabel);
        const done = clanShrineView({ prestige: 30000, tier: 5, canClaim: false, offeringPills: 1 });
        assert.isFalse(done.enabled.btnClaimShrine);
        assert.equals('今日供奉已領取', done.texts.shrineClaimLabel);
        const lines = clanShrineBenefitLines(5);
        assert.equals('子嗣五維 +20%', lines[0]);
        assert.isTrue(lines.indexOf('每日祠堂供奉') >= 0);
        assert.isTrue(lines.indexOf('子嗣保證紫因子') >= 0);
        assert.isTrue(clanShrineBenefitLines(3).indexOf('每日祠堂供奉') < 0);
    });

    suite.test('檢視：異常輸入夾回合法範圍', () => {
        const v = clanShrineView({ prestige: -5, tier: 99, canClaim: false, offeringPills: 1 });
        assert.equals('家族聲望 0', v.texts.shrinePrestige);
        assert.equals('Lv.5　百年門閥', v.texts.shrineTier);
    });

    suite.test('控制器：掛載隱藏、開窗刷新、關閉', async () => {
        const t = setup({ prestige: 1600, tier: 2 });
        await t.ctrl.mount();
        assert.isFalse(t.host.node.active);
        t.ctrl.setOpen(true);
        assert.isTrue(t.host.node.active);
        assert.equals('Lv.2　鄉梓郡望', t.applied[t.applied.length - 1].texts.shrineTier);
        t.click('btnCloseShrine');
        assert.isFalse(t.host.node.active);
    });

    suite.test('控制器：領取供奉成功提示並刷新成灰鈕；不能領時只提示', async () => {
        const t = setup({ prestige: 30000, tier: 5, claimable: true });
        await t.ctrl.mount();
        t.ctrl.setOpen(true);
        assert.isTrue(t.applied[t.applied.length - 1].enabled.btnClaimShrine);
        assert.equals(1, await t.ctrl.claim());
        assert.equals('祠堂供奉：獲得補元散 ×1', t.toasts[0]);
        assert.isFalse(t.applied[t.applied.length - 1].enabled.btnClaimShrine);
        assert.equals(0, await t.ctrl.claim());
        assert.equals('今天沒有可領的祠堂供奉', t.toasts[1]);
    });

    suite.test('控制器：升階提示稱號；畫面關著不刷新、開著才刷新', async () => {
        const t = setup({ prestige: 1500, tier: 2 });
        await t.ctrl.mount();
        const before = t.applied.length;
        t.ctrl.onPrestigeChanged({ tier: 2, tierUp: true });
        assert.equals('祠堂升階：Lv.2「鄉梓郡望」', t.toasts[0]);
        assert.equals(before, t.applied.length);
        t.ctrl.setOpen(true);
        const opened = t.applied.length;
        t.ctrl.onPrestigeChanged({ tier: 2, tierUp: false });
        assert.equals(opened + 1, t.applied.length);
        assert.equals(1, t.toasts.length);
    });

    return suite;
}
