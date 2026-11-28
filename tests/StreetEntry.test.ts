/**
 * StreetEntry.test.ts — 大廳「出去逛逛」入口（PROG-2-10256，QSOC-01 9.5.1）
 * 鎖住：入口開放照 StreetOpenGate（打完第一場才開、上鎖有提示 key）、真實名冊（家臣＋訪客、性別、親密度排序、名額上限）、
 * 首訪獎勵走 reward.claim 且同識別碼重試不重複入帳、同次遊玩內保存首訪狀態、四語系新字串。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { SilverRoutedWallet } from '../assets/scripts/core/api/localserver/SilverWalletPort';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';
import {
    STREET_ENTRY_LOCKED_HINT_KEY, STREET_FIRST_VISIT_GRANT_KEY, buildStreetRoster, claimStreetFirstVisitReward,
    openStreetFirstVisit, resetStreetFirstVisitMemory, saveStreetFirstVisit, streetEntryState, toLifeId,
} from '../assets/scripts/ui/life/StreetEntry';
import type { RealGeneral } from '../assets/scripts/ui/life/StreetEntry';
import { DEFAULT_STREET_FIRST_VISIT_CONFIG } from '../assets/scripts/ui/life/StreetFirstVisit';

const ROOT = path.resolve(__dirname, '..');
const readJson = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
const generals = readJson<GeneralConfig[]>('assets/resources/data/generals.json');
const rewardConfig = normalizeRewardConfig(readJson('assets/resources/data/reward-config.json'));

const g = (id: string, name: string, gender = '男', faction = 'shu'): RealGeneral => ({ id, name, gender, faction });

function fakeGacha(): WalletAuthority {
    const w = {
        gems: 0,
        balance: (c: string) => (c === 'gems' ? w.gems : 0),
        spend: (c: string, n: number) => { if (c !== 'gems' || w.gems < n) return false; w.gems -= n; return true; },
        credit: (c: string, n: number) => { if (c === 'gems') w.gems += n; },
        snapshot: () => ({ gems: w.gems }),
    };
    return w;
}

async function newBundle() {
    const adapter = new MemoryStorageAdapter();
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.setGeneralTemplates(generals);
    session.configureFamily(readJson('assets/resources/data/family-config.json'));
    session.configureOccupancyMatrix(readJson('assets/resources/data/occupancy-matrix.json'));
    await session.startNewGameWithStarters(5, generals, {});
    const local = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    local.setWallet(new SilverRoutedWallet(fakeGacha(), session.silverLedger));
    local.setItemAuthority(session.itemAuthority());
    local.setRewardAuthority(session.rewardAuthority());
    local.setRewardConfig(rewardConfig);
    return { session, api: local.api };
}

export function createStreetEntrySuite(): TestSuite {
    const suite = new TestSuite('StreetEntry (PROG-2-10256)');

    suite.test('入口開放：沒打完第一場戰鬥上鎖並給提示 key；打完且第一季就開，不要求帶逛教學（教學在大街裡進行）', () => {
        const locked = streetEntryState({ firstBattleDone: false, seasonIndex: 1 });
        assert.isFalse(locked.open);
        assert.equals(STREET_ENTRY_LOCKED_HINT_KEY, locked.lockedHintKey);
        const open = streetEntryState({ firstBattleDone: true, seasonIndex: 1 });
        assert.isTrue(open.open);
        assert.equals(null, open.lockedHintKey);
        assert.isFalse(streetEntryState({ firstBattleDone: true, seasonIndex: 0 }).open, '季序號低於 openSeasonMin');
    });

    suite.test('真實名冊：id 轉底線、性別（女→f、其餘 m）、親密度排序、家臣與訪客分類', () => {
        const r = buildStreetRoster({
            retainers: [g('zhang-fei', '張飛'), g('diao-chan', '貂蟬', '女'), g('guan-yu', '關羽')],
            visitors: [g('cao-cao', '曹操', '男', 'wei'), g('diao-chan', '貂蟬', '女')],
            intimacyOf: (id) => ({ 'diao-chan': 80, 'zhang-fei': 50, 'guan-yu': 50, 'cao-cao': 10 } as Record<string, number>)[id] ?? 0,
            maxActors: 24,
            maxVisitors: 4,
        });
        assert.equals('diao_chan,guan_yu,zhang_fei,cao_cao', r.lifeRoster.map((e) => e.id).join(','));
        assert.equals('retainer,retainer,retainer,visitor', r.lifeRoster.map((e) => e.kind).join(','));
        assert.equals('wei', r.lifeRoster[3].faction);
        const diao = r.candidates.find((c) => c.id === 'diao_chan');
        assert.equals('f', diao?.gender);
        assert.equals(80, diao?.intimacy);
        assert.equals('m', r.candidates.find((c) => c.id === 'zhang_fei')?.gender);
        assert.equals('貂蟬', r.names['diao_chan']);
        assert.equals('diao-chan', r.realIdOf['diao_chan']);
        assert.equals('zhang_fei', toLifeId('zhang-fei'));
        assert.equals(4, r.lifeRoster.length, '家臣名冊內的人不會再被當訪客重複放入');
    });

    suite.test('名額：家臣滿額時保留訪客名額；家臣不足時空位讓給訪客；總數不超過 maxActors', () => {
        const many = Array.from({ length: 30 }, (_, i) => g(`r-${String(i).padStart(2, '0')}`, `家臣${i}`));
        const visitors = [g('v-1', '客1'), g('v-2', '客2'), g('v-3', '客3'), g('v-4', '客4'), g('v-5', '客5')];
        const full = buildStreetRoster({ retainers: many, visitors, intimacyOf: () => 0, maxActors: 12, maxVisitors: 4 });
        assert.equals(12, full.lifeRoster.length);
        assert.equals(4, full.lifeRoster.filter((e) => e.kind === 'visitor').length);
        const few = buildStreetRoster({ retainers: many.slice(0, 3), visitors, intimacyOf: () => 0, maxActors: 12, maxVisitors: 4 });
        assert.equals(8, few.lifeRoster.length, '3 家臣＋5 訪客（空位讓給訪客）');
    });

    suite.test('首訪候選接 StreetFirstVisit：真實名冊挑得出帶路者與 3 位目標', () => {
        const r = buildStreetRoster({
            retainers: [g('a', 'A'), g('b', 'B'), g('c', 'C'), g('d', 'D')],
            visitors: [],
            intimacyOf: (id) => ({ a: 90, b: 70, c: 50, d: 30 } as Record<string, number>)[id] ?? 0,
            maxActors: 24,
            maxVisitors: 4,
        });
        resetStreetFirstVisitMemory();
        const v = openStreetFirstVisit();
        assert.isTrue(v.tryStartEscort({ firstBattleDone: true, seasonIndex: 1 }, r.candidates));
        assert.equals('a', v.state.guideId);
        v.finishEscort(r.candidates);
        assert.equals('b,c,d', v.state.targetIds.join(','));
    });

    suite.test('同次遊玩內保存首訪狀態：離開大街再進來沿用進度', () => {
        resetStreetFirstVisitMemory();
        const r = buildStreetRoster({
            retainers: [g('a', 'A'), g('b', 'B'), g('c', 'C'), g('d', 'D')], visitors: [], intimacyOf: () => 0, maxActors: 24, maxVisitors: 4,
        });
        const v = openStreetFirstVisit();
        v.tryStartEscort({ firstBattleDone: true, seasonIndex: 1 }, r.candidates);
        v.finishEscort(r.candidates);
        v.markFound(v.state.targetIds[0]);
        saveStreetFirstVisit(v);
        const w = openStreetFirstVisit();
        assert.equals('searching', w.phase);
        assert.equals(1, w.progress.found);
        resetStreetFirstVisitMemory();
        assert.equals('locked', openStreetFirstVisit().phase);
    });

    suite.test('發獎：reward.claim 銀兩入帳；同識別碼重試只回原結果、不重複入帳', async () => {
        const { session, api } = await newBundle();
        const before = session.silverLedger.silverBalance();
        const first = await claimStreetFirstVisitReward(api);
        assert.isTrue(first.ok);
        assert.isFalse(first.replayed);
        assert.equals(50, first.silver);
        assert.equals(before + 50, session.silverLedger.silverBalance());
        assert.isTrue(session.rewardAuthority().meta().grants.some((x) => x.key === STREET_FIRST_VISIT_GRANT_KEY));
        const again = await claimStreetFirstVisitReward(api);
        assert.isTrue(again.ok);
        assert.isTrue(again.replayed);
        assert.equals(0, again.silver);
        assert.equals(before + 50, session.silverLedger.silverBalance(), '重試不再入帳');
    });

    suite.test('發獎：套件不存在時失敗但不丟例外', async () => {
        const { api } = await newBundle();
        const r = await claimStreetFirstVisitReward(api, 'BUNDLE_NOT_EXIST', 'streetFirstVisit:bad');
        assert.isFalse(r.ok);
    });

    suite.test('四語系：入口與首訪新字串都有，找人目標有 {0}', () => {
        const keys = ['life.street_entry.label', 'life.street_entry.locked_hint', 'life.street_entry.back', 'life.street_entry.reward', 'life.street_first.not_target', DEFAULT_STREET_FIRST_VISIT_CONFIG.i18n.targets];
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const dict = readJson<Record<string, string>>(`assets/resources/i18n/${lang}.json`);
            for (const k of keys) assert.isTrue(typeof dict[k] === 'string' && dict[k].length > 0, `${lang} 缺 ${k}`);
            assert.isTrue(dict[DEFAULT_STREET_FIRST_VISIT_CONFIG.i18n.targets].includes('{0}'), `${lang} targets 缺 {0}`);
            assert.isTrue(dict['life.street_entry.reward'].includes('{0}'), `${lang} reward 缺 {0}`);
        }
    });

    return suite;
}
