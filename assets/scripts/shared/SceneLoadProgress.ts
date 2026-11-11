// @spec-source → Issue #2074；PROG-2-2216，Web 場景載入回饋。
/** 不依賴 Cocos 資源／Canvas 的 Web 覆蓋層：跨場景且不受 startup opacity=0 影響。 */
export class LoadProgressState {
    public phase = '';
    public completed = 0;
    public total: number | null = null;
    public active = false;
    public failed = false;
    begin(phase: string, total: number | null = null): void {
        this.phase = phase; this.completed = 0;
        this.total = total !== null && Number.isFinite(total) && total > 0 ? total : null;
        this.active = true; this.failed = false;
    }
    report(completed: number, total: number): void {
        if (!this.active || this.failed || !Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return;
        this.total = total;
        this.completed = Math.max(0, Math.min(total, completed));
    }
    step(): void {
        if (this.active && !this.failed) this.completed = this.total === null ? this.completed + 1 : Math.min(this.total, this.completed + 1);
    }
    get text(): string {
        if (this.failed) return '載入失敗，請重新整理後再試。';
        if (this.total === null) return `${this.phase}… 已完成 ${this.completed} 個介面`;
        return `${this.phase}… ${Math.floor(Math.min(1, this.completed / this.total) * 100)}%（${this.completed}/${this.total}）`;
    }
}

export const sceneLoadState = new LoadProgressState();

/**
 * 精緻框＋漸層光棒（PROG-2-2230）：細金框半透明底、6px 光棒，金色漸層上有一道光掃過。
 * 總數未知時光棒改為來回流動的一段光，不捏造百分比。樣式全在這張表，畫面端只切 data-mode 與寬度。
 */
export const SCENE_LOAD_PROGRESS_CSS = `
#scene-load-progress{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);width:min(440px,86vw);
  box-sizing:border-box;padding:10px 16px 12px;pointer-events:none;z-index:2147483647;display:flex;flex-direction:column;
  align-items:stretch;gap:8px;background:linear-gradient(180deg,rgba(28,22,10,.86),rgba(10,8,4,.9));
  border:1px solid rgba(212,175,55,.55);border-radius:4px;
  box-shadow:0 0 0 1px rgba(0,0,0,.6),inset 0 0 12px rgba(212,175,55,.12),0 8px 24px rgba(0,0,0,.55);
  color:#E8D9A8;font:13px/1.4 "Noto Serif TC","Songti TC",serif;letter-spacing:2px;text-align:center}
#scene-load-progress .slp-track{position:relative;height:6px;border-radius:3px;overflow:hidden;
  background:rgba(255,255,255,.06);box-shadow:inset 0 1px 2px rgba(0,0,0,.8),0 0 0 1px rgba(212,175,55,.28)}
#scene-load-progress .slp-fill{position:absolute;left:0;top:0;bottom:0;border-radius:3px;overflow:hidden;
  background:linear-gradient(90deg,#7A5A12,#D4AF37 55%,#FFE7A0);box-shadow:0 0 8px rgba(255,215,0,.55);transition:width .25s ease-out}
#scene-load-progress .slp-fill::after{content:"";position:absolute;top:0;bottom:0;width:40%;left:-40%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);animation:slp-sweep 1.6s linear infinite}
#scene-load-progress[data-mode="indeterminate"] .slp-fill{width:32%;animation:slp-flow 1.8s ease-in-out infinite}
#scene-load-progress[data-mode="failed"] .slp-fill{width:100%;background:#8A2A1E;box-shadow:none}
#scene-load-progress button{pointer-events:auto;align-self:center;margin-top:2px;padding:4px 18px;font:inherit;
  color:#2D1E00;background:linear-gradient(180deg,#FFE088,#D4AF37);border:1px solid #FFF3C4;border-radius:3px;cursor:pointer}
@keyframes slp-sweep{to{left:100%}}
@keyframes slp-flow{0%{left:-32%}100%{left:100%}}
`;

let root: HTMLDivElement | null = null;
let label: HTMLDivElement | null = null;
let fill: HTMLDivElement | null = null;
function render(): void {
    if (typeof document === 'undefined' || !document.body) return;
    if (!root) {
        root = document.createElement('div'); root.id = 'scene-load-progress';
        root.setAttribute('role', 'status'); root.setAttribute('aria-live', 'polite');
        const style = document.createElement('style'); style.textContent = SCENE_LOAD_PROGRESS_CSS;
        label = document.createElement('div'); label.className = 'slp-label';
        const track = document.createElement('div'); track.className = 'slp-track';
        fill = document.createElement('div'); fill.className = 'slp-fill';
        track.append(fill); root.append(style, label, track); document.body.appendChild(root);
    }
    label!.textContent = sceneLoadState.text;
    if (sceneLoadState.failed) {
        root.setAttribute('data-mode', 'failed');
    } else if (sceneLoadState.total !== null) {
        root.setAttribute('data-mode', 'determinate');
        fill!.style.width = `${Math.min(1, sceneLoadState.completed / sceneLoadState.total) * 100}%`;
    } else {
        root.setAttribute('data-mode', 'indeterminate'); // 真實完成數但總數未知，不捏造百分比。
        fill!.style.width = '';
    }
}
export const SceneLoadProgress = {
    begin(phase: string, total: number | null = null): void { sceneLoadState.begin(phase, total); render(); },
    report(completed: number, total: number): void { sceneLoadState.report(completed, total); if (sceneLoadState.active) render(); },
    step(): void { sceneLoadState.step(); if (sceneLoadState.active) render(); },
    complete(): void {
        sceneLoadState.active = false;
        root?.remove(); root = null; label = null; fill = null;
    },
    fail(): void {
        if (!sceneLoadState.active || sceneLoadState.failed) return;
        sceneLoadState.failed = true; render();
        if (root && typeof document !== 'undefined') {
            const retry = document.createElement('button'); retry.textContent = '重新載入';
            retry.onclick = () => window.location.reload(); root.appendChild(retry);
        }
    },
};
