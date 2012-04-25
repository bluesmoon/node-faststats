var assert = require('assert'),
    Stats = require('fast-stats').Stats;

var s1 = new Stats({buckets: [1, 2, 3, 5, 8, 13], store_data: false});
for(var i=0; i<20; i++)
	s1.push(i);

/*
We should have the following buckets filled:
0
1
2
3, 4
5, 6, 7
8, 9, 10, 11, 12
13, 14, 15, 16, 17, 18, 19
*/

var d = s1.distribution();

d.forEach(function(e) {
	switch(e.bucket) {
		case 0.5: assert.equal(e.count, 1);
			break;
		case 1.5: assert.equal(e.count, 1);
			break;
		case 2.5: assert.equal(e.count, 1);
			break;
		case 4: assert.equal(e.count, 2);
			break;
		case 6.5: assert.equal(e.count, 3);
			break;
		case 10.5: assert.equal(e.count, 5);
			break;
		case 16: assert.equal(e.count, 7);
			break;
		default: assert.fail(e.bucket, "", "", "Unexpected bucket");
	}
});

assert.equal(s1.median(), 8+(13-8)*1.5/5);	// median approximated to low bound of bucket + position in bucket where item might fall

