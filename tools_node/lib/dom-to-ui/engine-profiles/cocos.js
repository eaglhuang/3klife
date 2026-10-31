'use strict';

// Cocos 引擎接口：轉換器核心只產生中立描述（字族鍵、溢出意圖、CSS 對齊），
// 由此處翻成 Cocos 的資源路徑與列舉名稱。換 Unity 時新增同形狀的 profile 即可（PROG-2-1653）。

const FONT_ASSETS = {
  newsreader: 'fonts/newsreader/font',
  manrope: 'fonts/manrope/font',
  notosans_tc: 'fonts/notosans_tc/font',
};

// 中立溢出意圖 → Cocos Label.Overflow 名稱
const LABEL_OVERFLOW = {
  'wrap-height': 'RESIZE_HEIGHT',
};

module.exports = {
  id: 'cocos',
  defaultFontKey: 'notosans_tc',
  fontAssetByKey(key) {
    return FONT_ASSETS[key] || `fonts/${key}/font`;
  },
  labelOverflow(intent) {
    return LABEL_OVERFLOW[intent] || null;
  },
  textAlign(cssAlign) {
    return String(cssAlign || 'left').toUpperCase();
  },
};
