/**
 * YearEndCeremonyData.test.ts — 年終典禮資料與入帳（PROG-2-10050）
 * 鎖住：分數公式（係數在資料 JSON）、驚喜獎判定、賞賜入帳與防重複領取、
 * 套件金額與名次獎勵表一致、年收入／去年分數的存檔來回、演出時間軸與四語系 NPC 名稱。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
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
    YearEndRankingService,
    academyScoreOfGrades,
    computeYearEndScore,
    judgeSurpriseTags,
} from '../assets/scripts/core/systems/YearEndRankingService';
import {
    CEREMONY_ACT_SECONDS,
    CEREMONY_TIMELINE,
    buildYearEndCeremonyResult,
    ceremonyEventsBetween,
    normalizeLastCeremonyScore,
    normalizeYearSilverIncome,
    type CeremonyAct,
} from '../assets/scripts/core/systems/YearEndCeremonyRuntime';
import {
    YEAR_END_SURPRISE_BUNDLE_ID,
    claimYearEndRewards,
    yearEndRankBundleId,
} from '../assets/scripts/core/systems/YearEndCeremonyReward';

const ROOT = join(__dirname, '..');
const readJson = <T = Record<string, any>>(rel: string): T => JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) as T;
const generals = readJson<GeneralConfig[]>('assets/resources/data/generals.json');
const rankingConfig = readJson('assets/resources/data/master/year-end-ranking-config.json');
const rewardConfig = normalizeRewardConfig(readJson('assets/resources/data/reward-config.json'));

const ZERO = { annualIncome: 0, prestige: 0, childCount: 0, spouseCount: 0, academyScore: 0 };

/** 假轉蛋錢包：持有 gems、可入帳（reward.claim 的 currency 入帳需要 credit） */
function fakeGacha(): WalletAuthority & { gems: number } {
    const w = {
        gems: 0,
        balance: (c: string) => (c === 'gems' ? w.gems : 0),
        spend: (c: string, n: number) => { if (c !== 'gems' || w.gems < n) return false; w.gems -= n; return true; },
        credit: (c: string, n: number) => { if (c === 'gems') w.gems += n; },
        snapshot: () => ({ gems: w.gems }),
    };
    return w;
}

async function newSession(adapter = new MemoryStorageAdapter()): Promise<GameSession> {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.setGeneralTemplates(generals);
    session.configureFamily(readJson('assets/resources/data/family-config.json'));
    session.configureOccupancyMatrix(readJson('assets/resources/data/occupancy-matrix.json'));
    await session.startNewGameWithStarters(5, generals, {});
    return session;
}

async function newBundle() {
    const session = await newSession();
    const gacha = fakeGacha();
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    bundle.setWallet(new SilverRoutedWallet(gacha, session.silverLedger));
    bundle.setItemAuthority(session.itemAuthority());
    bundle.setRewardAuthority(session.rewardAuthority());
    bundle.setRewardConfig(rewardConfig);
    return { session, gacha, api: bundle.api };
}

/** 指定分數的榜單結果（用年收入湊分數：分數 = 600 + 年收入 x 0.1） */
function resultWithScore(year: number, score: number, context: { lastYearScore: number | null; childInteractions: number } = { lastYearScore: null, childInteractions: 0 }) {
    return buildYearEndCeremonyResult(year, { ...ZERO, annualIncome: (score - 600) * 10 }, '本府', context);
}

export function createYearEndCeremonyDataSuite(): TestSuite {
    const suite = new TestSuite('YearEndCeremonyData (年終典禮資料與入帳 PROG-2-10050)');

    suite.test('分數公式：新手算例 1050 分（收入 1600、聲望 50、1 子、1 配偶、學府 50），無子嗣學府 920', () => {
        assert.equals(1050, computeYearEndScore({ annualIncome: 1600, prestige: 50, childCount: 1, spouseCount: 1, academyScore: 50 }));
        assert.equals(920, computeYearEndScore({ annualIncome: 1600, prestige: 50, childCount: 0, spouseCount: 1, academyScore: 0 }));
        assert.equals(600, computeYearEndScore(ZERO));
    });

    suite.test('分數公式：係數取自資料 JSON；缺欄位／非數字／負數一律當 0', () => {
        const f = rankingConfig.scoreFormula;
        assert.equals(600, f.base);
        assert.equals(0.1, f.incomeRate);
        assert.equals(2, f.prestigeWeight);
        assert.equals(80, f.childWeight);
        assert.equals(60, f.spouseWeight);
        const broken = { annualIncome: NaN, prestige: -5, childCount: Infinity, spouseCount: undefined as unknown as number, academyScore: -1 };
        assert.equals(600, computeYearEndScore(broken));
        // 年收入先四捨五入再加：1234 x 0.1 = 123.4 -> 123
        assert.equals(723, computeYearEndScore({ ...ZERO, annualIncome: 1234 }));
    });

    suite.test('學府成績分：取本年結業最高評級；沒人結業或評級不認得為 0', () => {
        assert.equals(50, academyScoreOfGrades(['C', 'S', 'B']));
        assert.equals(20, academyScoreOfGrades(['B']));
        assert.equals(0, academyScoreOfGrades([]));
        assert.equals(0, academyScoreOfGrades(['X']));
    });

    suite.test('NPC 基準只看年份、與玩家分數無關：玩家分數低時落榜、高時奪冠；新手 900~1050 落第 3~5 名', () => {
        assert.equals(1100, YearEndRankingService.getNpcBaseScore(1));
        assert.equals(1700, YearEndRankingService.getNpcBaseScore(9));
        assert.equals(5, resultWithScore(1, 600).playerRank);
        assert.equals(1, resultWithScore(1, 1500).playerRank);
        for (const score of [900, 920, 1050]) {
            const rank = resultWithScore(1, score).playerRank;
            assert.isTrue(rank >= 3 && rank <= 5, `分數 ${score} 名次 ${rank}`);
        }
    });

    suite.test('驚喜獎：黑馬 = 較去年成長 >= 25%（邊界含）；第 1 年無去年資料不發黑馬', () => {
        assert.equals('dark_horse', judgeSurpriseTags({ score: 1250, lastYearScore: 1000, childInteractions: 0 })[0]);
        assert.equals(0, judgeSurpriseTags({ score: 1249, lastYearScore: 1000, childInteractions: 0 }).length);
        assert.equals(0, judgeSurpriseTags({ score: 5000, lastYearScore: null, childInteractions: 0 }).length);
        assert.equals(0, judgeSurpriseTags({ score: 5000, lastYearScore: 0, childInteractions: 0 }).length);
    });

    suite.test('驚喜獎：撒嬌 = 子嗣互動 >= 3；每年至多 1 個、黑馬優先', () => {
        assert.equals('spoiled', judgeSurpriseTags({ score: 1000, lastYearScore: 1000, childInteractions: 3 })[0]);
        assert.equals(0, judgeSurpriseTags({ score: 1000, lastYearScore: 1000, childInteractions: 2 }).length);
        const both = judgeSurpriseTags({ score: 2000, lastYearScore: 1000, childInteractions: 9 });
        assert.equals(1, both.length);
        assert.equals('dark_horse', both[0]);
        assert.equals('surprise_dark_horse', resultWithScore(2, 2000, { lastYearScore: 1000, childInteractions: 9 }).surpriseAward?.id);
        assert.equals('surprise_spoiled', resultWithScore(2, 1000, { lastYearScore: 1000, childInteractions: 3 }).surpriseAward?.id);
        assert.equals(null, resultWithScore(1, 1100).surpriseAward);
    });

    suite.test('獎勵套件金額與名次獎勵表、驚喜獎金一致（reward-config 與 year-end-ranking-config 不能各說各話）', () => {
        const amountOf = (bundleId: string, currency: string): number => {
            const bundle = rewardConfig.bundles.find((b) => b.id === bundleId);
            assert.isTrue(!!bundle, `找不到套件 ${bundleId}`);
            return (bundle!.effects as unknown as Array<Record<string, unknown>>).filter((e) => e.kind === 'currency' && e.id === currency).reduce((n, e) => n + (e.amount as number), 0);
        };
        const cases: Array<[number, number]> = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 9], [2, 1], [3, 1], [4, 1], [10, 1]];
        for (const [rank, year] of cases) {
            const id = yearEndRankBundleId(rank, year)!;
            const expected = YearEndRankingService.getRankReward(rank, year);
            assert.equals(expected.gold, amountOf(id, 'silver'));
            assert.equals(expected.jade, amountOf(id, 'gems'));
        }
        assert.equals(null, yearEndRankBundleId(11, 1));
        assert.equals(rankingConfig.surpriseAwards.dark_horse.bonusGold, amountOf(YEAR_END_SURPRISE_BUNDLE_ID, 'silver'));
        assert.equals(rankingConfig.surpriseAwards.spoiled.bonusGold, amountOf(YEAR_END_SURPRISE_BUNDLE_ID, 'silver'));
    });

    suite.test('收下賞賜：銀兩走家族銀兩、玉璧走轉蛋錢包，第 3 名 1000 銀兩＋80 玉璧', async () => {
        const { session, gacha, api } = await newBundle();
        const before = session.silverLedger.silverBalance();
        const result = resultWithScore(1, 1100);
        assert.equals(3, result.playerRank);
        const out = await claimYearEndRewards(api, result);
        assert.isTrue(out.ok);
        assert.isFalse(out.alreadyClaimed);
        assert.equals(1000, out.silver);
        assert.equals(80, out.gems);
        assert.equals(before + 1000, session.silverLedger.silverBalance());
        assert.equals(before + 1000, out.silverBalance);
        assert.equals(80, gacha.gems);
    });

    suite.test('防重複領取：同一年重按不再入帳，回「已領過」；下一年可再領', async () => {
        const { session, gacha, api } = await newBundle();
        const result = resultWithScore(1, 1100);
        await claimYearEndRewards(api, result);
        const silver = session.silverLedger.silverBalance();
        const again = await claimYearEndRewards(api, result);
        assert.isTrue(again.ok);
        assert.isTrue(again.alreadyClaimed);
        assert.equals(0, again.silver);
        assert.equals(0, again.gems);
        assert.equals(silver, session.silverLedger.silverBalance());
        assert.equals(80, gacha.gems);
        // grantKey 記在存檔的 rewardMeta，不是記憶體旗標
        assert.isTrue(session.rewardAuthority().meta().grants.some((g) => g.key === 'yearEnd:1:rank'));
        await claimYearEndRewards(api, resultWithScore(2, 1100));
        assert.isTrue(session.silverLedger.silverBalance() > silver);
    });

    suite.test('驚喜獎加發 500 銀兩，且驚喜與名次分開記帳', async () => {
        const { session, api } = await newBundle();
        const before = session.silverLedger.silverBalance();
        const result = resultWithScore(2, 1100, { lastYearScore: 800, childInteractions: 0 });
        assert.equals('surprise_dark_horse', result.surpriseAward?.id);
        const rank = YearEndRankingService.getRankReward(result.playerRank, 2);
        const out = await claimYearEndRewards(api, result);
        assert.equals(rank.gold + 500, out.silver);
        assert.equals(before + rank.gold + 500, session.silverLedger.silverBalance());
        const keys = session.rewardAuthority().meta().grants.map((g) => g.key);
        assert.isTrue(keys.includes('yearEnd:2:rank') && keys.includes('yearEnd:2:surprise'));
    });

    suite.test('入帳失敗不吞：沒有錢包與獎勵設定時回 ok=false（可重按），不誤報已領', async () => {
        const broken = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()));
        const out = await claimYearEndRewards(broken.api, resultWithScore(1, 1100));
        assert.isFalse(out.ok);
        assert.isFalse(out.alreadyClaimed);
        assert.equals(0, out.silver);
    });

    suite.test('年收入：銀兩入帳累計進 yearEndScoreInputs、可扣回賞賜；存檔來回；典禮記分後歸零並成為去年分數', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await newSession(adapter);
        const base = session.yearEndScoreInputs().scoreInput.annualIncome;
        session.silverLedger.creditSilver(400);
        assert.equals(base + 400, session.yearEndScoreInputs().scoreInput.annualIncome);
        session.excludeFromYearSilverIncome(150);
        assert.equals(base + 250, session.yearEndScoreInputs().scoreInput.annualIncome);
        assert.equals(null, session.yearEndScoreInputs().context.lastYearScore);
        await session.save();
        const loaded = new GameSession(5);
        loaded.setRosterStore(new InMemoryRosterStore());
        loaded.setSaveService(new PlayerSaveService(adapter));
        loaded.setAutoSave(false);
        await loaded.load();
        assert.equals(base + 250, loaded.yearEndScoreInputs().scoreInput.annualIncome);
        await loaded.recordYearEndCeremonyScore(1, 987);
        assert.equals(0, loaded.yearEndScoreInputs().scoreInput.annualIncome);
        assert.equals(987, loaded.yearEndScoreInputs().context.lastYearScore);
        await loaded.recordYearEndCeremonyScore(1, 5000);
        assert.equals(987, loaded.yearEndScoreInputs().context.lastYearScore);
    });

    suite.test('存檔欄位容錯：壞的年收入／去年分數回 0／null', () => {
        assert.equals(0, normalizeYearSilverIncome(-3));
        assert.equals(0, normalizeYearSilverIncome('x'));
        assert.equals(12, normalizeYearSilverIncome(12.9));
        assert.equals(null, normalizeLastCeremonyScore({ year: 0, score: 5 }));
        assert.equals(null, normalizeLastCeremonyScore({ year: 1, score: -1 }));
        assert.equals(null, normalizeLastCeremonyScore(null));
        assert.equals(88, normalizeLastCeremonyScore({ year: 2, score: 88.4 })?.score);
    });

    suite.test('演出時間軸：金、銀、銅依序亮框，事件都在該幕停留秒數內；敲鑼對齊第 1、2 幕，掌聲隨金框', () => {
        for (const act of [1, 2, 3] as CeremonyAct[]) {
            for (const item of CEREMONY_TIMELINE[act]) {
                assert.isTrue(item.at < CEREMONY_ACT_SECONDS[act - 1], `第 ${act} 幕事件 ${item.at} 秒超出停留時間`);
            }
        }
        const reveals = ceremonyEventsBetween(2, -1, 100).filter((e) => e.type === 'reveal');
        assert.equals('1,2,3', reveals.map((e) => (e as { rank: number }).rank).join(','));
        assert.isTrue(ceremonyEventsBetween(1, -1, 0).some((e) => e.type === 'cue' && e.cue === 'gong'));
        assert.isTrue(ceremonyEventsBetween(2, -1, 0).some((e) => e.type === 'cue' && e.cue === 'gong'));
        assert.isTrue(ceremonyEventsBetween(2, 0.5, 1).some((e) => e.type === 'cue' && e.cue === 'applause'));
        // 區間左開右閉：同一時刻不會重複觸發
        assert.equals(0, ceremonyEventsBetween(2, 0.8, 0.8).length);
        assert.equals(0, ceremonyEventsBetween(3, -1, 100).length);
    });

    suite.test('NPC 名門名稱改 i18n key：四個 key 四語系都有值、與資料池一一對應', () => {
        const keys = rankingConfig.npcFillPool.map((n: { nameKey: string }) => n.nameKey);
        assert.equals('npc.house.chendeng,npc.house.zhangzhao,npc.house.shenpei,npc.house.jushou', keys.join(','));
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = readJson<Record<string, string>>(`assets/resources/i18n/${locale}.json`);
            for (const key of [...keys, 'ui.ceremony.claimed', 'ui.ceremony.claimed_again', 'ui.ceremony.claim_failed']) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺 ${key}`);
            }
        }
    });

    return suite;
}
