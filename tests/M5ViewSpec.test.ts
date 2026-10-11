/**
 * M5ViewSpec.test.ts — M5 戰場 View 層 headless 測試（PROG-2-0081~0083）
 *
 * 不開 Cocos 編輯器：驗 ui-spec JSON 有程式會查找的節點路徑、screen 有路由，
 * 再驗 Presenter（純邏輯）輸出的文字。
 * Unity 對照：EditMode Test 檢查 Prefab 階層有 SerializeField 綁定的子物件，再測 Presenter。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { buildBattleRecordTabText } from '../assets/scripts/core/systems/BattleRecordStats';
import { PrisonerPopupController } from '../assets/scripts/ui/core/PrisonerPopupController';
import { createPowRecord, createPrisonState, type PowDecision, type PrisonState } from '../assets/scripts/core/systems/PrisonerOfWar';
import { STARTER_MILITARY } from '../assets/scripts/core/systems/MilitaryReserve';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';

const UI_SPEC = path.resolve(__dirname, '../assets/resources/ui-spec');

interface SpecNode { name?: string; children?: SpecNode[] }

function readSpec<T = SpecNode>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(UI_SPEC, rel), 'utf8')) as T;
}

function findPath(root: SpecNode, nodePath: string): SpecNode | null {
    let current: SpecNode | null = root;
    for (const segment of nodePath.split('/')) {
        current = current?.children?.find((c) => c.name === segment) ?? null;
        if (!current) return null;
    }
    return current;
}

function collectIds(node: { id?: string; children?: unknown[] }, out: Set<string>): Set<string> {
    if (node.id) out.add(node.id);
    for (const c of node.children ?? []) collectIds(c as { id?: string; children?: unknown[] }, out);
    return out;
}

/** View 的 texts / actives / enabled key 都要對得到 layout 節點 id（applyFlowView 靠 id 綁定） */
function assertViewKeysInLayout(view: { texts: Record<string, string>; actives: Record<string, boolean>; enabled: Record<string, boolean> }, ids: Set<string>, layoutName: string): void {
    const missing = [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)].filter((k) => !ids.has(k));
    assert.equals('', missing.join(','), `${layoutName} 缺節點 id`);
}

function findByName(root: SpecNode, name: string): SpecNode | null {
    if (root.name === name) return root;
    for (const child of root.children ?? []) {
        const hit = findByName(child, name);
        if (hit) return hit;
    }
    return null;
}

export function createM5ViewSpecSuite(): TestSuite {
    const suite = new TestSuite('M5ViewSpec');

    suite.test('0081 戰績分頁：unified 版面有「戰」按鈕、screen 有 Record 路由、fragment 有子面板要的 Label', () => {
        const layout = readSpec<{ root?: SpecNode } & SpecNode>('layouts/general-detail-unified-main.json');
        const tabBar = findByName(layout.root ?? layout, 'RightTabBar');
        assert.isTrue(!!tabBar && !!findPath(tabBar, 'BtnTabRecord/Label'), 'RightTabBar/BtnTabRecord');
        assert.equals(7, tabBar!.children!.length, '七個分頁按鈕');
        const screen = readSpec<{ tabRouting: Record<string, { slotId: string; fragment: string }> }>('screens/general-detail-unified-screen.json');
        assert.equals('fragments/layouts/gd-tab-record', screen.tabRouting.Record?.fragment);
        assert.equals('ContentSlot', screen.tabRouting.Record?.slotId);
        const fragment = readSpec('fragments/layouts/gd-tab-record.json');
        assert.equals('TabRecordContent', fragment.name);
        for (const p of ['SummaryCard/CareerValue', 'SummaryCard/WinRateValue', 'StatsCard/StatsValue', 'MilestoneCard/MilestoneValue', 'RetireCard/RetireValue']) {
            assert.isTrue(!!findPath(fragment, p), `fragment 缺 ${p}`);
        }
    });

    suite.test('0081 戰績分頁文字：沒出征過顯示「尚未出征」，有戰績時列出五項與里程碑', () => {
        const empty = buildBattleRecordTabText(undefined);
        assert.equals('尚未出征', empty.career);
        assert.equals('勝率 —', empty.winRate);
        assert.isTrue(empty.stats.includes('勝場：0'));
        assert.equals('里程碑：尚未達成', empty.milestones);
        assert.equals('退役評價：N', empty.retire);

        const veteran = buildBattleRecordTabText({ wins: 30, losses: 10, draws: 0, kills: 1200, totalDamage: 123456, guardianPower: 5000, milestones: ['KILL_100', 'KILL_1000'] });
        assert.equals('生涯戰績：30勝 10敗 斬1200人', veteran.career);
        assert.equals('勝率 75%', veteran.winRate);
        assert.isTrue(veteran.stats.includes('傷害總量：123,456'), veteran.stats);
        assert.equals(5, veteran.stats.split('\n').length);
        assert.equals('里程碑：百人斬、千人斬', veteran.milestones);
        assert.equals('退役評價：R', veteran.retire, `retire ${veteran.retire}`);
    });

    // ── 0082 俘虜四選一 ──────────────────────────────────────────────────

    const powTarget = (id: string, name: string, rarityTier = 'epic') => ({ id, name, rarityTier, cha: 60, luk: 50, int: 70, pol: 40 });

    function fakePowDeps(gold: number, pendingCount = 1) {
        let prison: PrisonState = createPrisonState();
        for (let i = 0; i < pendingCount; i += 1) {
            const target = powTarget(`pow-${i}`, `敵將${i}`);
            prison.pending.push({ record: createPowRecord(target, { cha: 80, luk: 60 })!, target });
        }
        let wallet = gold;
        const calls: PowDecision[] = [];
        const deps = {
            session: {
                get prison() { return prison; },
                get military() { return { ...STARTER_MILITARY }; },
                async resolvePrisoner(uid: string, decision: PowDecision) {
                    calls.push(decision);
                    const pending = prison.pending.find((p) => p.record.targetUid === uid)!;
                    const goldSpent = decision === 'recruit' ? pending.record.options.recruitCost.gold : 0;
                    prison = { ...prison, pending: prison.pending.filter((p) => p !== pending) };
                    return { decision, ok: true, reasons: [], joined: decision === 'recruit', imprisoned: false, released: false, goldSpent, cityTroopsSpent: 0, fameGained: 0, record: { ...pending.record, decision } };
                },
            },
            wallet: { gold: () => wallet, spendGold: (n: number) => { wallet -= n; return true; } },
        };
        return { deps, calls, wallet: () => wallet };
    }

    suite.test('0082 俘虜彈窗：view key 全部對得到 prisoner-popup-main 的節點 id，screen 指向自己的 layout/skin', () => {
        const layout = readSpec<{ root: SpecNode & { id?: string } }>('layouts/prisoner-popup-main.json');
        const ids = collectIds(layout.root, new Set());
        const { deps } = fakePowDeps(100000, 2);
        const ctrl = new PrisonerPopupController(deps);
        assertViewKeysInLayout(ctrl.getView(), ids, 'prisoner-popup-main');
        assertViewKeysInLayout(new PrisonerPopupController(fakePowDeps(0, 0).deps).getView(), ids, 'prisoner-popup-main（空）');
        const screen = readSpec<{ layout: string; skin: string }>('screens/prisoner-popup-screen.json');
        assert.equals('prisoner-popup-main', screen.layout);
        assert.equals('prisoner-popup-screen.skin', screen.skin);
        assert.isTrue(fs.existsSync(path.join(UI_SPEC, 'skins/prisoner-popup-screen.skin.json')));
    });

    suite.test('0082 俘虜彈窗：四選一文字與可按狀態，黃金不足不能招募；招募後從錢包扣金並換下一位', async () => {
        const poor = new PrisonerPopupController(fakePowDeps(0).deps).getView();
        assert.isTrue(poor.texts.powTarget.includes('敵將0（SR）'), poor.texts.powTarget);
        assert.isTrue(poor.texts.persuadeLabel.startsWith('勸降（成功率'), poor.texts.persuadeLabel);
        assert.isTrue(poor.texts.recruitLabel.includes('2000 黃金'), poor.texts.recruitLabel);
        assert.isTrue(poor.enabled.btnPersuade && poor.enabled.btnImprison && poor.enabled.btnRelease);
        assert.isFalse(poor.enabled.btnRecruit, '黃金不足');
        assert.isFalse(poor.enabled.btnPrevPow, '只有一位不能翻頁');

        const rich = fakePowDeps(5000, 2);
        const ctrl = new PrisonerPopupController(rich.deps);
        assert.equals('1 / 2', ctrl.getView().texts.powPager);
        assert.isTrue(ctrl.getView().enabled.btnRecruit);
        const result = await ctrl.decide('recruit');
        assert.isTrue(!!result?.joined);
        assert.equals(3000, rich.wallet(), '扣掉 SR 招募的 2000 黃金');
        const after = ctrl.getView();
        assert.isTrue(after.texts.powNotice.includes('勉強就範'), after.texts.powNotice);
        assert.equals('1 / 1', after.texts.powPager);
        assert.isTrue(after.texts.powTarget.includes('敵將1'));
    });

    suite.test('0082 俘虜彈窗 × GameSession：勸降失敗後勸降鈕關閉、仍可放走；放走後清單清空、顯示空提示', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([]));
        await session.capturePrisoner(powTarget('lu-bu', '呂布', 'legendary') as never);
        let gold = 0;
        const ctrl = new PrisonerPopupController({ session, wallet: { gold: () => gold, spendGold: (n) => { gold -= n; return true; } } });
        assert.isTrue(ctrl.hasPending());
        await ctrl.decide('persuade');
        const failed = ctrl.getView();
        assert.isTrue(failed.texts.powNotice.includes('寧死不降'), failed.texts.powNotice);
        assert.isFalse(failed.enabled.btnPersuade, '勸降失敗不能重擲');
        assert.isTrue(failed.enabled.btnRelease && failed.enabled.btnImprison);
        assert.equals('勸降（已失敗，寧死不屈）', failed.texts.persuadeLabel);
        await ctrl.decide('release');
        const empty = ctrl.getView();
        assert.isFalse(ctrl.hasPending());
        assert.isFalse(empty.actives.powPanel);
        assert.isTrue(empty.actives.powEmptyHint);
        assert.isTrue(empty.texts.powNotice.includes('義釋'), empty.texts.powNotice);
        assert.equals(500, session.prison.fame, 'SSR 放走 +500 名聲');
    });

    return suite;
}
