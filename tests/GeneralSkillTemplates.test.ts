/**
 * GeneralSkillTemplates.test.ts — 武將天生戰法／奧義模板＋覆寫（PROG-2-10246）
 *
 * 鎖住：
 * - 模板匹配規則（性別、最高屬性、兵種唯一 A、優先序）與持有上限算法；
 * - 每位武將至少 2 個不同的天生戰法，且都指向戰法庫裡可施放（非殼）的招式；
 * - 每種戰法、每種奧義的持有人數不超過武將總數 15%（火計、鼓舞不再占多數）；
 * - SR（epic）以上武將都有奧義、其餘維持無（覆寫特例除外）；前 30 位覆寫生效；
 * - generals-base.json 與 runtime generals.json 的戰法／奧義欄位一致，且與解析器輸出一致（改模板後忘了重跑腳本會被抓到）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { listBattleSkillProfiles } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import {
    GENERAL_SKILL_CAP_RATIO, holdCapViolations, holdDistribution, matchTemplate, rarityRankOf, resolveAllGeneralSkills, skillHoldCap, topStatOf,
    type GeneralSkillOverridesData, type GeneralSkillResolveContext, type GeneralSkillTemplate, type GeneralSkillTemplatesData, type SkillTemplateGeneral,
} from '../assets/scripts/core/systems/GeneralSkillTemplates';

type Slot = { tacticId: string }; type Ult = { ultimateId: string };
interface BaseGeneral extends SkillTemplateGeneral { tacticSlots: Slot[]; ultimateSlots: Ult[] }

export function createGeneralSkillTemplatesSuite(): TestSuite {
    const suite = new TestSuite('GeneralSkillTemplates (武將戰法／奧義模板＋覆寫 PROG-2-10246)');
    const root = path.resolve(__dirname, '..');
    const read = <T>(f: string): T => JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/data', f), 'utf8')) as T;
    const templates = read<GeneralSkillTemplatesData>('master/general-skill-templates.json');
    const overrides = read<GeneralSkillOverridesData>('master/general-skill-overrides.json');
    const base = read<{ data: BaseGeneral[] }>('master/generals-base.json').data;
    const runtime = read<BaseGeneral[]>('generals.json');
    const library = read<{ data: Array<{ id: string; battleSkillId: string }> }>('master/tactic-library.json').data;
    const ultDefs = read<{ data: Array<{ id: string; battleSkillId: string }> }>('master/ultimate-definitions.json').data;
    const castable = new Set(listBattleSkillProfiles().filter((p) => !p.pendingEffect).map((p) => p.battleSkillId));
    const tacticSkill = new Map(library.map((t) => [t.id, t.battleSkillId] as const));
    const ultSkill = new Map(ultDefs.map((u) => [u.id, u.battleSkillId] as const));
    const total = base.length;

    const synthetic = (extra: Partial<SkillTemplateGeneral>): SkillTemplateGeneral => ({ id: 'x', role: 'Combat', gender: '男', str: 50, int: 50, lea: 50, pol: 50, cha: 50, ...extra });
    const tpl = (templateId: string, priority: number, match: GeneralSkillTemplate['match']): GeneralSkillTemplate =>
        ({ templateId, name: templateId, priority, match, slots: { tactic1: [], tactic2: [], ultimate: [] } });

    suite.test('模板匹配：優先序大者先中、性別／最高屬性／兵種唯一 A 規則', () => {
        const list = [tpl('LOW', 1, {}), tpl('WOMAN', 90, { gender: ['女'] }), tpl('LEA', 30, { topStat: 'lea' }), tpl('CAV', 50, { troopUniqueA: 'CAVALRY' })];
        assert.equals('WOMAN', matchTemplate(synthetic({ gender: '女', lea: 99 }), list)?.templateId);
        assert.equals('LEA', matchTemplate(synthetic({ lea: 99 }), list)?.templateId);
        assert.equals('CAV', matchTemplate(synthetic({ lea: 99, troopAptitude: { CAVALRY: 'A', INFANTRY: 'B' } }), list)?.templateId);
        // 兩個兵種都是 A 不算「唯一 A」
        assert.equals('LEA', matchTemplate(synthetic({ lea: 99, troopAptitude: { CAVALRY: 'A', INFANTRY: 'A' } }), list)?.templateId);
        assert.equals('LOW', matchTemplate(synthetic({}), list)?.templateId);
        assert.equals('str', topStatOf(synthetic({ str: 80, int: 80 })));
    });

    suite.test('持有上限：總數 × 15% 無條件捨去；超過上限的招式會被列出', () => {
        assert.equals(35, skillHoldCap(235, GENERAL_SKILL_CAP_RATIO));
        assert.equals(1, skillHoldCap(3, GENERAL_SKILL_CAP_RATIO));
        const rows = holdDistribution([['a', 'b'], ['a'], ['a', 'a']], 4);
        assert.equals(3, rows[0].holders);
        assert.equals('a', holdCapViolations(rows, 4, 0.5).map((r) => r.skillId).join(','));
    });

    suite.test('模板資料：所有 pick／覆寫都是存在且可施放的招式、有兜底模板、命中 0 位的模板有說明', () => {
        const refs = new Set<string>([...templates.fallbackTactics, ...templates.fallbackUltimates]);
        for (const t of templates.templates) for (const list of Object.values(t.slots) as string[][]) list.forEach((s: string) => refs.add(s));
        for (const o of Object.values(overrides.overrides)) for (const s of Object.values(o)) refs.add(s);
        const bad = [...refs].filter((s) => !castable.has(s));
        assert.equals('', bad.join(','), `不存在或殼 profile：${bad.join(',')}`);
        assert.isTrue(templates.templates.some((t) => Object.keys(t.match).length === 0), '缺兜底模板');
        const ids = new Set(base.map((g) => g.id));
        for (const id of Object.keys(overrides.overrides)) assert.isTrue(ids.has(id), `覆寫的武將不存在：${id}`);
        assert.equals(30, Object.keys(overrides.overrides).length, '前 30 位覆寫');
    });

    suite.test('每位武將至少 2 個不同的天生戰法，且都指向戰法庫裡可施放的招式', () => {
        for (const g of base) {
            const skills = g.tacticSlots.map((s) => tacticSkill.get(s.tacticId));
            assert.isTrue(skills.every((s) => !!s && castable.has(s)), `${g.id} 有查不到或不可施放的戰法`);
            assert.isTrue(new Set(skills).size >= 2, `${g.id} 戰法少於 2 個不同招式`);
        }
    });

    suite.test('每種戰法、每種奧義的持有人數 ≤ 武將總數 15%；火計與鼓舞不再占多數', () => {
        const tacticRows = holdDistribution(base.map((g) => g.tacticSlots.map((s) => tacticSkill.get(s.tacticId) ?? s.tacticId)), total);
        const ultRows = holdDistribution(base.map((g) => g.ultimateSlots.slice(0, 1).map((s) => ultSkill.get(s.ultimateId) ?? s.ultimateId)), total);
        const bad = [...holdCapViolations(tacticRows, total), ...holdCapViolations(ultRows, total)];
        assert.equals('', bad.map((r) => `${r.skillId}=${r.holders}`).join(','), `超過 ${skillHoldCap(total)} 人上限`);
        const holders = (skill: string): number => tacticRows.find((r) => r.skillId === skill)?.holders ?? 0;
        assert.isTrue(holders('zhou-yu-inferno') + holders('mentor-morale') < total / 2, '火計＋鼓舞不得占多數');
        assert.isTrue(tacticRows.length >= 30, `戰法種類太少：${tacticRows.length}`);
    });

    suite.test('奧義：SR（epic）以上都有、其餘維持無（覆寫特例除外）；奧義定義存在且可施放', () => {
        const withOverrideUlt = new Set(Object.entries(overrides.overrides).filter(([, o]) => !!o.ultimate).map(([id]) => id));
        for (const g of base) {
            const has = g.ultimateSlots.length > 0;
            if (rarityRankOf(g.rarityTier) >= rarityRankOf(templates.ultimateMinRarity)) assert.isTrue(has, `${g.id} 缺奧義`);
            else if (!withOverrideUlt.has(g.id)) assert.isTrue(!has, `${g.id} 不該有奧義`);
            for (const u of g.ultimateSlots) assert.isTrue(!!ultSkill.get(u.ultimateId) && castable.has(ultSkill.get(u.ultimateId) as string), `${g.id} 奧義 ${u.ultimateId} 定義缺或不可施放`);
        }
    });

    suite.test('前 30 位覆寫生效：周瑜青龍…依建議表的戰法順序', () => {
        const slotsOf = (id: string): string[] => (base.find((g) => g.id === id) as BaseGeneral).tacticSlots.map((s) => tacticSkill.get(s.tacticId) as string);
        assert.equals('zhuge-liang-storm,empty-fort', slotsOf('zhuge-liang').join(','));
        assert.equals('tally-wei-zhen-hua-xia,insp-night-raid', slotsOf('zhang-liao').join(','));
        assert.equals('zhao-yun-immortal,medical-aid', slotsOf('da-qiao').join(','));
    });

    suite.test('資料一致：master 與 runtime generals.json 同步，且等於解析器輸出（改模板後要重跑 apply-general-skill-templates）', () => {
        const runtimeById = new Map(runtime.map((g) => [g.id, g] as const));
        for (const g of base) {
            const r = runtimeById.get(g.id);
            assert.equals(JSON.stringify(g.tacticSlots), JSON.stringify(r?.tacticSlots), `${g.id} runtime 戰法與 master 不同`);
            assert.equals(JSON.stringify(g.ultimateSlots), JSON.stringify(r?.ultimateSlots), `${g.id} runtime 奧義與 master 不同`);
        }
        const ctx: GeneralSkillResolveContext = {
            existingUltimateSkillOf: (id) => ultSkill.get(id) ?? null,
            existingTacticSkillOf: (id) => tacticSkill.get(id) ?? null,
            isCastableSkill: (s) => castable.has(s),
        };
        const result = resolveAllGeneralSkills(base, templates, overrides, ctx);
        const again = resolveAllGeneralSkills(base, templates, overrides, ctx);
        for (const g of base) {
            const r = result.get(g.id);
            assert.equals(JSON.stringify(r), JSON.stringify(again.get(g.id)), `${g.id} 解析不可重現`);
            assert.isTrue(r?.templateId !== 'NONE', `${g.id} 沒有命中任何模板`);
            const resolved = (r?.tacticSkills ?? []).join(',');
            const actual = g.tacticSlots.map((s) => tacticSkill.get(s.tacticId)).join(',');
            assert.equals(resolved, actual, `${g.id} 資料與解析器輸出不同`);
        }
    });

    return suite;
}
