/**
 * 戰法分組音效（PROG-2-10190）：七組特效各有對應音效鍵與 clip、發聲池 tactic 類別限制、音檔與授權存在性。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { TACTIC_VFX_GROUPS } from '../assets/scripts/battle/shared/TacticVfxGroups';
import { SfxVoicePool, DEFAULT_SFX_VOICE_POOL, parseSfxVoicePoolConfig } from '../assets/scripts/battle/shared/SfxVoicePool';
import { DEFAULT_BATTLE_AUDIO_LAYERS as CFG, createHitSfxState, parseBattleAudioLayersConfig, pickTacticSfx } from '../assets/scripts/battle/shared/BattleAudioLayers';

export function createTacticSfxSuite(): TestSuite {
    const suite = new TestSuite('TacticSfx (戰法分組音效 PROG-2-10190)');
    const root = path.resolve(__dirname, '..');
    const json = JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/data/battle-audio-layers.json'), 'utf8'));

    suite.test('七組特效每組都有音效 clip 與合法音量範圍（預設與 JSON 一致）', () => {
        const cfg = parseBattleAudioLayersConfig(json);
        for (const g of TACTIC_VFX_GROUPS) {
            for (const c of [CFG, cfg]) {
                const p = pickTacticSfx(g, c, () => 0.5);
                assert.isTrue(!!p, `${g} 沒有音效`);
                assert.equals(`tactic_${g}`, p!.clip, `${g} 對應 clip`);
                assert.isTrue(p!.volume > 0 && p!.volume <= 1, `${g} 音量 ${p!.volume}`);
            }
        }
        assert.isTrue(pickTacticSfx('unknown', CFG) === null, '未知組不播');
    });

    suite.test('多 clip 輪播不連續重複；音量落在範圍內', () => {
        const cfg = parseBattleAudioLayersConfig({ tactic: { clips: { fire: ['a', 'b'] }, volume: { fire: [0.2, 0.4] } } });
        const st = createHitSfxState();
        let last = '';
        for (let i = 0; i < 20; i++) {
            const p = pickTacticSfx('fire', cfg, Math.random, st)!;
            assert.isTrue(p.clip !== last, '連續重複');
            assert.isTrue(p.volume >= 0.2 && p.volume <= 0.4);
            last = p.clip;
        }
    });

    suite.test('發聲池：tactic 類別每秒上限、占槽、過期後恢復', () => {
        const pool = new SfxVoicePool(parseSfxVoicePoolConfig(json.pool));
        const cap = pool.getConfig().perSecond.tactic!;
        assert.equals(3, cap);
        let ok = 0;
        for (let i = 0; i < 10; i++) if (pool.acquire('tactic', 'tactic_fire', 1000 + i * 10).ok) ok++;
        assert.equals(cap, ok, '同一秒最多 3 聲');
        assert.equals(10 - cap, pool.stats.tactic.dropped);
        assert.equals(cap, pool.clipPlayed['tactic_fire']);
        assert.isTrue(pool.acquire('tactic', 'tactic_water', 2200).ok, '一秒後恢復');
    });

    suite.test('發聲池：槽滿時戰法聲（優先 2）可搶走出手聲（優先 1），搶不走受擊重擊', () => {
        const pool = new SfxVoicePool({ ...DEFAULT_SFX_VOICE_POOL, perSecond: {}, attackReserve: 0 });
        for (let i = 0; i < 8; i++) assert.isTrue(pool.acquire('attack', 'sfx_atk_blade', 0).ok);
        const r = pool.acquire('tactic', 'tactic_fire', 10);
        assert.isTrue(r.ok && r.reason === 'stolen');
        const full = new SfxVoicePool({ ...DEFAULT_SFX_VOICE_POOL, perSecond: {} });
        for (let i = 0; i < 8; i++) full.acquire('hit-heavy', 'sfx_hit_body_a', 0);
        assert.isFalse(full.acquire('tactic', 'tactic_fire', 10).ok);
    });

    suite.test('音檔、授權、清單：七個 clip 檔存在且在預載、授權清單與 _MANIFEST 有記錄', () => {
        const dir = path.join(root, 'assets/bundles/audio/clips');
        const lic = fs.readFileSync(path.join(dir, 'LICENSES-cc0.md'), 'utf8');
        const mf = fs.readFileSync(path.join(root, 'assets/bundles/audio/_MANIFEST.md'), 'utf8');
        for (const g of TACTIC_VFX_GROUPS) {
            const c = `tactic_${g}`;
            assert.isTrue(fs.existsSync(path.join(dir, `${c}.ogg`)), `缺音檔 ${c}`);
            assert.isTrue(fs.existsSync(path.join(dir, `${c}.ogg.meta`)), `缺 meta ${c}`);
            assert.isTrue(json.preload.includes(c), `預載缺 ${c}`);
            assert.isTrue(json.pool.clipDurationMs[c] > 0, `占槽時間缺 ${c}`);
            assert.isTrue(lic.includes(c), `授權清單缺 ${c}`);
            assert.isTrue(mf.includes(c), `_MANIFEST 缺 ${c}`);
        }
    });

    return suite;
}
