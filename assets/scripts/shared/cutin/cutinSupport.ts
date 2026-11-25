// @spec-source → Issue #2139（奧義漫畫分鏡 cut-in）；PROG-2-2250
/**
 * cutinSupport — cut-in 播放器周邊的純邏輯（不依賴 cc，可在 Node 單元測試）。
 *
 * - 資源路徑規則：設定檔、分鏡圖都走 resources，imageKey 與武將 id 都不寫進程式。
 * - 本場重播判斷：同一場戰鬥同一武將第二次施放走縮短重播。
 * - 安全區：把系統回報的安全區換算成四邊內縮，文字與黑邊不被瀏海／Home bar 擋住。
 *
 * Unity 對照：像 Cutscene 的 PlayableAsset 路徑解析 + 一個「本場已播過」旗標。
 */
import type { CutinConfig, PlaybackMode } from './cutinCore';

/** 設定清單：列出有 cut-in 的武將，避免對每位武將都去讀不存在的檔案而滿屏載入錯誤 */
export const CUTIN_INDEX_PATH = 'data/ult-cutin/index';

/** 'zhao-yun' → 'zhao_yun'（與武將美術路徑同一規則：id 的 - 換成 _） */
export function cutinFileKey(generalId: string): string {
  return generalId.trim().replace(/-/g, '_');
}

/** 武將 cut-in 設定檔的 resources 路徑 */
export function cutinConfigPath(generalId: string): string {
  return `data/ult-cutin/${cutinFileKey(generalId)}`;
}

/** 分鏡圖 imageKey（'ult_cutin/zhao_yun/01_charge'）→ resources 的 SpriteFrame 路徑 */
export function cutinImagePath(imageKey: string): string {
  return `sprites/${imageKey.replace(/^\/+/, '')}`;
}

/** 設定清單內容：generals 為有 cut-in 的武將 id（可寫 - 或 _，比對時一律正規化） */
export interface CutinIndex {
  generals?: readonly string[];
}

export function cutinIndexHas(index: CutinIndex | null | undefined, generalId: string): boolean {
  if (!index || !Array.isArray(index.generals)) return false;
  const key = cutinFileKey(generalId);
  return index.generals.some((id) => typeof id === 'string' && cutinFileKey(id) === key);
}

/**
 * 本場戰鬥的重播判斷：第一次施放播完整版，之後（同一武將）播縮短重播。
 * 跳過也算「看過」，所以只要開始播就記下來。
 */
export class CutinReplayTracker {
  private readonly seen = new Set<string>();

  /** 取得這次該用的模式，並把該武將記成已看過 */
  consume(generalId: string): PlaybackMode {
    const key = cutinFileKey(generalId);
    const mode: PlaybackMode = this.seen.has(key) ? 'replay' : 'full';
    this.seen.add(key);
    return mode;
  }

  /** 新的一場戰鬥開始時清掉 */
  reset(): void {
    this.seen.clear();
  }
}

export interface SafeInsets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SizeLike {
  width: number;
  height: number;
}

/** 系統安全區矩形：x/y 為左下角（Cocos sys.getSafeAreaRect 的座標系），單位與可視大小相同 */
export interface SafeRectLike extends SizeLike {
  x: number;
  y: number;
}

const NO_INSETS: SafeInsets = { left: 0, right: 0, top: 0, bottom: 0 };

/** 把安全區矩形換算成四邊內縮；沒有安全區、或矩形不合理時回傳全 0，不讓版面亂掉 */
export function computeSafeInsets(visible: SizeLike, safe: SafeRectLike | null | undefined): SafeInsets {
  if (!safe || !(visible.width > 0) || !(visible.height > 0)) return { ...NO_INSETS };
  if (!(safe.width > 0) || !(safe.height > 0)) return { ...NO_INSETS };
  const left = Math.max(0, safe.x);
  const bottom = Math.max(0, safe.y);
  const right = Math.max(0, visible.width - (safe.x + safe.width));
  const top = Math.max(0, visible.height - (safe.y + safe.height));
  // 內縮超過畫面一半一定是資料有問題（例如單位不一致），當作沒有安全區
  if (left + right >= visible.width / 2 || top + bottom >= visible.height / 2) return { ...NO_INSETS };
  return { left, right, top, bottom };
}

export interface CutinTextLayoutInput {
  /** 畫面（Canvas）寬高 */
  view: SizeLike;
  insets: SafeInsets;
  /** 本刻黑邊高度（letterbox × letterboxMax × 畫面高） */
  letterboxHeight: number;
  /** 文字區高度 */
  textHeight: number;
  /** 文字離邊界的間距 */
  margin?: number;
}

export interface CutinTextLayout {
  /** 文字區中心 y（以畫面中心為原點、向上為正） */
  centerY: number;
  /** 文字區可用寬度（已扣安全區左右內縮） */
  width: number;
  /** 文字區中心 x（安全區左右不對稱時置中於安全區） */
  centerX: number;
}

/**
 * 文字區擺在畫面下方：必須同時在「下方黑邊之上」與「安全區（Home bar）之上」。
 * 黑邊從畫面邊緣算起；安全區底部內縮也從畫面邊緣算起，兩者取較大者再往上留間距。
 */
export function layoutCutinText(input: CutinTextLayoutInput): CutinTextLayout {
  const margin = input.margin ?? 24;
  const floor = Math.max(input.letterboxHeight, input.insets.bottom);
  const bottomEdge = floor + margin;
  const centerY = -input.view.height / 2 + bottomEdge + input.textHeight / 2;
  const left = input.insets.left + margin;
  const right = input.insets.right + margin;
  return {
    centerY,
    centerX: (left - right) / 2,
    width: Math.max(0, input.view.width - left - right),
  };
}

// ── 暫代圖（PROG-2-9352）──────────────────────────────────────────────────────
// 還沒畫專屬分鏡圖的武將，施放奧義時改播一張「暫代圖」，確保流程與演出時序先接通，
// 也讓「這位武將還沒有分鏡圖」在畫面上一眼看得出來，才不會忘記替換。

/** 暫代圖的 imageKey：不對應任何 resources 檔案，由播放層以純色貼圖現場產生 */
export const PLACEHOLDER_CUTIN_IMAGE_KEY = 'ult_cutin/__placeholder__';

/** 疊在暫代圖上的警示字樣（畫面層與測試共用） */
export const PLACEHOLDER_CUTIN_TEXT = '暫代圖 待替換';

/** 總開關：關掉後沒有專屬分鏡圖的武將直接接奧義特效（維持舊行為） */
export const PLACEHOLDER_CUTIN_ENABLED = true;

/** 載入設定與分鏡圖的等待上限（毫秒）：超過就當沒有專屬 cut-in，改播暫代圖 */
export const CUTIN_LOAD_TIMEOUT_MS = 3000;

/**
 * 單次演出（含載入、播放）的真實時間硬上限（毫秒）。
 * 超過就強制收掉疊層並恢復戰場，回合流程不會被演出卡死。完整版約 3.5 秒，留足餘裕。
 */
export const CUTIN_HARD_TIMEOUT_MS = 12000;

/** 組出暫代圖的 cut-in 設定：單格、約 1.7 秒（完整版），重播縮成 0.8 秒；格式與專屬設定完全相同 */
export function buildPlaceholderCutinConfig(generalId: string, generalName: string, skillName = '奧義'): CutinConfig {
  return {
    id: `ult_cutin.placeholder.${cutinFileKey(generalId)}`,
    generalId,
    generalName,
    skillName,
    intro: { duration: 0.25, dimTo: 0.68, letterboxIn: 0.15 },
    panels: [
      {
        imageKey: PLACEHOLDER_CUTIN_IMAGE_KEY,
        hold: 1.0,
        zoomFrom: 1.12,
        zoomTo: 1.02,
        zoomEase: 'punch',
        transition: 'cut',
        flashFrames: 3,
        flashColor: [1, 1, 1],
        flashPeak: 0.9,
        shakeAmp: 8,
        shakeFrames: 8,
        // 暫代圖以前完全靜音（PROG-2-9435）：補切入風聲與命中吼聲，走下方的替代音表
        // PROG-2-9859：實測前 0.3 秒有聲、之後 1.3 秒空白直到 fireball；中段補一記重擊、結尾補一記命中，整段不再冷場
        sfx: [{ key: 'whoosh', offset: -0.04 }, { key: 'roar', offset: 0.03 }, { key: 'hit_heavy', offset: 0.6 }, { key: 'hit', offset: 0.98 }],
      },
    ],
    textOverlays: [{ panelIndex: 0, delay: 0.1, fadeIn: 0.133, generalName, skillName }],
    outro: { duration: 0.35, flashFrames: 3, flashColor: [0.86, 0.94, 1], burstColor: [0.47, 0.75, 1], letterboxOut: 0.2 },
    speed: 1,
    replay: { duration: 0.8, panelIndices: [0], playVoice: false },
    letterboxMax: 44 / 720,
    referenceFps: 30,
    shakeSeed: 1,
  };
}

/**
 * 「仍在用暫代圖」的清單：每次有武將因沒有專屬分鏡圖而改播暫代圖，就登記一次。
 * 全專案只有這一處；要替換時看 list() 或 console 的警告即可，替換完（放圖＋設定＋加進 index.json）就不會再出現。
 */
export class PlaceholderCutinRegistry {
  private readonly used = new Map<string, { name: string; count: number }>();

  /** 登記一次使用；回傳是否為本次執行第一次（呼叫端只在第一次記警告，避免洗版） */
  note(generalId: string, generalName: string): boolean {
    const key = cutinFileKey(generalId);
    const entry = this.used.get(key);
    if (entry) {
      entry.count += 1;
      return false;
    }
    this.used.set(key, { name: generalName, count: 1 });
    return true;
  }

  /** 目前仍用暫代圖的武將（id 已正規化） */
  list(): Array<{ generalId: string; name: string; count: number }> {
    return Array.from(this.used.entries()).map(([generalId, v]) => ({ generalId, name: v.name, count: v.count }));
  }

  clear(): void {
    this.used.clear();
  }
}

/** 全域唯一的暫代圖使用紀錄 */
export const placeholderCutinRegistry = new PlaceholderCutinRegistry();

/**
 * 分鏡音效替代表（PROG-2-9435）：分鏡設定寫的 whoosh／hit／hit_heavy／roar 在音效庫都還沒有檔案，
 * 以前缺檔只記一行 log、整段奧義幾乎靜音。先對到音效庫既有、語意最接近的 clip；
 * 等正式音檔放進 audio bundle（檔名與 key 相同）後，把該列刪掉即可，不用改程式。
 * clip 依檔名推測、未實機試聽，聽起來不對只改這張表。語音（voice）不替代：沒有配音寧可不出聲。
 */
export const CUTIN_SFX_FALLBACK: Readonly<Record<string, string>> = {
  whoosh: 'wave',
  hit: 'hurt',
  hit_heavy: 'boom',
  roar: 'thunder',
};

/** 分鏡音效 key → 實際要播的 clip 名；不在替代表就原樣播 */
export function resolveCutinSfxClip(key: string): string {
  return CUTIN_SFX_FALLBACK[key] ?? key;
}
