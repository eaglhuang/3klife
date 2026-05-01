#!/usr/bin/env node
'use strict';

const {
  analyzeFragmentGeometry,
  normalizeFragmentGeometry,
} = require('../lib/dom-to-ui/fragment-geometry-contract');

function fail(message) {
  console.error(`[fragment-geometry-contract-self-test] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const badFixedWrapper = {
  root: {
    type: 'container',
    name: 'TabRoot',
    widget: { top: 0, left: 0, right: 0, bottom: 0 },
    children: [
      {
        type: 'container',
        name: 'GeneratedOuterWrapper',
        width: 540,
        height: 970,
        layout: { type: 'vertical' },
        children: [
          { type: 'label', name: 'InnerLabel', text: 'content' },
        ],
      },
    ],
  },
};

const goodFillRoot = {
  root: {
    type: 'container',
    name: 'TabRoot',
    widget: { top: 0, left: 0, right: 0, bottom: 0 },
    children: [
      {
        type: 'container',
        name: 'GeneratedOuterWrapper',
        widget: { top: 0, left: 0, right: 0, bottom: 0 },
        layout: { type: 'vertical' },
        children: [
          { type: 'label', name: 'InnerLabel', text: 'content' },
        ],
      },
    ],
  },
};

const bad = analyzeFragmentGeometry(badFixedWrapper);
assert(bad.status === 'blocker', 'fixed outer wrapper should fail geometry contract');
assert(bad.findings.length === 1, 'fixed outer wrapper should produce one finding');

const normalized = normalizeFragmentGeometry(badFixedWrapper);
assert(normalized.changed, 'normalizer should update fixed wrapper');
assert(normalized.fragment.root.children[0].widget.left === 0, 'normalizer should apply fill widget');
assert(normalized.fragment.root.children[0].width === undefined, 'normalizer should remove wrapper width');
assert(normalized.fragment.root.children[0].height === undefined, 'normalizer should remove wrapper height');

const good = analyzeFragmentGeometry(goodFillRoot);
assert(good.status === 'pass', 'fill-root wrapper should pass geometry contract');

console.log('[fragment-geometry-contract-self-test] ALL PASS');
