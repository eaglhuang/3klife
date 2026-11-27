/**
 * FunCommon.test.ts — 新手樂趣四功能共用規則（doc_spec_1347 §1，PROG-2-10177）
 *
 * 鎖住：ToneLock（古代句後不得穿插現代、換範圍清空、雙口吻單元為例外）、女角／童角自稱掃描、
 * 存檔種子抽籤穩定、funState 正規化與空狀態不寫檔、四語 i18n 骨架。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    FunToneLock, funFill, funHash, funLineViolations, funPickWeighted, funPickIndex, hasUnfilledSlot, toddlerSelfOf, usableLine,
} from '../assets/scripts/core/fun/FunCommon';
import { cloneFunState, emptyFunState, isEmptyFunState, normalizeFunState } from '../assets/scripts/core/fun/FunState';

const root = path.resolve(__dirname, '..');

export function createFunCommonSuite(): TestSuite {
    const suite = new TestSuite('FunCommon (PROG-2-10177 新手樂趣共用規則)');

    suite.test('ToneLock：古代句後要現代被攔下並回 tone-blocked，維持古代', () => {
        const lock = new FunToneLock();
        lock.enterScope('lobby', 'none');
        const first = lock.resolve('guan_yu', 'ancient', ['ancient', 'modern']);
        assert.equals('ancient', first.tone);
        const second = lock.resolve('guan_yu', 'modern', ['ancient', 'modern']);
        assert.equals('ancient', second.tone);
        assert.equals('tone-blocked', second.warning);
        assert.equals('ancient', lock.lockOf('guan_yu'));
        assert.equals('unset', lock.lockOf('zhang_fei'));
    });

    suite.test('ToneLock：換場景或換視窗後鎖定清空、可重新抽', () => {
        const lock = new FunToneLock();
        lock.enterScope('lobby', 'none');
        lock.resolve('a', 'ancient', ['ancient', 'modern']);
        lock.enterScope('lobby', 'none');
        assert.equals('ancient', lock.lockOf('a'));
        lock.enterScope('lobby', 'roster');
        assert.equals('unset', lock.lockOf('a'));
        assert.equals('modern', lock.resolve('a', 'modern', ['ancient', 'modern']).tone);
        lock.enterScope('battle', 'roster');
        assert.equals('unset', lock.lockOf('a'));
    });

    suite.test('ToneLock：樣板池缺該口吻就退到有的那種並警告；全缺回 null', () => {
        const lock = new FunToneLock();
        lock.enterScope('s', 'w');
        const r = lock.resolve('a', 'ancient', ['modern']);
        assert.equals('modern', r.tone);
        assert.equals('tone-fallback', r.warning);
        assert.equals(null, lock.resolve('b', 'modern', []).tone);
    });

    suite.test('雙口吻單元：古代→現代為宣告例外，單元結束鎖定 modern', () => {
        const lock = new FunToneLock();
        lock.enterScope('lobby', 'recruit');
        const unit = lock.playDualUnit('guan_yu');
        assert.equals('ancient', unit[0]);
        assert.equals('modern', unit[1]);
        assert.equals('modern', lock.lockOf('guan_yu'));
        // 之後不得再回古代
        assert.equals('modern', lock.resolve('guan_yu', 'ancient', ['ancient', 'modern']).tone);
    });

    suite.test('自稱掃描：女角不得出現某／在下／俺／咱家；童角不得出現成人自稱', () => {
        assert.equals(0, funLineViolations('妾身今日來賀。', '女', 30).length);
        assert.equals(1, funLineViolations('關某特來道賀。', '女', 30).length);
        assert.equals(1, funLineViolations('俺來了', 'F', 30).length);
        assert.equals(0, funLineViolations('關某特來道賀。', '男', 30).length);
        assert.equals(1, funLineViolations('老夫來也', '男', 4).length);
    });

    suite.test('槽位代入：女將 {self} 走 SpeakerVoice；童角走童語表；未填槽位可偵測', () => {
        assert.equals('妾身賀喜', funFill('{self}賀喜', { voice: { gender: '女', type: 'Wise', age: 30 } }));
        assert.equals('本姑娘賀喜', funFill('{self}賀喜', { voice: { gender: '女', type: 'Brave', age: 30 } }));
        const kid = toddlerSelfOf('男', 'seed');
        assert.isTrue(kid === '我' || kid === '寶寶');
        for (let i = 0; i < 30; i += 1) {
            const g = toddlerSelfOf('女', `s${i}`);
            assert.isTrue(['我', '寶寶', '人家'].includes(g), g);
        }
        assert.isTrue(hasUnfilledSlot(funFill('{self}{sir}', { voice: { gender: '男' } })));
        assert.isTrue(usableLine('你好', 'k'));
        assert.isFalse(usableLine('k', 'k'));
        assert.isFalse(usableLine('', 'k'));
    });

    suite.test('抽籤：同種子同結果；排除清單內不會被抽（剔光才放行）', () => {
        assert.equals(funHash('abc'), funHash('abc'));
        assert.equals(funPickIndex('s', 'k', 7), funPickIndex('s', 'k', 7));
        assert.equals(-1, funPickIndex('s', 'k', 0));
        const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
        for (let i = 0; i < 40; i += 1) {
            const got = funPickWeighted(items, `seed${i}`, 'k', ['a', 'b']);
            assert.equals('c', got?.id);
        }
        assert.isTrue(funPickWeighted(items, 'x', 'k', ['a', 'b', 'c']) !== null);
        assert.equals(null, funPickWeighted([], 'x', 'k'));
    });

    suite.test('funState：壞資料不丟錯、空狀態判定、clone 不共用參照', () => {
        const empty = emptyFunState();
        assert.isTrue(isEmptyFunState(empty));
        assert.isTrue(isEmptyFunState(normalizeFunState(undefined)));
        assert.isTrue(isEmptyFunState(normalizeFunState('壞掉')));
        const s = normalizeFunState({
            toddler: { c1: { lastSeasonNo: 3, lastTemplateId: 't1' }, bad: { lastSeasonNo: 1 } },
            victoryChat: { lastTalkerId: 'g1', dayNo: 5, dayCount: 2, pending: { talkerId: 'g2', resultBand: 'bigWin', seasonNo: 4 } },
            moonParty: { childId: 'c1', guestIds: ['a', 'a', 'b', 7], done: false },
            recruitIntro: { g1: true, g2: false },
            dualToneAnnounced: true,
        });
        assert.isFalse(isEmptyFunState(s));
        assert.equals(1, Object.keys(s.toddler).length);
        assert.equals('g2', s.victoryChat.pending?.talkerId);
        assert.equals(2, s.moonParty?.guestIds.length);
        assert.equals(1, Object.keys(s.recruitIntro).length);
        const copy = cloneFunState(s);
        copy.toddler.c1.lastSeasonNo = 99;
        assert.equals(3, s.toddler.c1.lastSeasonNo);
    });

    suite.test('i18n 骨架：稱謂與浮字鍵四語齊備', () => {
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/i18n', `${loc}.json`), 'utf8')) as Record<string, string>;
            for (const key of ['fun.honor.father', 'fun.honor.mother', 'fun.honor.lord', 'fun.bond.float', 'fun.victory.float']) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${loc} 缺 ${key}`);
            }
        }
    });

    return suite;
}
