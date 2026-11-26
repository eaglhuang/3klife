/**
 * 史境天下年終頒獎典禮演出腳本組裝器（PROG-2-9601 PR2）
 * 遵循 doc_spec_1285 §5~§6 與使用者 11/22 關鍵裁決：
 * 1. 完整演出一次到位（雙主持對話、逐榜揭曉、諸侯全息立繪彈幕、冠軍感言）
 * 2. 雙主持動態傳承（第 1 屆史小境＋司馬徽；第 2 屆起上屆紅顏榜首＋上屆新人王）
 * 3. 壓軸雙層梯形大合照 DTO 構圖生成，輕量存檔、即時拼裝重現
 * 4. 嚴格落實「先結算發獎、後播放演出」，支援跳過與加速，跳過絕不遺漏任何獎項發放
 */

import { BoardRankResult, RankingCandidate } from './AnnualRankingTypes';

export interface CeremonyHost {
  hostId: string;
  name: string;
  title: string;
  avatarSpritePath: string;
  isFirstYearHost: boolean;
}

export interface MonarchHologram {
  monarchId: string;
  name: string;
  factionId: string;
  hologramShaderKey: string;
  quoteBubble: string;
}

export type StoryCueType =
  | 'PROLOGUE_HOST_ENTRY'
  | 'MONARCH_HOLOGRAM_CONNECT'
  | 'BOARD_ANNOUNCE_TOP10'
  | 'CHAMPION_SPOTLIGHT'
  | 'CHAMPION_SPEECH'
  | 'MONARCH_BULLET_CHAT'
  | 'GRAND_PHOTO_SHUTTER'
  | 'EPILOGUE_FAREWELL';

export interface CeremonyStoryCue {
  id: string;
  type: StoryCueType;
  order: number;
  boardId?: string;
  speakerId?: string;
  speakerName?: string;
  speakerAvatar?: string;
  dialogueText: string;
  hologramMonarchs?: MonarchHologram[];
  topCandidates?: RankingCandidate[];
  champion?: RankingCandidate;
  photoDto?: CeremonyPhotoBackdropDto;
  durationMs: number;
}

export interface CeremonyPhotoBackdropDto {
  year: number;
  layoutPattern: 'TRAPEZOID_TWO_LAYER';
  hosts: string[];
  champions: Record<string, string>; // boardId -> generalId
  frontRowGenerals: string[]; // 雙主持 + 冠軍 + 玩家代表 (半身立繪)
  backRowGenerals: string[];  // 諸侯全息投影 + 其餘前 10 入圍者 (小人/頭像)
  createdAtTick: number;
}

export interface CeremonyScriptAssemblyInput {
  year: number;
  boardResults: Record<string, BoardRankResult>;
  previousHosts?: { charmHostId: string; rookieHostId: string };
  livingMonarchIds: Array<{ id: string; name: string; factionId: string }>;
  playerFactionId?: string;
  gameTick?: number;
}

export class CeremonyScriptAssembler {
  /**
   * 組裝完整年終頒獎典禮演出腳本（StoryCue[]）
   */
  public static assembleCeremony(input: CeremonyScriptAssemblyInput): {
    hosts: [CeremonyHost, CeremonyHost];
    cues: CeremonyStoryCue[];
    photoBackdropDto: CeremonyPhotoBackdropDto;
  } {
    const { year, boardResults, previousHosts, livingMonarchIds, playerFactionId, gameTick } = input;

    // 1. 決定雙主持人
    const hosts = this.resolveHosts(year, previousHosts);

    // 2. 構建諸侯全息投影
    const holograms = this.resolveMonarchHolograms(livingMonarchIds);

    const cues: CeremonyStoryCue[] = [];
    let cueOrder = 1;

    // 序幕：主持人登台開場
    cues.push({
      id: `cue_${cueOrder}`,
      type: 'PROLOGUE_HOST_ENTRY',
      order: cueOrder++,
      speakerId: hosts[0].hostId,
      speakerName: hosts[0].name,
      speakerAvatar: hosts[0].avatarSpritePath,
      dialogueText: year === 1
        ? `大家好！我是頭盔客服史小境！歡迎來到第 ${year} 屆《史境天下風雲榜》年度頒獎盛典！`
        : `歡迎諸位英雄豪傑！第 ${year} 屆風雲榜盛典正式開幕！我是本屆大典主持 ${hosts[0].name}！`,
      durationMs: 3000
    });

    cues.push({
      id: `cue_${cueOrder}`,
      type: 'PROLOGUE_HOST_ENTRY',
      order: cueOrder++,
      speakerId: hosts[1].hostId,
      speakerName: hosts[1].name,
      speakerAvatar: hosts[1].avatarSpritePath,
      dialogueText: year === 1
        ? `……好！` // 司馬徽經典名梗
        : `與 ${hosts[0].name} 一同登台主持，乃我莫大榮幸！今夜就讓我們揭曉全天下最強風雲人物！`,
      durationMs: 2500
    });

    // 諸侯全息立繪連線上線
    cues.push({
      id: `cue_${cueOrder}`,
      type: 'MONARCH_HOLOGRAM_CONNECT',
      order: cueOrder++,
      speakerId: 'system',
      speakerName: '雲端金殿系統',
      dialogueText: `跨伺服器金殿全息投影連線就緒，曹操、劉備、孫權等各路諸侯全息投影已入場入座觀禮！`,
      hologramMonarchs: holograms,
      durationMs: 2500
    });

    // 3. 逐榜揭曉演出迴圈
    const championsMap: Record<string, string> = {};
    const frontRowSet = new Set<string>([hosts[0].hostId, hosts[1].hostId]);
    const backRowSet = new Set<string>();

    // 收集所有諸侯進入後排
    holograms.forEach((m) => backRowSet.add(m.monarchId));

    const boardIds = Object.keys(boardResults);
    for (const bId of boardIds) {
      const bRes = boardResults[bId];
      if (!bRes || bRes.candidates.length === 0) continue;

      const top10 = bRes.candidates.slice(0, 10);
      const champion = top10[0];
      championsMap[bId] = champion.generalId;
      frontRowSet.add(champion.generalId);

      // 其餘入圍者放入後排
      for (let i = 1; i < top10.length; i++) {
        if (!frontRowSet.has(top10[i].generalId)) {
          backRowSet.add(top10[i].generalId);
        }
      }

      // 階段 A：揭曉入圍
      cues.push({
        id: `cue_${cueOrder}`,
        type: 'BOARD_ANNOUNCE_TOP10',
        order: cueOrder++,
        boardId: bId,
        speakerId: hosts[0].hostId,
        speakerName: hosts[0].name,
        dialogueText: `現在公布【${bId}】榜單年度入圍名單！群雄逐鹿，異動劇烈！`,
        topCandidates: top10,
        durationMs: 3500
      });

      // 階段 B：聚光燈定格榜首與評審因果短評
      cues.push({
        id: `cue_${cueOrder}`,
        type: 'CHAMPION_SPOTLIGHT',
        order: cueOrder++,
        boardId: bId,
        speakerId: hosts[1].hostId,
        speakerName: hosts[1].name,
        dialogueText: `榮獲本屆【${bId}】魁首的是——${champion.generalId}！${champion.evidence?.summary || ''}`,
        champion,
        durationMs: 3000
      });

      // 階段 C：榜首得獎感言
      cues.push({
        id: `cue_${cueOrder}`,
        type: 'CHAMPION_SPEECH',
        order: cueOrder++,
        boardId: bId,
        speakerId: champion.generalId,
        speakerName: champion.generalId,
        dialogueText: this.buildChampionSpeech(champion, bId),
        champion,
        durationMs: 3000
      });

      // 階段 D：諸侯彈幕氣泡吐槽
      cues.push({
        id: `cue_${cueOrder}`,
        type: 'MONARCH_BULLET_CHAT',
        order: cueOrder++,
        boardId: bId,
        dialogueText: `座席全息投影諸侯引發騷動與熱烈彈幕評論！`,
        hologramMonarchs: this.buildMonarchReaction(holograms, champion, playerFactionId),
        durationMs: 2500
      });
    }

    // 4. 壓軸大合照（雙層梯形構圖）
    const photoBackdropDto: CeremonyPhotoBackdropDto = {
      year,
      layoutPattern: 'TRAPEZOID_TWO_LAYER',
      hosts: [hosts[0].hostId, hosts[1].hostId],
      champions: championsMap,
      frontRowGenerals: Array.from(frontRowSet),
      backRowGenerals: Array.from(backRowSet).filter((id) => !frontRowSet.has(id)),
      createdAtTick: gameTick !== undefined ? gameTick : year * 1000
    };

    cues.push({
      id: `cue_${cueOrder}`,
      type: 'GRAND_PHOTO_SHUTTER',
      order: cueOrder++,
      speakerId: hosts[0].hostId,
      speakerName: hosts[0].name,
      dialogueText: `全體獲獎名將與觀禮諸侯，請看向全息鏡頭——3、2、1，笑一個！（哢嚓！）`,
      photoDto: photoBackdropDto,
      durationMs: 4000
    });

    cues.push({
      id: `cue_${cueOrder}`,
      type: 'EPILOGUE_FAREWELL',
      order: cueOrder++,
      speakerId: hosts[1].hostId,
      speakerName: hosts[1].name,
      dialogueText: `大合照已定格為金殿大背景！今夜盛典圓滿落幕，英雄豪傑，明年風雲榜再會！`,
      photoDto: photoBackdropDto,
      durationMs: 3000
    });

    return {
      hosts,
      cues,
      photoBackdropDto
    };
  }

  /**
   * 解析主持人人選
   */
  private static resolveHosts(
    year: number,
    previousHosts?: { charmHostId: string; rookieHostId: string }
  ): [CeremonyHost, CeremonyHost] {
    if (year <= 1 || !previousHosts || !previousHosts.charmHostId || !previousHosts.rookieHostId) {
      return [
        {
          hostId: 'shi_xiaojing',
          name: '史小境',
          title: '頭盔 AI 客服',
          avatarSpritePath: 'sprites/ui_families/ceremony/hosts/shi_xiaojing',
          isFirstYearHost: true
        },
        {
          hostId: 'sima_hui',
          name: '司馬徽',
          title: '水鏡名士',
          avatarSpritePath: 'sprites/ui_families/ceremony/hosts/sima_hui',
          isFirstYearHost: true
        }
      ];
    }

    return [
      {
        hostId: previousHosts.charmHostId,
        name: previousHosts.charmHostId,
        title: '上屆紅顏魅力魁首',
        avatarSpritePath: `sprites/generals/avatars/${previousHosts.charmHostId}`,
        isFirstYearHost: false
      },
      {
        hostId: previousHosts.rookieHostId,
        name: previousHosts.rookieHostId,
        title: '上屆年度新人王',
        avatarSpritePath: `sprites/generals/avatars/${previousHosts.rookieHostId}`,
        isFirstYearHost: false
      }
    ];
  }

  /**
   * 解析諸侯全息投影列表
   */
  private static resolveMonarchHolograms(
    monarchs: Array<{ id: string; name: string; factionId: string }>
  ): MonarchHologram[] {
    const defaultMonarchs = monarchs && monarchs.length > 0 ? monarchs : [
      { id: 'cao_cao', name: '曹操', factionId: 'wei' },
      { id: 'liu_bei', name: '劉備', factionId: 'shu' },
      { id: 'sun_quan', name: '孫權', factionId: 'wu' }
    ];

    return defaultMonarchs.map((m) => ({
      monarchId: m.id,
      name: m.name,
      factionId: m.factionId,
      hologramShaderKey: 'shader_hologram_cyan_scanline',
      quoteBubble: `【${m.name} 全息連線中】`
    }));
  }

  /**
   * 生成榜首得獎感言（性格化文案）
   */
  private static buildChampionSpeech(candidate: RankingCandidate, boardId: string): string {
    switch (boardId) {
      case 'kills':
        return `刀口舔血，何懼強虜！天下英雄，誰敢再與我一戰！`;
      case 'governance':
        return `民為邦本，本固邦寧。此乃境內百姓勤勉之功，吾不敢居功自矜！`;
      case 'charm':
        return `感謝天下萬千知音抬愛！願此一曲清商，常伴諸君太平盛世！`;
      case 'rookie':
        return `承蒙諸位前輩名宿提攜指點！晚輩定當秉持初心，克紹箕裘！`;
      default:
        return `能得此殊榮，幸甚之至！`;
    }
  }

  /**
   * 依據榜首與諸侯陣營生成彈幕吐槽
   */
  private static buildMonarchReaction(
    monarchs: MonarchHologram[],
    champion: RankingCandidate,
    playerFactionId?: string
  ): MonarchHologram[] {
    return monarchs.map((m) => {
      let quote = '……甚善！';
      if (m.monarchId === 'cao_cao') {
        quote = champion.isPlayerOwned ? '……此子若不能為我所用，斷不可留！' : '生子當如孫仲謀，得將當如斯人也！';
      } else if (m.monarchId === 'liu_bei') {
        quote = champion.isPlayerOwned ? '得天下英才而聚之，漢室中興有望矣！' : '天下何其多奇士，吾當思之！';
      } else if (m.monarchId === 'sun_quan') {
        quote = '長江天塹之外，更有這般人物，實令人擊節讚賞！';
      }
      return {
        ...m,
        quoteBubble: quote
      };
    });
  }
}
