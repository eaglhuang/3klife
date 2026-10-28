import type {
    GeneralDetailCrestState,
    GeneralDetailDefaultTab,
    GeneralDetailStorySlot,
    GeneralStatsConfig,
    GeneralTalentRevealLevel,
} from '../../core/models/GeneralUnit';

type NurtureDualLayerStatRecord = Record<keyof GeneralStatsConfig, {
    talent: {
        base: number | null;
        current: number | null;
        maxPotential: number | null;
        revelationLevel: GeneralTalentRevealLevel;
    };
    prowess: number | null;
}>;

type NurtureProfilePresentation = {
    defaultTab: GeneralDetailDefaultTab;
    crestState: GeneralDetailCrestState;
    storyStripCells: Record<GeneralDetailStorySlot, string>;
};

type NurtureTrainingProfile = {
    sourceSessionId?: string;
    phaseBlock: string;
    mentorModeLabel: string;
    recommendedFocus: string[];
    graduationTags: string[];
};

type NurtureSessionInfo = {
    title: string;
    subtitle: string;
    turnLabel: string;
};

type NurtureSupportPlan = {
    title?: string;
    mentors: string[];
    lineageBoundary: string;
    supportSummary?: string;
};

type NurtureRiskPlan = {
    title?: string;
    pressureTags: string[];
    recoveryHint: string;
    concealExactYield?: boolean;
};

export interface NurtureSessionCanonicalContentState {
    sessionInfo: NurtureSessionInfo;
    dualLayerStats: NurtureDualLayerStatRecord;
    profilePresentation: NurtureProfilePresentation;
    trainingProfile: NurtureTrainingProfile;
    supportPlan: NurtureSupportPlan;
    riskPlan: NurtureRiskPlan;
}

export interface NurtureSessionContentState extends NurtureSessionCanonicalContentState {
    sessionTitle: string;
    sessionSubtitle: string;
    turnLabel: string;
    sessionSummary: string;
    phaseBlockTitle: string;
    phaseBlockBody: string;
    mentorModeLabel: string;
    mainCourseTitle: string;
    mainCourseBody: string;
    supportWindowTitle: string;
    supportWindowBody: string;
    riskWindowTitle: string;
    riskWindowBody: string;
    graduationTagsTitle: string;
    graduationTagsBody: string;
}

const STAT_KEYS: Array<keyof GeneralStatsConfig> = ['str', 'int', 'lea', 'pol', 'cha', 'luk'];

/** 文案鍵與 zh-TW 退回文字（語系表 ui.nurture.session.*） */
interface SessionTextEntry {
    key: string;
    fallback: string;
}

const STAT_LABEL_TEXT: Record<keyof GeneralStatsConfig, SessionTextEntry> = {
    str: { key: 'ui.nurture.session.stat.str', fallback: '武力' },
    int: { key: 'ui.nurture.session.stat.int', fallback: '智略' },
    lea: { key: 'ui.nurture.session.stat.lea', fallback: '統率' },
    pol: { key: 'ui.nurture.session.stat.pol', fallback: '政略' },
    cha: { key: 'ui.nurture.session.stat.cha', fallback: '魅力' },
    luk: { key: 'ui.nurture.session.stat.luk', fallback: '氣運' },
};

const PHASE_LABEL_TEXT: Record<string, SessionTextEntry> = {
    BEGIN: { key: 'ui.nurture.session.phase.begin', fallback: '前期啟蒙' },
    MID: { key: 'ui.nurture.session.phase.mid', fallback: '中盤磨合' },
    LATE: { key: 'ui.nurture.session.phase.late', fallback: '後期定型' },
    GRADUATION: { key: 'ui.nurture.session.phase.graduation', fallback: '畢業總結' },
};

/** 文案查詢：傳入語系鍵、zh-TW 退回模板與佔位參數；查不到鍵時用退回模板 */
export type SessionTextLookup = (key: string, fallback: string, ...args: string[]) => string;

/** 把 {0}、{1}… 佔位換成參數 */
export function fillSessionTemplate(template: string, args: readonly string[]): string {
    return template.replace(/\{(\d+)\}/g, (_match, index: string) => args[Number(index)] ?? '');
}

/** 沒有語系表時直接用 zh-TW 退回模板 */
export const fallbackSessionText: SessionTextLookup = (_key, fallback, ...args) => fillSessionTemplate(fallback, args);

export function normalizeNurtureSessionContentState(
    raw: Record<string, unknown>,
    t: SessionTextLookup = fallbackSessionText,
): NurtureSessionContentState {
    const canonical = buildCanonicalState(raw);
    return buildNurtureSessionContentState(canonical, t);
}

export function buildNurtureSessionContentState(
    canonical: NurtureSessionCanonicalContentState,
    t: SessionTextLookup = fallbackSessionText,
): NurtureSessionContentState {
    const phaseLabel = formatPhaseBlock(canonical.trainingProfile.phaseBlock, t);
    const revealSummary = buildRevealSummary(canonical.dualLayerStats, t);
    const focusSummary = buildFocusSummary(canonical.trainingProfile.recommendedFocus, t);
    const topStatsSummary = buildTopStatsSummary(canonical.dualLayerStats, t);
    const graduationTagsSummary = buildGraduationTagsSummary(canonical.trainingProfile.graduationTags, t);

    return {
        ...canonical,
        sessionTitle: canonical.sessionInfo.title,
        sessionSubtitle: canonical.sessionInfo.subtitle,
        turnLabel: canonical.sessionInfo.turnLabel,
        sessionSummary: t(
            'ui.nurture.session.summary',
            '本學年以{0}為主，{1}，並為{2}做準備。',
            phaseLabel,
            revealSummary,
            graduationTagsSummary,
        ),
        phaseBlockTitle: t('ui.nurture.session.phase_title', '學年階段：{0}', phaseLabel),
        phaseBlockBody: t('ui.nurture.session.phase_body', '本階段重點是{0}與隊伍磨合。{1}。', focusSummary, revealSummary),
        mentorModeLabel: t('ui.nurture.session.mentor_mode', '教官模式：{0}', canonical.trainingProfile.mentorModeLabel),
        mainCourseTitle: t('ui.nurture.session.main_title', '本回合主修'),
        mainCourseBody: t(
            'ui.nurture.session.main_body',
            '{0}，優先拉高{1}的穩定表現，暫不以畫面預告精確收益。',
            focusSummary,
            topStatsSummary,
        ),
        supportWindowTitle: canonical.supportPlan.title ?? t('ui.nurture.session.support_title', '支援窗口'),
        supportWindowBody: buildSupportWindowBody(canonical.supportPlan, t),
        riskWindowTitle: canonical.riskPlan.title ?? t('ui.nurture.session.risk_title', '風險提醒'),
        riskWindowBody: buildRiskWindowBody(canonical.riskPlan, t),
        graduationTagsTitle: t('ui.nurture.session.grad_title', '畢業標籤'),
        graduationTagsBody: t(
            'ui.nurture.session.grad_body',
            '候選標籤：{0}。正式標籤於畢業前後摘要帶顯示。',
            canonical.trainingProfile.graduationTags.join(' / '),
        ),
    };
}

function buildCanonicalState(raw: Record<string, unknown>): NurtureSessionCanonicalContentState {
    const typed = raw as Partial<NurtureSessionContentState>;
    return {
        sessionInfo: typed.sessionInfo ?? {
            title: typed.sessionTitle ?? '培育行程',
            subtitle: typed.sessionSubtitle ?? '第三學年 / 中盤磨合',
            turnLabel: typed.turnLabel ?? '第 13 回合',
        },
        dualLayerStats: normalizeDualLayerStats(typed.dualLayerStats),
        profilePresentation: typed.profilePresentation ?? {
            defaultTab: 'Overview',
            crestState: 'revealed',
            storyStripCells: {
                origin: '',
                faction: '',
                role: '',
                awakening: '',
                bloodline: '',
                future: '',
            },
        },
        trainingProfile: typed.trainingProfile ?? {
            sourceSessionId: undefined,
            phaseBlock: extractPhaseBlock(typed.phaseBlockTitle),
            mentorModeLabel: extractMentorModeLabel(typed.mentorModeLabel),
            recommendedFocus: extractRecommendedFocus(typed.mainCourseBody),
            graduationTags: extractGraduationTags(typed.graduationTagsBody),
        },
        supportPlan: typed.supportPlan ?? {
            title: typed.supportWindowTitle,
            mentors: ['黃月英教官'],
            lineageBoundary: '英靈傳道屬教學支援，不會轉回血脈親傳',
            supportSummary: typed.supportWindowBody,
        },
        riskPlan: typed.riskPlan ?? {
            title: typed.riskWindowTitle,
            pressureTags: ['高壓事件', '疲勞累積'],
            recoveryHint: '畫面只以戰術標籤與恢復提示呈現',
            concealExactYield: true,
        },
    };
}

function normalizeDualLayerStats(
    raw: Partial<NurtureDualLayerStatRecord> | undefined,
): NurtureDualLayerStatRecord {
    const entries = STAT_KEYS.map((key) => {
        const current = raw?.[key];
        const base = current?.talent?.base ?? null;
        return [
            key,
            {
                talent: {
                    base,
                    current: current?.talent?.current ?? base,
                    maxPotential: current?.talent?.maxPotential ?? base,
                    revelationLevel: current?.talent?.revelationLevel ?? (base === null ? 'HIDDEN' : 'RANGE'),
                },
                prowess: current?.prowess ?? null,
            },
        ] as const;
    });

    return Object.fromEntries(entries) as NurtureDualLayerStatRecord;
}

function buildRevealSummary(dualLayerStats: NurtureDualLayerStatRecord, t: SessionTextLookup): string {
    let exactCount = 0;
    let rangeCount = 0;
    let tendencyCount = 0;

    for (const key of STAT_KEYS) {
        const level = dualLayerStats[key].talent.revelationLevel;
        if (level === 'EXACT') {
            exactCount += 1;
        } else if (level === 'RANGE') {
            rangeCount += 1;
        } else if (level === 'TENDENCY') {
            tendencyCount += 1;
        }
    }

    if (exactCount >= 3) {
        return t('ui.nurture.session.reveal.exact', '目前已有多項屬性進入精確揭露，其餘欄位仍保留區間與傾向');
    }
    if (rangeCount >= 2) {
        return t('ui.nurture.session.reveal.range', '揭露規則以區間與標籤為主，不在中盤提前開精確值');
    }
    if (tendencyCount > 0) {
        return t('ui.nurture.session.reveal.tendency', '目前只公開傾向與訓練方向，不直接暴露完整數值');
    }
    return t('ui.nurture.session.reveal.sealed', '此階段仍以封存資訊為主，暫不公開精確值');
}

function buildFocusSummary(recommendedFocus: string[], t: SessionTextLookup): string {
    if (recommendedFocus.length === 0) {
        return t('ui.nurture.session.focus_default', '基礎磨課');
    }
    if (recommendedFocus.length === 1) {
        return recommendedFocus[0];
    }
    return t('ui.nurture.session.focus_join', '{0} + {1}', recommendedFocus[0], recommendedFocus[1]);
}

function buildTopStatsSummary(dualLayerStats: NurtureDualLayerStatRecord, t: SessionTextLookup): string {
    const ranked = STAT_KEYS
        .map((key) => ({
            key,
            score: dualLayerStats[key].prowess ?? dualLayerStats[key].talent.current ?? -1,
        }))
        .sort((left, right) => right.score - left.score)
        .filter((entry) => entry.score >= 0)
        .slice(0, 2)
        .map((entry) => statLabel(entry.key, t));

    return ranked.length > 0 ? ranked.join(' / ') : t('ui.nurture.session.top_stat_default', '主修軸');
}

function statLabel(key: keyof GeneralStatsConfig, t: SessionTextLookup): string {
    const entry = STAT_LABEL_TEXT[key];
    return t(entry.key, entry.fallback);
}

function buildSupportWindowBody(plan: NurtureSupportPlan, t: SessionTextLookup): string {
    const note = plan.supportSummary?.trim() || plan.lineageBoundary;
    if (plan.mentors.length === 0) {
        return t('ui.nurture.session.support_none', '本場未配置教官；{0}。', note);
    }
    return t('ui.nurture.session.support_body', '{0}提供訓練線加成；{1}。', plan.mentors.join(' / '), note);
}

function buildRiskWindowBody(plan: NurtureRiskPlan, t: SessionTextLookup): string {
    const pressure = plan.pressureTags.length > 0
        ? plan.pressureTags.join(' / ')
        : t('ui.nurture.session.pressure_default', '高壓事件');
    const conceal = plan.concealExactYield
        ? t('ui.nurture.session.risk_conceal', '，不提前洩露精確收益')
        : '';
    return t('ui.nurture.session.risk_body', '{0}可能疊加戰術壓力；{1}{2}。', pressure, plan.recoveryHint, conceal);
}

function buildGraduationTagsSummary(tags: string[], t: SessionTextLookup): string {
    if (tags.length === 0) {
        return t('ui.nurture.session.grad_title', '畢業標籤');
    }
    return tags.slice(0, 2).join(' / ');
}

function formatPhaseBlock(phaseBlock: string, t: SessionTextLookup): string {
    const entry = PHASE_LABEL_TEXT[phaseBlock];
    return entry ? t(entry.key, entry.fallback) : phaseBlock;
}

function extractPhaseBlock(value: string | undefined): string {
    if (!value) {
        return 'MID';
    }
    if (value.includes('前期')) return 'BEGIN';
    if (value.includes('後期')) return 'LATE';
    if (value.includes('畢業')) return 'GRADUATION';
    return 'MID';
}

function extractMentorModeLabel(value: string | undefined): string {
    if (!value) {
        return 'TeachingOnly';
    }
    return value.replace('教官模式：', '').trim() || 'TeachingOnly';
}

function extractRecommendedFocus(value: string | undefined): string[] {
    if (!value) {
        return ['校場操練', '沙盤推演'];
    }

    const hits = ['校場操練', '講武堂研經', '沙盤推演', '市集巡視', '名士清談']
        .filter((token) => value.includes(token));

    return hits.length > 0 ? hits.slice(0, 2) : ['校場操練', '沙盤推演'];
}

function extractGraduationTags(value: string | undefined): string[] {
    if (!value) {
        return ['守成', '教學線偏好'];
    }

    const rawTags = value
        .replace('候選標籤：', '')
        .replace('。正式標籤於畢業前後摘要帶顯示。', '')
        .split(/[\/／]/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);

    return rawTags.length > 0 ? rawTags : ['守成', '教學線偏好'];
}