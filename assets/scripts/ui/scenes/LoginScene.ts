// @spec-source → 見 docs/cross-reference-index.md
import { _decorator, Component, Node, UITransform, Widget } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { SceneName } from '../../core/config/Constants';
import { ensureGlobalDevOverlay } from '../dev/GachaDevOverlay';
import { installAdaptiveResolution } from '../core/AdaptiveResolution';
import { UIScreenPreviewHost } from '../components/UIScreenPreviewHost';
import { TitleScreenBinder } from '../core/TitleScreenBinder';

const { ccclass } = _decorator;

/** 場景裡的舊版標題節點；標題畫面掛上後隱藏，掛載失敗時留著當備援 */
const LEGACY_TITLE_NODES: readonly string[] = ['Button', 'TitleLabel', 'SubtitleLabel', 'BtnStart'];

@ccclass('LoginScene')
export class LoginScene extends Component {

    private _title: TitleScreenBinder | null = null;

    onLoad(): void {
        // 舊版標題一開始就藏起來（PROG-2-2240）：標題載入期間只看到啟動底圖，不露出灰底舊標題；載入失敗才拿出來備援。
        this._setLegacyTitleActive(this.node, false);
    }

    start(): void {
        installAdaptiveResolution();
        ensureGlobalDevOverlay();
        void this._mountTitleScreen();
    }

    /** 掛上 title-screen（UI-2-0158）：開始遊戲或點畫面任意處進入；左下公告／設定／帳號尚無功能，先隱藏 */
    private async _mountTitleScreen(): Promise<void> {
        const hostNode = new Node('TitleScreenHost');
        hostNode.active = false; // 先隱藏，避免 showScreen 期間閃屏
        hostNode.layer = this.node.layer;
        hostNode.parent = this.node;
        hostNode.addComponent(UITransform).setContentSize(1920, 1080);
        const widget = hostNode.addComponent(Widget);
        widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
        widget.top = widget.bottom = widget.left = widget.right = 0;
        const host = hostNode.addComponent(UIScreenPreviewHost);
        try {
            await host.showScreen('title-screen');
        } catch (error) {
            console.warn('[LoginScene] title-screen 載入失敗，改用場景內舊標題', error);
            // 備援：拿出舊標題，但預設 Button 沒有遊戲用途，只留 BtnStart 等節點
            this._setLegacyTitleActive(this.node, true);
            this._hideNamed(this.node, 'Button');
            hostNode.destroy();
            this._finishWebBoot();
            return;
        }
        this._title = new TitleScreenBinder(hostNode, Node.EventType.TOUCH_END, { onStart: () => this.onClickStart() });
        hostNode.active = true;
        this._finishWebBoot();
    }

    /** HTML 提示只跨越引擎與標題載入，不遮住已可操作的標題／備援按鈕。 */
    private _finishWebBoot(): void {
        if (typeof document === 'undefined') return;
        document.getElementById('web-boot-progress')?.remove();
        // 標題已畫好才淡出啟動底圖，避免中間閃一格空白畫布
        const backdrop = document.getElementById('web-boot-backdrop');
        if (backdrop) {
            // 這段也被測試以純 JS 執行，不寫型別註記；沒有 rAF 的環境退回 setTimeout
            const nextFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout;
            nextFrame(() => nextFrame(() => {
                if (backdrop.style) backdrop.style.opacity = '0';
                setTimeout(() => backdrop.remove(), 400);
            }));
        }
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('3klife-boot-ready'));
    }

    private _setLegacyTitleActive(root: Node, active: boolean): void {
        for (const child of root.children) {
            if (child.name === 'TitleScreenHost') continue;
            if (LEGACY_TITLE_NODES.includes(child.name)) child.active = active;
            else this._setLegacyTitleActive(child, active);
        }
    }

    private _hideNamed(root: Node, name: string): void {
        for (const child of root.children) {
            if (child.name === name) child.active = false;
            else this._hideNamed(child, name);
        }
    }

    /** 點擊「開始遊戲」按鈕 → SceneManager 攔截，導向 LoadingScene，再由 Loading 切入 LobbyScene */
    public onClickStart() {
        // ✅ 正確流程：Login → LoadingScene（中繼清理） → LobbyScene（大廳）
        services().scene.switchScene(SceneName.Lobby);

        // ---- 若要跳過大廳直接進戰鬥測試，改這行：----
        // services().scene.switchScene(SceneName.Battle);
    }
}
