// @spec-source → 可結緣女性來源系統.md §E #5（子嗣女兒分流）、§G（及笄劇本）；PROG-2-1787
/**
 * DaughterRoutePopupController — 女兒及笄選路線彈窗的流程（純邏輯，不依賴 cc）
 *
 * 所有 texts / actives / enabled 的 key 都等於 daughter-route-main.json 的節點 id，
 * tests/DaughterRouteFlow.test.ts 會逐一比對。
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 Cycle / Choose，畫面層拿 GetView() 一次刷新。
 */
import { daughterComingOfAgeLine, type DaughterRoute } from '../../core/systems/DaughterComingOfAge';

export interface DaughterRoutePopupView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface DaughterRoutePopupDeps {
    session: {
        readonly daughtersAwaitingChoice: ReadonlyArray<{ id: string; name: string }>;
        assignDaughterRouteFor(daughterId: string, route: DaughterRoute): Promise<{ ok: boolean }>;
    };
}

const ROUTE_TEXT: Readonly<Record<DaughterRoute, string>> = {
    frontline: '前線武將',
    palace: '後宮女官',
    instructor: '教官儲備',
};

export class DaughterRoutePopupController {
    private _targetId: string | null = null;
    private _notice = '';

    constructor(private readonly _deps: DaughterRoutePopupDeps) {}

    hasPending(): boolean {
        return this._deps.session.daughtersAwaitingChoice.length > 0;
    }

    open(): void {
        this._notice = '';
    }

    cycle(step = 1): void {
        const list = this._deps.session.daughtersAwaitingChoice;
        if (list.length === 0) return;
        const current = list.findIndex((d) => d.id === this._resolve()?.id);
        this._targetId = list[(((current + step) % list.length) + list.length) % list.length].id;
        this._notice = '';
    }

    async choose(route: DaughterRoute): Promise<boolean> {
        const current = this._resolve();
        if (!current) return false;
        const result = await this._deps.session.assignDaughterRouteFor(current.id, route);
        if (result.ok) this._notice = `${current.name} 擇定前路：${ROUTE_TEXT[route]}。`;
        return result.ok;
    }

    getView(): DaughterRoutePopupView {
        const list = this._deps.session.daughtersAwaitingChoice;
        const current = this._resolve();
        return {
            texts: {
                drTitle: '女兒及笄',
                closeDrLabel: current ? '稍後' : '關閉',
                drPager: current ? `${list.findIndex((d) => d.id === current.id) + 1} / ${list.length}` : '0 / 0',
                drEmptyHint: '目前沒有等待擇路的女兒。',
                drLine: current ? daughterComingOfAgeLine(current.name) : '',
                drNotice: this._notice,
                frontlineLabel: ROUTE_TEXT.frontline,
                palaceLabel: ROUTE_TEXT.palace,
                instructorLabel: ROUTE_TEXT.instructor,
            },
            actives: { drPanel: current !== null, drEmptyHint: current === null },
            enabled: {
                btnCloseDr: true,
                btnPrevDr: list.length > 1,
                btnNextDr: list.length > 1,
                btnFrontline: current !== null,
                btnPalace: current !== null,
                btnInstructor: current !== null,
            },
        };
    }

    private _resolve(): { id: string; name: string } | null {
        const list = this._deps.session.daughtersAwaitingChoice;
        return list.find((d) => d.id === this._targetId) ?? list[0] ?? null;
    }
}
