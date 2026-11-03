import { Node, UITransform, resources, sp } from 'cc';
import { Faction } from '../../core/config/Constants';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';

/**
 * 戰場武將 Spine 2D 疊層（spine-trial 共用骨架產出的 Spine 4.2 角色）。
 *
 * 武將 3D 模型照舊在世界座標，這裡在 UI 層掛一個 sp.Skeleton，位置由 UnitRenderer 每次投影傳入；
 * 平時循環 idle，武將出招時播一次 spear_thrust 再回 idle。
 * Unity 對照：像在 Canvas 上掛一個 SkeletonGraphic 跟著角色的螢幕座標走。
 */
interface SpineGeneralEntry {
  /** resources 底下的 SkeletonData 路徑（不含副檔名） */
  path: string;
  /** 骨架 1300px 高，縮到戰場上的顯示比例 */
  scale: number;
}

/** 陣營預設角色；之後改成依武將 id 對表即可 */
const SPINE_GENERAL_BY_FACTION: Record<string, SpineGeneralEntry> = {
  [Faction.Player]: { path: 'spine/generals/zhao_yun/zhao', scale: 0.22 },
  [Faction.Enemy]: { path: 'spine/generals/zhang_fei/char2', scale: 0.22 },
};

const IDLE = 'idle';
const ATTACK = 'spear_thrust';

export class SpineGeneralOverlay {
  private readonly nodes = new Map<string, Node>();
  private readonly loading = new Set<string>();

  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number) {}

  /** 確保該陣營的 Spine 武將存在並移到 uiPos；回傳是否已顯示（可用來隱藏 3D 模型） */
  public sync(faction: Faction, uiX: number, uiY: number): boolean {
    const node = this.nodes.get(faction);
    if (node?.isValid) {
      node.setPosition(uiX, uiY, 0);
      return true;
    }
    void this.load(faction, uiX, uiY);
    return false;
  }

  public remove(faction: Faction): void {
    const node = this.nodes.get(faction);
    if (node?.isValid) node.destroy();
    this.nodes.delete(faction);
  }

  public playAttack(faction: Faction): void {
    const skel = this.nodes.get(faction)?.getComponent(sp.Skeleton);
    if (!skel) return;
    skel.setAnimation(0, ATTACK, false);
    skel.addAnimation(0, IDLE, true, 0);
  }

  private async load(faction: Faction, x: number, y: number): Promise<void> {
    const entry = SPINE_GENERAL_BY_FACTION[faction];
    const parent = this.getParent();
    if (!entry || !parent || this.loading.has(faction)) return;
    this.loading.add(faction);
    resources.load(entry.path, sp.SkeletonData, (err, data) => {
      this.loading.delete(faction);
      if (err || !data) {
        UCUFLogger.warn(LogCategory.BATTLE, `[SpineGeneralOverlay] 載入失敗: ${entry.path}`, err);
        return;
      }
      if (!parent.isValid || this.nodes.has(faction)) return;
      const node = new Node(`SpineGeneral_${faction}`);
      node.layer = this.layer();
      node.addComponent(UITransform);
      parent.addChild(node);
      node.setSiblingIndex(0); // 壓在 HUD 標籤之下
      // 原畫朝畫面右；敵方鏡像朝左
      node.setScale(faction === Faction.Enemy ? -entry.scale : entry.scale, entry.scale, 1);
      node.setPosition(x, y, 0);
      const skel = node.addComponent(sp.Skeleton);
      skel.premultipliedAlpha = false;
      skel.skeletonData = data;
      skel.setAnimation(0, IDLE, true);
      this.nodes.set(faction, node);
    });
  }
}
