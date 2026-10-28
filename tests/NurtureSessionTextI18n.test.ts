/**
 * NurtureSessionTextI18n.test.ts — 培育行程畫面（nurture-session-main）文案的語系鍵 headless 測試
 *
 * 鎖住：NurtureSessionMapper 與 NurtureFlowController 用到的 ui.nurture.session.* 鍵，
 * 四個語系表都有值；zh-TW 的值與程式內的退回模板一致（查不到鍵時畫面仍顯示 zh-TW 原文）。
 *
 * Unity 對照：像 Localization Table 的 key 檢查，確保每個 LocalizedString 在每種語言都有條目。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildNurtureSessionContentState,
    fillSessionTemplate,
    type NurtureSessionCanonicalContentState,
    type SessionTextLookup,
} from '../assets/scripts/ui/components/NurtureSessionMapper';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];

/** NurtureFlowController 組行程資料時自己用到的鍵（標題、副標、回合、退回文字與五個訓練格名稱） */
const CONTROLLER_KEYS = [
    'ui.nurture.session.title',
    'ui.nurture.session.subtitle',
    'ui.nurture.session.turn',
    'ui.nurture.session.lineage',
    'ui.nurture.session.recovery',
    'ui.nurture.session.grad_placeholder',
    'ui.nurture.session.focus.str',
    'ui.nurture.session.focus.int',
    'ui.nurture.session.focus.lea',
    'ui.nurture.session.focus.pol',
    'ui.nurture.session.focus.cha',
];

type Stats = NurtureSessionCanonicalContentState['dualLayerStats'];
type Level = Stats[keyof Stats]['talent']['revelationLevel'];
type StatKey = keyof Stats;

function readLocale(name: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${name}.json`), 'utf8')) as Record<string, string>;
}

function statsWith(levels: Partial<Record<StatKey, Level>>, prowess: number | null): Stats {
    const keys: StatKey[] = ['str', 'int', 'lea', 'pol', 'cha', 'luk'];
    const entries = keys.map((key) => {
        const level: Level = levels[key] ?? 'HIDDEN';
        const base = level === 'HIDDEN' ? null : 50;
        return [key, { talent: { base, current: base, maxPotential: base, revelationLevel: level }, prowess }];
    });
    return Object.fromEntries(entries) as Stats;
}

interface CanonicalInput {
    levels: Partial<Record<StatKey, Level>>;
    prowess: number | null;
    focus: string[];
    phase: string;
    mentors: string[];
    conceal: boolean;
    pressure: string[];
    tags: string[];
}

function canonical(input: CanonicalInput): NurtureSessionCanonicalContentState {
    return {
        sessionInfo: { title: 'T', subtitle: 'S', turnLabel: 'L' },
        dualLayerStats: statsWith(input.levels, input.prowess),
        profilePresentation: {
            defaultTab: 'Overview',
            crestState: 'revealed',
            storyStripCells: { origin: '', faction: '', role: '', awakening: '', bloodline: '', future: '' },
        },
        trainingProfile: {
            phaseBlock: input.phase,
            mentorModeLabel: 'TeachingOnly',
            recommendedFocus: input.focus,
            graduationTags: input.tags,
        },
        supportPlan: { mentors: input.mentors, lineageBoundary: '英靈傳道' },
        riskPlan: { pressureTags: input.pressure, recoveryHint: '恢復', concealExactYield: input.conceal },
    };
}

/** 四組資料刻意走遍所有分支：揭露四種、焦點 0/1/2 項、有無教官、有無壓力與畢業標籤、有無戰力 */
const VARIANTS: NurtureSessionCanonicalContentState[] = [
    canonical({ levels: { str: 'RANGE', int: 'RANGE', lea: 'RANGE', pol: 'RANGE', cha: 'RANGE' }, prowess: 60, focus: ['校場操練', '沙盤推演'], phase: 'BEGIN', mentors: ['甲'], conceal: true, pressure: ['懶惰'], tags: ['守成'] }),
    canonical({ levels: { str: 'EXACT', int: 'EXACT', lea: 'EXACT' }, prowess: 60, focus: ['校場操練'], phase: 'GRADUATION', mentors: [], conceal: false, pressure: [], tags: [] }),
    canonical({ levels: { str: 'TENDENCY' }, prowess: null, focus: [], phase: 'MID', mentors: ['乙'], conceal: true, pressure: [], tags: ['守成'] }),
    canonical({ levels: {}, prowess: null, focus: [], phase: 'LATE', mentors: [], conceal: false, pressure: [], tags: [] }),
];

/** 跑過所有分支，收集 (語系鍵 → zh-TW 退回模板) */
function collectKeys(): Map<string, string> {
    const seen = new Map<string, string>();
    const lookup: SessionTextLookup = (key, fallback, ...args) => {
        seen.set(key, fallback);
        return fillSessionTemplate(fallback, args);
    };
    for (const variant of VARIANTS) buildNurtureSessionContentState(variant, lookup);
    return seen;
}

export function createNurtureSessionTextI18nSuite(): TestSuite {
    const suite = new TestSuite('NurtureSessionTextI18n');

    suite.test('mapper 用到的語系鍵四語都有值，zh-TW 與程式內退回模板一致', () => {
        const seen = collectKeys();
        for (const locale of LOCALES) {
            const table = readLocale(locale);
            for (const key of seen.keys()) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺鍵 ${key}`);
            }
        }
        const zh = readLocale('zh-TW');
        for (const [key, fallback] of seen) {
            assert.equals(fallback, zh[key], `zh-TW ${key} 與退回模板不同`);
        }
    });

    suite.test('NurtureFlowController 自己用到的行程鍵四語都有值', () => {
        for (const locale of LOCALES) {
            const table = readLocale(locale);
            for (const key of CONTROLLER_KEYS) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺鍵 ${key}`);
            }
        }
    });

    suite.test('英文語系套用後整段不再出現中文文案（確認 lookup 真的生效）', () => {
        const en = readLocale('en');
        const lookup: SessionTextLookup = (key, fallback, ...args) => fillSessionTemplate(en[key] ?? fallback, args);
        const content = buildNurtureSessionContentState(VARIANTS[0], lookup);
        assert.isFalse(content.sessionSummary.includes('本學年'));
        assert.isTrue(content.sessionSummary.includes('school year'));
        assert.isTrue(content.mainCourseBody.includes('Strength'));
    });

    return suite;
}
