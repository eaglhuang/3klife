// @spec-source → Issue #2139（奧義漫畫分鏡 cut-in）；PROG-2-2250、PROG-2-9352（暫代圖）
/**
 * UltCutinDirector — 戰場奧義 cut-in 的調度：決定播專屬分鏡還是暫代圖、播完整版還是重播、載入設定與分鏡圖、暫停與恢復戰場。
 *
 * 一場戰鬥一個實例（由 BattleUIBridge 持有），所以「同一武將第二次施放走縮短重播」自然以單場為界。
 * 規則：
 *   - 武將有專屬分鏡（data/ult-cutin/index.json 有列名、設定與分鏡圖可載入）→ 播專屬分鏡。
 *   - 沒列名、設定缺檔、分鏡圖都沒匯入 → 改播「暫代圖 待替換」（PROG-2-9352），並登記到暫代圖清單。
 *   - 連續多個奧義依序播，不重疊。
 *   - 載入拖太久（逾時）就當沒有專屬分鏡；整段演出另有真實時間硬上限，到點強制收掉疊層、恢復戰場，不讓回合流程卡住。
 *
 * Unity 對照：像 CutsceneDirector：先查有沒有這段過場，載好資源，Time.timeScale 凍結戰場，播完還原；沒有就播 Placeholder 過場。
 */
import { SpriteFrame, Texture2D, type Node } from 'cc';
import type { CutinConfig } from '../../shared/cutin/cutinCore';
import {
  CUTIN_HARD_TIMEOUT_MS, CUTIN_INDEX_PATH, CUTIN_LOAD_TIMEOUT_MS, CutinReplayTracker, PLACEHOLDER_CUTIN_ENABLED,
  PLACEHOLDER_CUTIN_IMAGE_KEY, buildPlaceholderCutinConfig, cutinConfigPath, cutinImagePath, cutinIndexHas,
  placeholderCutinRegistry,
  type CutinIndex,
} from '../../shared/cutin/cutinSupport';
import { abortAllUltCutins, playUltCutin, type CutinCuePlayer, type UltCutinOutcome, type UltCutinPlayArgs } from '../../ui/core/UltCutinOverlay';
import { setBattlePaused } from './BattleTimeScale';
import { services } from '../../core/managers/ServiceLoader';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';

function withTimeout<T>(task: Promise<T>, fallback: T, ms: number): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    task.then(
      (value) => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(fallback); },
    );
  });
}

/** 播放時的額外資訊：暫代圖要用的武將名與奧義名（專屬 cut-in 用自己的設定檔，不看這個） */
export interface UltCutinPlayOptions {
  playCue?: CutinCuePlayer;
  generalName?: string;
  skillName?: string;
}

/** 可替換的外部依賴；正式環境全用預設，單元測試注入假的 */
export interface UltCutinDirectorDeps {
  loadJson?: <T>(path: string) => Promise<T>;
  loadSpriteFrame?: (path: string) => Promise<SpriteFrame>;
  play?: (args: UltCutinPlayArgs) => Promise<UltCutinOutcome>;
  setPaused?: (paused: boolean) => void;
  /** 逾時保底要強制收掉疊層時呼叫 */
  abort?: () => void;
  /** 產生暫代圖的底圖（預設：執行期產生的純色貼圖，不佔任何 resources 檔案） */
  makePlaceholderFrame?: () => SpriteFrame | null;
  loadTimeoutMs?: number;
  hardTimeoutMs?: number;
  warn?: (message: string) => void;
}

/** 暫代圖底色：深紫灰，與戰場區隔、不會被誤認成正式美術 */
const PLACEHOLDER_RGBA: readonly [number, number, number, number] = [58, 36, 92, 255];

function makeSolidFrame(): SpriteFrame | null {
  try {
    const texture = new Texture2D();
    texture.reset({ width: 2, height: 2, format: Texture2D.PixelFormat.RGBA8888 });
    const data = new Uint8Array(2 * 2 * 4);
    for (let i = 0; i < 4; i++) data.set(PLACEHOLDER_RGBA, i * 4);
    texture.uploadData(data);
    const frame = new SpriteFrame();
    frame.texture = texture;
    return frame;
  } catch {
    return null;
  }
}

export class UltCutinDirector {
  private index: CutinIndex | null | undefined;
  private indexLoading: Promise<CutinIndex | null> | null = null;
  private readonly configs = new Map<string, Promise<CutinConfig | null>>();
  /** imageKey → 已載入的圖；null 代表試過、沒有這張（不再重試） */
  private readonly frames = new Map<string, SpriteFrame | null>();
  private readonly frameLoads = new Map<string, Promise<void>>();
  private readonly tracker = new CutinReplayTracker();
  private chain: Promise<unknown> = Promise.resolve();
  private placeholderFrame: SpriteFrame | null | undefined;

  constructor(private readonly deps: UltCutinDirectorDeps = {}) {}

  /** 新的一場戰鬥：清掉「本場已看過」 */
  public resetBattle(): void {
    this.tracker.reset();
  }

  /** 開場先把設定與分鏡圖載好，第一次施放時才不會卡一下；失敗不丟例外 */
  public prefetch(generalId: string | null | undefined): void {
    if (!generalId) {
      void this.loadIndex();
      return;
    }
    void this.ensureLoaded(generalId);
  }

  /**
   * 這位武將施放奧義時要不要走 cut-in 路徑：暫代圖開著時每位武將都要播；
   * 關掉暫代圖時只有清單已載入且有列名的武將才播（維持舊的同步時序）。
   */
  public mayPlay(generalId: string | null | undefined): boolean {
    if (!generalId) return false;
    return PLACEHOLDER_CUTIN_ENABLED || cutinIndexHas(this.index, generalId);
  }

  /**
   * 播放該武將的奧義 cut-in：有專屬分鏡圖播專屬的，沒有就播暫代圖。
   * 戰場在播放期間被暫停，結束（含跳過、逾時保底）後恢復。永遠會在有限時間內解決，不丟例外。
   */
  public play(generalId: string | null | undefined, parent: Node | null | undefined, options?: CutinCuePlayer | UltCutinPlayOptions): Promise<UltCutinOutcome> {
    if (!generalId || !parent) return Promise.resolve('unplayable');
    const opts: UltCutinPlayOptions = typeof options === 'function' ? { playCue: options } : (options ?? {});
    const run = (): Promise<UltCutinOutcome> => this.playGuarded(generalId, parent, opts);
    const next = this.chain.then(run, run);
    this.chain = next.catch(() => undefined);
    return next.catch(() => 'unplayable' as UltCutinOutcome);
  }

  /** 真實時間硬上限：到點就強制收掉疊層（恢復戰場），並讓還在載入的那一路作廢 */
  private playGuarded(generalId: string, parent: Node, opts: UltCutinPlayOptions): Promise<UltCutinOutcome> {
    const token = { cancelled: false };
    const hardMs = this.deps.hardTimeoutMs ?? CUTIN_HARD_TIMEOUT_MS;
    return new Promise<UltCutinOutcome>((resolve) => {
      const timer = setTimeout(() => {
        token.cancelled = true;
        this.warn(`[UltCutin] 演出超過 ${hardMs}ms，強制結束：${generalId}`);
        try { (this.deps.abort ?? abortAllUltCutins)(); } catch { /* 保底路徑不可再丟例外 */ }
        resolve('skipped');
      }, hardMs);
      this.playNow(generalId, parent, opts, token).then(
        (outcome) => { clearTimeout(timer); resolve(outcome); },
        () => { clearTimeout(timer); resolve('unplayable'); },
      );
    });
  }

  private async playNow(generalId: string, parent: Node, opts: UltCutinPlayOptions, token: { cancelled: boolean }): Promise<UltCutinOutcome> {
    const config = await withTimeout(this.ensureLoaded(generalId), null, this.deps.loadTimeoutMs ?? CUTIN_LOAD_TIMEOUT_MS);
    if (token.cancelled || !parent.isValid) return 'unplayable';
    const mode = this.tracker.consume(generalId);
    const play = this.deps.play ?? playUltCutin;
    const setPaused = this.deps.setPaused ?? setBattlePaused;
    const playCue = opts.playCue ?? defaultCuePlayer;

    if (config) {
      const outcome = await play({
        parent, config, mode,
        frames: (key) => this.frames.get(key) ?? null,
        playCue,
        onPauseRequest: () => setPaused(true),
        onResumeRequest: () => setPaused(false),
      });
      // 有設定檔但分鏡圖都沒匯入：outcome 是 'unplayable'，往下改播暫代圖
      if (outcome !== 'unplayable') return outcome;
    }
    if (!PLACEHOLDER_CUTIN_ENABLED || token.cancelled || !parent.isValid) return 'unplayable';

    const frame = this.getPlaceholderFrame();
    if (!frame) return 'unplayable';
    const name = opts.generalName?.trim() || generalId;
    if (placeholderCutinRegistry.note(generalId, name)) {
      this.warn(`[UltCutin] 暫代圖：${name}（${generalId}）還沒有專屬奧義分鏡圖，先用「暫代圖 待替換」，請補圖＋設定並加進 data/ult-cutin/index.json`);
    }
    return play({
      parent,
      config: buildPlaceholderCutinConfig(generalId, name, opts.skillName),
      mode,
      frames: (key) => (key === PLACEHOLDER_CUTIN_IMAGE_KEY ? frame : null),
      playCue: () => undefined,
      onPauseRequest: () => setPaused(true),
      onResumeRequest: () => setPaused(false),
      placeholder: true,
    });
  }

  private getPlaceholderFrame(): SpriteFrame | null {
    if (this.placeholderFrame === undefined) {
      this.placeholderFrame = (this.deps.makePlaceholderFrame ?? makeSolidFrame)();
    }
    return this.placeholderFrame;
  }

  private warn(message: string): void {
    if (this.deps.warn) this.deps.warn(message);
    else UCUFLogger.warn(LogCategory.BATTLE, message);
  }

  /** 設定與分鏡圖都載好才回傳設定；沒有 cut-in 的武將回傳 null */
  private async ensureLoaded(generalId: string): Promise<CutinConfig | null> {
    const index = await this.loadIndex();
    if (!cutinIndexHas(index, generalId)) return null;
    let pending = this.configs.get(generalId);
    if (!pending) {
      pending = this.loadConfig(generalId);
      this.configs.set(generalId, pending);
    }
    return pending;
  }

  private loadJson<T>(path: string): Promise<T> {
    return this.deps.loadJson ? this.deps.loadJson<T>(path) : services().resource.loadJson<T>(path);
  }

  private loadIndex(): Promise<CutinIndex | null> {
    if (this.index !== undefined) return Promise.resolve(this.index);
    if (!this.indexLoading) {
      this.indexLoading = this.loadJson<CutinIndex>(CUTIN_INDEX_PATH)
        .catch(() => null)
        .then((value) => { this.index = value; return value; });
    }
    return this.indexLoading;
  }

  private async loadConfig(generalId: string): Promise<CutinConfig | null> {
    let config: CutinConfig | null = null;
    try {
      config = await this.loadJson<CutinConfig>(cutinConfigPath(generalId));
    } catch {
      UCUFLogger.info(LogCategory.DATA, `[UltCutin] 找不到設定檔，略過專屬 cut-in：${generalId}`);
      return null;
    }
    if (!config || !Array.isArray(config.panels)) return null;
    await Promise.all(config.panels.map((panel) => this.loadFrame(panel.imageKey)));
    return config;
  }

  private loadFrame(imageKey: string): Promise<void> {
    let pending = this.frameLoads.get(imageKey);
    if (!pending) {
      const load = this.deps.loadSpriteFrame ?? ((path: string) => services().resource.loadSpriteFrame(path));
      pending = load(cutinImagePath(imageKey))
        .then((frame) => { this.frames.set(imageKey, frame); })
        .catch(() => { this.frames.set(imageKey, null); });
      this.frameLoads.set(imageKey, pending);
    }
    return pending;
  }
}

/** 預設音效播放：音效與語音各自一個 key，缺檔由 AudioSystem 記一行 log，畫面照播 */
const defaultCuePlayer: CutinCuePlayer = (_kind, key) => {
  try {
    services().audio.playSfx(key);
  } catch {
    // 音效系統還沒就緒（例如預覽模式）：靜音略過
  }
};
