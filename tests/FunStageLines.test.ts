/**
 * FunStageLines.test.ts — FUN-02 滿月酒／FUN-03 戰後搭話／FUN-04 首次招募自我介紹（doc_spec_1347，PROG-2-10185）
 *
 * 鎖住：招募每批最多 3 位且預告句只播一次、滿月酒資格與賓客 3～5 位、
 * 搭話連續兩場不同人且每季有上限、grantKey 去重、台詞全部以女性代入不出現不合身分自稱、
 * 四語 i18n 齊備、資料鍵在 zh-TW 都查得到。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { emptyFunState } from '../assets/scripts/core/fun/FunState';
import { funLineViolations } from '../assets/scripts/core/fun/FunCommon';
import {
    clearVictoryPending, isFamilyNewborn, markMoonPartyDone, markRecruitIntroPlayed, moonGrantKey, moonGuestBeat,
    moonPartyChild, normalizeStageLines, pickMoonGuests, queueVictoryChat, recruitIntroFor, selectRecruitBatch,
    victoryBandOf, victoryChatLine, victoryGrantKey, type FunStageLines, type StageGeneral,
} from '../assets/scripts/core/fun/FunStageLines';

const root = path.resolve(__dirname, '..');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];

function table(loc: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/i18n', `${loc}.json`), 'utf8'));
}

function loadLines(): FunStageLines {
    const lines = normalizeStageLines(JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/data/fun-stage-lines.json'), 'utf8')));
    if (!lines) throw new Error('fun-stage-lines.json 壞掉');
    return lines;
}

export function createFunStageLinesSuite(): TestSuite {
    const suite = new TestSuite('FunStageLines (PROG-2-10185 FUN-02/03/04)');
    const lines = loadLines();
    const zh = table('zh-TW');
    const translate = (key: string): string => zh[key] ?? key;
    const env = { translate, honor: '主公' };
    const gen = (id: string, extra: Partial<StageGeneral> = {}): StageGeneral => ({ id, name: id, age: 30, gender: 'M', ...extra });

    suite.test('FUN-04：每批最多 3 位、聽過的不再選、未成年不選', () => {
        const gs = [gen('a'), gen('b'), gen('c'), gen('d'), gen('kid', { age: 8 })];
        const state = markRecruitIntroPlayed(emptyFunState(), 'a', false);
        const batch = selectRecruitBatch(gs, state, lines.recruit.maxIntroPerBatch);
        assert.equals(3, batch.length);
        assert.isFalse(batch.some((g) => g.id === 'a' || g.id === 'kid'));
    });

    suite.test('FUN-04：預告句只在遊戲第一次介紹用，播完旗標寫進存檔', () => {
        const g = gen('guan-yu');
        const first = recruitIntroFor(lines, g, emptyFunState(), env);
        assert.isTrue(!!first && first.announced);
        const after = markRecruitIntroPlayed(emptyFunState(), g.id, true);
        assert.isTrue(after.dualToneAnnounced);
        assert.equals(null, recruitIntroFor(lines, g, after, env));
        const second = recruitIntroFor(lines, gen('zhang-fei'), after, env);
        assert.isTrue(!!second && !second.announced && second.osText.length > 0);
    });

    suite.test('FUN-02：只有首子、滿一季、未辦過才辦；開局幼苗不算', () => {
        const seedling = { id: 's', birthSeason: -4, fatherId: 'x' };
        const kid = { id: 'k1', birthSeason: 5, fatherId: 'p', motherId: 'm' };
        const kid2 = { id: 'k2', birthSeason: 6, fatherId: 'p', motherId: 'm' };
        assert.isFalse(isFamilyNewborn(seedling));
        const st = emptyFunState();
        assert.equals(null, moonPartyChild(lines, [seedling, kid], 5, st));
        assert.equals('k1', moonPartyChild(lines, [kid2, kid], 6, st)!.id);
        assert.equals(null, moonPartyChild(lines, [kid], 5 + lines.moon.lateSeasons + 1, st));
        assert.equals(null, moonPartyChild(lines, [kid], 6, markMoonPartyDone(st, 'k1', ['a'])));
    });

    suite.test('FUN-02：賓客 3～5 位且不重複，不足用家人補位', () => {
        const cands = Array.from({ length: 9 }, (_, i) => ({ ...gen(`g${i}`), friendship: i }));
        const picked = pickMoonGuests(lines, cands, [], 'seed');
        assert.isTrue(picked.length >= lines.moon.minGuests && picked.length <= lines.moon.maxGuests);
        assert.equals(picked.length, new Set(picked).size);
        const few = pickMoonGuests(lines, [{ ...gen('x') }], [gen('f1'), gen('f2')], 'seed');
        assert.equals(3, few.length);
    });

    suite.test('FUN-02：每位賓客有祝賀與 OS，grantKey 依孩子＋賓客固定', () => {
        const beat = moonGuestBeat(lines, gen('liu-bei'), { id: 'k1', name: 'kid', gender: 'F' }, env);
        assert.isTrue(!!beat && beat.toastText.length > 0 && beat.osText.length > 0);
        assert.equals(moonGrantKey('k1', 'liu-bei'), beat!.grantKey);
        assert.isTrue(beat!.bundleId.length > 0);
    });

    suite.test('FUN-03：連續兩場不同人、每季最多 maxPerSeason 場', () => {
        const cands = [gen('a'), gen('b'), gen('c')];
        let st = emptyFunState();
        let last = '';
        for (let i = 0; i < lines.victory.maxPerSeason; i += 1) {
            const next = queueVictoryChat(lines, st, cands, { seasonNo: 3, resultBand: 'win' }, 'u');
            assert.isTrue(!!next);
            const talker = next!.victoryChat.pending!.talkerId;
            assert.isTrue(talker !== last);
            last = talker;
            st = clearVictoryPending(next!);
        }
        assert.equals(null, queueVictoryChat(lines, st, cands, { seasonNo: 3, resultBand: 'win' }, 'u'));
        assert.isTrue(!!queueVictoryChat(lines, st, cands, { seasonNo: 4, resultBand: 'win' }, 'u'));
    });

    suite.test('FUN-03：戰況帶與 grantKey', () => {
        assert.equals('bigWin', victoryBandOf([0.9, 0.95]));
        assert.equals('closeWin', victoryBandOf([0.9, 0.1]));
        assert.equals('win', victoryBandOf([]));
        assert.equals(victoryGrantKey(lines, 'a', 3, 1), victoryGrantKey(lines, 'a', 3, 1));
        assert.isTrue(victoryGrantKey(lines, 'a', 3, 1) !== victoryGrantKey(lines, 'a', 3, 2));
        const line = victoryChatLine(lines, gen('a'), { talkerId: 'a', resultBand: 'bigWin', seasonNo: 3 }, env, 'u');
        assert.isTrue(!!line && line.text.length > 0);
    });

    suite.test('台詞以女性代入不出現不合身分自稱（全部 fun.fun02/fun04/victory 非 OS 鍵）', () => {
        const keys = Object.keys(zh).filter((k) => /^fun\.(fun02|fun04|victory)\./.test(k) && !k.endsWith('.os'));
        assert.isTrue(keys.length > 30);
        for (const k of keys) {
            const text = zh[k].split('{he}').join('她');
            assert.equals(0, funLineViolations(text, 'F', 30).length);
        }
    });

    suite.test('i18n：fun.* 四語鍵齊備，資料檔引用的鍵在 zh-TW 都查得到', () => {
        const base = Object.keys(zh).filter((k) => k.startsWith('fun.'));
        for (const loc of LOCALES) {
            const tb = table(loc);
            for (const k of base) assert.isTrue(typeof tb[k] === 'string' && tb[k] !== '', `${loc} 缺 ${k}`);
        }
        const raw = fs.readFileSync(path.join(root, 'assets/resources/data/fun-stage-lines.json'), 'utf8');
        for (const m of raw.match(/"fun\.[A-Za-z0-9_.]+"/g) ?? []) {
            const k = m.slice(1, -1);
            assert.isTrue(typeof zh[k] === 'string', `資料鍵 ${k} 不在 zh-TW`);
        }
    });

    return suite;
}
