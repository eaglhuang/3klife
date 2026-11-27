// @spec-source → 內政任務詳情單屏重排規格書 doc_spec_1342；PROG-2-10166（服務層投影文字走 i18n 四語）
/**
 * MissionProjectionI18n.test.ts
 *
 * 鎖住：
 *  1. 全部任務定義的標題、簡介、事實、目標、提示在四語都有鍵、佔位符一致，zh-TW 與任務 JSON 原文同步。
 *  2. 投影層的 mission.proj.* 鍵四語齊全、佔位符一致。
 *  3. 英文語系下，投影出的成功率、風險、獎勵、事實、標題簡介不含中文；沒翻譯函式時維持繁中原文；
 *     服務回傳結構只增不減（text 欄位仍在）。
 *  4. 內容資料鍵命名與 tools_node/gen-mission-text-i18n.js 一致。
 */
import { TestSuite, assert } from '../TestRunner';
import { projectMission } from '../../assets/scripts/core/mission/MissionProjection';
import { missionTextKey } from '../../assets/scripts/core/mission/MissionTextKeys';
import { revealableText, resolveOne } from '../../assets/scripts/ui/mission/MissionProjectionText';
import type { MissionTr } from '../../assets/scripts/ui/core/HallDetailActionStates';
import { loadFixture, mkGeneral, mkInstance } from './missionTestKit';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja'];
const readLocale = (lang: string): Record<string, string> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8'));
const placeholders = (text: string): string => (text.match(/\{\d+\}/g) ?? []).sort().join(',');
const CJK = /[㐀-鿿぀-ヺ]/;
const translator = (lang: string): MissionTr => {
    const dict = readLocale(lang);
    return (key, ...args) => {
        const raw = dict[key];
        if (raw === undefined) return key;
        return raw.replace(/\{(\d+)\}/g, (_m, i: string) => String(args[Number(i)] ?? ''));
    };
};

/** 由任務 JSON 算出所有內容資料鍵 → 繁中原文（用 MissionTextKeys 的命名） */
function contentSource(): Record<string, string> {
    const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/mission-index.json'), 'utf8'));
    const out: Record<string, string> = {};
    for (const entry of idx.defs) {
        const def = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data', entry.path), 'utf8'));
        const id: string = def.id;
        out[missionTextKey.title(id)] = def.text.title;
        out[missionTextKey.brief(id)] = def.text.brief;
        for (const f of def.facts ?? []) {
            out[missionTextKey.factLabel(id, f.key)] = f.label;
            for (const lv of f.levels) out[missionTextKey.text(id, lv.text)] = lv.text;
            if (f.decoy) out[missionTextKey.text(id, f.decoy)] = f.decoy;
        }
        for (const b of def.branches ?? []) {
            out[missionTextKey.text(id, b.objective.text)] = b.objective.text;
            if (b.presented?.objectiveText) out[missionTextKey.text(id, b.presented.objectiveText)] = b.presented.objectiveText;
            (b.presented?.hints ?? []).forEach((h: string) => { out[missionTextKey.text(id, h)] = h; });
        }
    }
    return out;
}

const PROJ_KEYS = [
    'level.high', 'level.mid', 'level.low', 'res.grain', 'res.gold', 'res.silver', 'res.troops', 'res.generalExp', 'res.fame', 'res.officerExp',
    'rate.unknown', 'rate.vague', 'rate.range', 'risk.unknown', 'risk.level', 'risk.exact',
    'reward.blind', 'reward.blind_unknown', 'reward.tier', 'reward.full', 'reward.range', 'reward.none',
    'hidden.spawn', 'hidden.unlock', 'hidden.trait', 'sep',
].map((k) => `mission.proj.${k}`);

export function createMissionProjectionI18nSuite(): TestSuite {
    const suite = new TestSuite('MissionProjectionI18n (PROG-2-10166：服務層投影文字走 i18n 四語)');
    const beacon = loadFixture('beacon-patrol');
    const view = (intel: number, seed = 1) =>
        projectMission({ def: beacon, instance: mkInstance(beacon, 'ROUTINE', intel, 'V1'), saveSeed: seed, flags: {}, general: mkGeneral() });

    suite.test('任務內容資料：四語鍵齊全、非空、zh-TW 與任務 JSON 同步', () => {
        const source = contentSource();
        const keys = Object.keys(source);
        assert.isTrue(keys.length >= 700, `鍵數量異常：${keys.length}`);
        for (const k of keys) assert.isTrue(/^[A-Za-z0-9_.-]+$/.test(k), `鍵含非法字元：${k}`);
        const zh = readLocale('zh-TW');
        for (const k of keys) assert.equals(source[k], zh[k], `zh-TW ${k} 與任務 JSON 不同步（跑 node tools_node/gen-mission-text-i18n.js）`);
        for (const lang of ['zh-CN', 'en', 'ja']) {
            const dict = readLocale(lang);
            for (const k of keys) assert.isTrue(typeof dict[k] === 'string' && dict[k].trim().length > 0, `${lang} 缺 ${k}`);
        }
        const en = readLocale('en');
        for (const k of keys) assert.isFalse(CJK.test(en[k]), `en ${k} 仍有中文：${en[k]}`);
    });

    suite.test('投影鍵 mission.proj.*：四語齊全、佔位符與繁中一致', () => {
        const base = readLocale('zh-TW');
        for (const lang of LANGS) {
            const dict = readLocale(lang);
            for (const k of PROJ_KEYS) {
                assert.isTrue(typeof dict[k] === 'string' && dict[k].length > 0, `${lang} 缺 ${k}`);
                assert.equals(placeholders(base[k]), placeholders(dict[k]), `${lang} ${k} 佔位符不一致`);
            }
        }
        for (const k of PROJ_KEYS.filter((x) => !x.endsWith('.sep'))) assert.isFalse(CJK.test(readLocale('en')[k]), `en ${k} 仍有中文`);
    });

    suite.test('工具同步檢查通過（鍵命名與 gen-mission-text-i18n.js 一致）', () => {
        execFileSync(process.execPath, [path.join(ROOT, 'tools_node/gen-mission-text-i18n.js'), '--check'], { stdio: 'pipe' });
    });

    suite.test('英文語系：各情報層的成功率、風險、獎勵、事實、標題簡介、目標提示不含中文', () => {
        const tr = translator('en');
        for (const intel of [10, 35, 65, 95]) {
            for (const seed of [1, 2, 3]) {
                const v = view(intel, seed);
                const texts = [revealableText(v.rate, tr), revealableText(v.risk, tr), revealableText(v.reward, tr), revealableText(v.objective, tr),
                    resolveOne(v.titleRef, tr, v.title), resolveOne(v.briefRef, tr, v.brief),
                    ...v.facts.filter((f) => f.state !== 'hidden').flatMap((f) => [resolveOne(f.labelRef, tr, f.label), resolveOne(f.textRef, tr, f.text)]),
                    ...v.hints.map((h, i) => resolveOne(v.hintRefs?.[i], tr, h))];
                for (const t of texts) assert.isFalse(CJK.test(t), `intel ${intel} 英文仍有中文：${t}`);
            }
        }
        const vague = view(35);
        assert.equals(true, /^Success rate: (High|Medium|Low)$/.test(revealableText(vague.rate, tr)), revealableText(vague.rate, tr));
        assert.equals(true, /^Risk: (High|Medium|Low)$/.test(revealableText(vague.risk, tr)), revealableText(vague.risk, tr));
        assert.equals(true, /^about \d+–\d+%$/.test(revealableText(view(65).rate, tr)), revealableText(view(65).rate, tr));
        assert.equals(true, /^Disaster chance about \d+%$/.test(revealableText(view(95).risk, tr)), revealableText(view(95).risk, tr));
        assert.equals('Unknown', revealableText(view(10).rate, tr));
        assert.equals(true, revealableText(view(10).reward, tr).endsWith('?'), revealableText(view(10).reward, tr));
    });

    suite.test('日文／簡中：投影文字不殘留繁中專用字，日文走日文格式', () => {
        const ja = translator('ja');
        assert.equals(true, /^約\d+～\d+%$/.test(revealableText(view(65).rate, ja)), revealableText(view(65).rate, ja));
        assert.equals('不明', revealableText(view(10).rate, ja));
        const cn = translator('zh-CN');
        assert.equals(true, /^约 \d+～\d+%$/.test(revealableText(view(65).rate, cn)), revealableText(view(65).rate, cn));
    });

    suite.test('沒有翻譯函式或查不到鍵：維持繁中原文；回傳結構的 text 欄位不變', () => {
        for (const intel of [10, 35, 65, 95]) {
            const v = view(intel);
            assert.equals(v.rate.text, revealableText(v.rate, undefined));
            assert.equals(v.reward.text, revealableText(v.reward, undefined));
            assert.equals(v.title, resolveOne(v.titleRef, undefined, v.title));
            const none: MissionTr = (key) => key;
            assert.equals(v.risk.text, revealableText(v.risk, none));
            assert.equals(v.brief, resolveOne(v.briefRef, none, v.brief));
            // 繁中語系譯文與投影原文一致
            const zh = translator('zh-TW');
            assert.equals(v.rate.text, revealableText(v.rate, zh));
            assert.equals(v.risk.text, revealableText(v.risk, zh));
            assert.equals(v.reward.text, revealableText(v.reward, zh));
            assert.equals(v.title, resolveOne(v.titleRef, zh, v.title));
            for (const f of v.facts) assert.equals(f.text, resolveOne(f.textRef, zh, f.text));
        }
    });

    return suite;
}
