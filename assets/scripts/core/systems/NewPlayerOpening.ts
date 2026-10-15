// @spec-source → 新手開場規格書.md §4 第一幕（分鏡 1–4）、§5.1 信件正文、§2 開場流程；OPEN-01；PROG-2-0646
/**
 * NewPlayerOpening — 新玩家開場的幕序與第一幕文字，純 TS，不依賴 cc。
 *
 * 幕序：intro（第一幕情懷定錨）→ destiny（第二幕宿命轉蛋）。
 * 第三幕首戰教學由戰場內的教學提示與大廳 3 段式引導負責（不在大廳內推進），
 * 第四幕紅顏需要「首戰已通過」的存檔旗標，尚未有欄位，暫不自動觸發。
 * 台詞為 PM 暫定文字：規格只給主軸（§5.1），沒有逐字稿，正式文案待企劃。
 *
 * Unity 對照：像 Timeline 的 Track 清單，每一幕只定義「何時進、何時出」，
 * 畫面層依 current() 決定顯示哪個 Panel。
 */
import type { OpeningFlowConfig } from '../config/OpeningFlowConfig';
import { destinyOpeningPhase } from './DestinyOpening';
import { OpeningFlowController } from './OpeningFlowController';

export const OPENING_INTRO_DONE = 'intro-done';

export interface IntroPanel {
    id: 'ancient' | 'letter' | 'pixel' | 'vortex';
    text: string;
    /** 此頁按鈕文字（信件頁是規格指定的「開始宿命轉蛋」） */
    button: string;
}

/** 第一幕四個分鏡：黑場古文 → Win95 信件 → 像素回憶 → 時空漩渦 */
export const INTRO_PANELS: readonly IntroPanel[] = Object.freeze([
    { id: 'ancient', text: '天下大勢，分久必合，合久必分。\n祖紋命篆在黑暗中浮現，一個名字接著一個名字。', button: '繼續' },
    { id: 'letter', text: '你是不是又在回味那段三國舊作？\n遺憾，是可以被改寫的。\n我們為你備好了夢境觀測位與全息頭盔，幾位脾氣很硬、卻願意跟隨你的宿命之將，正在等你。', button: '開始宿命轉蛋' },
    { id: 'pixel', text: '熟悉的像素地圖、六大諸侯的頭像……\n六色因子的光痕正侵入舊日的記憶。', button: '繼續' },
    { id: 'vortex', text: '白點擴散成漩渦，舊日的靈魂被吸進命盤裂口，\n轉蛋盤自遠而近飛來。', button: '進入宿命' },
]);

/** 新玩家開場：第一幕 intro 以 intro-done 離開，第二幕 destiny 以 destiny-locked 離開 */
export function createNewPlayerOpeningFlow(): OpeningFlowController {
    const config: OpeningFlowConfig = {
        phases: [
            { id: 'intro', enterWhen: (e) => e.type === 'start', leaveWhen: (e) => e.type === OPENING_INTRO_DONE },
            destinyOpeningPhase('destiny', OPENING_INTRO_DONE),
        ],
    };
    return new OpeningFlowController(config);
}
