/**
 * DuelStageDemo.ts — 生活層 Q 頭切磋 demo 元件（PROG-2-10231）
 *
 * 掛在任何 Canvas 子節點上即可（或執行期 addComponent）。自己持有一個 QAnimManager 與舞台，
 * 整個元件只有一個 update。對外：globalThis.__lifeDuel.run(mode, seed) 手動開一場（驗收截圖用）。
 * 結算走 startDuel：先扣 InteractionQuota 一次互動，再模擬；結果只顯示、不寫傷勢（傷勢由呼叫端經伺服器 API 寫）。
 */
import { _decorator, Color, Component, Label, Node, UITransform } from 'cc';
import clipsJson from '../../../../../resources/data/q-motion-clips.json';
import budgetJson from '../../../../../resources/data/q-anim-budget.json';
import { QAnimManager } from '../../anim/QAnimManager';
import type { QAnimBudget, QClipLibrary } from '../../anim/types';
import { startDuel } from '../../../../core/life/duel/DuelInvite';
import { DEFAULT_DUEL_CONFIG } from '../../../../core/life/duel/DuelSim';
import type { DuelFighter, DuelMode, DuelResult } from '../../../../core/life/duel/DuelTypes';
import { InteractionQuota } from '../../../../ui/life/InteractionQuota';
import { DuelStageView } from './DuelStageView';

const { ccclass, property } = _decorator;

const GUAN: DuelFighter = { id: 'guanyu', force: 97, intellect: 75 };
const ZHANG: DuelFighter = { id: 'zhangfei', force: 98, intellect: 30 };

@ccclass('DuelStageDemo')
export class DuelStageDemo extends Component {
    @property({ tooltip: '頭高 H（像素）' })
    headH = 80;

    @property({ tooltip: '切磋速度倍率' })
    speed = 1;

    private anim: QAnimManager | null = null;
    private stage: DuelStageView | null = null;
    private caption: Label | null = null;
    private readonly quota = new InteractionQuota();
    private seq = 0;

    onLoad(): void {
        const budget = budgetJson as unknown as QAnimBudget;
        this.anim = new QAnimManager(clipsJson as unknown as QClipLibrary, budget, { tier: 'high' });
        const stageNode = new Node('DuelStage');
        stageNode.layer = this.node.layer;
        stageNode.addComponent(UITransform).setContentSize(900, 400);
        this.node.addChild(stageNode);
        this.stage = new DuelStageView(stageNode, this.anim, DEFAULT_DUEL_CONFIG);
        const cn = new Node('DuelCaption');
        cn.layer = this.node.layer;
        cn.addComponent(UITransform).setContentSize(900, 40);
        this.caption = cn.addComponent(Label);
        this.caption.fontSize = 24;
        this.caption.color = new Color(255, 255, 255, 255);
        cn.setPosition(0, this.headH * 2.4, 0);
        this.node.addChild(cn);
        (globalThis as Record<string, unknown>)['__lifeDuel'] = { run: (mode?: DuelMode, seed?: number) => this.run(mode ?? 'serious', seed), demo: this };
    }

    /** 開一場：guanyu vs zhangfei；回傳是否成功開打（互動次數用完會回 false） */
    run(mode: DuelMode, seed?: number): boolean {
        if (!this.stage || this.stage.playing) return false;
        const s = seed ?? 1000 + ++this.seq;
        const out = startDuel({ a: GUAN, b: ZHANG, mode, seed: s }, { id: ZHANG.id }, true, this.quota);
        if (!out.started || !out.result) {
            this.setCaption(`互動次數不足：${out.reason ?? ''}`);
            return false;
        }
        this.setCaption(`${mode === 'friendly' ? '點到為止' : '認真切磋'}（剩餘免費互動 ${this.quota.freeRemaining}）`);
        return this.stage.start(out.result, { headH: this.headH, colors: [new Color(110, 170, 230, 255), new Color(232, 120, 90, 255)], speed: this.speed }, (r) => this.onDone(r));
    }

    private onDone(r: DuelResult): void {
        const who = r.winner === 'a' ? '關羽勝' : r.winner === 'b' ? '張飛勝' : '平手';
        const hurt = r.injury ? `，${r.injury.targetId === 'guanyu' ? '關羽' : '張飛'}${r.injury.level === 'severe' ? '重傷' : '輕傷'}` : '，無傷勢';
        this.setCaption(`${who}（${r.rounds} 回合 ${r.outcomeTier}${hurt}）`);
    }

    private setCaption(text: string): void {
        if (this.caption) this.caption.string = text;
    }

    update(dt: number): void {
        if (!this.anim || !this.stage) return;
        this.anim.update(dt);
        this.stage.update(dt);
    }

    onDestroy(): void {
        const g = globalThis as Record<string, unknown>;
        if ((g['__lifeDuel'] as { demo?: unknown } | undefined)?.demo === this) delete g['__lifeDuel'];
        this.stage?.stop();
        this.stage = null;
        this.anim = null;
    }
}
