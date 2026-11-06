// @spec-source → MVP核心循環貫通與遊玩動線功能規格書.md (doc_spec_0308) Phase 2 畢業審定、CP-07；PROG-2-1956
/**
 * AcademyGraduationView — 學府結業結算的畫面文字（純邏輯，不依賴 cc）
 *
 * 把 AcademyGraduationResult 轉成結算彈窗要顯示的字：評級、五維總和、新學戰法、新解鎖特質。
 * 戰法／特質名稱由宿主注入，查不到時退回 id；文案缺 key 時退回 zh-TW 預設。
 */
import type { AcademyGraduationResult } from '../../core/systems/nurture/AcademyGraduation';

export const ACADEMY_GRADUATION_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.academy.graduation.title': '學府結業',
    'ui.academy.graduation.grade': '評級 {0}',
    'ui.academy.graduation.stat_total': '五維總和 {0}',
    'ui.academy.graduation.tactics': '新學戰法：{0}',
    'ui.academy.graduation.tactics_none': '新學戰法：無',
    'ui.academy.graduation.traits': '新解鎖特質：{0}',
    'ui.academy.graduation.traits_none': '新解鎖特質：無',
    'ui.academy.graduation.failed': '結業失敗，請確認學府修業已完成',
};

export type AcademyGraduationTextLookup = (key: string) => string;
export type AcademyGraduationNameLookup = (id: string) => string | undefined;

const IDENTITY_LOOKUP: AcademyGraduationTextLookup = (key) => key;

function textOf(lookup: AcademyGraduationTextLookup, key: string, ...args: (string | number)[]): string {
    const localized = lookup(key);
    const template = localized === key ? (ACADEMY_GRADUATION_FALLBACK_ZH_TW[key] ?? key) : localized;
    return template.replace(/\{(\d+)\}/g, (match, index: string) => {
        const value = args[Number(index)];
        return value === undefined ? match : String(value);
    });
}

export interface AcademyGraduationViewDeps {
    lookup?: AcademyGraduationTextLookup;
    tacticName?: AcademyGraduationNameLookup;
    traitName?: AcademyGraduationNameLookup;
    /** 武將顯示名；查無時只顯示標題 */
    generalName?: string;
}

/** 結算彈窗的欄位文字，key 對應 academy-graduation-main.json 的 id */
export interface AcademyGraduationViewTexts {
    academyGradTitle: string;
    academyGradGrade: string;
    academyGradStatTotal: string;
    academyGradTactics: string;
    academyGradTraits: string;
}

function namesText(ids: readonly string[], nameOf: AcademyGraduationNameLookup | undefined): string {
    return ids.map((id) => nameOf?.(id) ?? id).join('、');
}

export function academyGraduationTexts(result: Readonly<AcademyGraduationResult>, deps: AcademyGraduationViewDeps = {}): AcademyGraduationViewTexts {
    const lookup = deps.lookup ?? IDENTITY_LOOKUP;
    const title = textOf(lookup, 'ui.academy.graduation.title');
    return {
        academyGradTitle: deps.generalName ? `${title}　${deps.generalName}` : title,
        academyGradGrade: textOf(lookup, 'ui.academy.graduation.grade', result.grade),
        academyGradStatTotal: textOf(lookup, 'ui.academy.graduation.stat_total', result.statTotal),
        academyGradTactics: result.newTactics.length > 0
            ? textOf(lookup, 'ui.academy.graduation.tactics', namesText(result.newTactics, deps.tacticName))
            : textOf(lookup, 'ui.academy.graduation.tactics_none'),
        academyGradTraits: result.traits.length > 0
            ? textOf(lookup, 'ui.academy.graduation.traits', namesText(result.traits, deps.traitName))
            : textOf(lookup, 'ui.academy.graduation.traits_none'),
    };
}

/** 結業失敗時顯示的提示文字 */
export function academyGraduationFailedText(lookup: AcademyGraduationTextLookup = IDENTITY_LOOKUP): string {
    return textOf(lookup, 'ui.academy.graduation.failed');
}
