// PROG-2-9729：戰鬥音效分層（受擊輕重、分兵種腳步、隨機範圍、die／boom 錯開）的純邏輯測試
import * as fs from 'fs';
import * as path from 'path';
import { TroopType } from '../assets/scripts/shared/CommonEnums';
import {
    DEFAULT_BATTLE_AUDIO_LAYERS as CFG,
    DieBoomStagger,
    attackSfxDelaySec,
    createFootstepCapState,
    createHitSfxState,
    tryAcquireHitSfx,
    footstepClipFor,
    footstepDelayMs,
    jitterFootstepVolume,
    parseBattleAudioLayersConfig,
    pickHitSfx,
    resolveClipName,
    resolveHitTier,
    shouldPlayCritBoom,
    tryAcquireFootstep,
} from '../assets/scripts/battle/shared/BattleAudioLayers';
import { BATTLE_VISUAL_TIMING } from '../assets/scripts/battle/views/BattlePresentationTiming';
import { ATTACK_IMPACT_SEC } from '../assets/scripts/battle/shared/AttackShotStyle';
import { TestSuite, assert } from './TestRunner';

const PITCHED = { ...CFG, clipSource: 'pitched' as const };
const base = { damage: 5, maxHp: 100, isCrit: false, lethal: false, blocked: false, defenderType: TroopType.Infantry };

export function createBattleAudioLayersSuite(): TestSuite {
    const suite = new TestSuite('BattleAudioLayers');

    suite.test('受擊分層：致命＞擋下＞重擊＞盾兵擋＞輕擊', () => {
        assert.equals('light', resolveHitTier(base));
        assert.equals('heavy', resolveHitTier({ ...base, damage: 20 }));
        assert.equals('heavy', resolveHitTier({ ...base, isCrit: true }));
        assert.equals('block', resolveHitTier({ ...base, blocked: true }));
        assert.equals('block', resolveHitTier({ ...base, defenderType: TroopType.Shield }));
        assert.equals('heavy', resolveHitTier({ ...base, defenderType: TroopType.Shield, isCrit: true }));
        assert.equals('lethal', resolveHitTier({ ...base, lethal: true, isCrit: true, blocked: true }));
    });

    suite.test('四層選出的 clip 互不相同（至少 3 種以上不同的音）', () => {
        const clips = (['light', 'heavy', 'block', 'lethal'] as const).map(t => pickHitSfx(t, CFG, () => 0).clip);
        assert.isTrue(new Set(clips).size === 4, clips.join(','));
        // 輕擊有兩個 clip 可隨機
        assert.isTrue(pickHitSfx('light', CFG, () => 0).clip !== pickHitSfx('light', CFG, () => 0.99).clip);
    });

    suite.test('PROG-2-10021 輕擊池 4 檔，輪播不連續兩次相同（任何亂數序列）', () => {
        assert.isTrue(CFG.hit.tiers.light.clips.length >= 4);
        const st = createHitSfxState();
        let last = '';
        for (let i = 0; i < 400; i++) {
            const r = ((i * 37) % 101) / 100;
            const clip = pickHitSfx('light', CFG, () => r, st).clip;
            assert.isTrue(clip !== last, 'repeat at ' + i + ':' + clip);
            last = clip;
        }
        // 借音檔音量壓低
        const weapon = pickHitSfx('light', CFG, () => 0.5, createHitSfxState());
        assert.isTrue(weapon.volume <= 0.9);
    });

    suite.test('PROG-2-10021 輕擊節流：視窗內最多 2 聲，過視窗恢復；其他層不節流', () => {
        const st = createHitSfxState();
        assert.isTrue(tryAcquireHitSfx(st, 'light', 1000, CFG));
        assert.isTrue(tryAcquireHitSfx(st, 'light', 1010, CFG));
        assert.isFalse(tryAcquireHitSfx(st, 'light', 1020, CFG));
        assert.isTrue(tryAcquireHitSfx(st, 'light', 1100, CFG));
        for (let i = 0; i < 5; i++) assert.isTrue(tryAcquireHitSfx(st, 'heavy', 1100, CFG));
    });

    suite.test('PROG-2-10021 池為空或只有一檔不崩', () => {
        const empty = { ...CFG, hit: { ...CFG.hit, tiers: { ...CFG.hit.tiers, light: { clips: [], volume: [0.7, 0.9] as const } } } };
        assert.equals('', pickHitSfx('light', empty, () => 0.3, createHitSfxState()).clip);
        const one = { ...CFG, hit: { ...CFG.hit, tiers: { ...CFG.hit.tiers, light: { clips: ['hurt'], volume: [0.7, 0.9] as const } } } };
        const st = createHitSfxState();
        assert.equals('hurt', pickHitSfx('light', one, () => 0, st).clip);
        assert.equals('hurt', pickHitSfx('light', one, () => 0, st).clip);
        const parsed = parseBattleAudioLayersConfig({ hit: { tiers: { light: { clips: [] } } } });
        assert.isTrue(parsed.hit.tiers.light.clips.length >= 4);
    });

    suite.test('clipSource 開關：預設 cc0；cc0 把金屬擊打／肉體悶擊／單拍馬蹄換成 CC0 檔，pitched 回到變調代用版', () => {
        assert.equals('cc0', CFG.clipSource);
        assert.equals('cc0_hit_metal', pickHitSfx('block', CFG, () => 0).clip);
        assert.equals('cc0_hit_flesh', pickHitSfx('heavy', CFG, () => 0).clip);
        assert.equals('cc0_hoof_single', footstepClipFor(TroopType.Cavalry, CFG));
        assert.equals('hit_block', pickHitSfx('block', PITCHED, () => 0).clip);
        assert.equals('hit_heavy', pickHitSfx('heavy', PITCHED, () => 0).clip);
        assert.equals('footstep_hoof', footstepClipFor(TroopType.Cavalry, PITCHED));
        // 沒有對應的 clip 兩版都原樣（輕擊、致命、步兵腳步不受影響）
        for (const cfg of [CFG, PITCHED]) {
            assert.equals('hit_lethal', pickHitSfx('lethal', cfg, () => 0).clip);
            assert.equals('footstep', footstepClipFor(TroopType.Infantry, cfg));
            assert.equals('footstep_light', footstepClipFor(TroopType.Archer, cfg));
        }
        assert.equals('hit_light', resolveClipName('hit_light', CFG));
        assert.equals('cc0_hit_metal', resolveClipName('hit_block', CFG));
        assert.equals('hit_block', resolveClipName('hit_block', PITCHED));
    });

    suite.test('clipSource 設定解析：pitched 生效、亂值退回預設、替換表可覆寫、變調版檔案仍在', () => {
        assert.equals('pitched', parseBattleAudioLayersConfig({ clipSource: 'pitched' }).clipSource);
        assert.equals('cc0', parseBattleAudioLayersConfig({ clipSource: 'nope' }).clipSource);
        assert.equals('cc0', parseBattleAudioLayersConfig(null).clipSource);
        const o = parseBattleAudioLayersConfig({ cc0Clips: { hit_block: 'x_metal', bad: 3 } });
        assert.equals('x_metal', pickHitSfx('block', o, () => 0).clip);
        assert.equals('cc0_hoof_single', o.cc0Clips.footstep_hoof);
        const dir = path.resolve(__dirname, '..', 'assets/bundles/audio/clips');
        for (const n of ['hit_block.wav', 'hit_heavy.wav', 'footstep_hoof.wav', 'LICENSES-cc0.md']) assert.isTrue(fs.existsSync(path.join(dir, n)), n);
    });

    suite.test('受擊音量落在各層範圍內，且隨機值不同', () => {
        for (const t of ['light', 'heavy', 'block', 'lethal'] as const) {
            const sc = Object.values(CFG.hit.tiers[t].clipVolumeScale ?? {});
            const lo = CFG.hit.tiers[t].volume[0] * Math.min(1, ...sc);
            const hi = CFG.hit.tiers[t].volume[1];
            for (const r of [0, 0.3, 0.7, 1]) {
                const v = pickHitSfx(t, CFG, () => r).volume;
                assert.isTrue(v >= lo - 1e-9 && v <= hi + 1e-9, `${t} ${v}`);
            }
            assert.isTrue(pickHitSfx(t, CFG, () => 0.2).volume !== pickHitSfx(t, CFG, () => 0.21).volume);
        }
    });

    suite.test('JSON 與預設值一致，重擊門檻與視覺重擊同一個數字，clip 檔都存在', () => {
        const root = path.resolve(__dirname, '..');
        const raw = JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/data/battle-audio-layers.json'), 'utf8'));
        const parsed = parseBattleAudioLayersConfig(raw);
        assert.equals(JSON.stringify(CFG), JSON.stringify(parsed));
        assert.equals(BATTLE_VISUAL_TIMING.heavyHitMaxHpRatio, parsed.hit.heavyMaxHpRatio);
        const names = new Set<string>();
        Object.values(parsed.hit.tiers).forEach(s => s.clips.forEach(c => names.add(c)));
        Object.values(parsed.footstep.clips).forEach(c => names.add(c));
        // PROG-2-9732：CC0 版的替換檔也必須存在（兩版檔案都在，才能切換對照）
        Object.values(parsed.cc0Clips).forEach(c => names.add(c));
        const dir = path.join(root, 'assets/bundles/audio/clips');
        for (const n of names) {
            const ok = ['.mp3', '.wav', '.ogg'].some(ext => fs.existsSync(path.join(dir, n + ext)));
            assert.isTrue(ok, `缺音檔 ${n}`);
        }
    });

    suite.test('壞設定退回預設，不丟例外', () => {
        assert.equals(JSON.stringify(CFG), JSON.stringify(parseBattleAudioLayersConfig(null)));
        const bad = parseBattleAudioLayersConfig({ hit: { tiers: { light: { clips: [], volume: [1, 0.2] } } }, footstep: { intervalJitter: 9 } });
        assert.equals(JSON.stringify(CFG.hit.tiers.light), JSON.stringify(bad.hit.tiers.light));
        assert.equals(CFG.footstep.intervalJitter, bad.footstep.intervalJitter);
    });

    suite.test('腳步分兵種：騎兵馬蹄、盾兵重步、弓兵輕步、步兵原音、水軍無對應', () => {
        assert.equals('cc0_hoof_single', footstepClipFor(TroopType.Cavalry));
        assert.equals('footstep_hoof', footstepClipFor(TroopType.Cavalry, PITCHED));
        assert.equals('footstep_heavy', footstepClipFor(TroopType.Shield));
        assert.equals('footstep_light', footstepClipFor(TroopType.Archer));
        assert.equals('footstep', footstepClipFor(TroopType.Infantry));
        assert.equals(null, footstepClipFor(TroopType.Navy));
        assert.isTrue(new Set([TroopType.Cavalry, TroopType.Shield, TroopType.Archer, TroopType.Infantry].map(t => footstepClipFor(t))).size === 4);
    });

    suite.test('腳步音量隨機 0.8～1.0 倍、延遲在 ±20% 間隔內且不等距', () => {
        assert.isTrue(Math.abs(jitterFootstepVolume(0.5, CFG, () => 0) - 0.4) < 1e-9);
        assert.isTrue(Math.abs(jitterFootstepVolume(0.5, CFG, () => 1) - 0.5) < 1e-9);
        const maxDelay = 2 * CFG.footstep.intervalJitter * CFG.footstep.nominalIntervalMs;
        const delays = [0, 0.25, 0.5, 0.75, 1].map(r => footstepDelayMs(CFG, () => r));
        for (const d of delays) assert.isTrue(d >= 0 && d <= maxDelay + 1e-9, `${d}`);
        assert.isTrue(new Set(delays).size === 5);
        // 實際步距＝名目間隔＋相鄰兩次延遲差，不應等距
        const rnd = [0.1, 0.9, 0.4, 0.6, 0.2];
        const gaps: number[] = [];
        for (let i = 1; i < rnd.length; i++) gaps.push(CFG.footstep.nominalIntervalMs + footstepDelayMs(CFG, () => rnd[i]) - footstepDelayMs(CFG, () => rnd[i - 1]));
        assert.isTrue(new Set(gaps.map(g => Math.round(g))).size > 1, '步距不應等距');
    });

    suite.test('腳步總量上限：視窗內最多 maxPerWindow、每秒最多 maxPerSecond，不分兵種', () => {
        const st = createFootstepCapState();
        assert.isTrue(tryAcquireFootstep(st, 1000));
        assert.isTrue(tryAcquireFootstep(st, 1001));
        assert.isFalse(tryAcquireFootstep(st, 1002));
        assert.isFalse(tryAcquireFootstep(st, 1119));
        const st2 = createFootstepCapState();
        let played = 0;
        for (let t = 0; t < 1000; t += 10) if (tryAcquireFootstep(st2, 5000 + t)) played++;
        assert.isTrue(played <= CFG.footstep.maxPerSecond, `played=${played}`);
        assert.isTrue(played > 0);
        assert.isTrue(tryAcquireFootstep(st2, 6500));
    });

    suite.test('die 與 boom 不同幀：先到先播、後到延後 staggerMs；致命暴擊不疊 boom', () => {
        const s = new DieBoomStagger(80);
        assert.equals(0, s.delayFor('boom', 1000));
        assert.equals(78, s.delayFor('die', 1002));
        const s2 = new DieBoomStagger(80);
        assert.equals(0, s2.delayFor('die', 500));
        assert.equals(80, s2.delayFor('boom', 500));
        assert.equals(0, s2.delayFor('die', 2000));
        assert.isFalse(shouldPlayCritBoom(true));
        assert.isTrue(shouldPlayCritBoom(false));
    });

    suite.test('出手音到命中音的間隔：近戰縮到 0.18 秒內，弓箭與騎兵維持出手當下', () => {
        for (const style of ['thrust', 'shield', 'slash', 'generic'] as const) {
            const gap = ATTACK_IMPACT_SEC[style] - attackSfxDelaySec(ATTACK_IMPACT_SEC[style], style);
            assert.isTrue(gap <= 0.18 + 1e-9, `${style} gap=${gap}`);
            assert.isTrue(attackSfxDelaySec(ATTACK_IMPACT_SEC[style], style) >= 0);
        }
        assert.equals(0, attackSfxDelaySec(ATTACK_IMPACT_SEC.bow, 'bow'));
        assert.equals(0, attackSfxDelaySec(ATTACK_IMPACT_SEC.charge, 'charge'));
    });

    return suite;
}
