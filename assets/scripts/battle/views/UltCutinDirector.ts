// @spec-source → Issue #2139（奧義漫畫分鏡 cut-in）；PROG-2-2250
/**
 * UltCutinDirector — 戰場奧義 cut-in 的調度：決定播不播、播完整版還是重播、載入設定與分鏡圖、暫停與恢復戰場。
 *
 * 一場戰鬥一個實例（由 BattleUIBridge 持有），所以「同一武將第二次施放走縮短重播」自然以單場為界。
 * 規則：
 *   - 武將不在 data/ult-cutin/index.json、設定缺檔、分鏡圖都沒匯入 → 回傳 'unplayable'，呼叫端直接接奧義特效，不報錯。
 *   - 連續多個奧義依序播，不重疊。
 *   - 載入拖太久（逾時）也視為不可播，不讓奧義特效卡住。
 *
 * Unity 對照：像 CutsceneDirector：先查有沒有這段過場，載好資源，Time.timeScale 凍結戰場，播完還原。
 */
import type { Node, SpriteFrame } from 'cc';
import type { CutinConfig } from '../../shared/cutin/cutinCore';
import {
  CUTIN_INDEX_PATH, CutinReplayTracker, cutinConfigPath, cutinImagePath, cutinIndexHas,
  type CutinIndex,
} from '../../shared/cutin/cutinSupport';
import { playUltCutin, type CutinCuePlayer, type UltCutinOutcome } from '../../ui/core/UltCutinOverlay';
import { setBattlePaused } from './BattleTimeScale';
import { services } from '../../core/managers/ServiceLoader';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';

/** 載入設定與分鏡圖的等待上限（毫秒）：超過就當沒有 cut-in */
const LOAD_TIMEOUT_MS = 3000;

function withTimeout<T>(task: Promise<T>, fallback: T, ms: number): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    task.then(
      (value) => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(fallback); },
    );
  });
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
   * 同步判斷這位武將有沒有 cut-in 可能要播（清單已載入且有列名）。
   * 呼叫端用它決定要不要走非同步路徑：沒有時奧義特效維持原本的同步時序。
   */
  public mayPlay(generalId: string | null | undefined): boolean {
    return !!generalId && cutinIndexHas(this.index, generalId);
  }

  /**
   * 播放該武將的奧義 cut-in。沒有可播內容時不建任何節點，回傳 'unplayable'。
   * 戰場在播放期間被暫停，結束（含跳過）後恢復。
   */
  public play(generalId: string | null | undefined, parent: Node | null | undefined, playCue?: CutinCuePlayer): Promise<UltCutinOutcome> {
    if (!generalId || !parent) return Promise.resolve('unplayable');
    const run = (): Promise<UltCutinOutcome> => this.playNow(generalId, parent, playCue);
    const next = this.chain.then(run, run);
    this.chain = next.catch(() => undefined);
    return next.catch(() => 'unplayable' as UltCutinOutcome);
  }

  private async playNow(generalId: string, parent: Node, playCue?: CutinCuePlayer): Promise<UltCutinOutcome> {
    const config = await withTimeout(this.ensureLoaded(generalId), null, LOAD_TIMEOUT_MS);
    if (!config || !parent.isValid) return 'unplayable';
    const mode = this.tracker.consume(generalId);
    return playUltCutin({
      parent,
      config,
      mode,
      frames: (key) => this.frames.get(key) ?? null,
      playCue: playCue ?? defaultCuePlayer,
      onPauseRequest: () => setBattlePaused(true),
      onResumeRequest: () => setBattlePaused(false),
    });
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

  private loadIndex(): Promise<CutinIndex | null> {
    if (this.index !== undefined) return Promise.resolve(this.index);
    if (!this.indexLoading) {
      this.indexLoading = services().resource.loadJson<CutinIndex>(CUTIN_INDEX_PATH)
        .catch(() => null)
        .then((value) => { this.index = value; return value; });
    }
    return this.indexLoading;
  }

  private async loadConfig(generalId: string): Promise<CutinConfig | null> {
    let config: CutinConfig | null = null;
    try {
      config = await services().resource.loadJson<CutinConfig>(cutinConfigPath(generalId));
    } catch {
      UCUFLogger.info(LogCategory.DATA, `[UltCutin] 找不到設定檔，略過 cut-in：${generalId}`);
      return null;
    }
    if (!config || !Array.isArray(config.panels)) return null;
    await Promise.all(config.panels.map((panel) => this.loadFrame(panel.imageKey)));
    return config;
  }

  private loadFrame(imageKey: string): Promise<void> {
    let pending = this.frameLoads.get(imageKey);
    if (!pending) {
      pending = services().resource.loadSpriteFrame(cutinImagePath(imageKey))
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
