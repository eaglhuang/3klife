// @spec-source → issue #2238；PROG-2-9403
import { Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { avatarCandidates, battleCandidates, loadFirstAvailableArtCandidate, portraitCandidates } from '../../core/systems/GeneralArtPaths';
import { services } from '../../core/managers/ServiceLoader';

/**
 * 主將沒有 Spine 素材（或素材載不起來）時的 2D 後備外觀：立繪站牌。
 * 原因：沒有 Spine 的武將（孫策、甘寧等）原本退回「藍色通用棋子」，玩家看不出主將是誰（issue #2238）。
 * 圖片順序：Q 版戰鬥圖 → 標準立繪 → 頭像；全部載不到才由呼叫端保留 3D 棋子。
 * Unity 對照：Spine/Animator 缺資源時，改在同位置掛一張 SpriteRenderer 站牌。
 */
export function standeeArtCandidates(generalId: string): string[] {
  return [...battleCandidates(generalId), ...portraitCandidates(generalId), ...avatarCandidates(generalId)];
}

/** 判斷主將是否要改用立繪站牌：沒有 Spine 設定，或該 Spine 素材已確定載不起來。 */
export function needsStandeeFallback(spinePath: string | null | undefined, spineFailed: (path: string) => boolean): boolean {
  return !spinePath || spineFailed(spinePath);
}

/** 站牌顯示高度（畫面像素）：與 Spine 主將的標籤到腳底距離（230）一致，兩種外觀站位大小不跳。 */
export const STANDEE_HEIGHT_PX = 230;

interface StandeeEntry {
  generalId: string;
  node: Node | null;
  loading: boolean;
  /** 已確定所有候選圖都載不到；不再重試，讓呼叫端保留 3D 棋子。 */
  failed: boolean;
}

export class GeneralPortraitStandee {
  private readonly entries = new Map<string, StandeeEntry>();

  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number) {}

  /** 更新站牌位置；回傳 true 表示站牌已顯示（呼叫端可隱藏 3D 棋子）。 */
  public sync(id: string, generalId: string, x: number, y: number, visible = true): boolean {
    let entry = this.entries.get(id);
    if (entry && entry.generalId !== generalId) { this.remove(id); entry = undefined; }
    if (!entry) {
      entry = { generalId, node: null, loading: false, failed: false };
      this.entries.set(id, entry);
    }
    if (!entry.node && !entry.loading && !entry.failed) this.load(id, entry);
    const node = entry.node;
    if (!node || !node.isValid) return false;
    node.active = visible;
    node.setPosition(x, y, 0);
    return true;
  }

  public has(id: string): boolean { return this.entries.has(id); }

  public remove(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.entries.delete(id);
    if (entry.node?.isValid) entry.node.destroy();
  }

  public clear(): void {
    for (const id of Array.from(this.entries.keys())) this.remove(id);
  }

  private load(id: string, entry: StandeeEntry): void {
    entry.loading = true;
    void loadFirstAvailableArtCandidate<SpriteFrame>(
      standeeArtCandidates(entry.generalId),
      (path) => services().resource.loadSpriteFrame(path).catch(() => null),
    ).then((frame) => {
      entry.loading = false;
      const parent = this.getParent();
      // 載入期間單位可能已被移除或換人：不再掛節點
      if (this.entries.get(id) !== entry) return;
      if (!frame || !parent?.isValid) { entry.failed = !frame; return; }
      const node = new Node(`GeneralStandee_${id}`);
      node.layer = this.layer();
      const transform = node.addComponent(UITransform);
      const size = frame.originalSize;
      const height = STANDEE_HEIGHT_PX;
      const width = size && size.height > 0 ? height * size.width / size.height : height * 0.66;
      transform.setContentSize(width, height);
      transform.setAnchorPoint(0.5, 0); // 腳底中點對齊站位
      const sprite = node.addComponent(Sprite);
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      sprite.spriteFrame = frame;
      parent.addChild(node);
      node.setSiblingIndex(0);
      entry.node = node;
    });
  }
}
