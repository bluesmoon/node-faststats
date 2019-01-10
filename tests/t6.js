var assert = require('assert'),
    Stats = require('fast-stats').Stats;

var even = new Stats().push(0.11, 0.11).stddev();
var odd  = new Stats().push(0.11, 0.11, 0.11).stddev();

assert.equal(0, even);
assert.equal(0, odd);
