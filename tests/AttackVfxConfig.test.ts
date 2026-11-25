/**
 * AttackVfxConfig.test.ts — 攻擊特效設定檔檢查：兵種五種齊全、眩光欄位、顏色飽和度、武器模板畫法分支、兵種分類都走得到新特效。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { attackStyleFor } from '../assets/scripts/battle/shared/AttackStyle';
import { TestSuite, assert } from './TestRunner';

type Pal = { main: string; glow: string; core: string; accent: string };
const cfg = JSON.parse(readFileSync(join(__dirname, '../assets/resources/data/attack-vfx.json'), 'utf8'));
const player = readFileSync(join(__dirname, '../assets/scripts/battle/views/AttackVfxPlayer.ts'), 'utf8');

/** #RRGGBB → HSV（s、v 為 0~1） */
function hsv(hex: string): { s: number; v: number } {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return { s: mx === 0 ? 0 : (mx - mn) / mx, v: mx };
}

function allPalettes(): Array<[string, Pal]> {
    const out: Array<[string, Pal]> = [];
    for (const [k, v] of Object.entries<any>(cfg.troops)) out.push([`troops.${k}`, v.palette]);
    for (const [k, v] of Object.entries<any>(cfg.generalProfiles)) if (!k.startsWith('_')) out.push([`generalProfiles.${k}`, v.palette]);
    for (const [k, v] of Object.entries<any>(cfg.fallback.elementPalettes)) out.push([`fallback.${k}`, v as Pal]);
    out.push(['fallback.default', cfg.fallback.defaultPalette]);
    return out;
}

export function createAttackVfxConfigSuite(): TestSuite {
    const suite = new TestSuite('AttackVfxConfig');

    suite.test('五種兵種都有設定，且各自有畫法 kind 與調色盤', () => {
        for (const k of ['slash', 'thrust', 'bow', 'shield', 'charge']) {
            assert.isTrue(!!cfg.troops[k], `缺少兵種 ${k}`);
            assert.isTrue(typeof cfg.troops[k].kind === 'string', `${k} 缺 kind`);
            assert.isTrue(!!cfg.troops[k].palette, `${k} 缺 palette`);
        }
    });

    suite.test('兵種分類：槍／步／弓／盾／騎都能對到設定（不會退回舊特效）', () => {
        const troopTypes = ['pikeman', 'infantry', 'archer', 'shield', 'cavalry', 'engineer', 'medic', 'navy'];
        for (const t of troopTypes) {
            const style = attackStyleFor(t);
            assert.isTrue(style !== 'generic' && !!cfg.troops[style], `${t} → ${style} 沒有新特效設定`);
        }
    });

    suite.test('glow 眩光欄位齊全且在合理範圍', () => {
        const g = cfg.glow;
        for (const k of ['outerWidthMul', 'outerAlpha', 'midAlpha', 'coreWidthMul', 'coreWhiten', 'stripOuterMul', 'stripCoreMul']) {
            assert.isTrue(typeof g[k] === 'number', `glow.${k} 缺少`);
        }
        assert.isTrue(g.outerWidthMul >= 4 && g.outerWidthMul <= 10, '外暈寬倍數應在 4~10（相對核心寬）');
        assert.isTrue(g.coreWhiten >= 0.85, "核心要偏白（coreWhiten ≥0.85）");
        assert.isTrue(g.outerAlpha >= 0.5, '外暈 alpha 應不低於 0.5');
        assert.isTrue(g.midWhiten >= 0 && g.midWhiten <= 0.5, '中層微提亮 midWhiten 在 0~0.5（不能洗掉飽和色）');
        assert.isTrue(g.flash.sec <= 0.16, '命中閃光需 ≤0.16 秒');
        assert.isTrue(g.flash.rays >= 4 && g.flash.rays <= 6, '星形閃光 4~6 道放射線');
        assert.isTrue(g.flash.lenPx >= 24 && g.flash.coreRadiusPx > 0, '星形閃光尺寸至少 24px');
        assert.isTrue(cfg.additive === true, '預設應為加色混合');
    });

    suite.test('疊畫 passes：預設 2、上限 3、程式端夾到 1~3；passes=1 有 lowEnd 舊亮度可退回', () => {
        const g = cfg.glow;
        assert.isTrue(Number.isInteger(g.passes) && g.passes >= 1 && g.passes <= 3, 'glow.passes 應為 1~3 的整數');
        assert.isTrue(g.passes === 2, '預設 passes 應為 2');
        assert.isTrue(/Math\.min\(3,/.test(player) && /Math\.max\(1,/.test(player), '播放器需把 passes 夾在 1~3');
        assert.isTrue(/for \(let k = 0; k < PASS; k\+\+\)/.test(player), '線／圓／刀光等筆畫需依 PASS 疊畫');
        const lo = g.lowEnd;
        assert.isTrue(!!lo && typeof lo === 'object', 'glow.lowEnd 應提供 passes=1 的舊亮度覆寫');
        assert.isTrue(lo.outerAlpha === 0.45 && lo.coreWhiten === 0.85 && lo.midWhiten === 0, 'lowEnd 應為舊亮度數值');
        assert.isTrue(lo.flash.sec === 0.11 && lo.flash.lenPx === 44, 'lowEnd 閃光應為舊尺寸');
        assert.isTrue(/resolveGlow\(/.test(player) && /lowEnd/.test(player), '播放器需在 passes=1 時套用 lowEnd');
    });

    suite.test('效能：不用 customMaterial；繪製次數有計數欄位供量測', () => {
        assert.isTrue(!/\.customMaterial\s*=/.test(player), '不可使用 customMaterial（網頁版會崩潰）');
        assert.isTrue(/getMaterialInstance\(0\)/.test(player) && /overridePipelineStates/.test(player), '加色需維持 getMaterialInstance 覆寫');
        assert.isTrue(/drawOps/.test(player) && /peakDrawOps/.test(player), 'attackVfxStats 需有 drawOps／peakDrawOps');
    });

    suite.test('顏色：main／glow／accent 飽和度 ≥0.85 且明度 1.0，core 偏白', () => {
        for (const [name, pal] of allPalettes()) {
            for (const k of ['main', 'glow', 'accent'] as const) {
                const { s, v } = hsv(pal[k]);
                assert.isTrue(s >= 0.85, `${name}.${k} ${pal[k]} 飽和度 ${s.toFixed(2)} < 0.85`);
                if (k !== 'glow') assert.isTrue(v >= 0.999, `${name}.${k} ${pal[k]} 明度 ${v.toFixed(2)} < 1`);
            }
            assert.isTrue(hsv(pal.core).s <= 0.35, `${name}.core 應近白`);
        }
    });

    suite.test('命中火花線寬與尺寸達標、上限由 JSON 控制', () => {
        assert.isTrue(cfg.budget.minLinePx >= 2);
        const specs: any[] = [...Object.values(cfg.troops), cfg.generalTemplates.blade, cfg.generalTemplates.spear, cfg.generalTemplates.sword, cfg.generalTemplates.bow];
        for (const s of specs) {
            if (s.sparkWidthPx !== undefined) assert.isTrue(s.sparkWidthPx >= 2, '火花線寬至少 2px');
            if (s.sparkLenPx !== undefined) assert.isTrue(s.sparkLenPx >= 28, '火花長度至少 28px');
        }
        assert.isTrue(cfg.troops.bow.trailWidthPx >= 12, '箭尾要夠寬才能在全景看見');
        assert.isTrue(cfg.budget.maxEffects > 0 && cfg.budget.maxParticles > 0);
    });

    suite.test('武器模板 blade／sword／spear／bow／cast 都存在，kind 在播放器有對應畫法分支', () => {
        for (const w of ['blade', 'sword', 'spear', 'bow', 'cast']) {
            const tpl = cfg.generalTemplates[w];
            assert.isTrue(!!tpl, `缺武器模板 ${w}`);
            assert.isTrue(player.includes(`case '${tpl.kind}'`), `播放器沒有 ${tpl.kind} 畫法分支`);
        }
        for (const t of Object.values<any>(cfg.troops)) assert.isTrue(player.includes(`case '${t.kind}'`), `播放器沒有 ${t.kind} 畫法分支`);
        assert.isTrue(!!cfg.generalTemplates.sword.doubleArc, '劍應為雙弧');
        assert.isTrue(cfg.generalTemplates.sword.durationSec < cfg.generalTemplates.blade.durationSec, '劍應比刀更短更快');
    });

    suite.test('騎兵揚塵為土黃色一般混合、不走加色', () => {
        const c = cfg.troops.charge;
        const n = parseInt(c.dustColor.slice(1), 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        assert.isTrue(r > g && g > b, '揚塵應為土黃色');
        assert.isTrue(c.dustAlpha < 255);
        assert.isTrue(/this\.dg\b/.test(player), '揚塵應畫在獨立的一般混合 Graphics');
    });

    suite.test('騎兵、盾兵、諸葛亮法陣：JSON 有縮小與降不透明度倍率，不遮住部隊身形', () => {
        const cases: Array<[string, { sizeMul?: number; alphaMul?: number }]> = [
            ['盾兵', cfg.troops.shield], ['騎兵', cfg.troops.charge], ['施法法陣', cfg.generalTemplates.cast],
        ];
        for (const [name, p] of cases) {
            assert.isTrue(typeof p.sizeMul === 'number' && p.sizeMul >= 0.5 && p.sizeMul < 1, `${name} sizeMul 應在 0.5~1 之間`);
            assert.isTrue(typeof p.alphaMul === 'number' && p.alphaMul >= 0.4 && p.alphaMul < 1, `${name} alphaMul 應在 0.4~1 之間`);
        }
        assert.isTrue(/curAlphaMul/.test(player) && /scaleParams\(/.test(player), '播放器需套用 alphaMul 與 sizeMul');
    });

    return suite;
}
