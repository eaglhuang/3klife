'use strict';

const traverser = require('./traverser');
const typography = require('./typography');
const backgrounds = require('./backgrounds');
const interactions = require('./interactions');
const motion = require('./motion');

module.exports = Object.assign(
  {},
  traverser,
  typography,
  backgrounds,
  interactions,
  motion,
);
