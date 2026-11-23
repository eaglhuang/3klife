/**
 * AcademyEmptyGuardView.test.ts
 *
 * 學府空轉防護 ViewState 單元測試 (PROG-2-9614)
 */

import { TestSuite, assert } from './TestRunner';
import {
    buildAcademyEmptyGuardViewState,
} from '../assets/scripts/ui/core/AcademyEmptyGuardView';

export function createAcademyEmptyGuardViewSuite(): TestSuite {
    const suite = new TestSuite('AcademyEmptyGuardView (PROG-2-9614)');

    suite.test('當有成員達到入學年齡時應允許進入學府報名畫面', () => {
        const viewState = buildAcademyEmptyGuardViewState({
            candidateAges: [10, 15, 8],
            minEnrollAge: 15,
        });
        assert.isTrue(viewState.canOpenEnrollView, '應允許進入學府');
        assert.equals(undefined, viewState.actionRedirectRoute, '無需導流');
    });

    suite.test('當無任何子嗣時應提示前往媒人說親並給予導流', () => {
        const viewState = buildAcademyEmptyGuardViewState({
            candidateAges: [],
            minEnrollAge: 15,
        });
        assert.isFalse(viewState.canOpenEnrollView, '不得開空列表假死');
        assert.equals('ui.academy.empty_guard.no_child_title', viewState.titleKey, '標題鍵值應正確');
        assert.equals('matchmaker', viewState.actionRedirectRoute, '應導流至媒人');
        assert.equals(15, viewState.messageParams?.minAge, '變數 minAge 應正確帶入');
    });

    suite.test('當有子嗣但全體未滿 15 歲時應提示尚年幼並計算剩餘年數', () => {
        const viewState = buildAcademyEmptyGuardViewState({
            candidateAges: [6, 12, 14],
            minEnrollAge: 15,
        });
        assert.isFalse(viewState.canOpenEnrollView, '不得開空列表假死');
        assert.equals('ui.academy.empty_guard.too_young_title', viewState.titleKey, '標題鍵值應為年幼');
        assert.equals(14, viewState.messageParams?.currentAge, '最大年齡應為 14');
        assert.equals(1, viewState.messageParams?.yearsRemaining, '距離 15 歲還剩 1 年');
        assert.equals('lobby', viewState.actionRedirectRoute, '應導流回大廳培育');
    });

    return suite;
}