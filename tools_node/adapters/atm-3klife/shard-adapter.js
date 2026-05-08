'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_PROFILE = Object.freeze({
  oversizeLineThreshold: 600,
  autoSplitThresholdKB: 30,
  scanThresholdKB: 6,
  partNaming: {
    separator: '-part-',
    startAt: 1,
    zeroPad: 0,
  },
});

function normalizeNumber(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadProfile(profilePath) {
  if (!profilePath || !fs.existsSync(profilePath)) {
    return DEFAULT_PROFILE;
  }
  const raw = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  return {
    oversizeLineThreshold: normalizeNumber(raw.oversizeLineThreshold, DEFAULT_PROFILE.oversizeLineThreshold),
    autoSplitThresholdKB: normalizeNumber(raw.autoSplitThresholdKB, DEFAULT_PROFILE.autoSplitThresholdKB),
    scanThresholdKB: normalizeNumber(raw.scanThresholdKB, DEFAULT_PROFILE.scanThresholdKB),
    partNaming: {
      separator: typeof raw.partNaming?.separator === 'string' && raw.partNaming.separator.length > 0
        ? raw.partNaming.separator
        : DEFAULT_PROFILE.partNaming.separator,
      startAt: normalizeNumber(raw.partNaming?.startAt, DEFAULT_PROFILE.partNaming.startAt),
      zeroPad: Number.isFinite(Number(raw.partNaming?.zeroPad))
        ? Math.max(0, Number.parseInt(String(raw.partNaming.zeroPad), 10))
        : DEFAULT_PROFILE.partNaming.zeroPad,
    },
  };
}

class ShardAdapter {
  constructor(options = {}) {
    const profilePath = options.profilePath
      ? path.resolve(options.profilePath)
      : path.resolve(__dirname, 'shard-profile.json');
    this.profile = loadProfile(profilePath);
    this.profilePath = profilePath;
  }

  getOversizeLineThreshold() {
    return this.profile.oversizeLineThreshold;
  }

  getAutoSplitThresholdKB() {
    return this.profile.autoSplitThresholdKB;
  }

  getScanThresholdKB() {
    return this.profile.scanThresholdKB;
  }

  buildPartName(shardName, partIndex) {
    const startAt = this.profile.partNaming.startAt;
    const zeroPad = this.profile.partNaming.zeroPad;
    const serial = startAt + partIndex - 1;
    const serialText = zeroPad > 0 ? String(serial).padStart(zeroPad, '0') : String(serial);
    return `${shardName}${this.profile.partNaming.separator}${serialText}`;
  }
}

function createShardAdapter(options = {}) {
  return new ShardAdapter(options);
}

module.exports = {
  ShardAdapter,
  createShardAdapter,
};
