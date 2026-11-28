/**
 * StreetFirstVisit.test.ts — 市井大街首訪任務（PROG-2-10229，QSOC-01 9.5）
 * 鎖住：帶路挑親密度最高家臣、目標 3 位且家臣不足用他國遊歷補、狀態機順序、完成給一次獎勵並解鎖送禮、
 * 開放旗標 tutorialEscortRequired=true 後要逛完才開、台詞四語系且分性別。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    DEFAULT_STREET_FIRST_VISIT_CONFIG, StreetFirstVisit, escortProgress, pickGuide, pickTargets, streetLineKey,
} from '../assets/scripts/ui/life/StreetFirstVisit';
import type { StreetCandidate } from '../assets/scripts/ui/life/StreetFirstVisit';
import { DEFAULT_STREET_OPEN_CONFIG } from '../assets/scripts/ui/life/StreetOpenGate';

const DATA = path.resolve(__dirname, '../assets/resources/data');
const c = (id: string, kind: 'retainer' | 'visitor', intimacy: number, gender: 'm' | 'f' = 'm'): StreetCandidate => ({ id, kind, intimacy, gender });
const FACTS = { firstBattleDone: true, seasonIndex: 1 };

export function createStreetFirstVisitSuite(): TestSuite {
    const suite = new TestSuite('StreetFirstVisit (PROG-2-10229)');

    suite.test('資料：目標 3 位、獎勵套件存在於 reward-config、tutorialEscortRequired 已為 true', () => {
        assert.equals(3, DEFAULT_STREET_FIRST_VISIT_CONFIG.targetCount);
        const reward = JSON.parse(fs.readFileSync(path.join(DATA, 'reward-config.json'), 'utf8'));
        assert.isTrue(reward.bundles.some((b: { id: string }) => b.id === DEFAULT_STREET_FIRST_VISIT_CONFIG.rewardBundleId), '缺獎勵套件');
        assert.isTrue(DEFAULT_STREET_OPEN_CONFIG.tutorialEscortRequired);
    });

    suite.test('帶路者：家臣中親密度最高；同分取 id 小者；訪客不能帶路；沒家臣回 null', () => {
        assert.equals('b', pickGuide([c('a', 'retainer', 10), c('b', 'retainer', 80), c('v', 'visitor', 99)]));
        assert.equals('a', pickGuide([c('b', 'retainer', 5), c('a', 'retainer', 5)]));
        assert.equals(null, pickGuide([c('v', 'visitor', 99)]));
    });

    suite.test('目標：排除帶路者，家臣夠 3 位就全是家臣', () => {
        const list = [c('g', 'retainer', 90), c('r1', 'retainer', 50), c('r2', 'retainer', 40), c('r3', 'retainer', 30), c('r4', 'retainer', 20), c('v1', 'visitor', 99)];
        assert.equals('r1,r2,r3', pickTargets(list, 'g').join(','));
    });

    suite.test('目標：家臣不足 3 位用他國遊歷武將補（親密度高者先）', () => {
        const list = [c('g', 'retainer', 90), c('r1', 'retainer', 50), c('v1', 'visitor', 10), c('v2', 'visitor', 70), c('v3', 'visitor', 30)];
        assert.equals('r1,v2,v3', pickTargets(list, 'g').join(','));
        assert.equals('v2', pickTargets([c('v2', 'visitor', 1)], null).join(','));
    });

    suite.test('狀態機：條件不成立不開始；成立進帶路；走完進尋找；不能跳步', () => {
        const v = new StreetFirstVisit();
        const list = [c('g', 'retainer', 90), c('r1', 'retainer', 50), c('r2', 'retainer', 40), c('v1', 'visitor', 10)];
        assert.isFalse(v.tryStartEscort({ firstBattleDone: false, seasonIndex: 1 }, list));
        assert.equals('locked', v.phase);
        assert.equals(null, v.finishEscort(list));
        assert.equals('locked', v.phase);
        assert.isTrue(v.tryStartEscort(FACTS, list));
        assert.equals('escort', v.phase);
        assert.equals('g', v.state.guideId);
        assert.isFalse(v.tryStartEscort(FACTS, list), '已在帶路不可重複開始');
        assert.isFalse(v.markFound('r1').newlyFound, '帶路中不算找人');
        assert.equals(null, v.finishEscort(list));
        assert.equals('searching', v.phase);
        assert.equals(3, v.progress.required);
    });

    suite.test('沒有家臣可帶路時不開始', () => {
        assert.isFalse(new StreetFirstVisit().tryStartEscort(FACTS, [c('v', 'visitor', 5)]));
    });

    suite.test('找人：進度 1/3、2/3；重複與非目標不算；找滿給一次獎勵並解鎖送禮', () => {
        const v = new StreetFirstVisit();
        const list = [c('g', 'retainer', 90), c('r1', 'retainer', 50), c('r2', 'retainer', 40), c('v1', 'visitor', 10)];
        v.tryStartEscort(FACTS, list);
        v.finishEscort(list);
        assert.isFalse(v.giftUnlocked);
        assert.isFalse(v.markFound('g').newlyFound, '帶路者不在目標內');
        const a = v.markFound('r1');
        assert.isTrue(a.newlyFound);
        assert.equals(1, a.found);
        assert.equals('1', v.progressText().args[0]);
        assert.equals('3', v.progressText().args[1]);
        assert.isFalse(v.markFound('r1').newlyFound, '重複不算');
        v.markFound('r2');
        const done = v.markFound('v1');
        assert.isTrue(done.completed);
        assert.equals('BUNDLE_STREET_FIRST_VISIT', done.rewardBundleId);
        assert.equals('done', v.phase);
        assert.isTrue(v.giftUnlocked);
        const again = v.markFound('v1');
        assert.equals(null, again.rewardBundleId, '獎勵只給一次');
    });

    suite.test('目標 0 位（沒人可找）：帶路走完直接完成', () => {
        const v = new StreetFirstVisit();
        const list = [c('g', 'retainer', 90)];
        v.tryStartEscort(FACTS, list);
        const r = v.finishEscort(list);
        assert.isTrue(r !== null && r.completed);
        assert.isTrue(v.giftUnlocked);
    });

    suite.test('接 StreetOpenGate：帶路走完前大街不算開放，走完才開', () => {
        const v = new StreetFirstVisit();
        const list = [c('g', 'retainer', 90), c('r1', 'retainer', 50)];
        assert.isFalse(v.isStreetOpen(FACTS));
        v.tryStartEscort(FACTS, list);
        assert.isFalse(v.isStreetOpen(FACTS), '帶路中尚未開放');
        v.finishEscort(list);
        assert.isTrue(v.isStreetOpen(FACTS));
        assert.isFalse(v.isStreetOpen({ firstBattleDone: false, seasonIndex: 1 }));
    });

    suite.test('存檔還原：state 可回灌繼續', () => {
        const v = new StreetFirstVisit();
        const list = [c('g', 'retainer', 90), c('r1', 'retainer', 50)];
        v.tryStartEscort(FACTS, list);
        v.finishEscort(list);
        const w = new StreetFirstVisit(undefined, JSON.parse(JSON.stringify(v.state)));
        assert.equals('searching', w.phase);
        assert.isTrue(w.markFound('r1').completed);
    });

    suite.test('帶路位移：依秒數落在哪站、走完 finished', () => {
        const cfg = DEFAULT_STREET_FIRST_VISIT_CONFIG;
        const per = cfg.escort.secondsPerStop;
        const e0 = escortProgress(0, cfg);
        assert.equals(0, e0.stopIndex);
        assert.isFalse(e0.finished);
        const e1 = escortProgress(per * 1.5, cfg);
        assert.equals(1, e1.stopIndex);
        assert.isTrue(Math.abs(e1.t - 0.5) < 1e-9);
        assert.isTrue(escortProgress(per * (cfg.escort.stops.length - 1), cfg).finished);
    });

    suite.test('台詞：四語系都有進度／完成／帶路／找到（分男女）／送禮解鎖，且找到有 {0}', () => {
        const i18n = DEFAULT_STREET_FIRST_VISIT_CONFIG.i18n;
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const dict = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../assets/resources/i18n/${lang}.json`), 'utf8'));
            assert.isTrue(typeof dict[i18n.progress] === 'string' && dict[i18n.progress].includes('{0}') && dict[i18n.progress].includes('{1}'), `${lang} 缺進度`);
            assert.isTrue(typeof dict[i18n.complete] === 'string', `${lang} 缺完成`);
            for (const base of [i18n.guideIntro, i18n.found, i18n.giftUnlocked]) {
                for (const g of ['m', 'f'] as const) {
                    const v = dict[streetLineKey(base, g)];
                    assert.isTrue(typeof v === 'string' && v.length > 0, `${lang} 缺 ${streetLineKey(base, g)}`);
                }
            }
            assert.isTrue(dict[streetLineKey(i18n.found, 'f')].includes('{0}'), `${lang} found.f 要有武將名`);
        }
    });

    return suite;
}
