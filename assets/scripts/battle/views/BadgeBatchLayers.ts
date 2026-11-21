/**
 * BadgeBatchLayers — 部隊頭頂徽章分層合批（PROG-2-9713）
 *
 * 舊做法：每塊徽章的底框（Graphics）、兵種圓章（Graphics）、四個文字（各自一張貼圖）交錯排在同一個節點下，
 * 每換一種材質／貼圖就斷一次合批，一塊徽章約 7～8 個 draw call。
 *
 * 新做法：徽章節點（anchor）只留位置、縮放、透明度與避讓用的尺寸；能畫的東西拆到三個共用圖層：
 *   - bg：底框＋兵種圓章，都是同一張底圖（battle_badge_atlas）的精靈 → 全部徽章合成 1 個 draw call
 *   - icon：兵種圖示精靈（同一張圖的連在一起合批）
 *   - text：文字一律用 BITMAP 點陣快取（打包進動態圖集）→ 全部徽章合成約 1 個 draw call
 * 每幀在位置更新後呼叫 sync()，把 anchor 的位置／縮放／顯示／透明度抄給各圖層的代理節點。
 * Unity 對照：類似把同材質的 UI 元素移到同一個 Canvas 子層，讓 batcher 不被插隊打斷。
 */
import { Node, UIOpacity, UITransform } from "cc";

export type BadgeLayerKind = "bg" | "icon" | "text";

interface ProxyEntry {
  node: Node;
  opacity: UIOpacity;
}

interface BadgeLink {
  anchor: Node;
  anchorOpacity: UIOpacity | null;
  proxies: ProxyEntry[];
}

export class BadgeBatchLayers {
  readonly bg: Node;
  readonly icon: Node;
  readonly text: Node;
  private readonly links: BadgeLink[] = [];
  private readonly linkByAnchor = new Map<Node, BadgeLink>();

  constructor(parent: Node, layer: number) {
    this.bg = BadgeBatchLayers.makeLayer("BadgeBgLayer", parent, layer);
    this.icon = BadgeBatchLayers.makeLayer("BadgeIconLayer", parent, layer);
    this.text = BadgeBatchLayers.makeLayer("BadgeTextLayer", parent, layer);
  }

  private static makeLayer(name: string, parent: Node, layer: number): Node {
    const n = new Node(name);
    n.layer = layer;
    n.addComponent(UITransform);
    parent.addChild(n);
    return n;
  }

  get isValid(): boolean {
    return this.bg.isValid && this.icon.isValid && this.text.isValid;
  }

  /** 為 anchor 在指定圖層建立代理節點；之後把要畫的子節點掛在回傳的節點下（本地座標與掛在 anchor 下相同）。 */
  proxyFor(anchor: Node, kind: BadgeLayerKind): Node {
    let link = this.linkByAnchor.get(anchor);
    if (!link) {
      link = { anchor, anchorOpacity: anchor.getComponent(UIOpacity), proxies: [] };
      this.links.push(link);
      this.linkByAnchor.set(anchor, link);
    }
    const layerNode = kind === "bg" ? this.bg : kind === "icon" ? this.icon : this.text;
    const node = new Node(`${anchor.name}_${kind}`);
    node.layer = anchor.layer;
    node.addComponent(UITransform);
    const opacity = node.addComponent(UIOpacity);
    layerNode.addChild(node);
    link.proxies.push({ node, opacity });
    BadgeBatchLayers.copy(link, link.proxies[link.proxies.length - 1]);
    return node;
  }

  /** 受擊的徽章排到各圖層最上面（取代原本 setSiblingIndex 的效果）。 */
  bringToFront(anchor: Node): void {
    const link = this.linkByAnchor.get(anchor);
    if (!link) return;
    for (const p of link.proxies) {
      const parent = p.node.parent;
      if (parent && p.node.getSiblingIndex() < parent.children.length - 1) p.node.setSiblingIndex(parent.children.length - 1);
    }
  }

  /** 每幀位置更新完後呼叫：抄 anchor 狀態；anchor 已銷毀就連代理一起清掉。 */
  sync(): void {
    for (let i = this.links.length - 1; i >= 0; i--) {
      const link = this.links[i];
      if (!link.anchor.isValid) {
        for (const p of link.proxies) if (p.node.isValid) p.node.destroy();
        this.links.splice(i, 1);
        this.linkByAnchor.delete(link.anchor);
        continue;
      }
      for (const p of link.proxies) BadgeBatchLayers.copy(link, p);
    }
  }

  get linkCount(): number {
    return this.links.length;
  }

  private static copy(link: BadgeLink, p: ProxyEntry): void {
    const a = link.anchor;
    const visible = a.activeInHierarchy;
    if (p.node.active !== visible) p.node.active = visible;
    if (!visible) return;
    const pos = a.position;
    const cur = p.node.position;
    if (cur.x !== pos.x || cur.y !== pos.y || cur.z !== pos.z) p.node.setPosition(pos);
    const sc = a.scale;
    const cs = p.node.scale;
    if (cs.x !== sc.x || cs.y !== sc.y) p.node.setScale(sc);
    const op = link.anchorOpacity ? link.anchorOpacity.opacity : 255;
    if (p.opacity.opacity !== op) p.opacity.opacity = op;
  }
}
