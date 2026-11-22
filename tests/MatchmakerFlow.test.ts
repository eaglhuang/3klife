/**
 * MatchmakerFlow.test.ts — 結緣媒人導流與大廳隊列通用化測試（PROG-2-9612）
 *
 * 覆蓋：
 * 1. 世界觀無年齡硬規則：開場教學後首次換季觸發 first-visit，存檔旗標生效，讀檔換季不重複。
 * 2. 春季常規導流：春季且配偶未達上限、有剩餘次數觸發 spring-visit；達上限或無次數不觸發。
 * 3. 候選人種子決定論：同一年同一位序之 3 位民間女子資料固定不變。
 * 4. 點擊稍後不扣次數；納入配偶扣除 100 銀兩、入家譜名冊、剩餘次數扣 1。
 * 5. 銀兩不足 100 時無法納入，提示「家族銀兩不足，媒婆說她不賒帳」並提供導流。
 * 6. 大廳導流隊列 LobbyGuideQueue 順序性（典禮 > 晉升 > 媒人）與同人綁定。
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { matchmakerCandidates } from '../assets/scripts/core/systems/SpouseSources';
import { checkMatchmakerTrigger } from '../assets/scripts/core/systems/MatchmakerGuideManager';
import { MatchmakerDialogPresenter } from '../assets/scripts/ui/family/MatchmakerDialogPresenter';
import { LobbyGuideQueue } from '../assets/scripts/ui/core/LobbyGuideQueue';

const ROOT = join(__dirname, '..');
const generals = JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
const readJson = (name: string): unknown => JSON.parse(readFileSync(join(ROOT, `assets/resources/data/${name}.json`), 'utf8'));

async function createTestSession() {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.setGeneralTemplates(generals);
    session.configureFamily(readJson('family-config'));
    session.configureOccupancyMatrix(readJson('occupancy-matrix'));
    await session.startNewGameWithStarters(5, generals, {});
    return session;
}

export function createMatchmakerFlowSuite(): TestSuite {
    const suite = new TestSuite('MatchmakerFlow (結緣媒人導流與大廳隊列通用化 PROG-2-9612)');

    suite.test('1. 首次換季紅娘叩門（first-visit）與存檔旗標防重複', async () => {
        const session = await createTestSession();
        assert.isFalse(session.matchmakerFirstVisitDone, '開局時 matchmakerFirstVisitDone 應為 false');

        // 第一次推進季度（開場教學結束後換季，第 1 年第 1 季 → 第 1 年第 2 季）
        const payload1 = await session.advanceSeason();
        assert.isTrue(!!payload1.matchmakerOfferNotice, '首次換季應觸發媒人導流通知');
        assert.equals('first-visit', payload1.matchmakerOfferNotice?.promptType);
        assert.equals(3, payload1.matchmakerOfferNotice?.candidates.length);
        assert.isTrue(session.matchmakerFirstVisitDone, '觸發後旗標應設為 true');

        // 存檔並讀檔驗證
        const saveService = new PlayerSaveService(new MemoryStorageAdapter());
        session.setSaveService(saveService);
        await session.save();
        const loaded = await saveService.load();
        assert.isTrue(!!loaded && loaded.matchmakerFirstVisitDone === true, '存檔中應包含 matchmakerFirstVisitDone = true');

        // 下一次換季（非春季，第 1 年第 2 季 → 第 1 年第 3 季），已完成首次叩門，不應再出 first-visit
        const payload2 = await session.advanceSeason();
        assert.isTrue(!payload2.matchmakerOfferNotice, '非春季且已完成首次叩門，不應重複觸發導流');
    });

    suite.test('2. 春季常規說親導流（spring-visit）與上限阻擋', () => {
        // 純邏輯驗證 checkMatchmakerTrigger
        // 情境 A：春季、配偶未達上限、有剩餘次數 → 觸發 spring-visit
        const res1 = checkMatchmakerTrigger({
            totalSeasonsElapsed: 4,
            currentSeason: 1, // 春季
            isOpeningDone: true,
            firstVisitDone: true,
            spouseCount: 0,
            spouseCap: 2,
            remainingOffers: 2,
        });
        assert.isTrue(!!res1);
        assert.equals('spring-visit', res1?.promptType);

        // 情境 B：春季、配偶已達上限 → 不觸發
        const res2 = checkMatchmakerTrigger({
            totalSeasonsElapsed: 4,
            currentSeason: 1,
            isOpeningDone: true,
            firstVisitDone: true,
            spouseCount: 2,
            spouseCap: 2,
            remainingOffers: 2,
        });
        assert.isTrue(res2 === null, '配偶達上限時不應觸發春季說親導流');

        // 情境 C：春季、本年剩餘次數為 0 → 不觸發
        const res3 = checkMatchmakerTrigger({
            totalSeasonsElapsed: 4,
            currentSeason: 1,
            isOpeningDone: true,
            firstVisitDone: true,
            spouseCount: 0,
            spouseCap: 2,
            remainingOffers: 0,
        });
        assert.isTrue(res3 === null, '次數用盡時不應觸發春季說親導流');
    });

    suite.test('3. 候選人種子決定論：同一年候選人名單完全相同', async () => {
        const session = await createTestSession();
        const config = session.familyConfig!;
        const c1 = matchmakerCandidates(1, config);
        const c2 = matchmakerCandidates(1, config);
        assert.equals(3, c1.length);
        assert.equals(c1[0].generalId, c2[0].generalId);
        assert.equals(c1[0].name, c2[0].name);
        assert.equals(c1[0].ep, c2[0].ep);
        assert.equals(c1[1].generalId, c2[1].generalId);
        assert.equals(c1[2].generalId, c2[2].generalId);
    });

    suite.test('4. 點擊稍後不扣次數；納入配偶扣 100 銀兩、入家譜名冊、剩餘次數扣 1', async () => {
        const session = await createTestSession();
        const initialSilver = session.silverLedger.silverBalance(); // startingSilver 預設 600
        const offer1 = session.matchmakerOffer();
        assert.equals(2, offer1.remaining);

        // 測試 Presenter：點擊 close / 稍後再議
        let enrolled = false;
        const presenterLater = new MatchmakerDialogPresenter({
            promptType: 'first-visit',
            candidates: offer1.candidates,
            price: 100,
            silverBalance: initialSilver,
            remainingOffers: offer1.remaining,
            onEnroll: async (pick) => {
                enrolled = true;
                return session.enrollMatchmakerSpouse(pick);
            },
        });
        presenterLater.close();
        assert.isFalse(enrolled, 'close 不應呼叫 enroll');
        assert.equals(initialSilver, session.silverLedger.silverBalance(), '銀兩不應變更');
        assert.equals(2, session.matchmakerOffer().remaining, '剩餘次數不應變更');

        // 測試 Presenter：納入第 0 位候選人
        const chosenCandidate = offer1.candidates[0];
        const presenterEnroll = new MatchmakerDialogPresenter({
            promptType: 'first-visit',
            candidates: offer1.candidates,
            price: 100,
            silverBalance: session.silverLedger.silverBalance(),
            remainingOffers: session.matchmakerOffer().remaining,
            onEnroll: async (pick) => session.enrollMatchmakerSpouse(pick),
        });
        presenterEnroll.selectCandidate(0);
        const enrollResult = await presenterEnroll.confirmEnroll();
        assert.isTrue(enrollResult.ok, '納入配偶應成功');
        assert.equals(chosenCandidate.generalId, enrollResult.generalId);
        assert.equals(initialSilver - 100, session.silverLedger.silverBalance(), '成功納入應實扣 100 銀兩');
        assert.isTrue(session.isSpouse(chosenCandidate.generalId), '該女子應已記錄為配偶');
        assert.isTrue(session.roster.some((g) => g.id === chosenCandidate.generalId), '配偶應已在名冊中');

        // 本年剩餘次數應從 2 變 1
        assert.equals(1, session.matchmakerOffer().remaining);
    });

    suite.test('5. 銀兩不足 100 時按鈕反灰並提示「家族銀兩不足，媒婆說她不賒帳」且導流至商業任務', async () => {
        let gotoCommerceCalled = false;
        const presenter = new MatchmakerDialogPresenter({
            promptType: 'first-visit',
            candidates: [
                { index: 0, generalId: 'test_1', name: '陳婉', ep: 60, hint: '書香門第' },
            ],
            price: 100,
            silverBalance: 50, // 只有 50 銀兩，不足 100
            remainingOffers: 2,
            onEnroll: async () => ({ ok: true }),
            onGotoCommerce: () => { gotoCommerceCalled = true; },
        });

        assert.isFalse(presenter.canAfford, '銀兩應不足');
        assert.isFalse(presenter.canSubmit, '不足時不可提交納入');
        assert.equals('家族銀兩不足，媒婆說她不賒帳', presenter.blockNotice);

        // 嘗試提交應回失敗
        const res = await presenter.confirmEnroll();
        assert.isFalse(res.ok);
        assert.equals('家族銀兩不足，媒婆說她不賒帳', res.reason);

        // 點擊導流跳轉商業任務
        presenter.gotoCommerceTask();
        assert.isTrue(gotoCommerceCalled, '應觸發前往商業任務導流');
    });

    suite.test('6. LobbyGuideQueue 順序性（典禮 > 晉升 > 媒人）與同人同標記沿用', () => {
        const queue = new LobbyGuideQueue();

        queue.enqueue({
            id: 'matchmaker-1',
            priority: 'matchmaker',
            markStyle: 'promotion',
            guideSpeech: '媒人求見',
            acceptLabel: '立即相看',
            declineLabel: '稍後再議',
            actionId: 'family-matchmaker',
        });

        queue.enqueue({
            id: 'promotion-1',
            priority: 'officer-promotion',
            markStyle: 'promotion',
            guideSpeech: '官職晉升',
            acceptLabel: '立即前往',
            declineLabel: '稍後再議',
            actionId: 'officer',
        });

        queue.enqueue({
            id: 'annual-gala-1',
            priority: 'annual-gala',
            markStyle: 'promotion',
            guideSpeech: '年終頒獎盛典開幕',
            acceptLabel: '入席',
            declineLabel: '跳過',
            actionId: 'annual-gala',
        });

        // 檢查優先級：annual-gala 最前，其次 officer-promotion，最後 matchmaker
        const first = queue.peek();
        assert.equals('annual-gala-1', first?.id, '年終盛典優先級應最高');

        // 綁定武將測試：同人沿用
        const present1 = [{ id: 'general_zhao_yun' }, { id: 'general_guan_yu' }];
        const bound1 = queue.bindAnchorGeneral(present1);
        assert.equals('general_zhao_yun', bound1);

        // 走動輪替：趙雲仍在場，應持續綁定趙雲（不換人）
        const present2 = [{ id: 'general_guan_yu' }, { id: 'general_zhao_yun' }, { id: 'general_zhang_fei' }];
        const bound2 = queue.bindAnchorGeneral(present2);
        assert.equals('general_zhao_yun', bound2, '在場時應沿用原武將');

        // 趙雲離場：換為在場第一位關羽
        const present3 = [{ id: 'general_guan_yu' }, { id: 'general_zhang_fei' }];
        const bound3 = queue.bindAnchorGeneral(present3);
        assert.equals('general_guan_yu', bound3, '原武將離場時切換至在場首位');

        // 逐一 dequeue
        queue.dequeue('annual-gala-1');
        assert.equals('promotion-1', queue.peek()?.id, '盛典移除後應輪到官職晉升');

        queue.dequeue('promotion-1');
        assert.equals('matchmaker-1', queue.peek()?.id, '官職移除後應輪到媒人說親');

        queue.dequeue('matchmaker-1');
        assert.isTrue(queue.peek() === undefined, '全部移除後隊列應為空');
        assert.isFalse(queue.hasPending);
    });

    return suite;
}
