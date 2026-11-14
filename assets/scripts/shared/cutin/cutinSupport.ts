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
import type { PlaybackMode } from './cutinCore';

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
