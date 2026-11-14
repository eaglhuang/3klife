import { FootPoint, UnitPresentationCore, UnitPresentationState } from './UnitPresentationCore';

export type DuelPhase = 'approach' | 'faceoff' | 'exchange' | 'outcome' | 'return' | 'done';
export interface DuelParticipant {
  unit: UnitPresentationCore;
  sideline: FootPoint;
  arena: FootPoint;
}

/** 單挑只控制演出，勝負由既有戰鬥結算提供。 */
export class DuelPresentationCore {
  private phase: DuelPhase = 'approach';
  private elapsed = 0;
  private readonly actors: [DuelParticipant, DuelParticipant];
  constructor(a: DuelParticipant, b: DuelParticipant, private readonly winner: 0 | 1 | null, private readonly fallen: boolean) {
    this.actors = [a, b];
    for (const actor of this.actors) actor.unit.moveTo(actor.arena);
  }
  public step(dt: number): { phase: DuelPhase; units: [UnitPresentationState, UnitPresentationState] } {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('dt 必須為有限非負數');
    const units: [UnitPresentationState, UnitPresentationState] = [this.actors[0].unit.step(dt), this.actors[1].unit.step(dt)];
    this.elapsed += dt;
    if (this.phase === 'approach' && units.every(u => u.action === 'idle')) this.enter('faceoff');
    else if (this.phase === 'faceoff' && this.elapsed >= 0.6) {
      this.actors[0].unit.play('attack'); this.actors[1].unit.play('hit'); this.enter('exchange');
    } else if (this.phase === 'exchange' && this.elapsed >= 1.6) {
      if (this.winner !== null && this.fallen) this.actors[1 - this.winner].unit.play('fall');
      this.enter('outcome');
    } else if (this.phase === 'outcome' && this.elapsed >= 1.8) {
      this.actors.forEach((actor, i) => { if (!(this.fallen && this.winner !== null && i !== this.winner)) actor.unit.moveTo(actor.sideline, true); });
      this.enter('return');
    } else if (this.phase === 'return' && units.every(u => u.action === 'idle' || u.action === 'fall')) this.enter('done');
    return { phase: this.phase, units };
  }
  private enter(phase: DuelPhase): void { this.phase = phase; this.elapsed = 0; }
}
