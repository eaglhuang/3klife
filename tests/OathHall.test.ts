/**
 * OathHall.test.ts — 桃園盟約、割袍斷義、名酒宴飲、離隊留念、成長快照（PROG-2-10207）
 *
 * Unity 對照：像一組 EditMode 測試，只驗純規則與 GameSession 的狀態變化，不開場景。
 */
import { assert, TestSuite } from './TestRunner';
import { DEFAULT_OATH_CONFIG, normalizeOathConfig } from '../assets/scripts/core/systems/OathConfig';
import {
    activePactOf, checkPactFormation, emptySwornState, formPact, nemesesOf, normalizeSwornState, severTies, swornBrothersOf,
} from '../assets/scripts/core/systems/SwornPact';
import { holdBanquet, planBondPayment } from '../assets/scripts/core/systems/WineBanquet';
import { partingGiftClaim } from '../assets/scripts/core/systems/MercenaryParting';
import { applyGrowthSnapshot, freezeGrowthSnapshot } from '../assets/scripts/core/systems/MercenaryGrowthSnapshot';
import { bondToPermanent } from '../assets/scripts/core/systems/MercenaryBondPermanent';
import { OathHallController, oathHallText } from '../assets/scripts/ui/core/OathHallController';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { FriendshipService } from '../assets/scripts/core/services/FriendshipService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import * as fs from 'fs';
import * as path from 'path';

const C = DEFAULT_OATH_CONFIG;
const high = (a: string, b: string): number => (a && b ? 60 : 0);

function wiredSession(session: GameSession, store: PlayerSaveService): void {
    const bundle = createLocalApi(store, { now: () => 1_000 });
    bundle.setItemAuthority(session.itemAuthority());
    session.setItemApi(bundle.api);
}

function general(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    } as unknown as GeneralConfig;
}

async function sessionWith(ids: string[]): Promise<GameSession> {
    FriendshipService.resetInstance();
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore(ids.map(general)));
    wiredSession(session, new PlayerSaveService(new MemoryStorageAdapter()));
    await session.setLeadGeneral(ids[0]);
    return session;
}

export function createOathHallSuite(): TestSuite {
    const suite = new TestSuite('OathHall (PROG-2-10207 盟約／割袍／名酒／留念／快照)');

    suite.test('設定：預設門檻 60、名酒雙軌；壞資料退回預設、可改成 wine-required', () => {
        assert.equals(60, C.affinityThreshold);
        assert.equals('dual', C.wine.mode);
        assert.equals(60, normalizeOathConfig(null).affinityThreshold);
        assert.equals('wine-required', normalizeOathConfig({ wine: { mode: 'wine-required' } }).wine.mode);
        assert.equals(40, normalizeOathConfig({ affinityThreshold: 40 }).affinityThreshold);
    });

    suite.test('設定檔 oath-config.json 與預設值一致（門檻 60、雙軌）', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/data/oath-config.json'), 'utf8'));
        const cfg = normalizeOathConfig(raw);
        assert.equals(60, cfg.affinityThreshold);
        assert.equals('dual', cfg.wine.mode);
        assert.equals(4, cfg.parting.tiers.length);
    });

    suite.test('盟約：2~3 人、兩兩好感達 60 才成立', () => {
        const s = emptySwornState();
        assert.equals('member-count', (checkPactFormation(s, ['a'], high, C) as { reason: string }).reason);
        assert.equals('member-count', (checkPactFormation(s, ['a', 'b', 'c', 'd'], high, C) as { reason: string }).reason);
        assert.equals('affinity-too-low', (checkPactFormation(s, ['a', 'b'], () => 59, C) as { reason: string }).reason);
        assert.isTrue(checkPactFormation(s, ['a', 'b', 'c'], () => 60, C).ok);
    });

    suite.test('盟約：成立後可查兄弟，已在盟約者不能再結', () => {
        const r = formPact(emptySwornState(), ['b', 'a'], 5, high, C);
        assert.isTrue(r.ok);
        if (!r.ok) return;
        assert.equals('a|b', r.pact.swornBrotherIds.join('|'));
        assert.equals('b', swornBrothersOf(r.state, 'a')[0]);
        assert.equals('already-in-pact', (checkPactFormation(r.state, ['a', 'c'], high, C) as { reason: string }).reason);
    });

    suite.test('割袍斷義：鎖死 -100、互為宿敵、盟約瓦解，之後不能再結義', () => {
        const r = formPact(emptySwornState(), ['a', 'b', 'c'], 1, high, C);
        if (!r.ok) throw new Error('form');
        const cut = severTies(r.state, 'a', 'b', 2, C);
        assert.isTrue(cut.ok);
        if (!cut.ok) return;
        assert.equals(-100, cut.lockedAffinity);
        assert.equals(null, activePactOf(cut.state, 'a'));
        assert.equals('b', nemesesOf(cut.state, 'a')[0]);
        assert.equals('severed-pair', (checkPactFormation(cut.state, ['a', 'b'], high, C) as { reason: string }).reason);
        assert.equals('already-severed', (severTies(cut.state, 'a', 'b', 3, C) as { reason: string }).reason);
        assert.equals('not-sworn', (severTies(emptySwornState(), 'a', 'b', 3, C) as { reason: string }).reason);
    });

    suite.test('存檔正規化：壞資料略過、重複 pactId 只留一筆', () => {
        const s = normalizeSwornState({ pacts: [{ pactId: 'P', swornBrotherIds: ['a', 'b', 'a'] }, { pactId: 'P', swornBrotherIds: ['c', 'd'] }, { pactId: 'Q', swornBrotherIds: ['x'] }, 7], severedPairs: ['a|b', 3, 'a|b'] });
        assert.equals(1, s.pacts.length);
        assert.equals(2, s.pacts[0].swornBrotherIds.length);
        assert.equals(1, s.severedPairs.length);
    });

    suite.test('名酒宴飲：扣 1 瓶、好感依酒種增加，上限 100；沒酒或割袍配對被拒', () => {
        const inv = { ITEM_WINE_DUKANG: 2 };
        const r = holdBanquet(inv, 'DUKANG_WINE', 'a', 'b', 10, false, C);
        assert.isTrue(r.ok);
        if (!r.ok) return;
        assert.equals(35, r.affinityGain);
        assert.equals('ITEM_WINE_DUKANG', r.itemId);
        const capped = holdBanquet(inv, 'DUKANG_WINE', 'a', 'b', 90, false, C);
        assert.isTrue(capped.ok && capped.affinityGain === 10);
        assert.equals('no-wine', (holdBanquet({}, 'TUSU_WINE', 'a', 'b', 0, false, C) as { reason: string }).reason);
        assert.equals('severed-pair', (holdBanquet(inv, 'DUKANG_WINE', 'a', 'b', 0, true, C) as { reason: string }).reason);
        assert.equals('unknown-wine', (holdBanquet(inv, 'XX', 'a', 'b', 0, false, C) as { reason: string }).reason);
    });

    suite.test('結義付款（雙軌）：點數夠走點數；SSR 點數不足但有杜康×2 改走名酒', () => {
        const p1 = planBondPayment('SSR', 600, 600, { ITEM_WINE_DUKANG: 2 }, C);
        assert.isTrue(p1.ok && p1.path === 'points');
        const p2 = planBondPayment('SSR', 600, 0, { ITEM_WINE_DUKANG: 2 }, C);
        assert.isTrue(p2.ok && p2.path === 'wine');
        assert.equals('insufficient-points', (planBondPayment('SSR', 600, 0, { ITEM_WINE_DUKANG: 1 }, C) as { reason: string }).reason);
        assert.equals('insufficient-points', (planBondPayment('SR', 300, 0, { ITEM_WINE_DUKANG: 9 }, C) as { reason: string }).reason);
    });

    suite.test('結義付款（Q42 改 wine-required）：SSR／UR 一律名酒，R／SR 仍走點數；UR 要九醞×3', () => {
        const cfg = normalizeOathConfig({ wine: { mode: 'wine-required' } });
        assert.equals('insufficient-wine', (planBondPayment('SSR', 600, 9999, {}, cfg) as { reason: string }).reason);
        const ur = planBondPayment('UR', 1200, 9999, { ITEM_WINE_JIUYUN: 3 }, cfg);
        assert.isTrue(ur.ok && ur.path === 'wine' && ur.qty === 3);
        const sr = planBondPayment('SR', 300, 300, {}, cfg);
        assert.isTrue(sr.ok && sr.path === 'points');
    });

    suite.test('bondToPermanent：名酒路徑未傳判定仍回 wine-path-undecided（舊行為），傳 true 不扣點', () => {
        const stats = { STR: 1, INT: 1, POL: 1, CHR: 1, LUK: 1 };
        assert.equals('wine-path-undecided', bondToPermanent({ bondPoints: 0 }, 'SSR', 'wine', stats).reason);
        const ok = bondToPermanent({ bondPoints: 5 }, 'SSR', 'wine', stats, true);
        assert.isTrue(ok.ok && ok.pointsSpent === 0 && ok.wallet.bondPoints === 5);
        assert.equals('insufficient-wine', bondToPermanent({ bondPoints: 5 }, 'SSR', 'wine', stats, false).reason);
    });

    suite.test('離隊留念：好感越高取越高一檔，grantKey 含 uid 與日序', () => {
        assert.equals('BUNDLE_MERC_PARTING_1', partingGiftClaim('m1', 0, 7, C)!.bundleId);
        assert.equals('BUNDLE_MERC_PARTING_2', partingGiftClaim('m1', 20, 7, C)!.bundleId);
        assert.equals('BUNDLE_MERC_PARTING_3', partingGiftClaim('m1', 59, 7, C)!.bundleId);
        assert.equals('BUNDLE_MERC_PARTING_4', partingGiftClaim('m1', 60, 7, C)!.bundleId);
        assert.equals('merc-parting:m1:7', partingGiftClaim('m1', 60, 7, C)!.grantKey);
        const bundles = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/data/reward-config.json'), 'utf8')).bundles.map((b: { id: string }) => b.id);
        for (const t of C.parting.tiers) assert.isTrue(bundles.includes(t.bundleId), t.bundleId + ' 要在 reward-config.json');
    });

    suite.test('成長快照：凍結為不可變複本，繼承戰法去重；沒有成長資料不動武將', () => {
        const growth = { level: 15, exp: 300, learnedTactics: ['T1', 'T2', 'T1'] };
        const snap = freezeGrowthSnapshot(growth, 'g1', 4);
        assert.isTrue(snap !== null && snap.level === 15 && snap.learnedTactics.length === 2);
        growth.learnedTactics.push('T3');
        assert.equals(2, snap!.learnedTactics.length);
        const g = applyGrowthSnapshot({ ...general('g1'), learnedTactics: ['T2', 'T9'] } as GeneralConfig, snap);
        assert.equals('T2,T9,T1', (g.learnedTactics ?? []).join(','));
        assert.equals(null, freezeGrowthSnapshot(undefined, 'g1', 4));
        const same = general('g1');
        assert.isTrue(applyGrowthSnapshot(same, null) === same);
    });

    suite.test('GameSession：桃園結義好感不足被拒、足夠成立並記義兄弟；割袍後好感鎖 -100 且不能宴飲', async () => {
        const s = await sessionWith(['lead', 'b', 'c']);
        FriendshipService.getInstance().addPair('lead', 'b', 59, 't');
        assert.isFalse((await s.formSwornPact(['lead', 'b'])).ok);
        FriendshipService.getInstance().addPair('lead', 'b', 1, 't');
        const ok = await s.formSwornPact(['lead', 'b']);
        assert.isTrue(ok.ok);
        assert.equals('DYNAMIC_SWORN', s.dynamicRelations.listFor('b')[0].type);
        const cut = await s.severSwornTies('lead', 'b');
        assert.isTrue(cut.ok);
        assert.equals(-100, s.pairAffinity('lead', 'b'));
        FriendshipService.getInstance().addPair('lead', 'b', 50, 'again');
        assert.equals(-100, s.pairAffinity('lead', 'b'), '鎖死後 addPair 不再改動');
        await s.addItem('ITEM_WINE_TUSU', 1);
        const banquet = await s.holdWineBanquet('TUSU_WINE', 'lead', 'b');
        assert.isFalse(banquet.ok);
        assert.equals(1, s.itemCount('ITEM_WINE_TUSU'), '被拒不扣酒');
    });

    suite.test('GameSession：名酒宴飲扣酒加好感；盟約與鎖死隨存檔往返', async () => {
        const adapter = new MemoryStorageAdapter();
        const s = await sessionWith(['lead', 'b', 'c']);
        s.setSaveService(new PlayerSaveService(adapter));
        await s.addItem('ITEM_WINE_GREEN_PLUM', 2);
        const r = await s.holdWineBanquet('GREEN_PLUM', 'lead', 'c');
        assert.isTrue(r.ok);
        assert.equals(25, s.pairAffinity('lead', 'c'));
        assert.equals(1, s.itemCount('ITEM_WINE_GREEN_PLUM'));
        FriendshipService.getInstance().addPair('lead', 'b', 60, 't');
        await s.formSwornPact(['lead', 'b']);
        await s.severSwornTies('lead', 'b');
        await s.save();
        FriendshipService.resetInstance();
        const s2 = new GameSession(3);
        s2.setRosterStore(new InMemoryRosterStore(['lead', 'b', 'c'].map(general)));
        s2.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await s2.load());
        assert.equals('b', nemesesOf(s2.swornState(), 'lead')[0]);
        FriendshipService.getInstance().addPair('lead', 'b', 50, 'x');
        assert.equals(-100, s2.pairAffinity('lead', 'b'));
    });

    suite.test('結義堂控制器：選取上限 2 位、按鈕可按條件、文案走 i18n 查詢', async () => {
        const s = await sessionWith(['lead', 'b', 'c', 'd']);
        const asked: string[] = [];
        const hall = new OathHallController({
            lead: () => s.leadGeneralId,
            nameOf: (id) => id,
            candidates: () => ['b', 'c', 'd'].map((id) => ({ id, name: id })),
            affinity: (a, b) => s.pairAffinity(a, b),
            sworn: () => s.swornState(),
            config: () => s.oathConfig,
            itemCount: (id) => s.itemCount(id),
            formPact: (ids) => s.formSwornPact(ids),
            sever: (a, b) => s.severSwornTies(a, b),
            banquet: (w, a, b) => s.holdWineBanquet(w, a, b),
            lookup: (k) => { asked.push(k); return k; },
        });
        assert.isFalse(hall.getView().enabled.btnOathPact);
        hall.select(0); hall.select(1); hall.select(2);
        assert.equals(2, hall.selectedIds().length, '最多選 2 位同伴');
        assert.isTrue(hall.getView().enabled.btnOathPact);
        assert.isFalse(hall.getView().enabled.btnOathBanquet, '沒酒不能宴飲');
        assert.isFalse(await hall.formPact(), '好感不足');
        assert.isTrue(asked.includes('oathHall.notePactLow'));
        assert.isTrue(hall.lastNotice.includes('60'), '提示好感門檻 60');
        assert.equals('結義堂', oathHallText(undefined, 'title'));
    });

    suite.test('i18n：oathHall.* 四語系鍵齊全', () => {
        const dir = path.join(__dirname, '../assets/resources/i18n');
        const keys = (lang: string): string[] => Object.keys(JSON.parse(fs.readFileSync(path.join(dir, lang + '.json'), 'utf8'))).filter((k) => k.startsWith('oathHall.')).sort();
        const base = keys('zh-TW');
        assert.isTrue(base.length >= 40);
        for (const lang of ['zh-CN', 'en', 'ja']) assert.equals(base.join(','), keys(lang).join(','));
    });

    return suite;
}
