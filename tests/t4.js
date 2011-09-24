var assert = require('assert'),
    Stats = require('fast-stats').Stats;

var s1 = new Stats({buckets: [1, 2, 3, 5, 8, 13]});
for(var i=0; i<20; i++)
	s1.push(i);

/*
We should have the following buckets filled:
0, 1
2
3
4, 5
6, 7, 8
9, 10, 11, 12, 13
14, 15, 16, 17, 18, 19
*/

console.log(s1.distribution());
