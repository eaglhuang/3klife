/**
 * AcademyEmptyGuardView.test.ts
 *
 * 學府空轉防護 ViewState 單元測試 (PROG-2-9614)
 */

import { TestSuite, assert } from './TestRunner';
import {
    buildAcademyEmptyGuardViewState,
    academyEnrollCandidateAges,
} from '../assets/scripts/ui/core/AcademyEmptyGuardView';
import { fillI18nArgs } from '../assets/scripts/core/systems/I18nSystem';
import * as fs from 'fs';
import * as path from 'path';

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

    // PROG-2-9963：學府只收子嗣，成年家臣武將不算候選
    const adults = [
        { id: 'gan_ning', age: 30 },
        { id: 'zhang_fei', age: 35 },
    ];
    const guardFor = (roster: { id: string; age?: number; status?: string; captivity?: unknown }[], familyMembers: { personId: string; kind: string }[], birthChildIds: string[]) =>
        buildAcademyEmptyGuardViewState({ candidateAges: academyEnrollCandidateAges({ roster, familyMembers, birthChildIds }), minEnrollAge: 15 });

    suite.test('名冊只有成年家臣、沒有子嗣時導流媒人（不開入學畫面）', () => {
        const guard = guardFor(adults, [], []);
        assert.isFalse(guard.canOpenEnrollView, '成年家臣不得讓學府開啟');
        assert.equals('matchmaker', guard.actionRedirectRoute, '應導流至媒人');
    });

    suite.test('沒有任何子嗣（含只有配偶）時導流媒人', () => {
        const roster = [...adults, { id: 'wife', age: 22 }];
        const guard = guardFor(roster, [{ personId: 'wife', kind: 'spouse' }], []);
        assert.isFalse(guard.canOpenEnrollView, '配偶不可入學');
        assert.equals('matchmaker', guard.actionRedirectRoute, '應導流至媒人');
    });

    suite.test('有子嗣但未滿 15 歲時顯示還差 N 年', () => {
        const roster = [...adults, { id: 'kid', age: 12 }];
        const guard = guardFor(roster, [], ['kid']);
        assert.isFalse(guard.canOpenEnrollView, '未滿入學年齡');
        assert.equals(3, guard.messageParams?.yearsRemaining, '還差 3 年');
    });

    suite.test('有滿 15 歲的義子或家臣子嗣時開入學畫面；已歿與被俘者不算', () => {
        const roster = [...adults, { id: 'adoptee', age: 15 }, { id: 'dead_kid', age: 20, status: 'Dead' }, { id: 'captive_kid', age: 20, captivity: { by: 'x' } }];
        const members = [{ personId: 'adoptee', kind: 'adopted' }, { personId: 'dead_kid', kind: 'biological' }, { personId: 'captive_kid', kind: 'retainerChild' }];
        assert.isTrue(guardFor(roster, members, []).canOpenEnrollView, '滿 15 歲義子應可入學');
        assert.isFalse(guardFor(roster.filter((g) => g.id !== 'adoptee'), members, []).canOpenEnrollView, '已歿與被俘者不算候選');
    });

    suite.test('守衛提示字串四語系都用 {0}{1}{2} 位置佔位符，LobbyScene 代入後不殘留大括號（QA 11/25）', () => {
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const strings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'i18n', `${locale}.json`), 'utf8'));
            const young = fillI18nArgs(strings['ui.academy.empty_guard.too_young_desc'], ['12', '15', '3']);
            assert.isFalse(/\{[^}]*\}/.test(young), `${locale} too_young_desc 殘留佔位符：${young}`);
            assert.isTrue(young.includes('12') && young.includes('15') && young.includes('3'), `${locale} too_young_desc 應代入年齡、門檻、差距`);
            const none = fillI18nArgs(strings['ui.academy.empty_guard.no_child_desc'], ['15']);
            assert.isFalse(/\{[^}]*\}/.test(none), `${locale} no_child_desc 殘留佔位符：${none}`);
        }
    });

    return suite;
}
