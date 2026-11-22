/**
 * SupportCardLegacy.test.ts — 支援卡傳承與溢出轉換（PROG-2-9242 SUP-3；doc_spec_1264 §5.3～§5.4、TC-SUP-07、TC-SUP-08）
 *
 * 鎖住：獎勵效果 supportCard 走 item.* 命令——第一次入學、之後傳承 +1（最多 4 次，上限 +5/次）、傳承滿轉學分（R5／SR20／SSR60）；
 * 失敗整筆回滾（傳承與入學都撤銷）；同 grantKey 重送不重複；錯誤碼 E317／E318；傳承結果隨存檔保存；規則 JSON 與預設一致。
 *
 * Unity 對照：像抽卡結果處理器的 EditMode 測試，加一條「抽十次同一張卡」的整合情境。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { ItemAuthority, StockTable } from '../assets/scripts/core/api/localserver/ItemCommands';
import type { RewardAuthority } from '../assets/scripts/core/api/localserver/RewardCommands';
import { createSupportCardHandler, SUPPORT_CARD_EFFECT_KIND } from '../assets/scripts/core/api/localserver/SupportCardEffect';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { ItemInstanceView, RewardGrantResult } from '../assets/scripts/shared/api/ApiCommands';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import { DEFAULT_ITEM_CONFIG, type HolderRef } from '../assets/scripts/shared/item/ItemConfig';
import { emptyItemMeta, type ItemMeta } from '../assets/scripts/shared/item/ItemRules';
import { emptyRewardMeta, type RewardMeta } from '../assets/scripts/shared/reward/RewardRules';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';
import { normalizeSupportCards } from '../assets/scripts/shared/support/SupportCardConfig';
import { DEFAULT_SUPPORT_RULES, ITEM_SUP_CREDIT, normalizeSupportRules, planSupportDuplicate, withSupportItems } from '../assets/scripts/shared/support/SupportRules';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): unknown => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as unknown;
const cards = normalizeSupportCards(read('assets/resources/data/academy-support-cards.json'));
const rules = DEFAULT_SUPPORT_RULES;
const SSR = 'ITEM_SUPCARD_SIMA_HUI';
const SR = 'ITEM_SUPCARD_PANG_DEGONG';
const R = 'ITEM_SUPCARD_MA_RONG';

class MemoryItems implements ItemAuthority {
    public stock: Record<string, number> = {};
    public itemMeta: ItemMeta = emptyItemMeta();
    public read(holder: HolderRef, container: string): StockTable | null {
        return holder.kind === 'household' && container === 'main' ? { ...this.stock } : null;
    }
    public write(_holder: HolderRef, _container: string, next: StockTable): void { this.stock = { ...next }; }
    public meta(): ItemMeta { return this.itemMeta; }
    public setMeta(meta: ItemMeta): void { this.itemMeta = meta; }
}

class MemoryReward implements RewardAuthority {
    public rewardMeta: RewardMeta = emptyRewardMeta();
    public meta(): RewardMeta { return this.rewardMeta; }
    public setMeta(meta: RewardMeta): void { this.rewardMeta = meta; }
}

/** 一個套件：同一張卡抽 n 次（每次一個 supportCard 效果）；bad 為真時在最後多放一個不認識的效果，用來觸發整筆回滾 */
function bundleOf(id: string, itemId: string, n: number, bad = false) {
    const effects: Array<Record<string, unknown>> = Array.from({ length: n }, () => ({ kind: SUPPORT_CARD_EFFECT_KIND, itemId }));
    if (bad) effects.push({ kind: 'noSuchKind' });
    return { id, effects };
}

function rig(bundles: Array<ReturnType<typeof bundleOf>>) {
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const items = new MemoryItems();
    bundle.setItemAuthority(items);
    bundle.setItemConfig(withSupportItems(DEFAULT_ITEM_CONFIG, cards, rules));
    bundle.setRewardAuthority(new MemoryReward());
    bundle.setRewardConfig(normalizeRewardConfig({ bundles }));
    bundle.registerRewardEffect(SUPPORT_CARD_EFFECT_KIND, createSupportCardHandler(() => ({ cards, rules })));
    return { api: bundle.api, items, bundle };
}

const claim = (bundleId: string, grantKey: string) => ({ bundleId, grantKey, source: { kind: 'test' } });

export function createSupportCardLegacySuite(): TestSuite {
    const suite = new TestSuite('SupportCardLegacy');

    suite.test('planSupportDuplicate：未持有入學、傳承未滿 +1、傳承滿依稀有度轉學分', () => {
        assert.equals('enroll', planSupportDuplicate(rules, 'SSR', false, 0).action);
        assert.equals(1, (planSupportDuplicate(rules, 'R', true, 0) as { limitBreak: number }).limitBreak);
        assert.equals(4, (planSupportDuplicate(rules, 'SSR', true, 3) as { limitBreak: number }).limitBreak);
        assert.equals(5, (planSupportDuplicate(rules, 'R', true, 4) as { qty: number }).qty);
        assert.equals(20, (planSupportDuplicate(rules, 'SR', true, 4) as { qty: number }).qty);
        assert.equals(60, (planSupportDuplicate(rules, 'SSR', true, 4) as { qty: number }).qty);
    });

    suite.test('support-rules.json 的 creditOverflow 與預設一致；壞值回預設', () => {
        const loaded = normalizeSupportRules(read('assets/resources/data/support-rules.json'));
        assert.equals(JSON.stringify(DEFAULT_SUPPORT_RULES), JSON.stringify(loaded));
        const bad = normalizeSupportRules({ creditOverflow: { R: -1, SR: 'x', SSR: 7 } });
        assert.equals(5, bad.creditOverflow.R);
        assert.equals(20, bad.creditOverflow.SR);
        assert.equals(7, bad.creditOverflow.SSR);
    });

    suite.test('同一張 R 卡連抽 10 次：第 1 抽入學、第 2～5 抽傳承 1～4、第 6～10 抽各轉 5 學分', async () => {
        const r = rig([bundleOf('B10', R, 10)]);
        const out = await r.api.cmd<RewardGrantResult>('reward.claim', claim('B10', 'k10'));
        if (isApiFail(out)) throw new Error(out.message);
        const traces = out.result.plan.map((p) => p.trace.join(','));
        assert.equals('ENROLLED', traces[0]);
        assert.equals('LIMIT_BREAK 1,LIMIT_BREAK 2,LIMIT_BREAK 3,LIMIT_BREAK 4', traces.slice(1, 5).join(','));
        assert.equals('CREDIT 5,CREDIT 5,CREDIT 5,CREDIT 5,CREDIT 5', traces.slice(5).join(','));
        assert.equals(1, r.items.stock[R], '卡仍只有一張（unique）');
        assert.equals(25, r.items.stock[ITEM_SUP_CREDIT], '5 次溢出 × 5 學分');
        const inst = await r.api.query<ItemInstanceView>('item.instance', { itemId: R });
        if (isApiFail(inst)) throw new Error(inst.message);
        assert.equals(4, inst.result.limitBreak);
        assert.equals(40, inst.result.levelCap, 'R 20＋4×5');
    });

    suite.test('SR 與 SSR 的溢出學分各為 20、60', async () => {
        const r = rig([bundleOf('BSR', SR, 6), bundleOf('BSSR', SSR, 6)]);
        for (const id of ['BSR', 'BSSR']) {
            const out = await r.api.cmd<RewardGrantResult>('reward.claim', claim(id, `k-${id}`));
            if (isApiFail(out)) throw new Error(out.message);
        }
        assert.equals(80, r.items.stock[ITEM_SUP_CREDIT], '20＋60');
    });

    suite.test('同 grantKey 重送不重複發放（傳承與學分都只算一次）', async () => {
        const r = rig([bundleOf('B7', R, 7)]);
        await r.api.cmd('reward.claim', claim('B7', 'same'));
        const again = await r.api.cmd<RewardGrantResult>('reward.claim', claim('B7', 'same'));
        if (isApiFail(again)) throw new Error(again.message);
        assert.equals(10, r.items.stock[ITEM_SUP_CREDIT], '2 次溢出 × 5，不是 4 次');
        const inst = await r.api.query<ItemInstanceView>('item.instance', { itemId: R });
        if (isApiFail(inst)) throw new Error(inst.message);
        assert.equals(4, inst.result.limitBreak);
    });

    suite.test('後面的效果失敗：入學、傳承、學分整筆回滾', async () => {
        const r = rig([bundleOf('BBAD', R, 8, true)]);
        const out = await r.api.cmd('reward.claim', claim('BBAD', 'kbad'));
        assert.isTrue(isApiFail(out), '未知效果種類使整筆失敗');
        assert.equals(undefined, r.items.stock[R], '入學被撤銷');
        assert.equals(undefined, r.items.stock[ITEM_SUP_CREDIT], '學分被撤銷');
        assert.equals(undefined, r.items.itemMeta.instances?.[R], '實例狀態被撤銷');
    });

    suite.test('item.breakthrough：未持有 E317、傳承滿 E318；item.instance 未持有 E317', async () => {
        const r = rig([bundleOf('B5', R, 5)]);
        const none = await r.api.cmd('item.breakthrough', { itemId: R });
        assert.isTrue(isApiFail(none) && none.errorCode === 'E317');
        const noneView = await r.api.query('item.instance', { itemId: R });
        assert.isTrue(isApiFail(noneView) && noneView.errorCode === 'E317');
        await r.api.cmd('reward.claim', claim('B5', 'k5'));
        const full = await r.api.cmd('item.breakthrough', { itemId: R });
        assert.isTrue(isApiFail(full) && full.errorCode === 'E318');
        const mat = await r.api.cmd('item.breakthrough', { itemId: ITEM_SUP_CREDIT });
        assert.isTrue(isApiFail(mat) && mat.errorCode === 'E317', '材料不是可傳承物品');
    });

    suite.test('未知支援卡 id：整筆失敗', async () => {
        const r = rig([bundleOf('BX', 'ITEM_SUPCARD_NOPE', 1)]);
        const out = await r.api.cmd('reward.claim', claim('BX', 'kx'));
        assert.isTrue(isApiFail(out));
    });

    suite.test('真的 GameSession：傳承與溢出學分隨存檔快照保存', async () => {
        const store = new PlayerSaveService(new MemoryStorageAdapter());
        const bundle = createLocalApi(store, { now: () => 1_000 });
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(store);
        bundle.setItemAuthority(session.itemAuthority());
        bundle.setItemConfig(withSupportItems(DEFAULT_ITEM_CONFIG, cards, rules));
        session.setItemApi(bundle.api);
        bundle.setRewardAuthority(session.rewardAuthority());
        bundle.setRewardConfig(normalizeRewardConfig({ bundles: [bundleOf('BS', R, 7)] }));
        bundle.registerRewardEffect(SUPPORT_CARD_EFFECT_KIND, createSupportCardHandler(() => ({ cards, rules })));
        const out = await bundle.api.cmd<RewardGrantResult>('reward.claim', claim('BS', 'ks'));
        if (isApiFail(out)) throw new Error(out.message);
        assert.equals(10, session.itemCount(ITEM_SUP_CREDIT));
        const snap = session.createSnapshot();
        assert.equals(4, snap.itemMeta?.instances?.[R]?.limitBreak);
    });

    return suite;
}
