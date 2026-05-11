'use strict';

const core = require('../draft-builder-core');
const { extractInteraction, buildInteractionDraft } = require('../interaction-translator');

module.exports = {
  collectBehavior: core.collectBehavior,
  inferTabSemanticHints: core.inferTabSemanticHints,
  parseFragmentList: core.parseFragmentList,
  extractInteraction,
  buildInteractionDraft,
};
