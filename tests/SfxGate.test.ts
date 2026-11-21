/**
 * SfxGate — 統一音效節流閘門（PROG-2-9441）
 *
 * 覆蓋：
 * 1. AudioSystem.playSfx／playSfxWithCooldown 一律先問閘門，閘門說不播就不出聲。
 * 2. 沒裝閘門時維持內建 50ms 防重複。
 * 3. 戰場閘門 battleSfxGate 套用共用 SfxThrottle：特效同一毫秒兩聲 boom 只播一聲。
 * 4. 防回歸：除了 AudioSystem 本身，程式裡不可再直接呼叫 playOneShot（繞過閘門的唯一路徑），只減不增，基準 0。
 *
 * Unity 對照：所有 PlayOneShot 都包在 AudioManager 裡，再用 EditMode 測試掃描禁止散落的 AudioSource.PlayOneShot。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { AudioSystem } from '../assets/scripts/core/systems/AudioSystem';
import { AudioClip, AudioSource } from 'cc';
import { battleSfxGate, battleSfxThrottle } from '../assets/scripts/battle/shared/BattleAudio';
import { DEFAULT_SFX_THROTTLE } from '../assets/scripts/battle/shared/SfxThrottle';

/** 造一個已就緒、有 boom／hurt 兩個 clip 的 AudioSystem，回傳實際出聲的紀錄。 */
function makeAudio(): { audio: AudioSystem; played: string[] } {
    const audio = new AudioSystem();
    const played: string[] = [];
    const src = new AudioSource();
    src.playOneShot = (clip: AudioClip) => { played.push(clip.name); };
    const internals = audio as unknown as { sfxSource: AudioSource; clipCache: Map<string, AudioClip> };
    internals.sfxSource = src;
    ['boom', 'hurt'].forEach(n => { const c = new AudioClip(); c.name = n; internals.clipCache.set(n, c); });
    return { audio, played };
}

/** 掃 assets/scripts 底下的 .ts，回傳非註解行裡出現 playOneShot( 的位置。 */
function findDirectPlayOneShot(root: string): string[] {
    const hits: string[] = [];
    const walk = (dir: string) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) { walk(p); continue; }
            if (!ent.name.endsWith('.ts')) continue;
            const rel = path.relative(root, p).split(path.sep).join('/');
            if (rel === 'core/systems/AudioSystem.ts') continue;
            fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach((line, i) => {
                const t = line.trim();
                if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
                if (/playOneShot\s*\(/.test(line)) hits.push(`${rel}:${i + 1}`);
            });
        }
    };
    walk(root);
    return hits;
}

export function createSfxGateSuite(): TestSuite {
    const suite = new TestSuite('SfxGate (統一音效節流閘門 PROG-2-9441)');

    suite.test('playSfx 先問閘門：閘門擋下就不出聲，放行才播', () => {
        const { audio, played } = makeAudio();
        const asked: string[] = [];
        audio.setSfxGate(clip => { asked.push(clip); return clip !== 'boom'; });
        audio.playSfx('boom');
        audio.playSfx('hurt');
        assert.equals('boom,hurt', asked.join(','));
        assert.equals('hurt', played.join(','));
    });

    suite.test('playSfxWithCooldown 也經過閘門', () => {
        const { audio, played } = makeAudio();
        audio.setSfxGate(() => false);
        audio.playSfxWithCooldown('boom', 1, 300);
        assert.equals(0, played.length);
        audio.setSfxGate(null);
        audio.playSfxWithCooldown('boom', 1, 300);
        assert.equals('boom', played.join(','));
    });

    suite.test('沒裝閘門：同名 50ms 內不重複（內建保護不變）', () => {
        const { audio, played } = makeAudio();
        audio.playSfx('boom');
        audio.playSfx('boom');
        assert.equals(1, played.length);
        assert.equals(null, audio.getSfxGate());
    });

    suite.test('戰場閘門：特效同一毫秒兩聲 boom 只播一聲，不同音效照播', () => {
        battleSfxThrottle.setConfig({ ...DEFAULT_SFX_THROTTLE });
        battleSfxThrottle.reset();
        const { audio, played } = makeAudio();
        audio.setSfxGate(battleSfxGate);
        audio.playSfx('boom');
        audio.playSfx('boom');
        audio.playSfx('hurt');
        assert.equals('boom,hurt', played.join(','));
        battleSfxThrottle.reset();
    });

    suite.test('防回歸：AudioSystem 以外不可直接呼叫 playOneShot（基準 0，只減不增）', () => {
        const root = path.resolve(__dirname, '../assets/scripts');
        const hits = findDirectPlayOneShot(root);
        assert.equals(0, hits.length, `請改走 services().audio.playSfx（會經過統一節流閘門）：${hits.join(', ')}`);
    });

    return suite;
}
