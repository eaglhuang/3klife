/**
 * Generic manga cut-in timeline core.
 * Pure TypeScript: no Cocos, no DOM, unit-testable in Node.
 *
 * The host (e.g. a Cocos 3.x adapter) maps `sample()` onto sprites, labels,
 * letterbox graphics and AudioSource, and is responsible for pausing the
 * battle when this player emits pause/resume *requests*.
 */

export type TransitionType = "cut" | "fade" | "flash";
export type ZoomEase = "linear" | "easeInOut" | "easeOut" | "punch";
export type PlaybackMode = "full" | "replay";
export type Rgb = readonly [number, number, number];

export interface PanelCue {
  /** SFX or voice key understood by the host audio table. */
  key: string;
  /** Seconds after this panel starts, in speed=1 full time. Scaled in replay. */
  offset?: number;
}

export interface CutinPanelConfig {
  imageKey: string;
  /** Hold duration in seconds at speed=1. */
  hold: number;
  zoomFrom: number;
  zoomTo: number;
  zoomEase?: ZoomEase;
  /** Shake amplitude in pixels (design space, e.g. 1280x720). */
  shakeAmp?: number;
  /** Shake length in frames at `referenceFps`. */
  shakeFrames?: number;
  /** Flash overlay length in frames at `referenceFps`. Independent of `transition`. */
  flashFrames?: number;
  flashColor?: Rgb;
  flashPeak?: number;
  /** How this panel replaces the previous one. Default "cut". */
  transition?: TransitionType;
  /** Fade-in (and crossfade) length in seconds when `transition` is "fade". */
  fadeIn?: number;
  /** Optional SFX cues local to this panel. */
  sfx?: PanelCue[];
  /** Optional voice (配音) cue local to this panel. */
  voice?: PanelCue;
}

export interface CutinTextOverlay {
  /** Panel index in the *configured* `panels` array (before replay filtering). */
  panelIndex: number;
  /** Seconds after that panel starts (speed=1) before the text begins to appear. */
  delay?: number;
  fadeIn?: number;
  generalName?: string;
  skillName?: string;
}

export interface TimelineCue {
  key: string;
  /**
   * Absolute time in the full, speed=1 timeline (intro + all configured panels + outro).
   * Remapped when speed ≠ 1 or in replay; dropped if it falls inside a panel that replay skipped.
   */
  time: number;
}

export interface CutinVoiceLine {
  /** Per-general voice-line key, e.g. "voice.zhao_yun.ult". */
  key: string;
  /** Absolute time in the full speed=1 timeline. Optional if `panelIndex` is set. */
  time?: number;
  panelIndex?: number;
  /** Offset from that panel's start (speed=1). Default 0. */
  offset?: number;
}

export interface CutinReplayOptions {
  /** Target length in seconds. Default 0.8. */
  duration?: number;
  /**
   * If set, only these configured panel indices (in this order) play during replay.
   * Intro and outro still play, compressed into the same budget.
   */
  panelIndices?: number[];
  /** Whether to emit voice cues in replay. Default false, to keep the 0.8s cut short. */
  playVoice?: boolean;
}

export interface CutinConfig {
  id: string;
  generalId: string;
  generalName: string;
  skillName: string;
  intro: {
    duration: number;
    /** Battlefield dim amount at the end of intro, 0..1 (1 = fully black). */
    dimTo: number;
    /** Letterbox close duration; defaults to the full intro. */
    letterboxIn?: number;
  };
  /** One or more panels. Not limited to 3. N >= 1 to play; N === 0 skips the cut-in. */
  panels: CutinPanelConfig[];
  /**
   * Name / skill-name overlays. Each may attach to any panel index.
   * If omitted, a single overlay is shown on the last playable panel,
   * starting after that panel's flash (or 0.1s).
   */
  textOverlays?: CutinTextOverlay[];
  outro: {
    duration: number;
    flashFrames?: number;
    flashColor?: Rgb;
    burstColor?: Rgb;
    /** Letterbox open duration; defaults to the full outro. */
    letterboxOut?: number;
  };
  /** Global SFX on the full speed=1 timeline. */
  sfx?: TimelineCue[];
  /** Optional default voice line for this general (separate from SFX). */
  voice?: CutinVoiceLine;
  /** Speed multiplier for full mode. 2 = twice as fast. Default 1. */
  speed?: number;
  replay?: CutinReplayOptions;
  /** Max letterbox size as a fraction of design height. Default 44/720. */
  letterboxMax?: number;
  referenceFps?: number;
  shakeSeed?: number;
}

export type CutinPhase = "intro" | "panel" | "outro" | "ended";
export type CueKind = "sfx" | "voice";

export interface FiredCue {
  kind: CueKind;
  key: string;
}

export interface CutinSample {
  t: number;
  duration: number;
  phase: CutinPhase;
  mode: PlaybackMode;
  panelIndex: number;
  panelCount: number;
  imageKey: string | null;
  panelAlpha: number;
  prevPanelIndex: number;
  prevImageKey: string | null;
  prevPanelAlpha: number;
  dim: number;
  scale: number;
  shakeX: number;
  shakeY: number;
  flashAlpha: number;
  flashColor: Rgb;
  letterbox: number;
  textAlpha: number;
  generalName: string;
  skillName: string;
  burstAlpha: number;
  burstProgress: number;
  burstColor: Rgb;
  /** SFX + voice fired since the previous `sample()` / `tick()` call. */
  cues: FiredCue[];
  sfxCues: string[];
  voiceCues: string[];
  ended: boolean;
  skipped: boolean;
  playable: boolean;
}

export interface CutinPlayerOptions {
  mode?: PlaybackMode;
  seed?: number;
  onEnd?: () => void;
  /** Request only — this core never pauses the battle itself. */
  onPauseRequest?: () => void;
  onResumeRequest?: () => void;
  /**
   * If provided, panels whose image is missing are dropped.
   * If none remain, the cut-in is skipped (no throw, `onEnd` on `start()`).
   */
  hasImage?: (imageKey: string) => boolean;
}

interface Stage {
  phase: "intro" | "panel" | "outro";
  /** Index in the *playable* panel list, or -1. */
  playIndex: number;
  /** Index in the original config.panels array, or -1. */
  sourceIndex: number;
  start: number;
  duration: number;
  panel?: CutinPanelConfig;
  /** Scale from speed=1 seconds to playhead seconds for this stage. */
  timeScale: number;
}

interface ScheduledCue {
  kind: CueKind;
  key: string;
  time: number;
}

const WHITE: Rgb = [1, 1, 1];
const DEFAULT_FPS = 30;
const DEFAULT_LETTERBOX = 44 / 720;
const DEFAULT_REPLAY = 0.8;
const MIN_FLASH_S = 2 / DEFAULT_FPS;

export function easeLinear(t: number): number {
  return clamp01(t);
}

export function easeInOut(t: number): number {
  t = clamp01(t);
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function easeOut(t: number): number {
  t = clamp01(t);
  return 1 - (1 - t) ** 2;
}

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function applyEase(kind: ZoomEase | undefined, t: number): number {
  switch (kind) {
    case "easeInOut":
      return easeInOut(t);
    case "easeOut":
    case "punch":
      return easeOut(t);
    default:
      return easeLinear(t);
  }
}

function flashAlphaAt(local: number, frames: number, fps: number, peak: number, scale: number): number {
  if (frames <= 0) return 0;
  const raw = frames / fps;
  const dur = Math.max(Math.min(raw, MIN_FLASH_S), raw * scale);
  if (local < 0 || local >= dur) return 0;
  return peak * (1 - local / dur) ** 0.7;
}

/** Seeded, decaying camera shake. Frame index is deterministic for a given local time. */
export function shakeOffset(
  local: number,
  frames: number,
  amp: number,
  fps: number,
  seed: number,
  scale: number,
): { x: number; y: number } {
  if (frames <= 0 || amp === 0) return { x: 0, y: 0 };
  const raw = frames / fps;
  const dur = Math.max(Math.min(raw, MIN_FLASH_S), raw * scale);
  if (local < 0 || local >= dur) return { x: 0, y: 0 };
  const i = Math.floor(local * fps);
  const n = Math.max(1, Math.round(dur * fps));
  if (i >= n) return { x: 0, y: 0 };
  const decay = (1 - i / n) ** 1.15;
  const x = amp * decay * Math.sin(i * 2.3 + seed) * (i % 2 === 0 ? 1 : -0.85);
  const y = amp * 0.65 * decay * Math.cos(i * 1.7 + seed * 1.4);
  return { x, y };
}

export interface Playability {
  playable: boolean;
  reason?: string;
  /** Panels that will actually play (missing images removed). */
  panels: CutinPanelConfig[];
  /** Original indices of those panels. */
  sourceIndices: number[];
}

export function resolvePlayablePanels(
  config: CutinConfig,
  hasImage?: (imageKey: string) => boolean,
  replayIndices?: number[],
): Playability {
  const all = config.panels ?? [];
  const sourceIndices: number[] = [];
  const panels: CutinPanelConfig[] = [];
  const wanted = replayIndices && replayIndices.length > 0 ? new Set(replayIndices) : null;

  for (let i = 0; i < all.length; i++) {
    if (wanted && !wanted.has(i)) continue;
    const p = all[i];
    if (!p || !p.imageKey || typeof p.hold !== "number" || p.hold < 0) continue;
    if (hasImage && !hasImage(p.imageKey)) continue;
    panels.push(p);
    sourceIndices.push(i);
  }

  // Preserve caller-specified replay order.
  if (wanted && replayIndices) {
    const bySource = new Map(sourceIndices.map((s, k) => [s, panels[k]]));
    const orderedPanels: CutinPanelConfig[] = [];
    const orderedIdx: number[] = [];
    for (const i of replayIndices) {
      const panel = bySource.get(i);
      if (panel) {
        orderedPanels.push(panel);
        orderedIdx.push(i);
      }
    }
    if (orderedPanels.length === 0) {
      return { playable: false, reason: "no playable panels", panels: [], sourceIndices: [] };
    }
    return { playable: true, panels: orderedPanels, sourceIndices: orderedIdx };
  }

  if (panels.length === 0) {
    const reason = all.length === 0 ? "empty panels" : "missing images";
    return { playable: false, reason, panels: [], sourceIndices: [] };
  }
  return { playable: true, panels, sourceIndices };
}

export function validateConfig(config: CutinConfig): void {
  if (!config) throw new Error("cutin config is required");
  if (!config.id) throw new Error("cutin config.id is required");
  if (!config.intro || !(config.intro.duration >= 0)) throw new Error("cutin intro.duration must be >= 0");
  if (!config.outro || !(config.outro.duration >= 0)) throw new Error("cutin outro.duration must be >= 0");
  if (!Array.isArray(config.panels)) throw new Error("cutin panels must be an array");
  for (let i = 0; i < config.panels.length; i++) {
    const p = config.panels[i];
    if (!p.imageKey) throw new Error(`panels[${i}].imageKey is required`);
    if (!(p.hold > 0)) throw new Error(`panels[${i}].hold must be > 0`);
    if (!(p.zoomFrom > 0) || !(p.zoomTo > 0)) throw new Error(`panels[${i}] zoom must be > 0`);
    if (p.transition && !["cut", "fade", "flash"].includes(p.transition)) {
      throw new Error(`panels[${i}].transition must be cut, fade or flash`);
    }
  }
  if (config.textOverlays) {
    for (const o of config.textOverlays) {
      if (!Number.isInteger(o.panelIndex) || o.panelIndex < 0) {
        throw new Error("textOverlays.panelIndex must be a non-negative integer");
      }
    }
  }
}

function defaultOverlays(config: CutinConfig, sourceIndices: number[]): CutinTextOverlay[] {
  if (config.textOverlays && config.textOverlays.length > 0) return config.textOverlays;
  if (sourceIndices.length === 0) return [];
  const lastSource = sourceIndices[sourceIndices.length - 1];
  const last = config.panels[lastSource];
  const fps = config.referenceFps ?? DEFAULT_FPS;
  const afterFlash = last?.flashFrames ? last.flashFrames / fps : 0.1;
  return [{ panelIndex: lastSource, delay: afterFlash, fadeIn: 4 / fps }];
}

function fullTimelineSeconds(config: CutinConfig): { intro: number; panels: number[]; outro: number; total: number } {
  const holds = (config.panels ?? []).map((p) => p.hold);
  const intro = config.intro.duration;
  const outro = config.outro.duration;
  const panelSum = holds.reduce((a, b) => a + b, 0);
  return { intro, panels: holds, outro, total: intro + panelSum + outro };
}

function mapFullTimeToPlayhead(
  fullTime: number,
  config: CutinConfig,
  sourceIndices: number[],
  scaleOf: (kind: "intro" | "panel" | "outro") => number,
): number | null {
  const full = fullTimelineSeconds(config);
  const introEnd = full.intro;
  if (fullTime < 0) return null;
  if (fullTime <= introEnd) return fullTime * scaleOf("intro");

  let acc = introEnd;
  let play = full.intro * scaleOf("intro");
  for (let i = 0; i < config.panels.length; i++) {
    const hold = config.panels[i].hold;
    const start = acc;
    const end = acc + hold;
    const kept = sourceIndices.indexOf(i);
    if (fullTime <= end || (i === config.panels.length - 1 && fullTime < end + 1e-9)) {
      if (kept < 0) {
        if (fullTime < end) return null;
      } else {
        return play + (fullTime - start) * scaleOf("panel");
      }
    }
    if (kept >= 0) play += hold * scaleOf("panel");
    acc = end;
  }
  const outroStart = full.intro + full.panels.reduce((a, b) => a + b, 0);
  if (fullTime <= outroStart + full.outro) {
    return play + (fullTime - outroStart) * scaleOf("outro");
  }
  return play + full.outro * scaleOf("outro");
}

export class CutinPlayer {
  readonly config: CutinConfig;
  readonly mode: PlaybackMode;
  readonly fps: number;
  readonly seed: number;
  readonly letterboxMax: number;

  private readonly opts: CutinPlayerOptions;
  private readonly playableInfo: Playability;
  private stages: Stage[] = [];
  private cues: ScheduledCue[] = [];
  private overlays: CutinTextOverlay[] = [];
  private lastSampleT = Number.NEGATIVE_INFINITY;
  private skipOrigin: number | null = null;
  private skipPlayhead = 0;
  /** After skip(), next sample should fire cues at the outro start, not the skipped gap. */
  private cueCursor: number | null = null;
  private endedFired = false;
  private started = false;
  private skippedFlag = false;
  duration = 0;

  constructor(config: CutinConfig, options: CutinPlayerOptions = {}) {
    validateConfig(config);
    this.config = config;
    this.opts = options;
    this.mode = options.mode ?? "full";
    this.fps = config.referenceFps ?? DEFAULT_FPS;
    this.seed = options.seed ?? config.shakeSeed ?? 1;
    this.letterboxMax = config.letterboxMax ?? DEFAULT_LETTERBOX;

    const replayIdx = this.mode === "replay" ? config.replay?.panelIndices : undefined;
    this.playableInfo = resolvePlayablePanels(config, options.hasImage, replayIdx);
    this.rebuildTimeline();
  }

  get playable(): boolean {
    return this.playableInfo.playable;
  }

  get playablePanels(): readonly CutinPanelConfig[] {
    return this.playableInfo.panels;
  }

  get skipReason(): string | undefined {
    return this.playableInfo.reason;
  }

  start(): void {
    this.lastSampleT = Number.NEGATIVE_INFINITY;
    this.skipOrigin = null;
    this.skipPlayhead = 0;
    this.cueCursor = null;
    this.endedFired = false;
    this.started = true;
    this.skippedFlag = !this.playable;
    if (!this.playable) {
      this.fireEnd();
      return;
    }
    this.opts.onPauseRequest?.();
  }

  /**
   * Jump to the start of the outro. If already in (or past) the outro, this is a no-op.
   * `externalT` is the host clock passed to subsequent `sample(t)` calls; if omitted, the
   * previous sample time (or 0) is used.
   */
  skip(externalT?: number): void {
    if (!this.playable) return;
    const t = externalT ?? (Number.isFinite(this.lastSampleT) && this.lastSampleT !== Number.NEGATIVE_INFINITY
      ? this.lastSampleT
      : 0);
    const mapped = this.mapTime(t);
    const outro = this.stages.find((s) => s.phase === "outro");
    if (!outro) return;
    if (mapped >= outro.start) return;
    this.skipOrigin = t;
    this.skipPlayhead = outro.start;
    this.skippedFlag = true;
    // Drop cues in the skipped gap; keep the outro-start cue (e.g. boom).
    this.cueCursor = outro.start - 1e-9;
  }

  stop(): void {
    if (!this.endedFired) this.fireEnd();
  }

  /** Advance by `dt` seconds using an internal playhead. Returns the new sample. */
  tick(dt: number): CutinSample {
    const prev = this.lastSampleT === Number.NEGATIVE_INFINITY ? 0 : this.lastSampleT;
    return this.sample(prev + dt);
  }

  /**
   * Deterministic sample at external time `t` (seconds from start, before skip mapping).
   * Cue lists contain events in `(lastSample, t]` on the *mapped* playhead.
   */
  sample(t: number): CutinSample {
    const playable = this.playable;
    if (!playable) {
      const empty = this.emptySample(t);
      this.lastSampleT = t;
      return empty;
    }

    const mapped = this.mapTime(t);
    let prevMapped: number;
    if (this.cueCursor != null) {
      prevMapped = this.cueCursor;
      this.cueCursor = null;
    } else if (this.lastSampleT === Number.NEGATIVE_INFINITY) {
      prevMapped = Number.NEGATIVE_INFINITY;
    } else {
      prevMapped = this.mapTime(this.lastSampleT);
    }

    const cues = this.cues.filter((c) => c.time > prevMapped && c.time <= mapped);
    const ended = mapped >= this.duration - 1e-9;

    const sample = this.sampleMapped(mapped, t, cues);
    this.lastSampleT = t;
    if (ended) this.fireEnd();
    return sample;
  }

  private fireEnd(): void {
    if (this.endedFired) return;
    this.endedFired = true;
    if (this.started && this.playable) this.opts.onResumeRequest?.();
    this.opts.onEnd?.();
  }

  private mapTime(t: number): number {
    if (t < 0) t = 0;
    if (this.skipOrigin !== null && t >= this.skipOrigin) {
      return Math.min(this.duration, this.skipPlayhead + (t - this.skipOrigin));
    }
    return Math.min(this.duration, t);
  }

  private rebuildTimeline(): void {
    const cfg = this.config;
    const speed = cfg.speed && cfg.speed > 0 ? cfg.speed : 1;
    const panels = this.playableInfo.panels;
    const sourceIndices = this.playableInfo.sourceIndices;

    if (!this.playableInfo.playable) {
      this.stages = [];
      this.cues = [];
      this.duration = 0;
      return;
    }

    const rawIntro = cfg.intro.duration;
    const rawOutro = cfg.outro.duration;
    const rawPanels = panels.reduce((a, p) => a + p.hold, 0);
    const rawTotal = rawIntro + rawPanels + rawOutro;

    let introScale: number;
    let panelScale: number;
    let outroScale: number;
    if (this.mode === "replay") {
      const target = cfg.replay?.duration && cfg.replay.duration > 0 ? cfg.replay.duration : DEFAULT_REPLAY;
      const s = rawTotal > 0 ? target / rawTotal : 1;
      introScale = s;
      panelScale = s;
      outroScale = s;
    } else {
      introScale = 1 / speed;
      panelScale = 1 / speed;
      outroScale = 1 / speed;
    }

    const stages: Stage[] = [];
    let t = 0;
    stages.push({
      phase: "intro",
      playIndex: -1,
      sourceIndex: -1,
      start: t,
      duration: rawIntro * introScale,
      timeScale: introScale,
    });
    t += rawIntro * introScale;
    for (let i = 0; i < panels.length; i++) {
      const dur = panels[i].hold * panelScale;
      stages.push({
        phase: "panel",
        playIndex: i,
        sourceIndex: sourceIndices[i],
        start: t,
        duration: dur,
        panel: panels[i],
        timeScale: panelScale,
      });
      t += dur;
    }
    stages.push({
      phase: "outro",
      playIndex: -1,
      sourceIndex: -1,
      start: t,
      duration: rawOutro * outroScale,
      timeScale: outroScale,
    });
    t += rawOutro * outroScale;
    this.stages = stages;
    this.duration = t;
    this.overlays = defaultOverlays(cfg, sourceIndices);
    this.cues = this.buildCues((kind) => (kind === "intro" ? introScale : kind === "outro" ? outroScale : panelScale));
  }

  private buildCues(scaleOf: (kind: "intro" | "panel" | "outro") => number): ScheduledCue[] {
    const cfg = this.config;
    const sourceIndices = this.playableInfo.sourceIndices;
    const out: ScheduledCue[] = [];
    const playVoice = this.mode === "replay" ? !!cfg.replay?.playVoice : true;

    const add = (kind: CueKind, key: string, fullTime: number | null) => {
      if (!key) return;
      if (kind === "voice" && !playVoice) return;
      if (fullTime == null) return;
      const mapped = mapFullTimeToPlayhead(fullTime, cfg, sourceIndices, scaleOf);
      if (mapped == null) return;
      out.push({ kind, key, time: mapped });
    };

    for (const cue of cfg.sfx ?? []) add("sfx", cue.key, cue.time);

    if (cfg.voice) {
      let full = cfg.voice.time;
      if (full == null && cfg.voice.panelIndex != null) {
        full = panelFullStart(cfg, cfg.voice.panelIndex) + (cfg.voice.offset ?? 0);
      }
      add("voice", cfg.voice.key, full ?? null);
    }

    let acc = cfg.intro.duration;
    for (let i = 0; i < cfg.panels.length; i++) {
      const p = cfg.panels[i];
      const start = acc;
      if (sourceIndices.includes(i)) {
        for (const s of p.sfx ?? []) add("sfx", s.key, start + (s.offset ?? 0));
        if (p.voice) add("voice", p.voice.key, start + (p.voice.offset ?? 0));
      }
      acc += p.hold;
    }

    out.sort((a, b) => a.time - b.time || a.key.localeCompare(b.key));
    return out;
  }

  private stageAt(mapped: number): { stage: Stage; local: number } {
    if (this.stages.length === 0) {
      return {
        stage: { phase: "outro", playIndex: -1, sourceIndex: -1, start: 0, duration: 0, timeScale: 1 },
        local: 0,
      };
    }
    if (mapped >= this.duration) {
      const last = this.stages[this.stages.length - 1];
      return { stage: last, local: last.duration };
    }
    for (const stage of this.stages) {
      if (mapped < stage.start + stage.duration || stage === this.stages[this.stages.length - 1]) {
        if (mapped < stage.start + stage.duration || stage.phase !== "outro" && mapped < this.duration) {
          if (mapped >= stage.start && mapped < stage.start + stage.duration) {
            return { stage, local: mapped - stage.start };
          }
        }
      }
    }
    for (let i = this.stages.length - 1; i >= 0; i--) {
      if (mapped >= this.stages[i].start) {
        return { stage: this.stages[i], local: Math.min(this.stages[i].duration, mapped - this.stages[i].start) };
      }
    }
    return { stage: this.stages[0], local: 0 };
  }

  private sampleMapped(mapped: number, externalT: number, cues: ScheduledCue[]): CutinSample {
    const ended = mapped >= this.duration - 1e-9;
    const { stage, local } = this.stageAt(mapped);
    const cfg = this.config;
    const dimTo = cfg.intro.dimTo;
    const letterMax = 1;
    const burstColor: Rgb = cfg.outro.burstColor ?? [0.47, 0.75, 1];
    let phase: CutinPhase = ended ? "ended" : stage.phase;
    let panelIndex = -1;
    let imageKey: string | null = null;
    let panelAlpha = 0;
    let prevPanelIndex = -1;
    let prevImageKey: string | null = null;
    let prevPanelAlpha = 0;
    let scale = 1;
    let shakeX = 0;
    let shakeY = 0;
    let flashA = 0;
    let flashColor: Rgb = WHITE;
    let letterbox = 0;
    let dim = 0;
    let textAlpha = 0;
    let generalName = cfg.generalName;
    let skillName = cfg.skillName;
    let burstAlpha = 0;
    let burstProgress = 0;

    if (stage.phase === "intro") {
      const u = stage.duration > 0 ? local / stage.duration : 1;
      dim = lerp(0, dimTo, easeOut(u));
      const closeDur = (cfg.intro.letterboxIn ?? cfg.intro.duration) * stage.timeScale;
      const closeStart = Math.max(0, stage.duration - closeDur);
      letterbox = local <= closeStart ? 0 : easeOut((local - closeStart) / Math.max(closeDur, 1e-6));
    } else if (stage.phase === "panel" && stage.panel) {
      const p = stage.panel;
      panelIndex = stage.sourceIndex;
      imageKey = p.imageKey;
      dim = dimTo;
      letterbox = 1;
      const u = stage.duration > 0 ? local / stage.duration : 1;
      scale = lerp(p.zoomFrom, p.zoomTo, applyEase(p.zoomEase, u));
      const sh = shakeOffset(local, p.shakeFrames ?? 0, p.shakeAmp ?? 0, this.fps, this.seed + stage.sourceIndex, stage.timeScale);
      shakeX = sh.x;
      shakeY = sh.y;
      const peak = p.flashPeak ?? 0.9;
      flashColor = p.flashColor ?? WHITE;
      flashA = flashAlphaAt(local, p.flashFrames ?? 0, this.fps, peak, stage.timeScale);
      if ((p.transition ?? "cut") === "flash" && (p.flashFrames ?? 0) <= 0) {
        flashA = Math.max(flashA, flashAlphaAt(local, 3, this.fps, peak, stage.timeScale));
      }

      // fadeIn is specified in speed=1 seconds; convert with timeScale
      const fadeS = p.transition === "fade" ? Math.min((p.fadeIn ?? 0.2) * stage.timeScale, stage.duration) : 0;
      if (fadeS > 0 && local < fadeS) {
        panelAlpha = easeOut(local / fadeS);
        const prev = this.playableInfo.panels[stage.playIndex - 1];
        const prevSrc = this.playableInfo.sourceIndices[stage.playIndex - 1];
        if (prev) {
          prevPanelIndex = prevSrc;
          prevImageKey = prev.imageKey;
          prevPanelAlpha = 1 - panelAlpha;
        }
      } else {
        panelAlpha = 1;
      }

      const text = this.overlayAt(stage, local);
      if (text) {
        textAlpha = text.alpha;
        if (text.generalName) generalName = text.generalName;
        if (text.skillName) skillName = text.skillName;
      }
    } else if (stage.phase === "outro") {
      dim = lerp(dimTo, 0, easeInOut(stage.duration > 0 ? local / stage.duration : 1));
      const openDur = (cfg.outro.letterboxOut ?? cfg.outro.duration) * stage.timeScale;
      letterbox = local >= openDur ? 0 : 1 - easeInOut(local / Math.max(openDur, 1e-6));
      const u = stage.duration > 0 ? local / stage.duration : 1;
      burstProgress = u;
      burstAlpha = (1 - u) ** 0.65;
      flashColor = cfg.outro.flashColor ?? [0.86, 0.94, 1];
      flashA = flashAlphaAt(local, cfg.outro.flashFrames ?? 3, this.fps, 0.95, stage.timeScale);
      // Hold last panel faintly under the burst? Host may keep last sprite; we clear it.
      panelAlpha = 0;
    }

    if (ended) phase = "ended";

    const sfxCues = cues.filter((c) => c.kind === "sfx").map((c) => c.key);
    const voiceCues = cues.filter((c) => c.kind === "voice").map((c) => c.key);

    return {
      t: mapped,
      duration: this.duration,
      phase,
      mode: this.mode,
      panelIndex,
      panelCount: this.playableInfo.panels.length,
      imageKey,
      panelAlpha,
      prevPanelIndex,
      prevImageKey,
      prevPanelAlpha,
      dim,
      scale,
      shakeX,
      shakeY,
      flashAlpha: flashA,
      flashColor,
      letterbox: letterbox * letterMax,
      textAlpha,
      generalName,
      skillName,
      burstAlpha,
      burstProgress,
      burstColor,
      cues: cues.map((c) => ({ kind: c.kind, key: c.key })),
      sfxCues,
      voiceCues,
      ended,
      skipped: this.skippedFlag,
      playable: true,
    };
  }

  private overlayAt(stage: Stage, local: number): { alpha: number; generalName?: string; skillName?: string } | null {
    let best: { alpha: number; generalName?: string; skillName?: string } | null = null;
    for (const o of this.overlays) {
      if (o.panelIndex !== stage.sourceIndex) continue;
      const delay = (o.delay ?? 0) * stage.timeScale;
      const fade = (o.fadeIn ?? 0.12) * stage.timeScale;
      if (local < delay) continue;
      const a = fade > 0 ? easeOut(clamp01((local - delay) / fade)) : 1;
      best = { alpha: a, generalName: o.generalName, skillName: o.skillName };
    }
    return best;
  }

  private emptySample(t: number): CutinSample {
    return {
      t: 0,
      duration: 0,
      phase: "ended",
      mode: this.mode,
      panelIndex: -1,
      panelCount: 0,
      imageKey: null,
      panelAlpha: 0,
      prevPanelIndex: -1,
      prevImageKey: null,
      prevPanelAlpha: 0,
      dim: 0,
      scale: 1,
      shakeX: 0,
      shakeY: 0,
      flashAlpha: 0,
      flashColor: WHITE,
      letterbox: 0,
      textAlpha: 0,
      generalName: this.config.generalName,
      skillName: this.config.skillName,
      burstAlpha: 0,
      burstProgress: 0,
      burstColor: this.config.outro.burstColor ?? [0.47, 0.75, 1],
      cues: [],
      sfxCues: [],
      voiceCues: [],
      ended: true,
      skipped: true,
      playable: false,
    };
  }
}

function panelFullStart(config: CutinConfig, panelIndex: number): number {
  let t = config.intro.duration;
  for (let i = 0; i < panelIndex && i < config.panels.length; i++) t += config.panels[i].hold;
  return t;
}

export function createCutinPlayer(config: CutinConfig, options?: CutinPlayerOptions): CutinPlayer {
  return new CutinPlayer(config, options);
}

/** Full-mode length in seconds, ignoring missing-image filters and replay. */
export function fullDuration(config: CutinConfig): number {
  const speed = config.speed && config.speed > 0 ? config.speed : 1;
  return fullTimelineSeconds(config).total / speed;
}
