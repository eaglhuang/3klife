#!/usr/bin/env node
/**
 * PROG-2-9729：產生戰鬥音效「變調版本」。
 *
 * Cocos AudioSource.playOneShot 不支援 pitch／playbackRate，所以改成預先把既有素材重取樣成多個版本，
 * 程式端依傷害輕重、兵種挑不同檔。本機沒有 ffmpeg，這裡用 puppeteer-core 開 Edge 無頭頁，
 * 在頁面裡用 Web Audio 的 OfflineAudioContext（playbackRate 重取樣＋可選低通／增益）渲染，
 * 再於 node 端寫成 16-bit 單聲道 22050Hz WAV。不下載任何外部素材。
 *
 * 用法：
 *   node tools_node/gen-audio-variants.js          產生到 assets/bundles/audio/clips/（可重跑，輸出固定）
 *   node tools_node/gen-audio-variants.js --probe  只印來源檔長度，不寫檔
 *
 * 新檔的 .meta 不在這裡產生（uuid 要固定提交），已隨檔提交；重跑只覆寫 .wav。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const CLIPS = path.join(ROOT, 'assets', 'bundles', 'audio', 'clips');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT_RATE = 22050;

/**
 * 變調規格。rate<1 變低沉、變長；rate>1 變尖、變短。
 * startSec／maxSec 先在「來源時間」裁切，再重取樣；fadeMs 為輸出尾端淡出；lowpass 為低通截止頻率（Hz）。
 */
const SPECS = [
  // 受擊分層（來源 hurt／weapon／shield／bite，取短段避免拖尾）
  { out: 'hit_light',  src: 'hurt.mp3',   rate: 1.25, maxSec: 0.30, fadeMs: 40, gain: 0.9 },
  { out: 'hit_heavy',  src: 'hurt.mp3',   rate: 0.8,  maxSec: 0.45, fadeMs: 60, gain: 1.0, lowpass: 5000 },
  { out: 'hit_block',  src: 'shield.mp3', rate: 1.1,  maxSec: 0.30, fadeMs: 40, gain: 0.95 },
  { out: 'hit_lethal', src: 'bite.mp3',   rate: 0.75, maxSec: 0.50, fadeMs: 70, gain: 1.0, lowpass: 4500 },
  // 腳步分兵種（來源 footstep.mp3；騎兵馬蹄取 hoof_gallop 前段一個蹄拍再壓低）
  { out: 'footstep_light', src: 'footstep.mp3',    rate: 1.2,  maxSec: 0.25, fadeMs: 20, gain: 0.95 },
  { out: 'footstep_heavy', src: 'footstep.mp3',    rate: 0.78, maxSec: 0.35, fadeMs: 30, gain: 1.0, lowpass: 3500 },
  { out: 'footstep_hoof',  src: 'hoof_gallop.wav', rate: 0.85, startSec: 0.0, maxSec: 0.22, fadeMs: 40, gain: 1.0, lowpass: 4000 },
];

function pageFunction() {
  // 在頁面內執行：解碼 → 裁切 → OfflineAudioContext 重取樣 → 回傳 Float32 取樣陣列
  window.renderVariant = async (b64, spec, outRate) => {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const decCtx = new AudioContext();
    const decoded = await decCtx.decodeAudioData(buf.buffer);
    await decCtx.close();
    if (spec.probe) return { duration: decoded.duration, sampleRate: decoded.sampleRate };
    const start = spec.startSec || 0;
    const srcSec = Math.min(spec.maxSec, decoded.duration - start);
    const outSec = srcSec / spec.rate;
    const ctx = new OfflineAudioContext(1, Math.ceil(outSec * outRate), outRate);
    const node = ctx.createBufferSource();
    node.buffer = decoded;
    node.playbackRate.value = spec.rate;
    let tail = node;
    if (spec.lowpass) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = spec.lowpass;
      tail.connect(lp);
      tail = lp;
    }
    const g = ctx.createGain();
    const fade = Math.min((spec.fadeMs || 0) / 1000, outSec);
    g.gain.setValueAtTime(spec.gain, 0);
    tail.connect(g);
    g.connect(ctx.destination);
    node.start(0, start, srcSec);
    const rendered = await ctx.startRendering();
    // 尾端淡出在 node 端 encodeWav 處理，這裡只回傳取樣與淡出秒數
    const data = rendered.getChannelData(0);
    return { samples: Array.from(data), fade };
  };
}

function encodeWav(float, rate, fadeSec) {
  const n = float.length;
  const fadeN = Math.floor(fadeSec * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let v = float[i];
    // 尾端淡出（線性）
    if (fadeN > 0 && i >= n - fadeN) v *= (n - i) / fadeN;
    v = Math.max(-1, Math.min(1, v));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

async function main() {
  const probe = process.argv.includes('--probe');
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.evaluate('(' + pageFunction.toString() + ')()');
    if (probe) {
      for (const f of [...new Set(SPECS.map(s => s.src))].concat(['die.mp3', 'boom.mp3', 'hurt.mp3', 'weapon.mp3'])) {
        const b64 = fs.readFileSync(path.join(CLIPS, f)).toString('base64');
        const r = await page.evaluate((b, s) => window.renderVariant(b, s, 22050), b64, { probe: true });
        console.log(f, r.duration.toFixed(3) + 's', r.sampleRate);
      }
      return;
    }
    let total = 0;
    for (const spec of SPECS) {
      const b64 = fs.readFileSync(path.join(CLIPS, spec.src)).toString('base64');
      const r = await page.evaluate((b, s, rate) => window.renderVariant(b, s, rate), b64, spec, OUT_RATE);
      const wav = encodeWav(r.samples, OUT_RATE, r.fade);
      fs.writeFileSync(path.join(CLIPS, spec.out + '.wav'), wav);
      total += wav.length;
      console.log(spec.out + '.wav', wav.length, 'bytes', (r.samples.length / OUT_RATE).toFixed(3) + 's');
    }
    console.log('total bytes', total);
  } finally {
    await browser.close();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
