// ─── Minimal EventSystem stub（迴避 cc module 依賴）──────────────────────────
// EventSystem.ts imports 'cc' which is unavailable in Node.js CLI.
// This stub replicates the emit/on/off contract exactly.
export class StubEventSystem {
    private _listeners = new Map<string, Array<(payload?: unknown) => void>>();
    on<T = unknown>(event: string, handler: (payload?: T) => void): () => void {
        const list = this._listeners.get(event) ?? [];
        list.push(handler as (payload?: unknown) => void);
        this._listeners.set(event, list);
        return () => {
            const l = this._listeners.get(event);
            if (l) this._listeners.set(event, l.filter(h => h !== handler));
        };
    }
    emit<T = unknown>(event: string, payload?: T): void {
        (this._listeners.get(event) ?? []).slice().forEach(h => h(payload as unknown));
    }
}

// ─── Minimal ChildPanelBase stub（不依賴 cc.Node）────────────────────────────

/**
 * 用於測試的最小 ChildPanelBase stub。
 * 複製 _shallowDiff / _lastData / onDiffUpdate 的邏輯以驗證合約，
 * 迴避 Cocos runtime 依賴（UISkinResolver / UITemplateBinder 無法在 Node.js 建立）。
 */
export class StubPanel {
    dataSource: string = 'test';
    _lastData: unknown = null;
    onDataUpdateCalled = 0;
    onDiffUpdateCalled = 0;
    lastChangedKeys: string[] = [];

    _shallowDiff(prev: unknown, next: unknown): string[] {
        if (prev === null || typeof prev !== 'object' || Array.isArray(prev)) return [];
        if (next === null || typeof next !== 'object' || Array.isArray(next)) return [];
        const prevObj = prev as Record<string, unknown>;
        const nextObj = next as Record<string, unknown>;
        const changedKeys: string[] = [];
        const allKeys = new Set([...Object.keys(prevObj), ...Object.keys(nextObj)]);
        for (const key of allKeys) {
            if (prevObj[key] !== nextObj[key]) changedKeys.push(key);
        }
        return changedKeys;
    }

    onDataUpdate(_data: unknown): void {
        this.onDataUpdateCalled++;
    }

    onDiffUpdate(data: unknown, changedKeys: string[]): void {
        this.onDiffUpdateCalled++;
        this.lastChangedKeys = changedKeys;
        // default fallback
        this.onDataUpdate(data);
    }

    /** 模擬 CompositePanel.applyContentState 的分派邏輯 */
    applyData(data: unknown): void {
        const changedKeys = this._shallowDiff(this._lastData, data);
        if (this._lastData !== null && changedKeys.length === 0) return; // skip unchanged
        this._lastData = data;
        this.onDiffUpdate(data, changedKeys);
    }
}
