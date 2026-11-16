import { FootPoint, UnitPresentationCore, UnitPresentationState } from './UnitPresentationCore';

export type DuelPhase = 'approach' | 'faceoff' | 'exchange' | 'outcome' | 'return' | 'done';
export interface DuelParticipant {
  unit: UnitPresentationCore;
  sideline: FootPoint;
  arena: FootPoint;
}
export interface DuelExchange { attacker: 0 | 1; dodged: boolean }

/** 長回合單挑保留開頭、第一次閃避及最後一擊，避免演出超過回合安全逾時。 */
export function selectDuelExchanges(events: readonly DuelExchange[]): DuelExchange[] {
  if (events.length <= 4) return [...events];
  const dodge = events.findIndex(event => event.dodged);
  const selected = new Set([0, 1, events.length - 1, dodge >= 0 ? dodge : Math.floor(events.length / 2)]);
  // 網頁版建置會把 Set 的展開編成「整個集合當一個元素」，一定要用 Array.from（PROG-2-9355）
  return Array.from(selected).sort((a, b) => a - b).map(i => events[i]);
}

/** 整段單挑演出的硬上限（秒）；超過就直接收尾，演出出任何狀況都不能卡住回合（PROG-2-9355）。 */
export const DUEL_PRESENTATION_HARD_LIMIT_SECONDS = 15;

/** 單挑只控制演出，勝負由既有戰鬥結算提供。 */
export class DuelPresentationCore {
  private total = 0;
  private phase: DuelPhase = 'approach';
  private elapsed = 0;
  private readonly actors: [DuelParticipant, DuelParticipant];
  private exchangeIndex = 0;
  constructor(a: DuelParticipant, b: DuelParticipant, private readonly winner: 0 | 1 | null, private readonly fallen: boolean,
    private readonly exchanges: readonly DuelExchange[] = [{ attacker: 0, dodged: false }]) {
    this.actors = [a, b];
    for (const actor of this.actors) actor.unit.moveToWithin(actor.arena, 2);
  }
  public step(dt: number): { phase: DuelPhase; units: [UnitPresentationState, UnitPresentationState] } {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('dt 必須為有限非負數');
    const units: [UnitPresentationState, UnitPresentationState] = [this.actors[0].unit.step(dt), this.actors[1].unit.step(dt)];
    this.elapsed += dt;
    this.total += dt;
    if (this.phase !== 'done' && this.total >= DUEL_PRESENTATION_HARD_LIMIT_SECONDS) this.enter('done');
    else if (this.phase === 'approach' && units.every(u => u.action === 'idle')) this.enter('faceoff');
    else if (this.phase === 'faceoff' && this.elapsed >= 0.6) {
      if (this.startExchange()) this.enter('exchange');
      else this.finishExchange();
    } else if (this.phase === 'exchange' && this.elapsed >= 1.6) {
      this.exchangeIndex++;
      if (this.startExchange()) this.enter('exchange');
      else this.finishExchange();
    } else if (this.phase === 'outcome' && this.elapsed >= 1.8) {
      this.actors.forEach((actor, i) => { if (!(this.fallen && this.winner !== null && i !== this.winner)) actor.unit.moveToWithin(actor.sideline, 2, true); });
      this.enter('return');
    } else if (this.phase === 'return' && units.every(u => u.action === 'idle' || u.action === 'fall')) this.enter('done');
    return { phase: this.phase, units };
  }
  /** 回傳是否真的開始了一招；招式資料缺漏時回 false，由呼叫端直接進結果階段。 */
  private startExchange(): boolean {
    const event = this.exchanges[this.exchangeIndex];
    if (!event || (event.attacker !== 0 && event.attacker !== 1)) return false;
    this.actors[event.attacker].unit.play('attack');
    this.actors[1 - event.attacker].unit.play(event.dodged ? 'dodge' : 'hit');
    return true;
  }
  private finishExchange(): void {
    if (this.winner !== null && this.fallen) this.actors[1 - this.winner].unit.play('fall');
    this.enter('outcome');
  }
  private enter(phase: DuelPhase): void { this.phase = phase; this.elapsed = 0; }
}
