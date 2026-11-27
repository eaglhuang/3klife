// @spec-source → 新手第一年樂趣四功能規格書 doc_spec_1347 §1.4 優先序、§3 FUN-02、§4 FUN-03、§5 FUN-04；PROG-2-10185
/**
 * FunLobbyDirector — 大廳裡新手樂趣三個小劇場的排程（View 層）。
 *
 * 優先序（規格 §1.4）：FUN-02 滿月酒 ＞ FUN-04 首次招募自我介紹 ＞ FUN-03 勝仗搭話；同時排隊就依序一個一個播，
 * 不並行。每個都「先結算（reward.claim、存檔）、後演出」，跳過或閃退重進都不會重複入帳。
 * 觸發點：大廳準備好、名冊新增招募武將、季度更新後都會呼叫 scheduleFunTick（防抖）。
 *
 * 世界觀：武將一律古代口吻；白話吐槽是主角內心 OS，在舞台上顯示成「（心想）」淡色小字。
 */
import { Node } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { GAME_SESSION_EVENTS } from '../../core/managers/GameSession';
import { FriendshipService } from '../../core/services/FriendshipService';
import { claimFunReward } from '../../core/fun/FunReward';
import {
    FUN_STAGE_LINES_JSON, clearVictoryPending, getStageLines, markMoonPartyDone, markRecruitIntroPlayed, moonGuestBeat,
    moonPartyChild, normalizeStageLines, pickMoonGuests, recordMoonGuests, recruitIntroFor, selectRecruitBatch,
    setStageLines, victoryChatLine, victoryGrantKey,
    type FunStageLines, type MoonChildInput, type MoonGuestCandidate, type StageGeneral, type StageRenderEnv,
} from '../../core/fun/FunStageLines';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { loadGeneralAvatar } from '../core/GeneralAvatarLoader';
import { countFunStageShown, playFunStage, stopFunStage, type FunStageBeat, type FunStagePlan } from './FunStageView';

/** 還沒播的新招募武將（記憶體；大廳沒開時先排著，回大廳補播） */
const _recruitQueue: StageGeneral[] = [];
let _busy = false;
let _timer: ReturnType<typeof setTimeout> | null = null;
let _disposeEvents: (() => void) | null = null;
let _canvasHost: Node | null = null;
let _linesLoading: Promise<FunStageLines | null> | null = null;

function ensureLines(): Promise<FunStageLines | null> {
    const cached = getStageLines();
    if (cached) return Promise.resolve(cached);
    if (_linesLoading) return _linesLoading;
    _linesLoading = services().resource.loadJson(FUN_STAGE_LINES_JSON)
        .then((raw: unknown) => { setStageLines(normalizeStageLines(raw)); return getStageLines(); })
        .catch(() => null)
        .finally(() => { _linesLoading = null; });
    return _linesLoading;
}

function renderEnv(): StageRenderEnv {
    const s = services();
    return { translate: (key, ...args) => s.i18n.t(key, ...args), honor: s.i18n.t('fun.honor.lord') };
}

function stageGeneral(id: string): StageGeneral | null {
    const g = services().session.roster.find((x) => x.id === id);
    return g ? { id: g.id, name: g.name, gender: g.gender, age: g.age, personality: g.personality } : null;
}

function basePlan(mode: FunStagePlan['mode'], slots: FunStagePlan['slots'], beats: FunStageBeat[], onBeat?: (i: number) => void): FunStagePlan {
    const t = services().i18n;
    return {
        mode, slots, beats, onBeat,
        osPrefix: t.t('fun.os.prefix'), skipLabel: t.t('fun.stage.skip'), tapLabel: t.t('fun.stage.tap'),
        loadAvatar: (id) => loadGeneralAvatar(id, true),
    };
}

// ── FUN-02 滿月酒 ───────────────────────────────────────────────────────

async function runMoonParty(lines: FunStageLines): Promise<boolean> {
    const s = services();
    const roster = s.session.roster;
    const children = roster.map((g) => g as unknown as MoonChildInput & { name?: string; gender?: string });
    const season = s.session.gameTime.totalSeasonsElapsed;
    const child = moonPartyChild(lines, children, season, s.session.funState());
    if (!child) return false;
    const env = renderEnv();
    const seed = s.session.magistrateUid ?? '';
    // 賓客在事件時刻算好並寫入存檔（重進同一批人）
    let state = s.session.funState();
    let guestIds = state.moonParty && state.moonParty.childId === child.id && state.moonParty.guestIds.length > 0 ? state.moonParty.guestIds : [];
    if (guestIds.length === 0) {
        const lead = s.session.leadGeneralId;
        const family = [child.fatherId, child.motherId].filter((id): id is string => !!id).map(stageGeneral).filter((g): g is StageGeneral => g !== null);
        const kinIds = new Set([child.fatherId, child.motherId].filter((id): id is string => !!id));
        const candidates: MoonGuestCandidate[] = roster
            .filter((g) => g.id !== child.id && g.id !== lead && !kinIds.has(g.id))
            .map((g) => ({ id: g.id, name: g.name, gender: g.gender, age: g.age, personality: g.personality, friendship: FriendshipService.getInstance().get(g.id) }));
        guestIds = pickMoonGuests(lines, candidates, family, seed);
        if (guestIds.length === 0) return false;
        state = recordMoonGuests(state, child.id, guestIds);
        s.session.setFunState(state);
    }
    const beats: FunStageBeat[] = [{ text: env.translate('fun.fun02.open') }];
    const slots: Array<{ generalId: string; name: string }> = [];
    for (const id of guestIds) {
        const guest = stageGeneral(id);
        if (!guest) continue;
        const beat = moonGuestBeat(lines, guest, child, env);
        if (!beat) continue;
        // 先結算：每位賓客的賀禮一次入帳（grantKey 去重）
        const outcome = await claimFunReward(s.api, { bundleId: beat.bundleId, grantKey: beat.grantKey, sourceKind: 'fun02', sourceRef: id });
        const note = outcome.ok && outcome.applied > 0 && beat.giftName ? env.translate('fun.fun02.gift.line', beat.giftName, String(outcome.applied)) : beat.giftName;
        slots.push({ generalId: id, name: guest.name ?? id });
        beats.push({ slot: slots.length - 1, speakerName: guest.name ?? id, text: beat.toastText, osText: beat.osText, noteText: note });
    }
    if (slots.length === 0) return false;
    beats.push({ text: env.translate('fun.fun02.close') });
    const plan = basePlan('modal', slots, beats, (i) => UCUFLogger.info(LogCategory.UI, `[FUN-02] beat ${i + 1}/${beats.length} ${beats[i].speakerName ?? 'narration'}`));
    const outcome = await playFunStage(_canvasHost, plan);
    // 演出被跳過也標記完成（獎勵已入帳）；被別的畫面硬中止（beatsShown 0）才留到下次
    if (outcome.beatsShown > 0 || outcome.completed) {
        s.session.setFunState(markMoonPartyDone(s.session.funState(), child.id, guestIds));
        countFunStageShown('fun02');
    }
    UCUFLogger.info(LogCategory.UI, `[FUN-02] 滿月酒演出結束 guests=${slots.length} completed=${outcome.completed} beats=${outcome.beatsShown}`);
    return true;
}

// ── FUN-04 首次招募自我介紹 ─────────────────────────────────────────────

async function runRecruitIntros(lines: FunStageLines): Promise<boolean> {
    if (_recruitQueue.length === 0) return false;
    const s = services();
    const batch = selectRecruitBatch(_recruitQueue.splice(0, _recruitQueue.length), s.session.funState(), lines.recruit.maxIntroPerBatch);
    if (batch.length === 0) return false;
    const env = renderEnv();
    let played = false;
    for (const general of batch) {
        const state = s.session.funState();
        const intro = recruitIntroFor(lines, general, state, env);
        if (!intro) continue;
        const name = general.name ?? general.id;
        const beats: FunStageBeat[] = [{ slot: 0, speakerName: name, text: intro.introText, osText: intro.osText }];
        const plan = basePlan('modal', [{ generalId: general.id, name }], beats,
            () => UCUFLogger.info(LogCategory.UI, `[FUN-04] ${general.id} announce=${intro.announced} intro=${intro.introText.slice(0, 20)}`));
        const outcome = await playFunStage(_canvasHost, plan);
        if (outcome.beatsShown > 0 || outcome.completed) {
            s.session.setFunState(markRecruitIntroPlayed(s.session.funState(), general.id, intro.announced));
            countFunStageShown('fun04');
            played = true;
        } else {
            _recruitQueue.push(general); // 被硬中止：下次回大廳補播
        }
    }
    return played;
}

// ── FUN-03 勝仗搭話 ─────────────────────────────────────────────────────

async function runVictoryChat(lines: FunStageLines): Promise<boolean> {
    const s = services();
    const state = s.session.funState();
    const pending = state.victoryChat.pending;
    if (!pending) return false;
    // 先清掉待播（同一場只搭話一次）；找不到人或句子就靜默
    s.session.setFunState(clearVictoryPending(state));
    const talker = stageGeneral(pending.talkerId);
    if (!talker) return false;
    const env = renderEnv();
    const line = victoryChatLine(lines, talker, pending, env, s.session.magistrateUid ?? '');
    if (!line) return false;
    // 先結算：與該武將友誼 +1，每位武將每季最多 2 次（grantKey 的 n 依序找沒用過的）
    let gained = 0;
    for (let n = 1; n <= lines.victory.rewardCapPerGeneralPerSeason; n += 1) {
        const outcome = await claimFunReward(s.api, { bundleId: lines.victory.bundleId, grantKey: victoryGrantKey(lines, talker.id, pending.seasonNo, n), sourceKind: 'fun03', sourceRef: talker.id });
        if (!outcome.ok) break;
        if (!outcome.replayed) { gained = outcome.applied; break; }
    }
    const name = talker.name ?? talker.id;
    const beats: FunStageBeat[] = [{ slot: 0, speakerName: name, text: line.text, osText: line.osText }];
    const plan = basePlan('light', [{ generalId: talker.id, name }], beats,
        () => UCUFLogger.info(LogCategory.UI, `[FUN-03] ${talker.id} template=${line.templateId} → ${line.text.slice(0, 20)}`));
    const outcome = await playFunStage(_canvasHost, plan);
    if (outcome.beatsShown > 0) countFunStageShown('fun03');
    if (gained > 0) s.event.emit('SHOW_TOAST', { message: s.i18n.t('fun.victory.float', name, String(gained)), duration: 2 });
    return outcome.beatsShown > 0;
}

// ── 排程 ────────────────────────────────────────────────────────────────

/** 依優先序播一輪：滿月酒 → 自我介紹 → 勝仗搭話；單一飛行，不並行 */
export async function runFunLobbyTick(): Promise<void> {
    if (_busy || !_canvasHost?.isValid) return;
    _busy = true;
    try {
        const lines = await ensureLines();
        if (!lines) return;
        if (await runMoonParty(lines)) return;
        if (await runRecruitIntros(lines)) return;
        await runVictoryChat(lines);
    } catch (error) {
        UCUFLogger.error(LogCategory.UI, '[FUN] 大廳小劇場排程失敗，已略過', error);
    } finally {
        _busy = false;
    }
}

/** 防抖排程：事件連發（十連抽、連續入帳）只跑一次 */
export function scheduleFunTick(delayMs = 800): void {
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(() => {
        _timer = null;
        void runFunLobbyTick().then(() => {
            // 一輪只播一種；還有排隊的就接著播
            if (_recruitQueue.length > 0 || services().session.funState().victoryChat.pending) scheduleFunTick(600);
        });
    }, delayMs);
}

/** 大廳準備好後呼叫：掛上名冊事件、排第一輪；回傳解除函式（離開大廳時呼叫） */
export function startFunLobbyDirector(host: Node): () => void {
    _canvasHost = host;
    _disposeEvents?.();
    const s = services();
    const onRecruited = (added: readonly { id: string; name?: string; gender?: string; age?: number; personality?: StageGeneral['personality'] }[]): void => {
        for (const g of added) {
            if (!_recruitQueue.some((q) => q.id === g.id)) _recruitQueue.push({ id: g.id, name: g.name, gender: g.gender, age: g.age, personality: g.personality });
        }
        scheduleFunTick();
    };
    const off = s.event.on(GAME_SESSION_EVENTS.GeneralsRecruited, onRecruited);
    _disposeEvents = () => {
        off();
        _disposeEvents = null;
        if (_timer) { clearTimeout(_timer); _timer = null; }
        stopFunStage();
        _canvasHost = null;
    };
    scheduleFunTick(1500);
    return _disposeEvents;
}
