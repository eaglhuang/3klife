/**
 * 戰場音訊三項（PROG-2-10134）：發聲池（同時發聲上限／優先級／每秒上限／降音量）、
 * 小兵出手音與受擊音依兵種／攻擊方式分檔、戰場 BGM 三段狀態機、設定檔與音檔存在性。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { SfxVoicePool, DEFAULT_SFX_VOICE_POOL, parseSfxVoicePoolConfig } from '../assets/scripts/battle/shared/SfxVoicePool';
import { BattleBgmController, DEFAULT_BATTLE_BGM, parseBattleBgmConfig, type BgmPort, type BgmPlayOptions } from '../assets/scripts/battle/shared/BattleBgm';
import {
    DEFAULT_BATTLE_AUDIO_LAYERS as CFG, createHitSfxState, parseBattleAudioLayersConfig, pickHitSfx, pickUnitAttackSfx,
} from '../assets/scripts/battle/shared/BattleAudioLayers';
import { ATTACK_SFX_KEY } from '../assets/scripts/battle/shared/AttackSfxMapping';

function fakeBgm(clips: string[]) {
    const calls: string[] = [];
    const timers: { fn: () => void; ms: number; cleared: boolean }[] = [];
    const port: BgmPort = {
        hasClip: (n) => clips.includes(n),
        crossfadeTo: (clip: string, o: BgmPlayOptions) => { calls.push(`xf:${clip}:${o.volume}:${o.loop ? 'loop' : 'once'}:${o.fadeSec}`); },
        fadeOut: (s) => { calls.push(`fadeOut:${s}`); },
        stop: () => { calls.push('stop'); },
    };
    const ctl = new BattleBgmController(port, {
        set: (fn, ms) => { const t = { fn, ms, cleared: false }; timers.push(t); return t; },
        clear: (h) => { (h as { cleared: boolean }).cleared = true; },
    }, () => DEFAULT_BATTLE_BGM);
    return { ctl, calls, timers };
}

export function createBattleAudioPoolSuite(): TestSuite {
    const suite = new TestSuite('BattleAudioPool (戰場音訊 PROG-2-10134)');

    suite.test('發聲池：同時發聲數不超過上限，槽到期後重用', () => {
        const pool = new SfxVoicePool({ ...DEFAULT_SFX_VOICE_POOL, perSecond: {} });
        let ok = 0;
        for (let i = 0; i < 20; i++) if (pool.acquire('hit', 'sfx_hit_blade', 1000).ok) ok++;
        assert.equals(8, ok, '同一時刻最多 8 聲');
        assert.equals(8, pool.peakVoices);
        assert.equals(12, pool.stats.hit.dropped);
        assert.isTrue(pool.acquire('hit', 'sfx_hit_blade', 1000 + 401).ok, '400ms 後槽釋放可再播');
    });

    suite.test('受擊優先於出手：出手不能佔用保留槽；槽滿時重擊搶走出手的槽', () => {
        const pool = new SfxVoicePool({ ...DEFAULT_SFX_VOICE_POOL, perSecond: {} });
        let atk = 0;
        for (let i = 0; i < 10; i++) if (pool.acquire('attack', 'sfx_atk_blade', 0).ok) atk++;
        assert.equals(5, atk, '8 槽留 3 給受擊，出手最多 5');
        assert.equals(5, pool.stats.attack.dropped);
        let hit = 0;
        for (let i = 0; i < 10; i++) if (pool.acquire('hit', 'sfx_hit_blade', 0).ok) hit++;
        assert.equals(3 + 5, hit, '輕擊先吃 3 個空槽，之後搶走 5 個出手槽（同級不搶）');
        assert.equals(5, pool.stats.hit.stolen);
        const heavy = pool.acquire('hit-heavy', 'sfx_hit_body_a', 0);
        assert.isTrue(heavy.ok && heavy.reason === 'stolen', '全是輕擊時重擊還能搶槽');
        const lowAgain = pool.acquire('attack', 'sfx_atk_blade', 0);
        assert.isFalse(lowAgain.ok);
    });

    suite.test('類別每秒上限：出手 5、受擊 7；1 秒後恢復', () => {
        const pool = new SfxVoicePool({ ...DEFAULT_SFX_VOICE_POOL, maxVoices: 64, attackReserve: 0 });
        let atk = 0, hit = 0;
        for (let i = 0; i < 40; i++) { if (pool.acquire('attack', 'a', i * 10).ok) atk++; if (pool.acquire('hit', 'h', i * 10).ok) hit++; }
        assert.equals(5, atk);
        assert.equals(7, hit);
        assert.isTrue(pool.acquire('attack', 'a', 1001).ok, '滿 1 秒後恢復');
    });

    suite.test('腳步與其他類別不佔發聲槽、不降音量；人多時新聲音自動降音量且不低於下限', () => {
        const pool = new SfxVoicePool({ ...DEFAULT_SFX_VOICE_POOL, perSecond: {} });
        for (let i = 0; i < 50; i++) assert.isTrue(pool.acquire('footstep', 'footstep', 0).ok);
        assert.equals(0, pool.activeVoices(0));
        const first = pool.acquire('hit', 'h', 0);
        assert.equals(1, first.volumeScale);
        let last = first;
        for (let i = 0; i < 7; i++) last = pool.acquire('hit', 'h', 0);
        assert.isTrue(last.volumeScale < 1 && last.volumeScale >= DEFAULT_SFX_VOICE_POOL.duck.minScale, 'volumeScale=' + last.volumeScale);
    });

    suite.test('發聲池設定解析：缺漏用預設、非法值忽略', () => {
        assert.equals(DEFAULT_SFX_VOICE_POOL.maxVoices, parseSfxVoicePoolConfig(null).maxVoices);
        const c = parseSfxVoicePoolConfig({ maxVoices: 4, perSecond: { attack: 2, hit: 'x' }, clipDurationMs: { foo: 300, bar: -1 } });
        assert.equals(4, c.maxVoices);
        assert.equals(2, c.perSecond.attack);
        assert.equals(DEFAULT_SFX_VOICE_POOL.perSecond.hit, c.perSecond.hit);
        assert.equals(300, c.clipDurationMs.foo);
        assert.isTrue(c.clipDurationMs.bar === undefined);
    });

    suite.test('小兵出手音：五個攻擊鍵各用不同音檔，弓兵輪播兩個且不連續重複，音量在範圍內且低於受擊', () => {
        const keys = Object.values(ATTACK_SFX_KEY);
        const firstClips = keys.map(k => pickUnitAttackSfx(k, CFG, () => 0)!.clip);
        assert.equals(5, new Set(firstClips).size, '五種攻擊方式五種聲音');
        const st = createHitSfxState();
        const seq: string[] = [];
        for (let i = 0; i < 6; i++) seq.push(pickUnitAttackSfx(ATTACK_SFX_KEY.bow, CFG, () => 0.4, st)!.clip);
        for (let i = 1; i < seq.length; i++) assert.isTrue(seq[i] !== seq[i - 1], '弓兵連續兩次不同檔');
        assert.equals(2, new Set(seq).size);
        for (const k of keys) {
            const v = pickUnitAttackSfx(k, CFG, () => 1)!.volume;
            assert.isTrue(v <= 0.65 && v < CFG.hit.tiers.light.volume[0] + 0.1, k);
        }
        assert.isTrue(pickUnitAttackSfx('unit-attack-unknown', CFG) === null, '沒設定回 null 讓呼叫端退回舊 cue');
    });

    suite.test('輕擊受擊音依攻擊方式分檔：刀／槍／箭／盾／騎各不同；未知方式退回輕擊池；重擊擋下池擴充', () => {
        const heads = ['slash', 'thrust', 'bow', 'shield', 'charge'].map(s => pickHitSfx('light', CFG, () => 0, undefined, s).clip);
        assert.equals(5, new Set(heads).size, heads.join(','));
        assert.equals('hit_light', pickHitSfx('light', CFG, () => 0, undefined, 'generic').clip);
        assert.equals('hit_light', pickHitSfx('light', CFG, () => 0).clip);
        assert.isTrue(CFG.hit.tiers.heavy.clips.length >= 3 && CFG.hit.tiers.block.clips.includes('sfx_hit_clash'));
        // 重擊／擋下層不受 attackStyle 影響
        assert.equals(pickHitSfx('heavy', CFG, () => 0, undefined, 'slash').clip, pickHitSfx('heavy', CFG, () => 0).clip);
    });

    suite.test('BGM：開戰段淡入→排程切緊張段→結果曲；離開戰場停止；缺檔不崩', () => {
        const { ctl, calls, timers } = fakeBgm(Object.values(DEFAULT_BATTLE_BGM.clips));
        ctl.startBattle();
        ctl.startBattle(); // 重複呼叫無效
        assert.equals(1, calls.length);
        assert.equals('xf:bgm_battle_start:0.32:once:1.2', calls[0]);
        assert.equals((DEFAULT_BATTLE_BGM.startLengthSec - DEFAULT_BATTLE_BGM.tenseLeadSec) * 1000, timers[0].ms);
        timers[0].fn();
        assert.equals('tense', ctl.phase);
        assert.equals('xf:bgm_battle_tense:0.22:loop:1.5', calls[1]);
        ctl.setResult('player-win');
        assert.equals('xf:bgm_battle_victory:0.4:once:1.5', calls[2]);
        ctl.setResult('enemy-win'); // 已有結果不重複切
        assert.equals(3, calls.length);
        ctl.stop(true);
        assert.equals('stop', calls[3]);
        assert.equals('idle', ctl.phase);

        const b = fakeBgm(Object.values(DEFAULT_BATTLE_BGM.clips));
        b.ctl.startBattle(); b.ctl.setResult('enemy-win');
        assert.equals('xf:bgm_battle_defeat:0.32:once:1.5', b.calls[1]);
        assert.isTrue(b.timers[0].cleared, '結果出來要取消待切緊張段的排程');

        const d = fakeBgm(Object.values(DEFAULT_BATTLE_BGM.clips));
        d.ctl.startBattle(); d.ctl.setResult('draw');
        assert.equals('fadeOut:1', d.calls[1]);

        const m = fakeBgm([]);
        m.ctl.startBattle();
        assert.equals(0, m.calls.length, '缺檔靜音略過');
        assert.equals('idle', m.ctl.phase);
    });

    suite.test('BGM：離開戰場淡出；未開始時 setResult／stop 無作用；BGM 音量遠低於音效', () => {
        const { ctl, calls } = fakeBgm(Object.values(DEFAULT_BATTLE_BGM.clips));
        ctl.setResult('player-win'); ctl.stop();
        assert.equals(0, calls.length);
        ctl.startBattle(); ctl.stop();
        assert.equals('fadeOut:1', calls[1]);
        const v = DEFAULT_BATTLE_BGM.volume;
        assert.isTrue(Math.max(v.start, v.tense, v.victory, v.defeat) <= 0.4 && v.tense <= 0.25, 'BGM 不蓋過音效');
        const c = parseBattleBgmConfig({ volume: { tense: 5 }, startLengthSec: 'x', clips: { start: 'abc' } });
        assert.equals(DEFAULT_BATTLE_BGM.volume.tense, c.volume.tense);
        assert.equals('abc', c.clips.start);
        assert.equals(DEFAULT_BATTLE_BGM.startLengthSec, c.startLengthSec);
    });

    suite.test('設定檔與音檔：battle-audio-layers.json 解析後與預設一致，所有引用的 clip 檔都存在（授權有登記）', () => {
        const root = path.resolve(__dirname, '..');
        const json = JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/data/battle-audio-layers.json'), 'utf8'));
        const cfg = parseBattleAudioLayersConfig(json);
        assert.equals(JSON.stringify(CFG.attack), JSON.stringify(cfg.attack));
        assert.equals(JSON.stringify(CFG.hit.byStyle), JSON.stringify(cfg.hit.byStyle));
        assert.equals(JSON.stringify(CFG.bgm), JSON.stringify(cfg.bgm));
        assert.equals(JSON.stringify(CFG.pool), JSON.stringify(cfg.pool));
        const dir = path.join(root, 'assets/bundles/audio/clips');
        const files = new Set(fs.readdirSync(dir).map(f => f.replace(/\.[^.]+$/, '')));
        const used = new Set<string>([...cfg.preload, ...Object.values(cfg.bgm.clips)]);
        for (const l of Object.values(cfg.attack.clips)) l.forEach(c => used.add(c));
        for (const s of Object.values(cfg.hit.byStyle)) s.clips.forEach(c => used.add(c));
        for (const s of Object.values(cfg.hit.tiers)) s.clips.forEach(c => used.add(c));
        for (const c of used) assert.isTrue(files.has(c), `缺音檔 ${c}`);
        const lic = fs.readFileSync(path.join(dir, 'LICENSES-cc0.md'), 'utf8');
        for (const c of used) if (c.startsWith('sfx_') || c.startsWith('bgm_')) assert.isTrue(lic.includes(c), `授權清單缺 ${c}`);
        const mf = fs.readFileSync(path.join(root, 'assets/bundles/audio/_MANIFEST.md'), 'utf8');
        for (const c of used) if (c.startsWith('sfx_') || c.startsWith('bgm_')) assert.isTrue(mf.includes(c), `_MANIFEST 缺 ${c}`);
    });

    return suite;
}
