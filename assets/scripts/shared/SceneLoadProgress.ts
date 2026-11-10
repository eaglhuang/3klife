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
let root: HTMLDivElement | null = null;
let label: HTMLDivElement | null = null;
let bar: HTMLProgressElement | null = null;
function render(): void {
    if (typeof document === 'undefined' || !document.body) return;
    if (!root) {
        root = document.createElement('div'); root.id = 'scene-load-progress';
        root.setAttribute('role', 'status'); root.setAttribute('aria-live', 'polite');
        Object.assign(root.style, { position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)',
            width: 'min(480px, 94vw)', padding: '16px', boxSizing: 'border-box', pointerEvents: 'none', zIndex: '2147483647',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            gap: '16px', background: 'Canvas', color: 'CanvasText', font: '18px sans-serif', textAlign: 'center' });
        label = document.createElement('div'); bar = document.createElement('progress');
        bar.style.width = 'min(420px, 80vw)'; bar.style.height = '24px';
        root.append(label, bar); document.body.appendChild(root);
    }
    label!.textContent = sceneLoadState.text;
    if (sceneLoadState.total !== null) {
        bar!.max = sceneLoadState.total; bar!.value = Math.min(sceneLoadState.completed, sceneLoadState.total);
    } else bar!.removeAttribute('value'); // 真實完成數但總數未知，不捏造百分比。
}
export const SceneLoadProgress = {
    begin(phase: string, total: number | null = null): void { sceneLoadState.begin(phase, total); render(); },
    report(completed: number, total: number): void { sceneLoadState.report(completed, total); if (sceneLoadState.active) render(); },
    step(): void { sceneLoadState.step(); if (sceneLoadState.active) render(); },
    complete(): void {
        sceneLoadState.active = false;
        root?.remove(); root = null; label = null; bar = null;
    },
    fail(): void {
        if (!sceneLoadState.active || sceneLoadState.failed) return;
        sceneLoadState.failed = true; render();
        if (root && typeof document !== 'undefined') {
            const retry = document.createElement('button'); retry.textContent = '重新載入';
            retry.style.pointerEvents = 'auto';
            retry.onclick = () => window.location.reload(); root.appendChild(retry);
        }
    },
};
