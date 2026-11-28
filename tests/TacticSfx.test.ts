/**
 * 戰法分組音效（PROG-2-10190）：七組特效各有對應音效鍵與 clip、發聲池 tactic 類別限制、音檔與授權存在性。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { TACTIC_VFX_GROUPS } from '../assets/scripts/battle/shared/TacticVfxGroups';
import { SfxVoicePool, DEFAULT_SFX_VOICE_POOL, parseSfxVoicePoolConfig } from '../assets/scripts/battle/shared/SfxVoicePool';
import { DEFAULT_BATTLE_AUDIO_LAYERS as CFG, createHitSfxState, parseBattleAudioLayersConfig, pickTacticLayers, pickTacticSfx } from '../assets/scripts/battle/shared/BattleAudioLayers';

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

    suite.test('疊層設定解析：JSON 與預設一致；壞格式略過；空陣列可關閉疊層', () => {
        const cfg = parseBattleAudioLayersConfig(json);
        for (const c of [CFG, cfg]) {
            const w = c.tactic.layers.water[0];
            assert.isTrue(w.clips.includes('tactic_splash_a') && w.clips.includes('tactic_splash_b'));
            assert.equals(3, w.count[0]); assert.equals(5, w.count[1]);
            assert.isTrue(c.tactic.layers.heal[0].clips.includes('tactic_heal_sparkle'));
            assert.equals(undefined, c.tactic.layers.fire, '其他組不疊層');
        }
        const bad = parseBattleAudioLayersConfig({ tactic: { layers: { water: [{ clips: [] }, 'x'], heal: [], fire: [{ clips: ['a'] }] } } });
        assert.equals(0, bad.tactic.layers.water.length, '無 clip 的疊層略過');
        assert.equals(0, bad.tactic.layers.heal.length, '空陣列關閉疊層');
        assert.equals(1, bad.tactic.layers.fire.length);
        assert.equals(1, bad.tactic.layers.fire[0].count[0], '缺 count 預設 1 聲');
        assert.equals(0, pickTacticLayers('haste', CFG).length, '沒設定的組回空陣列');
    });

    suite.test('疊層排程：水淹 3～5 聲水花、回復 2～3 聲閃光；偏移在範圍內、依序、相鄰間隔 ≥90ms', () => {
        for (let i = 0; i < 200; i++) {
            const w = pickTacticLayers('water', CFG);
            assert.isTrue(w.length >= 3 && w.length <= 5, `水花 ${w.length} 聲`);
            for (let k = 0; k < w.length; k++) {
                assert.isTrue(w[k].delayMs >= 120, '偏移下限');
                assert.isTrue(w[k].volume >= 0.5 && w[k].volume <= 0.75, '音量範圍');
                assert.isTrue(w[k].clip === 'tactic_splash_a' || w[k].clip === 'tactic_splash_b');
                if (k > 0) assert.isTrue(w[k].delayMs - w[k - 1].delayMs >= 89, '相鄰至少 90ms（避開閘門同 clip 合併）');
            }
            const h = pickTacticLayers('heal', CFG);
            assert.isTrue(h.length >= 2 && h.length <= 3, `閃光 ${h.length} 聲`);
        }
        // 固定亂數：rand=0 取最小聲數與最小偏移，rand=0.999 取最大聲數
        assert.equals(3, pickTacticLayers('water', CFG, () => 0).length);
        assert.equals(5, pickTacticLayers('water', CFG, () => 0.999).length);
    });

    suite.test('疊層音檔與授權：新增 clip 存在、有 meta、在預載與占槽表、授權清單與 _MANIFEST 有記錄，新增素材總量 < 1MB', () => {
        const dir = path.join(root, 'assets/bundles/audio/clips');
        const lic = fs.readFileSync(path.join(dir, 'LICENSES-cc0.md'), 'utf8');
        const mf = fs.readFileSync(path.join(root, 'assets/bundles/audio/_MANIFEST.md'), 'utf8');
        let bytes = 0;
        for (const c of ['tactic_heal', 'tactic_heal_sparkle', 'tactic_water', 'tactic_splash_a', 'tactic_splash_b']) {
            const f = path.join(dir, `${c}.ogg`);
            assert.isTrue(fs.existsSync(f) && fs.existsSync(`${f}.meta`), `缺 ${c}`);
            bytes += fs.statSync(f).size;
            assert.isTrue(json.preload.includes(c), `預載缺 ${c}`);
            assert.isTrue(json.pool.clipDurationMs[c] > 0, `占槽時間缺 ${c}`);
            assert.isTrue(lic.includes(c) && mf.includes(c), `記載缺 ${c}`);
        }
        assert.isTrue(bytes < 1024 * 1024, `五檔共 ${bytes} bytes`);
    });

    return suite;
}
