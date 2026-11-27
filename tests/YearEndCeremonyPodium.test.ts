/**
 * YearEndCeremonyPodium.test.ts — 年末頒獎典禮 A 版領獎台（PROG-2-10153）
 * 多榜流程、揭曉倒敘、感言每名次 3～5 句輪播、觀眾台詞依榜名／本府名次組合、四語系鍵齊全、畫面規格節點。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { CharmRankingProvider } from '../assets/scripts/core/systems/annual_ranking/providers/CharmRankingProvider';
import {
    CEREMONY_AUDIENCE_COUNTS,
    CEREMONY_SPEECH_COUNT,
    audienceCategories,
    audienceLineKey,
    buildFameBoard,
    buildHouseBoard,
    ceremonyAct2Seconds,
    ceremonyBoardAt,
    ceremonyBoardReveals,
    ceremonyBoardRevealsBetween,
    planCeremonyBoards,
    winnerSpeechKey,
    type CeremonyBoard,
    type CeremonyBoardId,
} from '../assets/scripts/core/systems/YearEndCeremonyPodium';
import { CEREMONY_ACT_SECONDS, CEREMONY_MAX_TOTAL_SECONDS, buildYearEndCeremonyResult } from '../assets/scripts/core/systems/YearEndCeremonyRuntime';

const ROOT = path.resolve(__dirname, '..');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];
const table = (locale: string): Record<string, string> => JSON.parse(fs.readFileSync(path.join(ROOT, `assets/resources/i18n/${locale}.json`), 'utf8'));
const t = (key: string, ...args: string[]): string => key + args.join('|');
const ZERO = { annualIncome: 0, prestige: 0, childCount: 0, spouseCount: 0, academyScore: 0 };

const house = (): CeremonyBoard => buildHouseBoard(buildYearEndCeremonyResult(1, ZERO, '本府'), t);
const fame = (id: CeremonyBoardId, playerTop = false): CeremonyBoard => ({
    id,
    seconds: 4,
    playerInTop3: playerTop,
    entries: [1, 2, 3].map((rank) => ({ rank, name: `G${rank}`, score: 100 - rank, isPlayer: playerTop && rank === 2, gender: 'M' as const })),
});

export function createYearEndCeremonyPodiumSuite(): TestSuite {
    const suite = new TestSuite('YearEndCeremonyPodium');

    suite.test('多榜流程：名門榜 6 秒＋兩個風雲榜各 4 秒；第 2 幕合計 14、全典禮 ≤ 30 秒', () => {
        const boards = planCeremonyBoards(house(), [fame('kills'), fame('governance'), fame('charm')]);
        assert.equals(3, boards.length);
        assert.equals('house', boards[0].id);
        assert.equals(6, boards[0].seconds);
        assert.equals(4, boards[1].seconds);
        assert.equals(14, ceremonyAct2Seconds(boards));
        assert.isTrue(CEREMONY_ACT_SECONDS[0] + ceremonyAct2Seconds(boards) + CEREMONY_ACT_SECONDS[2] <= CEREMONY_MAX_TOTAL_SECONDS);
    });

    suite.test('風雲榜選榜：玩家自家有人入前三 > 新人王 > 原順序；沒有風雲榜名門榜多給 2 秒', () => {
        const picked = planCeremonyBoards(house(), [fame('kills'), fame('governance'), fame('rookie'), fame('charm', true)]);
        assert.equals('house,charm,rookie', picked.map((b) => b.id).join(','));
        const solo = planCeremonyBoards(house(), []);
        assert.equals(1, solo.length);
        assert.equals(8, ceremonyAct2Seconds(solo));
    });

    suite.test('換榜時間：依經過秒數落在第幾榜；超出停在最後一榜', () => {
        const boards = planCeremonyBoards(house(), [fame('kills'), fame('charm')]);
        assert.equals(0, ceremonyBoardAt(boards, 5.9).index);
        assert.equals(1, ceremonyBoardAt(boards, 6).index);
        assert.equals(2, ceremonyBoardAt(boards, 10.5).index);
        assert.equals(2, ceremonyBoardAt(boards, 99).index);
        assert.isTrue(Math.abs(ceremonyBoardAt(boards, 7.5).local - 1.5) < 1e-9);
    });

    suite.test('揭曉倒敘：季軍→亞軍→冠軍，冠軍帶掌聲；時間都在榜內，區間左開右閉', () => {
        for (const seconds of [4, 6, 8]) {
            const reveals = ceremonyBoardReveals(seconds);
            assert.equals('3,2,1', reveals.map((r) => r.rank).join(','));
            assert.isTrue(reveals.every((r) => r.at > 0 && r.at < seconds));
            assert.equals('1', reveals.filter((r) => r.applause).map((r) => r.rank).join(','));
        }
        assert.equals(3, ceremonyBoardRevealsBetween(6, -1, 6).length);
        assert.equals(0, ceremonyBoardRevealsBetween(6, 6, 6).length);
    });

    suite.test('名門榜頭像 id 取自 NPC 名門與玩家；風雲榜遮蔽或無分數不上台', () => {
        const result = buildYearEndCeremonyResult(1, ZERO, '本府');
        const board = buildHouseBoard(result, t, { npc: { npc_fill_4: 'ju-shou' }, player: 'liu-bei' });
        assert.equals('ju-shou', board.entries.find((e) => e.name.includes('jushou'))?.portraitId);
        assert.equals('liu-bei', board.entries.find((e) => e.isPlayer)?.portraitId);
        const none = buildFameBoard({ boardId: 'kills', titleKey: 'x', topThree: [{ generalId: 'a', rank: 1, trend: 'NEW', isPlayerOwned: false, isMasked: true }], totalCandidates: 1, isYearEndRevealed: true }, (id) => ({ name: id }));
        assert.equals(null, none);
        const ok = buildFameBoard({ boardId: 'rookie', titleKey: 'x', topThree: [{ generalId: 'a', rank: 1, score: 50, trend: 'NEW', isPlayerOwned: true }], totalCandidates: 1, isYearEndRevealed: true }, (id) => ({ name: id }));
        assert.equals(true, ok?.playerInTop3);
    });

    suite.test('得獎感言：每名次 3～5 句輪播，連點不重複到繞一圈，鍵四語系都有值', () => {
        assert.isTrue(CEREMONY_SPEECH_COUNT >= 3 && CEREMONY_SPEECH_COUNT <= 5);
        for (const rank of [1, 2, 3] as const) {
            const keys = Array.from({ length: CEREMONY_SPEECH_COUNT }, (_, i) => winnerSpeechKey(rank, i));
            assert.equals(CEREMONY_SPEECH_COUNT, new Set(keys).size);
            assert.equals(keys[0], winnerSpeechKey(rank, CEREMONY_SPEECH_COUNT));
            for (const locale of LOCALES) for (const key of keys) assert.isTrue(typeof table(locale)[key] === 'string' && table(locale)[key].length > 0, `${locale} ${key}`);
        }
    });

    suite.test('觀眾台詞：本府在榜／前三／落榜／不在榜各有類別輪替，且依榜名、名次組鍵', () => {
        assert.equals('rank,kin,board,roast', audienceCategories(2).join(','));
        assert.equals('rank,roast,board,kin', audienceCategories(5).join(','));
        assert.equals('board,kin,roast', audienceCategories(0).join(','));
        assert.equals('ui.ceremony.podium.aud.rank.5.1', audienceLineKey({ boardId: 'house', playerRank: 5, turn: 0 }));
        assert.equals('ui.ceremony.podium.aud.rank.2.1', audienceLineKey({ boardId: 'house', playerRank: 2, turn: 0 }));
        assert.equals('ui.ceremony.podium.aud.board.kills.1', audienceLineKey({ boardId: 'kills', playerRank: 0, turn: 0 }));
        assert.equals('ui.ceremony.podium.aud.roast.1', audienceLineKey({ boardId: 'house', playerRank: 5, turn: 1 }));
        const seen = new Set<string>();
        for (let turn = 0; turn < 24; turn++) seen.add(audienceLineKey({ boardId: 'house', playerRank: 5, turn }));
        assert.isTrue(seen.size >= 8, `24 次點擊只出現 ${seen.size} 種台詞`);
    });

    suite.test('觀眾台詞所有可能的鍵與榜名四語系都有值', () => {
        const ids: CeremonyBoardId[] = ['house', 'kills', 'governance', 'charm', 'rookie', 'mentor'];
        const keys = new Set<string>();
        for (const boardId of ids) for (const playerRank of [0, 1, 2, 3, 4, 5, 6]) for (let turn = 0; turn < 40; turn++) keys.add(audienceLineKey({ boardId, playerRank, turn }));
        for (const locale of LOCALES) {
            const tb = table(locale);
            for (const key of keys) assert.isTrue(typeof tb[key] === 'string' && tb[key].length > 0, `${locale} 缺 ${key}`);
            for (const id of ids) for (const part of ['title', 'short', 'desc']) assert.isTrue(!!tb[`ui.ceremony.board.${id}.${part}`], `${locale} 缺榜名 ${id}.${part}`);
        }
        assert.isTrue(CEREMONY_AUDIENCE_COUNTS.kin >= 3 && CEREMONY_AUDIENCE_COUNTS.roast >= 3);
    });

    suite.test('畫面規格：舞台容器、提示、對白、觀眾列、按鈕都在，舊標題／名單 Label 已移除', () => {
        const ids = new Set<string>();
        const walk = (node: { id?: string; children?: unknown[] }): void => {
            if (node.id) ids.add(node.id);
            for (const c of node.children ?? []) walk(c as { id?: string; children?: unknown[] });
        };
        walk(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/year-end-ceremony-main.json'), 'utf8')).root);
        for (const id of ['ycStage', 'ycHint', 'ycDialogue', 'ycCrowd', 'ycCrowdLine', 'ycReward', 'btnYcSkip', 'btnYcClose']) assert.isTrue(ids.has(id), `缺 ${id}`);
        assert.isTrue(!ids.has('ycTitle') && !ids.has('ycStandings'));
    });

    suite.test('紅顏榜只排女將（沒帶性別的舊流程不限）；風雲榜評審旁白每榜有入榜／沒入榜兩句且四語系都有值', () => {
        const provider = new CharmRankingProvider();
        const ctx = { year: 1, quarter: 4, generals: { m: { generalId: 'm', gender: 'M' }, f: { generalId: 'f', gender: 'F' }, u: { generalId: 'u' } } } as never;
        assert.equals(false, provider.isEligible('m', ctx, {} as never));
        assert.equals(true, provider.isEligible('f', ctx, {} as never));
        assert.equals(true, provider.isEligible('u', ctx, {} as never));
        const ids = ['kills', 'governance', 'charm', 'rookie', 'mentor'];
        const lines = new Set<string>();
        for (const locale of LOCALES) {
            const tb = table(locale);
            for (const id of ids) for (const k of ['in', 'out']) {
                const v = tb[`ui.ceremony.podium.judge.${id}.${k}`];
                assert.isTrue(typeof v === 'string' && v.length > 0, `${locale} 缺評審旁白 ${id}.${k}`);
                if (locale === 'zh-TW') lines.add(v);
            }
        }
        assert.equals(10, lines.size);
    });

    return suite;
}
