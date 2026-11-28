/**
 * GeneralSkillVfxCoverage.test.ts — 武將技能特效覆蓋（PROG-2-10236）
 *
 * 鎖住：
 * - 每個可施放（非殼）的戰法／專屬技都有專屬特效分組（第一批 7 組＋第二批 13 組），不再落到通用光效；
 * - 第二批每組都有配方（前搖動機＋命中動機＝前搖→主體→命中三段）、主色與全部 20 組互不相同、粒子與時間在手機預算內；
 * - 招式對照表只指向存在且可施放的招式，不蓋掉第一批的歸類；
 * - 每組都有音效（沿用既有音檔、音檔存在、不擴充發聲池）；
 * - 有奧義定義的武將都有專屬奧義特效（battle_ult_<代號>）：前搖→主體→命中至少三層、每層都有 prefab、層數不超過 5。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { listBattleSkillProfiles, resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import {
    TACTIC_VFX_ALL_GROUPS, TACTIC_VFX_BUDGET, TACTIC_VFX_EXTRA_GROUPS, TACTIC_VFX_GROUPS, TACTIC_VFX_RECIPES,
    extraTacticRecipeOf, tacticHitTotalSec, tacticVfxGroupOf,
} from '../assets/scripts/battle/shared/TacticVfxGroups';
import { EXTRA_TACTIC_SFX_CLIPS, TACTIC_VFX_SKILL_GROUP } from '../assets/scripts/battle/shared/TacticVfxExtraGroups';
import { DEFAULT_BATTLE_AUDIO_LAYERS, parseBattleAudioLayersConfig, pickTacticSfx } from '../assets/scripts/battle/shared/BattleAudioLayers';
import { VFX_BLOCK_REGISTRY } from '../assets/scripts/core/config/vfx-block-registry';
import { ultimateEffectKeyOf } from '../assets/scripts/battle/views/BattleFlowVfx';

type Layer = { blockId?: string; delay?: number; duration?: number };
type Effect = Layer & { blocks?: Layer[]; audio?: string; lifetime?: number };

export function createGeneralSkillVfxCoverageSuite(): TestSuite {
    const suite = new TestSuite('GeneralSkillVfxCoverage (武將技能特效覆蓋 PROG-2-10236)');
    const root = path.resolve(__dirname, '..');
    const data = (f: string) => JSON.parse(fs.readFileSync(path.join(root, 'assets/resources', f), 'utf8'));
    const registry = new Map(VFX_BLOCK_REGISTRY.map((b) => [b.id, b] as const));

    suite.test('每個可施放的戰法／專屬技都有專屬特效分組（殼 profile 除外）', () => {
        const missing: string[] = [];
        let castable = 0;
        for (const p of listBattleSkillProfiles()) {
            if (p.pendingEffect) continue;
            castable++;
            if (!tacticVfxGroupOf(p.battleSkillId)) missing.push(p.battleSkillId);
        }
        assert.isTrue(castable >= 40, `可施放招式數異常：${castable}`);
        assert.equals('', missing.join(','), `落到通用光效的招式：${missing.join(',')}`);
    });

    suite.test('20 組配方：第二批有前搖＋命中動機、主色互不相同、時間與粒子在預算內', () => {
        assert.equals(13, TACTIC_VFX_EXTRA_GROUPS.length);
        assert.equals(20, TACTIC_VFX_ALL_GROUPS.length);
        const seen = new Set<string>();
        for (const group of TACTIC_VFX_ALL_GROUPS) {
            const recipe = TACTIC_VFX_RECIPES[group];
            assert.isTrue(!!recipe, `${group} 缺配方`);
            assert.isTrue(recipe.particlesPerCell > 0 && recipe.windupParticles > 0, `${group} 粒子數必須為正`);
            assert.isTrue(recipe.particlesPerCell <= TACTIC_VFX_BUDGET.maxParticles / 4, `${group} 單格粒子過多`);
            assert.isTrue(tacticHitTotalSec(group) <= TACTIC_VFX_BUDGET.maxTotalSec + 1e-9, `${group} 命中＋餘韻超過上限`);
            seen.add(recipe.main.join(','));
        }
        assert.equals(20, seen.size, '20 組主色必須互不相同');
        for (const group of TACTIC_VFX_EXTRA_GROUPS) {
            const extra = extraTacticRecipeOf(group);
            assert.isTrue(!!extra && !!extra.windup && !!extra.hit, `${group} 缺前搖或命中動機`);
        }
        for (const group of TACTIC_VFX_GROUPS) assert.equals(null, extraTacticRecipeOf(group), `${group} 是第一批，不該有動機`);
    });

    suite.test('招式對照表只指向存在且可施放的招式，且不與第一批歸類重複', () => {
        const ids = Object.keys(TACTIC_VFX_SKILL_GROUP);
        assert.isTrue(ids.length >= 30, `第二批招式數 ${ids.length}`);
        const used = new Set<string>();
        for (const id of ids) {
            const profile = resolveBattleSkillProfile(id);
            assert.isTrue(!!profile, `${id} 沒有 profile`);
            assert.isFalse(!!profile!.pendingEffect, `${id} 是殼 profile，不該列入`);
            assert.isTrue(TACTIC_VFX_EXTRA_GROUPS.includes(TACTIC_VFX_SKILL_GROUP[id]), `${id} 對到未知分組`);
            assert.equals(TACTIC_VFX_SKILL_GROUP[id], tacticVfxGroupOf(id), `${id} 被第一批規則搶走，表內項目失效`);
            used.add(TACTIC_VFX_SKILL_GROUP[id]);
        }
        assert.equals(13, used.size, '每個第二批分組至少要有一個招式使用');
    });

    suite.test('第二批每組有音效：預設與 JSON 一致、音檔存在、不擴充發聲池', () => {
        const json = data('data/battle-audio-layers.json');
        const cfg = parseBattleAudioLayersConfig(json);
        const clipsDir = path.join(root, 'assets/bundles/audio/clips');
        const files = new Set(fs.readdirSync(clipsDir).filter((f) => !f.endsWith('.meta')).map((f) => f.replace(/\.[^.]+$/, '')));
        for (const group of TACTIC_VFX_EXTRA_GROUPS) {
            for (const c of [DEFAULT_BATTLE_AUDIO_LAYERS, cfg]) {
                const picked = pickTacticSfx(group, c, () => 0.5);
                assert.isTrue(!!picked, `${group} 沒有音效`);
                assert.isTrue(picked!.volume > 0 && picked!.volume <= 1, `${group} 音量 ${picked!.volume}`);
            }
            for (const clip of EXTRA_TACTIC_SFX_CLIPS[group]) {
                assert.isTrue(files.has(clip), `${group} 的音檔 ${clip} 不存在`);
                assert.isTrue(json.tactic.clips[group].includes(clip), `${group} 的 JSON 缺 ${clip}`);
            }
        }
        assert.equals(8, json.pool.maxVoices, '發聲池同時上限不可變');
        assert.equals(3, json.pool.perSecond.tactic, '戰法每秒上限不可變');
    });

    suite.test('有奧義定義的武將都有專屬奧義特效：前搖→主體→命中三段、積木有 prefab、層數 ≤ 5、有音效', () => {
        const defs = data('data/master/ultimate-definitions.json');
        const list: Array<{ id: string }> = defs.data ?? defs;
        const generals = new Set<string>();
        for (const d of list) {
            const m = /^ult-(.+)-\d+$/.exec(d.id);
            if (m) generals.add(m[1]);
        }
        assert.isTrue(generals.size >= 18, `奧義武將數 ${generals.size}`);
        const effects = data('data/vfx-effects.json').effects as Record<string, Effect>;
        for (const g of generals) {
            const key = ultimateEffectKeyOf(g);
            const e = effects[key];
            assert.isTrue(!!e, `${g} 缺專屬奧義特效 ${key}`);
            const layers = e.blocks ?? [];
            assert.isTrue(layers.length >= 3 && layers.length <= 5, `${key} 層數 ${layers.length}（需 3～5）`);
            assert.equals(0, layers[0].delay ?? 0, `${key} 前搖必須從 0 秒開始`);
            for (let i = 1; i < layers.length; i++) assert.isTrue((layers[i].delay ?? 0) > (layers[i - 1].delay ?? 0), `${key} 各層延遲必須遞增`);
            assert.isTrue((layers[layers.length - 1].delay ?? 0) >= 0.3, `${key} 命中層太早出現`);
            assert.isTrue(!!e.audio, `${key} 缺音效`);
            assert.isTrue((e.lifetime ?? 0) > 0 && (e.lifetime ?? 0) <= 2, `${key} lifetime 不合理`);
            for (const layer of layers) assert.isTrue(!!registry.get(layer.blockId ?? '')?.prefabPath, `${key} 的 ${layer.blockId} 沒有 prefabPath`);
        }
    });

    return suite;
}
