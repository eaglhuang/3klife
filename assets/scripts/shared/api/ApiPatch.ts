// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.7 存檔補丁白名單；PROG-2-9201
/**
 * ApiPatch — JSON Pointer 補丁（add／replace／remove 子集）與穩定序列化（零依賴）。
 *
 * 白名單依頂層欄位判斷；任何一段路徑是 __proto__／constructor／prototype 一律拒絕。
 */

export interface PatchOp {
    op: 'add' | 'replace' | 'remove';
    path: string;
    value?: unknown;
}

const BAD_SEGMENTS = ['__proto__', 'constructor', 'prototype'];

/** 解析 JSON Pointer；不是合法指標或含危險段回 null */
export function parsePointer(path: string): string[] | null {
    if (typeof path !== 'string' || path.length < 2 || path[0] !== '/') return null;
    const segments = path.slice(1).split('/').map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
    if (segments.some((s) => BAD_SEGMENTS.indexOf(s) >= 0)) return null;
    return segments;
}

/** 補丁的頂層欄位名；不合法回 null */
export function patchRoot(path: string): string | null {
    const segments = parsePointer(path);
    return segments ? segments[0] : null;
}

function clone<T>(value: T): T {
    return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}

/** 套用補丁到深拷貝並回傳；任何一項失敗丟 Error（呼叫端整批拒絕，不留半套） */
export function applyPatch(doc: unknown, ops: readonly PatchOp[]): unknown {
    const root = clone(doc) as Record<string, unknown>;
    for (const op of ops) {
        const segments = parsePointer(op.path);
        if (!segments) throw new Error(`補丁路徑不合法：${String(op.path)}`);
        let parent: unknown = root;
        for (let i = 0; i < segments.length - 1; i++) {
            parent = (parent as Record<string, unknown>)?.[segments[i]];
            if (parent === null || typeof parent !== 'object') throw new Error(`補丁路徑不存在：${op.path}`);
        }
        const key = segments[segments.length - 1];
        const container = parent as Record<string, unknown>;
        if (op.op === 'remove') {
            if (Array.isArray(container)) container.splice(Number(key), 1);
            else delete container[key];
        } else if (Array.isArray(container)) {
            const index = key === '-' ? container.length : Number(key);
            if (!Number.isInteger(index) || index < 0 || index > container.length) throw new Error(`補丁索引不合法：${op.path}`);
            if (op.op === 'add') container.splice(index, 0, clone(op.value));
            else container[index] = clone(op.value);
        } else {
            container[key] = clone(op.value);
        }
    }
    return root;
}

/** 鍵排序的穩定序列化，用於雜湊 */
export function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
    if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}
