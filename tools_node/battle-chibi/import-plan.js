// 匯入計畫的純邏輯（不碰檔案與 git），供 import-battle-chibi.js 與單元測試共用。
// 規則全部由資料決定：來源裡有哪些角色就處理哪些，不在程式裡寫死名單。

/** 小兵素材的命名前綴；符合者整份匯入到 soldiers/<名稱>/。 */
const SOLDIER_PREFIX = 'soldier_';

/**
 * 依來源角色名單與設定檔，排出每個角色要怎麼匯入。
 * @param {string[]} names 來源裡的角色資料夾名（例如 char2、soldier_cavalry_blue）
 * @param {{ generalDirs?: Record<string,string>, skip?: string[] }} config
 *   generalDirs：來源名 → 遊戲內武將資料夾名（兩者不同時才需要寫，例如 char2 → zhang_fei）
 *   skip：不匯入的來源名（淘汰的舊版骨架等）
 * @returns {{ name: string, kind: 'soldier'|'general', dir: string }[]} 依名稱排序，結果穩定
 */
function planImport(names, config) {
  const skip = new Set((config && config.skip) || []);
  const dirs = (config && config.generalDirs) || {};
  const seen = new Set();
  const plan = [];
  for (const name of names.slice().sort()) {
    if (!name || skip.has(name) || seen.has(name)) continue;
    seen.add(name);
    if (name.startsWith(SOLDIER_PREFIX)) plan.push({ name, kind: 'soldier', dir: `soldiers/${name}` });
    else plan.push({ name, kind: 'general', dir: `generals/${dirs[name] || name}` });
  }
  return plan;
}

/**
 * 從 Spine 圖集文字找出所有圖集頁的檔名。
 * 圖集頁的寫法：一行檔名，下一行以 size: 開頭。大圖集會有多頁，不能假設只有一張。
 */
function atlasPages(text) {
  const lines = String(text).split(/\r?\n/);
  const pages = [];
  for (let i = 0; i + 1 < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.includes(':') && /^size\s*:/.test(lines[i + 1].trim())) pages.push(line);
  }
  return pages;
}

/** 從小兵素材名拆出兵種外觀名與陣營色（soldier_cavalry_blue → cavalry、blue）；不符格式回傳 null。 */
function soldierArtOf(name) {
  const m = /^soldier_(.+)_(blue|red)$/.exec(name);
  return m ? { art: m[1], color: m[2] } : null;
}

module.exports = { planImport, atlasPages, soldierArtOf, SOLDIER_PREFIX };
