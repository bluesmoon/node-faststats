var assert = require('assert'),
    Stats = require('fast-stats').Stats;

var s = new Stats();

s.push(0, 10);
s.shift();
