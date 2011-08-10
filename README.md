Fast Statistics
===============

A NodeJS library to do statistical analysis of numeric datasets.

introduction
------------

When doing statistical analysis of data, the most common usage pattern is to run multiple statistical methods on the same set
of data.  Some of these methods use others.  For example, to calculate the standard deviation of a dataset, we first need the
mean.

Additionally, some methods can be calculated quickly as data is inserted, thereby reducing the number of loops required to
run through the data during processing.

Fast stats maintains a running cache of several summary values as data is inserted making final calculation very fast.  It
trades off a small amount of additional memory usage for a large reduction in execution time.

downsides
---------

The downside of how fast stats operates is that if your datapoints are too large, it may result in numeric overflow causing
incorrect results.  Fast stats does not attempt to detect or correct for this.

synopsis
--------

```javascript
var Stats = require('fast-stats').Stats;

var s = new Stats(1, 2, 3, 10, 8, 4, 3);
console.log(s.amean().toFixed(2));
// 4.43
```

installation
------------

    $ npm install fast-stats

API
---

fast-stats is completely synchronous.  There are no blocking methods and consequently no callbacks involved.  All
runtime calls are executed in-memory and are fast.


Copyright
---------

`fast-stats` is Copyright 2011 Philip Tellis <philip@bluesmoon.info> and the latest version of the code is
available at https://github.com/bluesmoon/node-faststats

License
-------

Apache 2.0.  See the [LICENSE](https://github.com/bluesmoon/node-faststats/blob/master/LICENSE) file for details.
