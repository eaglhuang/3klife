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
  return [...selected].sort((a, b) => a - b).map(i => events[i]);
}

/** 單挑只控制演出，勝負由既有戰鬥結算提供。 */
export class DuelPresentationCore {
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
    if (this.phase === 'approach' && units.every(u => u.action === 'idle')) this.enter('faceoff');
    else if (this.phase === 'faceoff' && this.elapsed >= 0.6) {
      if (this.exchanges.length) { this.startExchange(); this.enter('exchange'); }
      else this.finishExchange();
    } else if (this.phase === 'exchange' && this.elapsed >= 1.6) {
      this.exchangeIndex++;
      if (this.exchangeIndex < this.exchanges.length) { this.startExchange(); this.enter('exchange'); }
      else this.finishExchange();
    } else if (this.phase === 'outcome' && this.elapsed >= 1.8) {
      this.actors.forEach((actor, i) => { if (!(this.fallen && this.winner !== null && i !== this.winner)) actor.unit.moveToWithin(actor.sideline, 2, true); });
      this.enter('return');
    } else if (this.phase === 'return' && units.every(u => u.action === 'idle' || u.action === 'fall')) this.enter('done');
    return { phase: this.phase, units };
  }
  private startExchange(): void {
    const event = this.exchanges[this.exchangeIndex];
    this.actors[event.attacker].unit.play('attack');
    this.actors[1 - event.attacker].unit.play(event.dodged ? 'dodge' : 'hit');
  }
  private finishExchange(): void {
    if (this.winner !== null && this.fallen) this.actors[1 - this.winner].unit.play('fall');
    this.enter('outcome');
  }
  private enter(phase: DuelPhase): void { this.phase = phase; this.elapsed = 0; }
}
