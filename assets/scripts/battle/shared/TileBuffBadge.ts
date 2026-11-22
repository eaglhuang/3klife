// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9411.md（buff 格統一）
/**
 * TileBuffBadge — 棋盤 buff 格的顯示內容（PROG-2-9411）。純計算，不碰 cc，單元測試可直接跑。
 *
 * 棋盤 buff 格和單位頭頂狀態圖示（PROG-2-9399）用同一套語言：圓底一個字（攻／命），
 * 增益金邊、減益紅紫邊；格子另外標倍數（×3、÷5），稀有格加金色外圈。
 * 吃到時圖示飛向單位頭頂，戰報與音效分成增益和減益兩種（以前減益格也寫「吃到增益」）。
 * 只決定「畫什麼」，buff 格的生成規則與數值一律不動。
 *
 * Unity 對照：buff 格 Prefab 的 ViewModel；View 層（UnitRenderer）只照這裡的結果畫。
 */
import { STATUS_ICON_DEFS, type StatusIconKind } from './UnitStatusIcons';

/** 與 BattleState.TileBuff 相同的欄位子集（避免純邏輯層依賴 BattleState） */
export interface TileBuffSource {
  stat: 'attack' | 'hp';
  op: 'mul' | 'div';
  factor: number;
  rarity: 'normal' | 'rare';
}

export interface TileBuffBadge {
  /** 對應頭頂狀態圖示的種類（吃到後頭頂會出現同一個圖示） */
  kind: StatusIconKind;
  /** 圓底中央的字，與頭頂圖示同一個字 */
  glyph: string;
  isDebuff: boolean;
  /** 圖示旁的倍數：「×3」「÷5」 */
  amountText: string;
  rare: boolean;
}

export function tileBuffBadgeOf(buff: TileBuffSource): TileBuffBadge {
  const isDebuff = buff.op === 'div';
  const kind: StatusIconKind = buff.stat === 'attack'
    ? (isDebuff ? 'attack-down' : 'attack-up')
    : (isDebuff ? 'hp-down' : 'hp-up');
  const factor = Number.isFinite(buff.factor) ? Math.round(buff.factor * 10) / 10 : 1;
  return {
    kind,
    glyph: STATUS_ICON_DEFS[kind].glyph,
    isDebuff,
    amountText: `${isDebuff ? '÷' : '×'}${factor}`,
    rare: buff.rarity === 'rare',
  };
}

/**
 * 由吃到後的增減量反推圖示來源（格子此時已從 BattleState 移除）：
 * 攻擊有變動就算攻擊格，否則算生命格；變差算減益。倍數不顯示在飛行圖示上，填 1。
 */
export function tileBuffSourceFromDelta(attackDelta: number, hpDelta: number): TileBuffSource {
  const stat = attackDelta !== 0 ? 'attack' : 'hp';
  return { stat, op: tileBuffPickupIsDebuff(attackDelta, hpDelta) ? 'div' : 'mul', factor: 1, rarity: 'normal' };
}

/** 吃到 buff 格的結果：兩項都沒變好、且至少一項變差，才算減益（與頭頂光環判定一致） */
export function tileBuffPickupIsDebuff(attackDelta: number, hpDelta: number): boolean {
  return attackDelta <= 0 && hpDelta <= 0 && (attackDelta < 0 || hpDelta < 0);
}

/** 戰報一行：「我方吃到增益：攻擊 x 3 攻擊 +40」「敵方吃到減益：生命 / 5 生命 -96」 */
export function tileBuffPickupLogLine(opts: { isPlayer: boolean; buffText: string; attackDelta: number; hpDelta: number }): string {
  const deltaText = tileBuffDeltaText(opts.attackDelta, opts.hpDelta);
  const side = opts.isPlayer ? '我方' : '敵方';
  const tone = tileBuffPickupIsDebuff(opts.attackDelta, opts.hpDelta) ? '減益' : '增益';
  return `${side}吃到${tone}：${opts.buffText}${deltaText ? ` ${deltaText}` : ''}`;
}

/** 飄字用的增減量：「攻擊 +40 生命 -96」；兩項都是 0 時為空字串 */
export function tileBuffDeltaText(attackDelta: number, hpDelta: number): string {
  const sign = (n: number): string => (n > 0 ? '+' : '');
  return [
    attackDelta !== 0 ? `攻擊 ${sign(attackDelta)}${attackDelta}` : '',
    hpDelta !== 0 ? `生命 ${sign(hpDelta)}${hpDelta}` : '',
  ].filter(Boolean).join(' ');
}

/** 拾取飛入：從格子飛到單位頭頂的時間，以及途中的弧線高度（UI 像素） */
export const TILE_BUFF_PICKUP = {
  flySec: 0.32,
  arcPx: 60,
} as const;

/** 飛入軌跡取樣：k 為 0～1；回傳相對起點到終點的內插位置與縮放（起飛放大、抵達縮小） */
export function sampleTileBuffPickup(k: number, from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number; scale: number } {
  const c = Math.min(1, Math.max(0, Number.isFinite(k) ? k : 1));
  const e = 1 - (1 - c) * (1 - c);
  const arc = Math.sin(Math.PI * c) * TILE_BUFF_PICKUP.arcPx;
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e + arc,
    scale: c < 0.25 ? 1 + c * 1.2 : 1.3 - (c - 0.25) * 0.8,
  };
}
