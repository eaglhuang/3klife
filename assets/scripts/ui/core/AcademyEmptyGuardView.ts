/**
 * AcademyEmptyGuardView.ts
 *
 * 學府空轉防護與首年新手引導純函式模組 (PROG-2-9614)
 *
 * 規格依據：
 * 1. 入學年齡讀取規則配表（預設 minEnrollAge: 15），嚴禁寫死。
 * 2. 當家族無人達到入學年齡時，點擊學府不顯示空白列表假死，
 *    而是輸出詼諧口語之引導 ViewState，並提供導流動作（如前往結緣成家）。
 */

export interface AcademyEmptyGuardQuery {
    /** 家族中所有子嗣/候選人之年齡清單 */
    candidateAges: readonly number[];
    /** 入學最低年齡（由 academy-enroll-rules.json 提供，預設 15） */
    minEnrollAge?: number;
    /** 當前主角或世家稱謂（可選，如主公） */
    leaderTitleKey?: string;
}

export interface AcademyEmptyGuardViewState {
    /** 是否允許進入正常學府報名畫面 */
    canOpenEnrollView: boolean;
    /** 提示標題 i18n 鍵值 */
    titleKey?: string;
    /** 詼諧現代口語提示內文 i18n 鍵值 */
    messageKey?: string;
    /** 內文變數替換（如差幾年及冠、所需年齡等） */
    messageParams?: Record<string, string | number>;
    /** 導流按鈕文字鍵值 */
    actionButtonTextKey?: string;
    /** 導流目標路由代碼 */
    actionRedirectRoute?: 'matchmaker' | 'lobby' | 'marriage';
}

/**
 * 建構學府空轉防護 ViewState
 *
 * @param query 查詢條件
 * @returns ViewState
 */
export function buildAcademyEmptyGuardViewState(query: AcademyEmptyGuardQuery): AcademyEmptyGuardViewState {
    const minAge = query.minEnrollAge ?? 15;
    const ages = query.candidateAges ?? [];

    const hasEligibleCandidate = ages.some((age) => age >= minAge);
    if (hasEligibleCandidate) {
        return {
            canOpenEnrollView: true,
        };
    }

    // 若無任何子嗣
    if (ages.length === 0) {
        return {
            canOpenEnrollView: false,
            titleKey: 'ui.academy.empty_guard.no_child_title',
            messageKey: 'ui.academy.empty_guard.no_child_desc',
            messageParams: { minAge },
            actionButtonTextKey: 'ui.academy.empty_guard.btn_go_matchmaker',
            actionRedirectRoute: 'matchmaker',
        };
    }

    // 有子嗣但全體尚未達及冠/入學年齡
    const maxAge = Math.max(...ages);
    const yearsRemaining = Math.max(1, minAge - maxAge);

    return {
        canOpenEnrollView: false,
        titleKey: 'ui.academy.empty_guard.too_young_title',
        messageKey: 'ui.academy.empty_guard.too_young_desc',
        messageParams: {
            currentAge: maxAge,
            minAge,
            yearsRemaining,
        },
        actionButtonTextKey: 'ui.academy.empty_guard.btn_go_nurture',
        actionRedirectRoute: 'lobby',
    };
}
/** 名冊中判斷入學候選所需的最小欄位 */
export interface AcademyRosterEntry {
    id: string;
    age?: number;
    status?: string;
    captivity?: unknown;
}

export interface AcademyEnrollCandidateInput {
    roster: readonly AcademyRosterEntry[];
    /** 家族登記表成員（FamilyService.members()）：親生、義子（含開局義子）、家臣子嗣；配偶不可入學 */
    familyMembers: readonly { personId: string; kind: string }[];
    /** 結緣出生紀錄的子嗣 id（BreedingBirthRecord.child.UID），親生子嗣尚未登記家族表時以此補上 */
    birthChildIds: readonly string[];
}

/**
 * 學府入學候選年齡（裁決 11/21：只收子嗣，含親生、義子、家臣子；成年家臣武將與配偶不算）。
 * 子嗣＝家族登記表中 kind 非 spouse 的成員，或結緣出生紀錄中的子嗣；再排除已歿與被俘者。
 */
export function academyEnrollCandidateAges(input: AcademyEnrollCandidateInput): number[] {
    const offspringIds = new Set<string>(input.birthChildIds);
    for (const member of input.familyMembers) {
        if (member.kind !== 'spouse') offspringIds.add(member.personId);
    }
    return input.roster
        .filter((g) => offspringIds.has(g.id) && (g.status ?? '').toLowerCase() !== 'dead' && !g.captivity)
        .map((g) => Math.floor(g.age ?? 0));
}
