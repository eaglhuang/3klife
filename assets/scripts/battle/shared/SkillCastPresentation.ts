// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9410.md（放招手感）
/**
 * SkillCastPresentation — 武將放招演出的純計算（PROG-2-9410）。不碰 cc，單元測試可直接跑。
 *
 * 11/18 使用者裁決：放招前蓄力停頓 0.4 秒；招式名改在畫面中央橫幅（不是頭頂小字），約 0.8～1 秒，
 * 連續放招排隊或合併，不擋命中特效，避開右側戰報面板。
 *
 * 時序（同一次施放）：蓄力（招式名橫幅同時出現）→ 0.4 秒後出招特效 → 之前已排隊的命中與傷害跳字。
 * 奧義有漫畫分鏡時，分鏡本身就是停頓與招式名，不再加蓄力與橫幅；
 * SSR／UR 戰法已有半身立繪閃現（含招式名），只加蓄力、不再疊橫幅。
 *
 * Unity 對照：Timeline 上「Charge → Release」兩段 Clip，橫幅是一條 UI Track，連續觸發時合併成同一條。
 */

export const SKILL_CAST_TIMING = {
  /** 蓄力停頓（使用者裁決 0.4 秒） */
  chargeSec: 0.4,
  /** 橫幅停留（不含淡入淡出；總長約 0.9 秒，落在裁決的 0.8～1 秒內） */
  bannerHoldSec: 0.6,
  bannerFadeInSec: 0.12,
  bannerFadeOutSec: 0.2,
  /** 同一方在這段時間內連續放招，併進同一條橫幅（秒） */
  mergeWindowSec: 0.5,
  /** 一條橫幅最多列幾個招式名，再多就寫「等 N 招」 */
  maxNamesShown: 3,
} as const;

export interface SkillCastPlan {
  /** 出招前停頓幾秒（0 = 不停頓） */
  chargeSec: number;
  /** 要不要出中央招式名橫幅 */
  banner: boolean;
}

/**
 * 決定這次施放要怎麼演。
 * @param ultCutin 會播奧義漫畫分鏡（分鏡已暫停戰場並帶招式名字幕）
 * @param tacticFlash 會播 SSR／UR 戰法立繪閃現（已帶招式名）
 */
export function planSkillCast(opts: { ultCutin: boolean; tacticFlash: boolean }): SkillCastPlan {
  if (opts.ultCutin) return { chargeSec: 0, banner: false };
  return { chargeSec: SKILL_CAST_TIMING.chargeSec, banner: !opts.tacticFlash };
}

export type SkillBannerSide = 'player' | 'enemy';

export interface SkillBannerItem {
  side: SkillBannerSide;
  /** 施放者名字（可空：敵方自動戰法有時沒帶） */
  caster: string;
  /** 招式名（合併後會有多個，依施放順序） */
  names: string[];
}

/** 橫幅文字：「孫策　疾風突進」；合併時「孫策　疾風突進・火攻」；超過上限寫「等 N 招」。 */
export function skillBannerText(item: SkillBannerItem, maxNames: number = SKILL_CAST_TIMING.maxNamesShown): string {
  const names = item.names.filter(n => n.length > 0);
  const shown = names.length > maxNames ? `${names.slice(0, maxNames - 1).join('・')} 等 ${names.length} 招` : names.join('・');
  return item.caster ? `${item.caster}　${shown}` : shown;
}

export type SkillBannerPushResult = 'show' | 'merged' | 'queued';

/**
 * 橫幅排隊／合併（純狀態，時間由呼叫端傳入）。
 * - 沒有橫幅在顯示：直接顯示。
 * - 同一方、且目前這條才剛出現不久（mergeWindowSec 內）：併進目前這條，呼叫端改字並重新計時停留。
 * - 其他情況排隊；排隊最多兩條，再多就併進最後一條同方的（或最後一條），不讓橫幅一直拖下去。
 */
export class SkillBannerQueue {
  private current: { item: SkillBannerItem; startedAt: number } | null = null;
  private readonly waiting: SkillBannerItem[] = [];

  constructor(private readonly mergeWindowSec: number = SKILL_CAST_TIMING.mergeWindowSec, private readonly maxWaiting = 2) {}

  public get showing(): SkillBannerItem | null { return this.current?.item ?? null; }
  public get pending(): number { return this.waiting.length; }

  public push(item: SkillBannerItem, now: number): SkillBannerPushResult {
    const incoming: SkillBannerItem = { side: item.side, caster: item.caster, names: [...item.names] };
    const cur = this.current;
    if (!cur) { this.current = { item: incoming, startedAt: now }; return 'show'; }
    if (cur.item.side === incoming.side && now - cur.startedAt <= this.mergeWindowSec && this.waiting.length === 0) {
      cur.item.names.push(...incoming.names);
      cur.startedAt = now;
      return 'merged';
    }
    const sameSide = [...this.waiting].reverse().find(w => w.side === incoming.side);
    if (this.waiting.length >= this.maxWaiting) {
      (sameSide ?? this.waiting[this.waiting.length - 1]).names.push(...incoming.names);
      return 'queued';
    }
    const last = this.waiting[this.waiting.length - 1];
    if (last && last.side === incoming.side) { last.names.push(...incoming.names); return 'queued'; }
    this.waiting.push(incoming);
    return 'queued';
  }

  /** 目前這條播完了；回傳下一條（沒有就 null）。 */
  public finish(now: number): SkillBannerItem | null {
    const next = this.waiting.shift() ?? null;
    this.current = next ? { item: next, startedAt: now } : null;
    return next;
  }

  public clear(): void { this.current = null; this.waiting.length = 0; }
}

/** 蓄力時武將身上的「聚氣」表現：慢慢膨脹、越來越抖，放招瞬間回到原狀。k 為 0～1 的蓄力進度。 */
export function sampleChargePose(elapsed: number, durationSec: number): { scale: number; shakeX: number } {
  if (!(durationSec > 0) || !Number.isFinite(elapsed) || elapsed < 0 || elapsed >= durationSec) return { scale: 1, shakeX: 0 };
  const k = elapsed / durationSec;
  const ease = k * k * (3 - 2 * k);
  return { scale: 1 + 0.07 * ease, shakeX: Math.sin(elapsed * 90) * 2 * ease };
}
