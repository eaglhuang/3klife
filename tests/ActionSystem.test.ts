/**
 * ActionSystem 單元測試
 *
 * 測試範圍：
 *   - registerSkills / getSkill / getAllSkillIds：Registry 管理
 *   - playSkill：找不到技能的警告行為
 *   - playSkill：時間軸 step 的 dispatch（mock 服務呼叫）
 *
 * 注意：ActionSystem 的 step 執行依賴 services()（ServiceLoader）。
 * 在純 Node.js 下我們 mock 服務，驗證 step dispatch 邏輯的正確性。
 *
 * Unity 對照：類似 PlayableDirector 技能序列的 Integration Test，
 * 用 fake AudioSource / fake ParticleSystem 驗證 Timeline 邏輯。
 */

import { ActionSystem, SkillDef } from '../assets/scripts/core/systems/ActionSystem';
import { ServiceLoader } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

// ─── Mock 服務 ──────────────────────────────────────────────────────────────

// ─── 測試用技能定義 ─────────────────────────────────────────────────────────

const SIMPLE_SKILL: SkillDef = {
    id: 'test-skill',
    label: '測試技能',
    description: '僅用於單元測試',
    costSp: 50,
    steps: [
        { type: 'audio',     clip: 'fireball',   atTime: 0.0 },
        { type: 'floatText', text: '測試！',       atTime: 0.0 },
    ],
};

const MULTI_STEP_SKILL: SkillDef = {
    id: 'multi-step',
    label: '多步驟技能',
    description: '測試多 step 的時間軸計算',
    costSp: 100,
    steps: [
        { type: 'audio',  clip: 'boom',    atTime: 0.0  },
        { type: 'audio',  clip: 'thunder', atTime: 0.5  },
        { type: 'audio',  clip: 'wave',    atTime: 1.2  },
    ],
};

const VFX_SKILL: SkillDef = {
    id: 'vfx-skill',
    label: '含特效技能',
    description: '音效、特效、浮字各一步',
    costSp: 10,
    steps: [
        { type: 'audio',     clip: 'boom',       atTime: 0 },
        { type: 'vfx',       blockId: 'fire_burst', target: 'targets', atTime: 0 },
        { type: 'floatText', text: '火！',         atTime: 0 },
    ],
};

/** 以假服務與同步 setTimeout 跑一次 playSkill，回傳各服務被呼叫的紀錄 */
function runSkill(previewOnly: boolean | undefined): { vfx: string[]; sfx: string[]; text: string[] } {
    const log = { vfx: [] as string[], sfx: [] as string[], text: [] as string[] };
    const fake = {
        event:     { emit: () => undefined },
        effect:    { playBlock: (id: string) => { log.vfx.push(id); } },
        audio:     { playSfx: (clip: string) => { log.sfx.push(clip); } },
        floatText: { show: (_k: string, t: string) => { log.text.push(t); } },
    };
    const holder = ServiceLoader as unknown as { instance: unknown };
    const oldInstance = holder.instance;
    const oldTimeout = globalThis.setTimeout;
    holder.instance = fake;
    (globalThis as { setTimeout: unknown }).setTimeout = (fn: () => void) => { fn(); return 0; };
    try {
        const sys = new ActionSystem();
        sys.registerSkills([VFX_SKILL]);
        sys.playSkill('vfx-skill', {
            casterUnitId: 'u1',
            casterPos: { x: 0, y: 0, z: 0 },
            targetUnitIds: ['t1'],
            targetPositions: [{ x: 5, y: 0, z: 0 }],
            previewOnly,
        });
    } finally {
        holder.instance = oldInstance;
        (globalThis as { setTimeout: unknown }).setTimeout = oldTimeout;
    }
    return log;
}

// ─── 測試套件 ────────────────────────────────────────────────────────────────

export function createActionSystemSuite(): TestSuite {
    const suite = new TestSuite('ActionSystem');

    // ── Registry ─────────────────────────────────────────────────────────────

    suite.test('registerSkills + getSkill：能查詢到已注冊技能', () => {
        const sys = new ActionSystem();
        sys.registerSkills([SIMPLE_SKILL]);
        const def = sys.getSkill('test-skill');
        assert.isDefined(def, '應能取得已注冊的 SkillDef');
        assert.equals('test-skill', def!.id);
        assert.equals('測試技能', def!.label);
        assert.equals(50, def!.costSp);
    });

    suite.test('getSkill：未注冊的 id 回傳 undefined', () => {
        const sys = new ActionSystem();
        const def = sys.getSkill('no-such-skill');
        assert.equals(undefined, def);
    });

    suite.test('getAllSkillIds：空 registry 回傳空陣列', () => {
        const sys = new ActionSystem();
        const ids = sys.getAllSkillIds();
        assert.lengthEquals(0, ids);
    });

    suite.test('getAllSkillIds：批量注冊後回傳所有 id', () => {
        const sys = new ActionSystem();
        sys.registerSkills([SIMPLE_SKILL, MULTI_STEP_SKILL]);
        const ids = sys.getAllSkillIds();
        assert.lengthEquals(2, ids);
        assert.isTrue(ids.includes('test-skill'));
        assert.isTrue(ids.includes('multi-step'));
    });

    suite.test('registerSkills：重複呼叫不覆蓋舊技能（累積注冊）', () => {
        const sys = new ActionSystem();
        sys.registerSkills([SIMPLE_SKILL]);
        sys.registerSkills([MULTI_STEP_SKILL]);
        assert.lengthEquals(2, sys.getAllSkillIds());
    });

    // ── playSkill：找不到技能 ────────────────────────────────────────────────

    suite.test('playSkill：找不到技能時呼叫 onComplete（不卡住）', (_done?: () => void) => {
        const sys = new ActionSystem();
        let completed = false;
        sys.playSkill('non-existent', {
            casterUnitId:    'u1',
            casterPos:       { x: 0, y: 0, z: 0 },
            targetUnitIds:   [],
            targetPositions: [],
        }, () => { completed = true; });

        // playSkill 找不到技能會立即呼叫 onComplete（同步）
        assert.isTrue(completed, 'onComplete 應立即被呼叫');
    });

    // ── SkillDef 結構驗證 ────────────────────────────────────────────────────

    suite.test('SkillDef steps：costSp 正確', () => {
        const sys = new ActionSystem();
        sys.registerSkills([SIMPLE_SKILL]);
        const def = sys.getSkill('test-skill')!;
        assert.equals(50, def.costSp);
    });

    suite.test('SkillDef steps：step 數量與 atTime 正確', () => {
        const sys = new ActionSystem();
        sys.registerSkills([MULTI_STEP_SKILL]);
        const def = sys.getSkill('multi-step')!;
        assert.lengthEquals(3, def.steps);
        assert.equals(0.0,  def.steps[0].atTime);
        assert.equals(0.5,  def.steps[1].atTime);
        assert.equals(1.2,  def.steps[2].atTime);
    });

    suite.test('SkillDef：skills.json 格式的 4 個武將技能可全部解析', () => {
        // 模擬 JSON.parse(skills.json) 後的結果
        const raw: SkillDef[] = [
            { id: 'zhang-fei-roar',  label: '虎嘯',   description: '', costSp: 100, steps: [] },
            { id: 'guan-yu-slash',   label: '青龍偃月', description: '', costSp: 100, steps: [] },
            { id: 'lu-bu-rampage',   label: '天下無雙', description: '', costSp: 100, steps: [] },
            { id: 'cao-cao-tactics', label: '奇謀佈陣', description: '', costSp: 80,  steps: [] },
        ];
        const sys = new ActionSystem();
        sys.registerSkills(raw);
        assert.lengthEquals(4, sys.getAllSkillIds());
        assert.isDefined(sys.getSkill('cao-cao-tactics'));
        assert.equals(80, sys.getSkill('cao-cao-tactics')!.costSp);
    });

    // ── 預覽模式（武將詳情技能預覽）──────────────────────────────────────────

    suite.test('playSkill previewOnly：不呼叫 playBlock，音效與浮字仍執行', () => {
        const log = runSkill(true);
        assert.lengthEquals(0, log.vfx);
        assert.equals('boom', log.sfx[0]);
        assert.equals('火！', log.text[0]);
    });

    suite.test('playSkill 戰場路徑（未傳 previewOnly）：仍呼叫 playBlock 且音效浮字照常', () => {
        const log = runSkill(undefined);
        assert.lengthEquals(1, log.vfx);
        assert.equals('fire_burst', log.vfx[0]);
        assert.lengthEquals(1, log.sfx);
        assert.lengthEquals(1, log.text);
    });

    return suite;
}
