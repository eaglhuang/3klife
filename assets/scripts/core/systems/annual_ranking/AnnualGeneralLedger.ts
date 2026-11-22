/**
 * 史境天下風雲榜通用年度指標帳本（PROG-2-9601）
 * 職責：
 * 1. 記錄每位武將年度各維度動態 metrics 與因果 highlights
 * 2. 嚴格落實戰場一致性（極速決戰、委託代打、手動戰鬥記帳完全相同）
 * 3. Q4 結算後封存年度快照並清空歸零（TC-RNK-01 / TC-RNK-02）
 * 4. 支援存檔序列化與反序列化
 */

import { MetricHighlight } from './AnnualRankingTypes';

export interface LedgerSerializedData {
  year: number;
  metrics: Record<string, Record<string, number>>;
  highlights: Record<string, MetricHighlight[]>;
  snapshots: Record<number, {
    metrics: Record<string, Record<string, number>>;
    highlights: Record<string, MetricHighlight[]>;
  }>;
}

export class AnnualGeneralLedger {
  private _currentYear: number;
  private _metrics: Map<string, Map<string, number>> = new Map();
  private _highlights: Map<string, MetricHighlight[]> = new Map();
  private _snapshots: Map<number, {
    metrics: Record<string, Record<string, number>>;
    highlights: Record<string, MetricHighlight[]>;
  }> = new Map();

  constructor(initialYear: number = 1) {
    this._currentYear = initialYear;
  }

  public get currentYear(): number {
    return this._currentYear;
  }

  /**
   * 累加單項年度指標（可自訂 key，完全解耦）
   */
  public addMetric(
    generalId: string,
    metricKey: string,
    delta: number,
    meta?: Record<string, any>,
    gameTick?: number
  ): void {
    if (!this._metrics.has(generalId)) {
      this._metrics.set(generalId, new Map());
    }
    const generalMap = this._metrics.get(generalId)!;
    const currentVal = generalMap.get(metricKey) || 0;
    generalMap.set(metricKey, currentVal + delta);

    // 若有因果亮點資訊，寫入 highlights
    if (meta) {
      if (!this._highlights.has(generalId)) {
        this._highlights.set(generalId, []);
      }
      this._highlights.get(generalId)!.push({
        key: metricKey,
        value: delta,
        meta,
        timestamp: gameTick !== undefined ? gameTick : this._currentYear * 1000
      });
    }
  }

  /**
   * 取得武將單項指標數值
   */
  public getMetric(generalId: string, metricKey: string): number {
    const generalMap = this._metrics.get(generalId);
    if (!generalMap) return 0;
    return generalMap.get(metricKey) || 0;
  }

  /**
   * 取得武將所有指標數值字典
   */
  public getMetrics(generalId: string): Record<string, number> {
    const result: Record<string, number> = {};
    const generalMap = this._metrics.get(generalId);
    if (generalMap) {
      generalMap.forEach((v, k) => {
        result[k] = v;
      });
    }
    return result;
  }

  /**
   * 取得武將本年度所有因果亮點
   */
  public getHighlights(generalId: string): MetricHighlight[] {
    return this._highlights.get(generalId) || [];
  }

  /**
   * 取得目前有記帳的所有武將 ID
   */
  public getAllGeneralIds(): string[] {
    const ids = new Set<string>();
    this._metrics.forEach((_, id) => ids.add(id));
    this._highlights.forEach((_, id) => ids.add(id));
    return Array.from(ids);
  }

  /**
   * 戰場一致性介面（TC-RNK-02）：
   * 不論手動、極速決戰或委託代打，皆以實際戰鬥結算數據記帳，不打折也不加權。
   */
  public recordBattlePerformance(
    generalId: string,
    kills: number,
    enemyPower: number,
    duelTier: 'none' | 'officer' | 'elite' | 'legend' = 'none',
    isCommander: boolean = false,
    battleMode: 'manual' | 'speed' | 'delegate' = 'manual'
  ): void {
    this.addMetric(generalId, 'kills.total', kills);
    this.addMetric(generalId, 'kills.battleCount', 1);

    // 儲存單場最高戰力對手與單挑紀錄
    const currentMaxEnemy = this.getMetric(generalId, 'kills.maxEnemyPower');
    if (enemyPower > currentMaxEnemy) {
      this.addMetric(generalId, 'kills.maxEnemyPower', enemyPower - currentMaxEnemy);
    }

    this.addMetric(generalId, `duel.${duelTier}`, 1, {
      kills,
      enemyPower,
      duelTier,
      isCommander,
      battleMode
    });
  }

  /**
   * 治理產出記帳介面
   */
  public recordGovernanceOutput(
    generalId: string,
    quarter: number,
    taskType: string,
    output: number,
    effRate: number = 1.0,
    isVolunteered: boolean = false
  ): void {
    const key = `gov.q${quarter}.${taskType}`;
    this.addMetric(generalId, key, output);
    this.addMetric(generalId, 'gov.totalOutput', output, {
      quarter,
      taskType,
      output,
      effRate,
      isVolunteered
    });
  }

  /**
   * 演藝與魅力熱度記帳介面
   */
  public recordCharmPerformance(
    generalId: string,
    playTitle: string,
    theaterPrestige: number,
    playHeat: number,
    repeatCount: number = 0,
    banquetDiploHype: number = 0,
    decayMin: number = 0.6,
    decayStep: number = 0.1
  ): void {
    // 依據 doc_spec_1181 §6.3 計算 repeatDecay
    const decay = Math.max(decayMin, 1.0 - repeatCount * decayStep);
    const playHype = theaterPrestige * playHeat * decay;
    const totalHype = playHype + banquetDiploHype;

    this.addMetric(generalId, 'charm.theaterHype', playHype);
    this.addMetric(generalId, 'charm.banquetHype', banquetDiploHype);
    this.addMetric(generalId, 'charm.totalHype', totalHype, {
      playTitle,
      theaterPrestige,
      playHeat,
      decay,
      banquetDiploHype
    });
  }

  /**
   * 年度結算歸零（TC-RNK-01）：
   * 封存當年度快照至 snapshots，並重置 metrics 與 highlights
   */
  public resetYear(nextYear?: number): void {
    const snapshotMetrics: Record<string, Record<string, number>> = {};
    this._metrics.forEach((map, id) => {
      snapshotMetrics[id] = {};
      map.forEach((v, k) => {
        snapshotMetrics[id][k] = v;
      });
    });

    const snapshotHighlights: Record<string, MetricHighlight[]> = {};
    this._highlights.forEach((list, id) => {
      snapshotHighlights[id] = [...list];
    });

    this._snapshots.set(this._currentYear, {
      metrics: snapshotMetrics,
      highlights: snapshotHighlights
    });

    // 清空重置
    this._metrics.clear();
    this._highlights.clear();

    if (nextYear !== undefined) {
      this._currentYear = nextYear;
    } else {
      this._currentYear += 1;
    }
  }

  /**
   * 取得指定年度歷史快照
   */
  public getSnapshot(year: number): {
    metrics: Record<string, Record<string, number>>;
    highlights: Record<string, MetricHighlight[]>;
  } | undefined {
    return this._snapshots.get(year);
  }

  /**
   * 序列化為純物件供存檔
   */
  public serialize(): LedgerSerializedData {
    const metrics: Record<string, Record<string, number>> = {};
    this._metrics.forEach((map, id) => {
      metrics[id] = {};
      map.forEach((v, k) => {
        metrics[id][k] = v;
      });
    });

    const highlights: Record<string, MetricHighlight[]> = {};
    this._highlights.forEach((list, id) => {
      highlights[id] = [...list];
    });

    const snapshots: Record<number, any> = {};
    this._snapshots.forEach((v, y) => {
      snapshots[y] = v;
    });

    return {
      year: this._currentYear,
      metrics,
      highlights,
      snapshots
    };
  }

  /**
   * 從存檔反序列化復原
   */
  public deserialize(data: LedgerSerializedData): void {
    if (!data) return;
    this._currentYear = data.year || 1;
    this._metrics.clear();
    this._highlights.clear();
    this._snapshots.clear();

    if (data.metrics) {
      Object.keys(data.metrics).forEach((id) => {
        const m = new Map<string, number>();
        Object.keys(data.metrics[id]).forEach((k) => {
          m.set(k, data.metrics[id][k]);
        });
        this._metrics.set(id, m);
      });
    }

    if (data.highlights) {
      Object.keys(data.highlights).forEach((id) => {
        this._highlights.set(id, [...data.highlights[id]]);
      });
    }

    if (data.snapshots) {
      Object.keys(data.snapshots).forEach((yStr) => {
        const y = parseInt(yStr, 10);
        this._snapshots.set(y, data.snapshots[y]);
      });
    }
  }
}
