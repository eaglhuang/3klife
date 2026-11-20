// @spec-source → 劇情（演出）系統 Base 框架規格書 (doc_spec_1188) §5 學府打斷彈窗與結業文案；學府 (doc_spec_1179) §10.2；PROG-2-9208
/**
 * AcademyStoryTexts — 學府打斷點與結業的「顯示哪一句話」改讀劇情資料（story-config.json）。
 *
 * 原本畫面層把打斷種類與結業文案的 i18n key 寫死在程式裡；現在 key 由劇本的 popup 演出指令決定，
 * 這裡只負責「打斷種類 → 劇本 id → popup 的 key」查詢。畫面節點與 i18n key 本身不變。
 * 資料尚未載入或缺劇本時回 null，畫面端顯示空字串（規格：資料不足回空字串，不以模板句硬補）。
 * 劇本設定由 ServiceLoader 載入後呼叫 configureAcademyStories。
 */
import { DEFAULT_STORY_CONFIG, storyPopupOf, type StoryConfigV1 } from '../../../shared/story/StoryConfig';

/** 學府劇本 id 的命名：STORY_ACADEMY_<打斷種類>；結業完成訊息為 STORY_ACADEMY_GRADUATED */
export const ACADEMY_STORY_PREFIX = 'STORY_ACADEMY_';
export const ACADEMY_GRADUATED_STORY_ID = 'STORY_ACADEMY_GRADUATED';

let _config: StoryConfigV1 = DEFAULT_STORY_CONFIG;

export function configureAcademyStories(config: StoryConfigV1): void {
    _config = config;
}

export function academyInterruptStoryId(kind: string): string {
    return `${ACADEMY_STORY_PREFIX}${kind}`;
}

/** 打斷點彈窗的標題 key 與內文 key；查無劇本回 null */
export function academyInterruptTextKeys(kind: string): { titleKey: string | null; textKey: string | null } | null {
    return storyPopupOf(_config, academyInterruptStoryId(kind));
}

/** 結業完成訊息的 key；查無劇本回 null */
export function academyGraduatedTextKey(): string | null {
    return storyPopupOf(_config, ACADEMY_GRADUATED_STORY_ID)?.textKey ?? null;
}
