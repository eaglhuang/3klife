// @spec-source → Issue #2139（奧義漫畫分鏡 cut-in）；PROG-2-2250
/**
 * UltCutinCore.test.ts — cut-in 時間軸核心的 14 項測試（取自 spine-trial ult-cutin-core，改寫成 TestSuite）
 *
 * 涵蓋：趙雲範例設定（相位、縮放、閃白、文字、音效時間點）、震動可重現、點擊跳過、
 * 第二次施放的縮短重播（含只留部分格）、速度倍率、N=1／2／3／5 格、空分鏡、缺圖、暫停與恢復請求。
 * 核心是純邏輯，不依賴 cc；畫面層與戰場接線見 UltCutinSupport.test.ts。
 *
 * Unity 對照：像 PlayableDirector 的時間軸單元測試——不開場景，只檢查取樣出來的狀態。
 */
import * as fs from 'fs';
import * as path from 'path';
import {
    type CutinConfig,
    type CutinPanelConfig,
    type CutinPlayer,
    createCutinPlayer,
    fullDuration,
    resolvePlayablePanels,
    shakeOffset,
    validateConfig,
} from '../assets/scripts/shared/cutin/cutinCore';
import { TestSuite, assert } from './TestRunner';

/** 原測試用 node:assert 的 (actual, expected) 次序；這裡轉成 TestRunner 的 (expected, actual) */
const A = {
    equal<T>(actual: T, expected: T, msg?: string): void { assert.equals(expected, actual, msg); },
    notEqual<T>(actual: T, unexpected: T, msg?: string): void { assert.notEquals(unexpected, actual, msg); },
    deepEqual(actual: unknown, expected: unknown): void { assert.equals(JSON.stringify(expected), JSON.stringify(actual)); },
    ok(value: unknown, msg?: string): void { assert.isTrue(!!value, msg); },
    doesNotThrow(fn: () => unknown): void { assert.doesNotThrow(fn); },
};

const zhaoyun = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/ult-cutin/zhao_yun.json'), 'utf8'),
) as CutinConfig;

function panel(partial: Partial<CutinPanelConfig> & { imageKey: string; hold: number }): CutinPanelConfig {
  return {
    zoomFrom: 1,
    zoomTo: 1.05,
    zoomEase: "easeOut",
    transition: "cut",
    ...partial,
  };
}

function base(over: Partial<CutinConfig> & { panels: CutinPanelConfig[] }): CutinConfig {
  return {
    id: over.id ?? "test",
    generalId: over.generalId ?? "g",
    generalName: over.generalName ?? "測試",
    skillName: over.skillName ?? "試招",
    intro: over.intro ?? { duration: 0.2, dimTo: 0.5, letterboxIn: 0.1 },
    panels: over.panels,
    textOverlays: over.textOverlays,
    outro: over.outro ?? { duration: 0.2, flashFrames: 3, burstColor: [0.5, 0.7, 1] },
    sfx: over.sfx,
    voice: over.voice,
    speed: over.speed,
    replay: over.replay,
    referenceFps: over.referenceFps ?? 30,
    shakeSeed: over.shakeSeed ?? 1,
  };
}

function collectCues(player: CutinPlayer, times: number[]) {
  const sfx: string[] = [];
  const voice: string[] = [];
  for (const t of times) {
    const s = player.sample(t);
    sfx.push(...s.sfxCues);
    voice.push(...s.voiceCues);
  }
  return { sfx, voice };
}


export function createUltCutinCoreSuite(): TestSuite {
    const suite = new TestSuite('UltCutinCore (奧義漫畫分鏡時間軸核心 Issue #2139)');

    suite.test("zhaoyun config validates and full duration is 2.6s", () => {
      validateConfig(zhaoyun);
      A.equal(zhaoyun.panels.length, 3);
      A.equal(zhaoyun.panels[0].hold, 0.6);
      A.equal(zhaoyun.panels[1].hold, 0.5);
      A.equal(zhaoyun.panels[2].hold, 0.6);
      A.equal(zhaoyun.outro.duration, 0.5);
      A.equal(fullDuration(zhaoyun), 2.6);
    });

    suite.test("zhaoyun full playback hits expected phases, zoom, flash, text", () => {
      const pause: string[] = [];
      const player = createCutinPlayer(zhaoyun, {
        mode: "full",
        onPauseRequest: () => pause.push("pause"),
        onResumeRequest: () => pause.push("resume"),
        onEnd: () => pause.push("end"),
      });
      player.start();
      A.deepEqual(pause, ["pause"]);

      const intro = player.sample(0.1);
      A.equal(intro.phase, "intro");
      A.equal(intro.panelIndex, -1);
      A.ok(intro.dim > 0 && intro.dim < zhaoyun.intro.dimTo);
      A.equal(intro.letterbox, 0); // letterbox closes in last 0.2s of 0.4s intro

      const introEnd = player.sample(0.4);
      A.ok(introEnd.phase === "panel" || introEnd.letterbox > 0.9);
      if (introEnd.phase === "panel") A.equal(introEnd.panelIndex, 0);

      const p1 = player.sample(0.7); // 0.3s into panel 1
      A.equal(p1.phase, "panel");
      A.equal(p1.panelIndex, 0);
      A.equal(p1.imageKey, "ult_cutin/zhao_yun/01_charge");
      A.equal(p1.panelAlpha, 1);
      A.ok(p1.scale > 1.0 && p1.scale < 1.06);
      A.equal(p1.textAlpha, 0);
      A.equal(p1.flashAlpha, 0);

      const p2flash = player.sample(1.0);
      A.equal(p2flash.phase, "panel");
      A.equal(p2flash.panelIndex, 1);
      A.ok(p2flash.flashAlpha > 0.5, `flash ${p2flash.flashAlpha}`);
      A.ok(Math.abs(p2flash.shakeX) + Math.abs(p2flash.shakeY) > 0);

      const p2mid = player.sample(1.25);
      A.equal(p2mid.panelIndex, 1);
      A.equal(p2mid.flashAlpha, 0);
      A.ok(p2mid.scale < 1.13 && p2mid.scale >= 1.04);

      const p3early = player.sample(1.5);
      A.equal(p3early.panelIndex, 2);
      A.ok(p3early.flashAlpha > 0.5);
      A.equal(p3early.textAlpha, 0); // delay 0.1s

      const p3text = player.sample(1.8);
      A.equal(p3text.panelIndex, 2);
      A.equal(p3text.textAlpha, 1);
      A.equal(p3text.generalName, "趙雲");
      A.equal(p3text.skillName, "龍膽·破軍");

      const outro = player.sample(2.2);
      A.equal(outro.phase, "outro");
      A.ok(outro.burstProgress > 0);
      A.ok(outro.letterbox < 1);

      const done = player.sample(2.6);
      A.equal(done.phase, "ended");
      A.equal(done.ended, true);
      A.deepEqual(pause, ["pause", "resume", "end"]);

      // onEnd only once
      player.sample(3);
      A.deepEqual(pause, ["pause", "resume", "end"]);
    });

    suite.test("zhaoyun SFX and voice cues fire once at expected times", () => {
      const player = createCutinPlayer(zhaoyun);
      player.start();
      const steps = [];
      for (let i = 1; i <= 26; i++) steps.push(i * 0.1);
      const { sfx, voice } = collectCues(player, steps);
      A.deepEqual(sfx, ["whoosh", "hit", "hit_heavy", "roar", "boom"]);
      A.deepEqual(voice, ["voice.zhao_yun.ult"]);
    });

    suite.test("shake is deterministic for a given seed", () => {
      const a = shakeOffset(0, 6, 8, 30, 9, 1);
      const b = shakeOffset(0, 6, 8, 30, 9, 1);
      A.deepEqual(a, b);
      const c = shakeOffset(0, 6, 8, 30, 10, 1);
      A.ok(a.x !== c.x || a.y !== c.y);
      const p1 = createCutinPlayer(zhaoyun, { seed: 3 });
      const p2 = createCutinPlayer(zhaoyun, { seed: 3 });
      p1.start();
      p2.start();
      A.deepEqual(p1.sample(1.0).shakeX, p2.sample(1.0).shakeX);
    });

    suite.test("skip jumps to outro and does not fire later panel cues", () => {
      const player = createCutinPlayer(zhaoyun);
      player.start();
      player.sample(0.2);
      player.skip(0.2);
      const after = player.sample(0.2);
      A.equal(after.phase, "outro");
      A.equal(after.skipped, true);
      const more = collectCues(player, [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
      const sfx = [...after.sfxCues, ...more.sfx];
      A.ok(sfx.includes("boom"), `sfx=${sfx.join(",")}`);
      A.ok(!sfx.includes("hit"));
      A.ok(!sfx.includes("hit_heavy"));
      A.ok(!after.voiceCues.includes("voice.zhao_yun.ult"));
      const end = player.sample(0.2 + 0.5);
      A.equal(end.ended, true);
    });

    suite.test("replay mode compresses to about 0.8s and can keep a panel subset", () => {
      const player = createCutinPlayer(zhaoyun, { mode: "replay" });
      player.start();
      A.ok(Math.abs(player.duration - 0.8) < 1e-9, `duration ${player.duration}`);
      const mid = player.sample(0.3);
      // replay.panelIndices = [1, 2], so first playable panel is strike (source 1)
      if (mid.phase === "panel") {
        A.ok(mid.panelIndex === 1 || mid.panelIndex === 2, `panel ${mid.panelIndex}`);
        A.notEqual(mid.panelIndex, 0);
      }
      const end = player.sample(0.8);
      A.equal(end.ended, true);
      // Default replay.playVoice is false
      const p2 = createCutinPlayer(zhaoyun, { mode: "replay" });
      p2.start();
      const steps = [];
      for (let i = 1; i <= 16; i++) steps.push((i * 0.8) / 16);
      const { voice, sfx } = collectCues(p2, steps);
      A.deepEqual(voice, []);
      // dropped panel 0 whoosh; hit/roar/boom should still map
      A.ok(sfx.includes("hit"));
      A.ok(sfx.includes("boom"));
      A.ok(!sfx.includes("whoosh"));
    });

    suite.test("speed multiplier shortens full mode", () => {
      const cfg = { ...zhaoyun, speed: 2 };
      const player = createCutinPlayer(cfg);
      A.equal(player.duration, 1.3);
      A.equal(fullDuration(cfg), 1.3);
    });

    suite.test("N=1 voice cue and duration", () => {
      const cfg = base({
        panels: [panel({ imageKey: "a/01", hold: 0.4, transition: "fade", fadeIn: 0.1 })],
        textOverlays: [{ panelIndex: 0, delay: 0.05, fadeIn: 0.05 }],
        voice: { key: "voice.a", panelIndex: 0, offset: 0 },
      });
      const player = createCutinPlayer(cfg);
      player.start();
      A.ok(Math.abs(player.duration - 0.8) < 1e-9);
      const mid = player.sample(0.4);
      A.equal(mid.phase, "panel");
      A.equal(mid.panelCount, 1);
      const p = createCutinPlayer(cfg);
      p.start();
      const { voice } = collectCues(p, [0.15, 0.25, 0.4]);
      A.deepEqual(voice, ["voice.a"]);
    });

    suite.test("N=2 fade crossfade exposes previous panel", () => {
      const cfg = base({
        intro: { duration: 0, dimTo: 0.5 },
        panels: [
          panel({ imageKey: "b/01", hold: 0.3, transition: "cut" }),
          panel({ imageKey: "b/02", hold: 0.4, transition: "fade", fadeIn: 0.2, zoomFrom: 1.1, zoomTo: 1.0 }),
        ],
        outro: { duration: 0 },
        textOverlays: [{ panelIndex: 0, delay: 0, fadeIn: 0 }],
      });
      const player = createCutinPlayer(cfg);
      player.start();
      const xfade = player.sample(0.3 + 0.05);
      A.equal(xfade.panelIndex, 1);
      A.equal(xfade.prevPanelIndex, 0);
      A.equal(xfade.prevImageKey, "b/01");
      A.ok(xfade.panelAlpha > 0 && xfade.panelAlpha < 1);
      A.ok(xfade.prevPanelAlpha > 0);
      A.ok(Math.abs(xfade.panelAlpha + xfade.prevPanelAlpha - 1) < 1e-6);
      A.equal(xfade.textAlpha, 0); // text is on panel 0, already left
    });

    suite.test("N=3 default overlay lands on the last panel", () => {
      const cfg = base({
        intro: { duration: 0, dimTo: 0.4 },
        panels: [
          panel({ imageKey: "c/01", hold: 0.2 }),
          panel({ imageKey: "c/02", hold: 0.2 }),
          panel({ imageKey: "c/03", hold: 0.3, flashFrames: 0 }),
        ],
        outro: { duration: 0 },
      });
      const player = createCutinPlayer(cfg);
      player.start();
      const late = player.sample(0.2 + 0.2 + 0.2);
      A.equal(late.panelIndex, 2);
      A.ok(late.textAlpha > 0);
    });

    suite.test("N=5 plays all five and replay can keep a subset", () => {
      const panels = [1, 2, 3, 4, 5].map((n) =>
        panel({ imageKey: `d/0${n}`, hold: 0.2, sfx: [{ key: `s${n}`, offset: 0 }] }),
      );
      const cfg = base({
        intro: { duration: 0.1, dimTo: 0.5 },
        panels,
        outro: { duration: 0.1 },
        replay: { duration: 0.8, panelIndices: [0, 2, 4], playVoice: false },
        voice: { key: "voice.d", panelIndex: 2, offset: 0 },
      });
      const full = createCutinPlayer(cfg);
      full.start();
      A.equal(full.playablePanels.length, 5);
      A.ok(Math.abs(full.duration - (0.1 + 1.0 + 0.1)) < 1e-9);
      const seen = new Set<number>();
      for (let t = 0; t <= full.duration + 1e-6; t += 0.05) {
        const s = full.sample(t);
        if (s.phase === "panel") seen.add(s.panelIndex);
      }
      A.deepEqual([...seen].sort(), [0, 1, 2, 3, 4]);

      const replay = createCutinPlayer(cfg, { mode: "replay" });
      replay.start();
      A.equal(replay.playablePanels.length, 3);
      A.ok(Math.abs(replay.duration - 0.8) < 1e-9);
      const seenR = new Set<number>();
      const sfx: string[] = [];
      for (let t = 0; t <= 0.8 + 1e-6; t += 0.02) {
        const s = replay.sample(t);
        if (s.phase === "panel") seenR.add(s.panelIndex);
        sfx.push(...s.sfxCues);
      }
      A.deepEqual([...seenR].sort(), [0, 2, 4]);
      A.ok(sfx.includes("s1") && sfx.includes("s3") && sfx.includes("s5"));
      A.ok(!sfx.includes("s2") && !sfx.includes("s4"));
    });

    suite.test("empty panels skip the cut-in without throwing", () => {
      const cfg = base({ panels: [] });
      A.doesNotThrow(() => validateConfig(cfg));
      const events: string[] = [];
      const player = createCutinPlayer(cfg, {
        onPauseRequest: () => events.push("pause"),
        onResumeRequest: () => events.push("resume"),
        onEnd: () => events.push("end"),
      });
      A.equal(player.playable, false);
      player.start();
      const s = player.sample(0);
      A.equal(s.ended, true);
      A.equal(s.playable, false);
      A.equal(s.skipped, true);
      A.equal(s.panelCount, 0);
      A.deepEqual(events, ["end"]);
    });

    suite.test("missing images are dropped; all missing skips the cut-in", () => {
      const cfg = base({
        intro: { duration: 0.1, dimTo: 0.4 },
        panels: [
          panel({ imageKey: "ok/01", hold: 0.3 }),
          panel({ imageKey: "missing/02", hold: 0.3 }),
          panel({ imageKey: "ok/03", hold: 0.3 }),
        ],
        outro: { duration: 0.1 },
        textOverlays: [{ panelIndex: 2, delay: 0, fadeIn: 0 }],
      });
      const some = createCutinPlayer(cfg, { hasImage: (k) => k.startsWith("ok/") });
      some.start();
      A.equal(some.playable, true);
      A.equal(some.playablePanels.length, 2);
      const seen = new Set<number>();
      for (let t = 0; t <= some.duration; t += 0.05) {
        const s = some.sample(t);
        if (s.phase === "panel") seen.add(s.panelIndex);
      }
      A.deepEqual([...seen].sort(), [0, 2]);

      const events: string[] = [];
      const none = createCutinPlayer(cfg, {
        hasImage: () => false,
        onPauseRequest: () => events.push("pause"),
        onEnd: () => events.push("end"),
      });
      A.equal(none.playable, false);
      A.equal(resolvePlayablePanels(cfg, () => false).reason, "missing images");
      none.start();
      A.equal(none.sample(0).ended, true);
      A.deepEqual(events, ["end"]);
    });

    suite.test("pause and resume are requests only, emitted around a playable run", () => {
      const events: string[] = [];
      const cfg = base({
        intro: { duration: 0.05, dimTo: 0.3 },
        panels: [panel({ imageKey: "e/01", hold: 0.1 })],
        outro: { duration: 0.05 },
      });
      const player = createCutinPlayer(cfg, {
        onPauseRequest: () => events.push("pause"),
        onResumeRequest: () => events.push("resume"),
        onEnd: () => events.push("end"),
      });
      player.start();
      player.sample(cfg.intro.duration + 0.1 + 0.05);
      A.deepEqual(events, ["pause", "resume", "end"]);
    });

    return suite;
}
