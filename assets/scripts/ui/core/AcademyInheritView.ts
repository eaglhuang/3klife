// @spec-source → 學府培育三十六回合三階段推進與訓練效果公式規格書.md (doc_spec_1127)、PROG-2-9183 學府開獎與生平印記畫面呈現
/**
 * AcademyInheritView — 學府雙年先祖遺風開獎與生平印記顯示模型（純邏輯，不依賴 cc）
 *
 * 1. 所有文案皆走 i18n lookup（缺 key 退回 zh-TW 預設模板）。
 * 2. 印記與五維皆轉為玩家可讀中文名稱，絕不外露內部 id（如 mark_*）。
 */
import type {
    AncestralInheritEventRecord,
    CareerMarkRecord,
} from '../../core/systems/nurture/AcademyInheritAndMarks';
import {
    careerMarkTpDiscount,
    topCareerMarksForBreeding,
} from '../../core/systems/nurture/AcademyInheritAndMarks';
import type { AcademyStatKey } from '../../core/systems/nurture/AcademyTypes';

export type AcademyInheritTextLookup = (key: string) => string;

export const ACADEMY_INHERIT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.academy.mark.yingchuan': '潁川清談印記',
    'ui.academy.mark.youzhou': '幽州鐵騎印記',
    'ui.academy.mark.jiangdong': '江東水師印記',
    'ui.academy.mark.luoyang': '洛陽朝堂印記',
    'ui.academy.mark.longzhong': '隆中奇謀印記',
    'ui.academy.mark.default': '宗族學府印記',
    'ui.academy.mark.pedigree_hint': '生平印記：{0}（遺傳採計最高 2 枚）',
    'ui.academy.inherit.title_midterm': '第 12 回合・期中先祖感應',
    'ui.academy.inherit.title_rite': '第 24 回合・弱冠先祖感應',
    'ui.academy.inherit.hit': '先祖「{0}」顯靈！領悟 {1} +{2}',
    'ui.academy.inherit.hit_apt': '先祖「{0}」顯靈！領悟 {1} +{2}、兵種適性躍升（{3}）',
    'ui.academy.inherit.miss': '先祖「{0}」靜觀其變，尚未顯靈～ 且看下回蓄勢再發！',
    'ui.academy.inherit.pity_active': '（期中沉潛積蓄，本次保底感應 +10% 生效！）',
    'ui.academy.inherit.default_ancestor': '宗族先祖',
    'ui.stat.str': '武力',
    'ui.stat.lea': '統率',
    'ui.stat.int': '智力',
    'ui.stat.pol': '政治',
    'ui.stat.cha': '魅力',
    'ui.apt.cavalry': '騎兵',
    'ui.apt.infantry': '步兵',
    'ui.apt.archer': '弓兵',
    'ui.apt.pikeman': '槍兵',
    'ui.apt.navy': '水師',
    'ui.apt.siege': '工兵',
};

const MARK_KEY_BY_ID: Readonly<Record<string, string>> = {
    mark_yingchuan_scholar: 'ui.academy.mark.yingchuan',
    mark_youzhou_cavalry: 'ui.academy.mark.youzhou',
    mark_jiangdong_navy: 'ui.academy.mark.jiangdong',
    mark_luoyang_court: 'ui.academy.mark.luoyang',
    mark_longzhong_strategy: 'ui.academy.mark.longzhong',
};

const IDENTITY_LOOKUP: AcademyInheritTextLookup = (key) => key;

function textOf(lookup: AcademyInheritTextLookup, key: string, ...args: (string | number)[]): string {
    const localized = lookup(key);
    const template = localized === key ? (ACADEMY_INHERIT_FALLBACK_ZH_TW[key] ?? key) : localized;
    return template.replace(/\{(\d+)\}/g, (match, index: string) => {
        const value = args[Number(index)];
        return value === undefined ? match : String(value);
    });
}

export function careerMarkDisplayName(markId: string, lookup: AcademyInheritTextLookup = IDENTITY_LOOKUP): string {
    const key = MARK_KEY_BY_ID[markId] ?? 'ui.academy.mark.default';
    return textOf(lookup, key);
}

export function academyStatDisplayName(stat: AcademyStatKey, lookup: AcademyInheritTextLookup = IDENTITY_LOOKUP): string {
    return textOf(lookup, `ui.stat.${stat}`);
}

export function aptitudeTargetDisplayName(target: string, lookup: AcademyInheritTextLookup = IDENTITY_LOOKUP): string {
    const key = `ui.apt.${target.toLowerCase()}`;
    const resolved = textOf(lookup, key);
    return resolved === key ? target : resolved;
}

export interface AncestralInheritViewModel {
    title: string;
    body: string;
    pityHint: string;
    triggered: boolean;
}

export function buildAncestralInheritView(
    record: Readonly<AncestralInheritEventRecord>,
    options: {
        ancestorName?: string;
        pityActive?: boolean;
        lookup?: AcademyInheritTextLookup;
    } = {},
): AncestralInheritViewModel {
    const lookup = options.lookup ?? IDENTITY_LOOKUP;
    const title = textOf(
        lookup,
        record.turn === 12 ? 'ui.academy.inherit.title_midterm' : 'ui.academy.inherit.title_rite',
    );
    const ancestor = options.ancestorName?.trim() || textOf(lookup, 'ui.academy.inherit.default_ancestor');
    const statName = academyStatDisplayName(record.targetStat, lookup);
    let body: string;
    if (record.triggered) {
        if (record.aptitudeBoostTarget) {
            const aptName = aptitudeTargetDisplayName(record.aptitudeBoostTarget, lookup);
            body = textOf(lookup, 'ui.academy.inherit.hit_apt', ancestor, statName, record.statDelta, aptName);
        } else {
            body = textOf(lookup, 'ui.academy.inherit.hit', ancestor, statName, record.statDelta);
        }
    } else {
        body = textOf(lookup, 'ui.academy.inherit.miss', ancestor);
    }
    const pityHint = options.pityActive ? textOf(lookup, 'ui.academy.inherit.pity_active') : '';
    return {
        title,
        body: pityHint ? `${body} ${pityHint}` : body,
        pityHint,
        triggered: record.triggered,
    };
}

export function formatCareerMarkBadge(
    mark: Readonly<CareerMarkRecord>,
    lookup: AcademyInheritTextLookup = IDENTITY_LOOKUP,
): string {
    const name = careerMarkDisplayName(mark.id, lookup);
    const discountPct = Math.round(careerMarkTpDiscount([mark], mark.id, 0) * 100);
    return `${name} ${mark.stars}★（TP −${discountPct}%）`;
}

/** 譜牒／武將資訊欄顯示持有印記與「遺傳採計最高 2 枚」標示 */
export function formatRosterCareerMarksLine(
    marks: readonly CareerMarkRecord[] | undefined,
    lookup: AcademyInheritTextLookup = IDENTITY_LOOKUP,
): string {
    if (!marks || marks.length === 0) return '';
    const top2 = topCareerMarksForBreeding(marks, 2);
    const labels = top2.map((m) => `${careerMarkDisplayName(m.id, lookup)} ${m.stars}★`);
    return textOf(lookup, 'ui.academy.mark.pedigree_hint', labels.join('、'));
}
