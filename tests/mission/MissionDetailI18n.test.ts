// @spec-source → 內政任務詳情單屏重排規格書 doc_spec_1342；PROG-2-10161（任務詳情寫死中文標籤改走 i18n）
/**
 * MissionDetailI18n.test.ts
 *
 * 鎖住：
 *  1. 版面 JSON 的每個 label 都帶 textKey；程式與版面用到的 mission.detail.* 鍵在 zh-TW／zh-CN／en／ja 四語都有且佔位符一致。
 *  2. 英文語系下，presenter 組出的詳情 state（停用原因、情報提示、耗費不足、再探浮字、回報季）不含中文字。
 *  3. 繁中語系的譯文與程式內的繁中原文一致（沒有翻譯函式時畫面不變）。
 */
import { TestSuite, assert } from '../TestRunner';
import type { MissionDetailView, Revealable } from '../../assets/scripts/core/mission/MissionTypes';
import type { CandidateView, IMissionService, MissionCardView, MissionResult } from '../../assets/scripts/core/mission/service/IMissionService';
import { buildMissionDialogState, intelGainFloatText, MISSION_COST_SHORT_MARKER, returnSeasonText } from '../../assets/scripts/ui/mission/MissionDetailPresenter';
import { DETAIL_ACTION_BLOCKED_TEXT, detailActionBlockedText, type DetailActionDisabledReason, type MissionTr } from '../../assets/scripts/ui/core/HallDetailActionStates';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja'];
const readLocale = (lang: string): Record<string, string> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8'));
const placeholders = (text: string): string => (text.match(/\{\d+\}/g) ?? []).sort().join(',');
const CJK = /[㐀-鿿぀-ヺ]/; // 不含 U+30FB「・」（分隔符，各語系共用）

const translator = (lang: string): MissionTr => {
    const dict = readLocale(lang);
    return (key, ...args) => {
        const raw = dict[key];
        if (raw === undefined) return key;
        return raw.replace(/\{(\d+)\}/g, (_m, i: string) => String(args[Number(i)] ?? ''));
    };
};

/** 掃出程式與版面用到的 mission.detail.* 鍵（含動態拼出的牆別、難度） */
function usedKeys(): string[] {
    const keys = new Set<string>();
    const files = [
        'assets/scripts/ui/mission/MissionDetailPresenter.ts',
        'assets/scripts/ui/core/HallDetailActionStates.ts',
        'assets/scripts/ui/components/LobbyMissionDetailDialogComposite.ts',
    ];
    for (const f of files) {
        const src: string = fs.readFileSync(path.join(ROOT, f), 'utf8');
        for (const m of src.matchAll(/'(mission\.detail\.[A-Za-z_.]+)'/g)) keys.add(m[1]);
    }
    const layout = fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/lobby-mission-detail-dialog-main.json'), 'utf8');
    for (const m of layout.matchAll(/"textKey": "(mission\.detail\.[A-Za-z_.]+)"/g)) keys.add(m[1]);
    for (const w of ['Military', 'Domestic', 'Expedition']) keys.add(`mission.detail.wall.${w}`);
    for (const d of ['EASY', 'NORMAL', 'ELITE', 'ADVANCED', 'HELL']) keys.add(`mission.detail.difficulty.${d}`);
    for (const k of ['ui.mission.shortage.gold', 'ui.mission.shortage.silver', 'ui.hallMission.chain.tag']) keys.add(k);
    // 動態鍵前綴（'mission.detail.wall.' 之類）不是完整鍵，濾掉
    return [...keys].filter((k) => !k.endsWith('.'));
}

const ok = <T>(value: T): MissionResult<T> => ({ ok: true, value, revision: 1, ledger: [], events: [] });
const hint = (text: string): Revealable => ({ state: 'hint', text });

function detail(over: Partial<MissionDetailView> = {}): MissionDetailView {
    return {
        id: 'M1', defId: 'beacon-patrol', title: 'Beacon Patrol', brief: 'brief', theme: 'patrol', difficulty: 'NORMAL', intel: 35, intelBand: 'vague',
        facts: [{ key: 'a', label: 'Enemy', text: 'dozens', state: 'hint' }],
        objective: hint('Patrol'), hints: ['rumor'], rate: hint('Success rate: High'), risk: hint('Risk: Low'), riskTags: [], reward: hint('Tier: 2'),
        hiddenRewards: [], cost: { grain: 100, troops: 50, gold: 20, silver: 30, energy: 10 }, durationSeasons: 2, expireSeason: 3, status: 'OPEN',
        canRecon: true, canWait: true, ...over,
    };
}
const cand = (id: string, over: Partial<CandidateView> = {}): CandidateView =>
    ({ generalId: id, name: id, block: [], blockText: '', rate: hint('Success rate: Mid'), volunteer: false, memoryHint: '', ...over });
const card = (over: Partial<MissionCardView> = {}): MissionCardView => ({
    id: 'M1', defId: 'beacon-patrol', title: 'Beacon Patrol', theme: 'patrol', difficulty: 'NORMAL', intel: 35, intelBand: 'vague', status: 'OPEN',
    expireSeason: 3, rate: hint('Success rate: High'), reward: hint('Tier: 2'), ...over,
});
function fake(d: MissionDetailView, cands: CandidateView[], c: MissionCardView = card()): IMissionService {
    const never = (): never => { throw new Error('presenter 不該呼叫動作'); };
    return {
        getBoard: () => ok({ revision: 1, season: 1, missions: [c] }),
        getDetail: () => ok(d),
        getCandidates: () => ok(cands),
        getHistory: never, recon: never, wait: never, dispatch: never, advanceSeason: never, getSnapshot: never, loadSnapshot: never, onChanged: never,
    } as unknown as IMissionService;
}
const baseCtx = { season: 1, stock: { grain: 10, gold: 5, silver: 5, troops: 10 }, reconGrainCost: 50, reconCap: 90, hiddenRevealIntel: 100, intelBands: { vague: 30, clear: 60, full: 90 } };

/** 把 state 內所有字串欄位攤平，供「不含中文」檢查 */
function stringsOf(state: object): string[] {
    const out: string[] = [];
    for (const v of Object.values(state)) {
        if (typeof v === 'string') out.push(v);
        else if (v && typeof v === 'object') out.push(...Object.values(v as Record<string, unknown>).filter((x): x is string => typeof x === 'string'));
    }
    return out;
}

export function createMissionDetailI18nSuite(): TestSuite {
    const suite = new TestSuite('MissionDetailI18n (PROG-2-10161：任務詳情標籤改走 i18n 四語)');

    suite.test('版面 JSON：每個有文字的 label 都帶 textKey', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/lobby-mission-detail-dialog-main.json'), 'utf8'));
        const bad: string[] = [];
        const walk = (node: any): void => {
            if (!node || typeof node !== 'object') return;
            if (node.type === 'label' && typeof node.text === 'string' && CJK.test(node.text) && !node.textKey) bad.push(`${node.name}:${node.text}`);
            for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v);
        };
        walk(layout);
        assert.equals('', bad.join(', '), '含中文原文的 label 必須有 textKey');
    });

    suite.test('四語系鍵齊全、非空、佔位符與繁中一致', () => {
        const keys = usedKeys();
        assert.isTrue(keys.length >= 70, `鍵數量異常：${keys.length}`);
        const base = readLocale('zh-TW');
        for (const lang of LANGS) {
            const dict = readLocale(lang);
            for (const k of keys) {
                assert.isTrue(typeof dict[k] === 'string' && dict[k].length > 0, `${lang} 缺 ${k}`);
                assert.equals(placeholders(base[k]), placeholders(dict[k]), `${lang} ${k} 佔位符不一致`);
            }
        }
    });

    suite.test('英文語系：版面標籤與耗費不足標記不含中文，標記字出現在不足行', () => {
        const en = readLocale('en');
        for (const k of usedKeys().filter((x) => x.startsWith('mission.detail.ui.'))) assert.isFalse(CJK.test(en[k]), `${k} 還是中文`);
        for (const lang of LANGS) {
            const dict = readLocale(lang);
            const line = translator(lang)('mission.detail.cost_short', '100', '10');
            assert.isTrue(line.includes(dict['mission.detail.cost_short_marker']), `${lang} 不足行要含標記字`);
        }
        assert.equals('不足，現有', MISSION_COST_SHORT_MARKER);
    });

    suite.test('英文語系：詳情 state（情報不足＋糧草不足＋無武將）所有字串不含中文', () => {
        const tr = translator('en');
        const states = [
            buildMissionDialogState(fake(detail(), [cand('Zhao')]), 'M1', () => 'Military', { ...baseCtx, selectedGeneralId: 'Zhao', tr }),
            buildMissionDialogState(fake(detail(), []), 'M1', () => 'Domestic', { ...baseCtx, selectedGeneralId: null, tr }),
            buildMissionDialogState(fake(detail({ intel: 90, intelBand: 'full', canRecon: false, canWait: false }), [cand('Zhao', { volunteer: true })]), 'M1', () => 'Military', { ...baseCtx, selectedGeneralId: 'Zhao', tr }),
            buildMissionDialogState(fake(detail({ intel: 100, intelBand: 'full', status: 'ACTIVE' }), [cand('Zhao')], card({ returnSeason: 5, executorName: 'Zhao', chain: { depth: 2, total: 3 } } as Partial<MissionCardView>)), 'M1', () => 'Military', { ...baseCtx, selectedGeneralId: 'Zhao', tr }),
        ];
        for (const s of states) {
            assert.isTrue(s !== null);
            for (const text of stringsOf(s!)) assert.isFalse(CJK.test(text), `英文語系仍有中文：${text}`);
        }
        const low = states[0]!;
        assert.isTrue(low.intelHintLabel.startsWith('Intel 35%'), low.intelHintLabel);
        assert.isTrue(low.costFoodValueLabel.includes('Short, have 10'), low.costFoodValueLabel);
        assert.equals('Gold／Silver', low.costFundNameLabel);
        assert.isTrue((low.actionBlockedText.execute ?? '').startsWith('Insufficient Grain'));
        assert.isTrue(states[1]!.aiDelegateHintLabel.startsWith('No officer'));
        assert.isTrue((states[2]!.actionBlockedText['re-scout'] ?? '').includes('capped'));
        assert.isTrue(states[3]!.intelHintLabel.startsWith('Locked'), states[3]!.intelHintLabel);
        assert.isTrue(states[3]!.envScoutWeatherLine.includes('Year 2, Season 2'), states[3]!.envScoutWeatherLine);
    });

    suite.test('停用原因與再探浮字、回報季走翻譯', () => {
        const tr = translator('en');
        for (const reason of ['not-offered', 'full-intel', 'need-general'] as DetailActionDisabledReason[]) {
            assert.isFalse(CJK.test(detailActionBlockedText(reason, tr)));
            assert.equals(DETAIL_ACTION_BLOCKED_TEXT[reason], detailActionBlockedText(reason), '沒給翻譯函式沿用繁中');
        }
        assert.equals('Intel +25 → 78%', intelGainFloatText(25, 78, tr));
        assert.equals('情報 +25 → 78%', intelGainFloatText(25, 78));
        assert.equals('Report due Year 1, Season 2 (1 seasons left)', returnSeasonText(card({ returnSeason: 1 } as Partial<MissionCardView>), 0, tr));
    });

    suite.test('繁中譯文與程式內原文一致：有沒有翻譯函式，state 完全相同', () => {
        const svc = (): IMissionService => fake(detail({ rate: hint('成功率：高'), risk: hint('風險：低') }), [cand('A')]);
        const plain = buildMissionDialogState(svc(), 'M1', () => 'Military', { ...baseCtx, selectedGeneralId: 'A' });
        const zh = buildMissionDialogState(svc(), 'M1', () => 'Military', { ...baseCtx, selectedGeneralId: 'A', tr: translator('zh-TW') });
        assert.equals(JSON.stringify(plain), JSON.stringify(zh));
    });

    return suite;
}
