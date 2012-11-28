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

var s = new Stats().push(1, 2, 3, 10, 8, 4, 3);
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

### Configuring the Stats object

The `Stats` constructor takes in a configuration object as a parameter.  This is a simple key-value list that tells
`fast-stats` how to behave under certain conditions.

```javascript
var s = new Stats({ bucket_precision: 10 });
```

The following configuration options are recognised.  All of them are optional.

 *  `bucket_precision`: *[number]* Tells `fast-stats` to maintain a histogram of your dataset using this parameter as the least
    count, or precision.

    This is useful if you have a very large data set, and want to approximate percentile values like the median 
    without having to store the entire dataset in memory.  For example, if you had a million time measurements
    between 0.5 and 1.5 seconds, you could store all million of them, or you could set up 1000 one millisecond
    buckets and store a count of items in each bucket with a precision of 1 millisecond each.  If you reduce (higher
    values are considered less precise) the precision to 10 milliseconds, the number of buckets reduces from 1000
    to 100, taking up less memory overall.

    By default, `fast-stats` will not maintain buckets since it does not know the least count and range of your
    dataset in advance.

    This option is required if you need to use the `distribution()` method.

 *  `buckets`: *[array of numbers]* Tells `fast-stats` to maintain a histogram of your dataset using these custom buckets.

    Each number in the array is the upper limit of a bucket.  The lower limit of the first bucket is 0, the lower limit
    for all other buckets is the upper limit of the previous bucket.

    If you use both `bucket_precision` and `buckets`, `buckets` takes precedence.

 *  `store_data`: *[boolean]* Tells `fast-stats` not to store actual data values. This is useful to reduce memory utilisation
    for large datasets, however it comes with a few caveats.

    1.  You can no longer get an exact median or other percentile value out of your dataset, however you could
        use bucketing (see `bucket_precision` above) to get an approximate percentile value.
    2.  You can no longer run an exact `iqr` filter or a `band_pass` filter on the data, however you could use
        bucketing to get an approximate filtered object.
    3.  You can no longer get at the entire dataset or remove data from the dataset.

    The mean, standard deviation and margin of error calculations are unaffected by this parameter.  If you use
    bucketing, and only care about the mean, standard deviation and margin of error or an approximate median or
    percentile value, set this option to false.

    By default, `store_data` is `true`.


### Getting data in and out

#### Initialising and adding data

The `Stats` object looks a lot like an array in the way you add and remove data to its ends, however there is
no direct access to individual elements.  Data is added to the object using the `push()` and `unshift()` methods.
All values must be numbers and behaviour is undefined if they are not.

The `push()` method takes in a list of values that will be added to the end of the current list and
the `unshift()` method takes in a list of values that will be added to the beginning of the list.

Instead of passing in multiple parameters, you can also pass in an array of numbers as the first parameter.

The following are equivalent.

```javascript
var s1, s2, s3, s4;
s1 = new Stats().push(1, 2, 3, 10, 8, 4, 3);

s2 = new Stats().push([1, 2, 3, 10, 8, 4, 3]);

s3 = new Stats();
s3.push(1, 2, 3, 10, 8, 4, 3);

s4 = new Stats();
s4.unshift(1, 2, 3, 10, 8, 4);
s4.push(3);

assert.equal(s1.amean().toFixed(2), s2.amean().toFixed(2));
assert.equal(s1.amean().toFixed(2), s3.amean().toFixed(2));
assert.equal(s1.amean().toFixed(2), s4.amean().toFixed(2));
```

Note that we use the `toFixed()` method of the Number class when comparing numbers.  Remember that even if you
pass in integers, values like the arithmetic mean, standard deviation and median can sometimes be floating point
numbers, and two floating point numbers may not necessarily be equal to the last decimal point.  The `toFixed()`
method is useful to restrict how precise we want our comparison to be.  Be aware that it returns a string though.

`fast-stats` does not use the `toFixed()` method internally.

The `push()` and `unshift()` methods return the `this` object.

#### Removing data

If you need to remove data from a `Stats` object, use the `pop()` and `shift()` methods.  Their semantics are the
same as the `pop()` and `shift()` methods of Arrays.

```javascript
var a = s1.pop();
assert.equal(a, 3);

var b = s2.shift();
assert.equal(b, 1);

assert.equal(s1.length, 6);
assert.equal(s2.length, 6);
assert.ok(s1.amean() < s2.amean());
```

#### Clearing all data

The `reset()` method clears out all data.

```javascript
s4.reset();
assert.equal(s4.length, 0);
```

The `reset()` method returns a reference to the object, so you can chain methods.

#### Making a copy

The `copy()` method returns a copy of the current Stats object.

```javascript
s4 = s3.copy();

assert.equal(s3.length, s4.length);
```

Additionally, the `copy()` method can create a new `Stats` object with a different configuration.
This is most useful if you need to change bucket sizes or precision.  Simply pass the new config
object as a parameter to the `copy()` method:

```javascript
s4 = s3.copy({store_data: false, bucket_precision: 10 });

### Summaries & Averages

The term _Average_ is overloaded in Statistics.  It relates to a summary of a data set, but says nothing about how
we arrived at that summary.  There are many ways to summarise data, including the arithmetic mean, geometric mean,
harmonic mean, median, mode and more.  `fast-stats` implements the Arithmetic Mean, the Geometric Mean and the Median.
It also implements a percentile method to get at any percentile of the data.

#### Arithmetic Mean

The arithmetic mean is calculated as the sum of all data points divided by the number of data points.  This is useful
for data sets that are fairly uniform, following a linear or binomial distribution.  Use the `amean()` method or the `μ()`
method to get at it:

```javascript
var a = s1.amean();
assert.equal(a.toFixed(2), "4.67");   // remember we popped out the last item of `s1` above.
```

#### Geometric Mean

The arithmetic mean is the `n`th root of the product of all data points where n is the number of data points. This is useful
for data sets that follow an exponential or log-normal distribution.  Use the `gmean()` method to get at it:

```javascript
var a = s1.gmean();
assert.equal(a.toFixed(2), "3.53");
```

#### Median

The median is the middle point of the dataset when sorted in ascending order.  This is useful if your dataset has a lot of
outliers and noise that would not normally be found in a complete population.  Use the `median()` method to get at it:

```javascript
var a = s1.median();
assert.equal(a.toFixed(2), "3.50");
```

If your data set contains an odd number of points, the median will be the middle point.  If it contains an even number of
points, then the median will be the arithmetic mean of the two middle points.

If your Stats object is configured to use buckets and has `store_data` set to false, then the median will be an approximation
of the actual median.

#### Any Percentile

You can also get at any percentile value within the data.  Use the `percentile()` method to get at this data.  The
`percentile()` method takes in a single argument.  This is a number between 0 and 100 (both inclusive) that specifies
which percentile point you want.

```javascript
var p95 = s1.percentile(95);
var m = s1.percentile(50);
var q1 = s1.percentile(25);

assert.equal(p95.toFixed(2), "10.00");
assert.equal(m.toFixed(2), "3.50");
assert.equal(q1.toFixed(2), "2.50");
```

Passing in 50 as an argument will return the median, while 25 and 75 will return the first and third quartiles respectively.
These three special values may be arithmetic means of two other values within the set.  All other arguments will return a
number from the data set.

If your Stats object is configured to use buckets and has `store_data` set to false, then the percentile value returned will
be an approximation of the actual percentile based on the configured `bucket_precision` or `buckets`.

#### Range

The `range()` method tells you the minimum and maximum values of your data set.  It returns an array of two values.  The
first is the lower bound and the second is the upper bound.

```javascript
var r = s1.range();

assert.equal(r.length, 2);
assert.equal(r[0], 1);
assert.equal(r[1], 10);
```
#### Distribution

The `distribution()` method tells you how your data is distributed.  You need to set the `bucket_precision` or `buckets`
configuration options if you plan on using this method.  It will then split your data into buckets based on the value of
`bucket_precision` or `buckets` and tell you how many data points fall into each bucket.  You can use this to plot a 
histogram of your data, or to compare it to commonly known distribution functions.

The return value is a sparse array of buckets with counts of datapoints per bucket.   To save on memory, any empty buckets
are undefined.  You should treat an undefined bucket as if it had 0 datapoints.

A bucket structure looks like this:
```javascript
{
   bucket: <bucket midpoint>,
   range:  [<bucket low>, <bucket high>],
   count:  <number of datapoints>
}
```

Note that the upper bound of the `range` is open, ie, the range does not include the upper bound.

```javascript
var s7 = new Stats({bucket_precision: 10});

// Populate s7 with sequence of squares from 0-10
// 0 1 4 9 16 25 36 49 64 81 100
for(var i=0; i<=10; i++)
	s7.push(i*i);

// distribution should be [4, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1]
// but 0s are undefined to save on memory
var d=s7.distribution();

// length should be one more than (max-min)/bucket_precision
assert.equal(d.length, 11);

d.forEach(function(e) {
	switch(e.bucket) {
		case 5: assert.equal(e.count, 4);	// 0 1 4 9
			break;
		case 15: assert.equal(e.count, 1);	// 16
			break;
		case 25: assert.equal(e.count, 1);	// 25
			break;
		case 35: assert.equal(e.count, 1);	// 36
			break;
		case 45: assert.equal(e.count, 1);	// 49
			break;
		case 55: assert.equal(e.count, 0);
			break;
		case 65: assert.equal(e.count, 1);	// 64
			break;
		case 75: assert.equal(e.count, 0);
			break;
		case 85: assert.equal(e.count, 1);	// 81
			break;
		case 95: assert.equal(e.count, 0);
			break;
		case 105: assert.equal(e.count, 1);	// 100
			break;
		default: assert.fail(e.bucket, "", "", "Unexpected bucket");
	}
});
```

Using custom buckets instead:

```javascript
var assert = require('assert'),
    Stats = require('fast-stats').Stats;

var s1 = new Stats({buckets: [1, 2, 3, 5, 8, 13]});
for(var i=0; i<20; i++)
	s1.push(i);

var d = s1.distribution();

d.forEach(function(e) {
	switch(e.bucket) {
		case 0.5: assert.equal(e.count, 1);	// 0
			break;
		case 1.5: assert.equal(e.count, 1);	// 1
			break;
		case 2.5: assert.equal(e.count, 1);	// 2
			break;
		case 4: assert.equal(e.count, 2);	// 3, 4
			break;
		case 6.5: assert.equal(e.count, 3);	// 5, 6, 7
			break;
		case 10.5: assert.equal(e.count, 5);	// 8, 9, 10, 11, 12
			break;
		case 16: assert.equal(e.count, 7);	// 13, 14, 15, 16, 17, 18, 19
			break;
		default: assert.fail(e.bucket, "", "", "Unexpected bucket");
	}
});
```

### Data Accuracy

There are various statistical values that tell you how accurate or uniform your data is.  `fast-stats` implements
the Arithmetic Standard Deviation, Geometric Standard Deviation and 95% Confidence Interval Margin of Error.

#### Arithmetic Standard Deviation

Also commonly just called the Standard Deviation, with the symbol σ.  This tells you the spread of your data if
it follows a normal (or close to normal) distribution, ie, the bell curve.  `fast-stats` is really fast at
calculating the standard deviation of a dataset.  Use the `stddev()` method or the `σ()` method to get at it.

```javascript
var sd = s1.σ();

assert.equal(sd.toFixed(2), '3.25');
```

The arithmetic standard deviation is used in conjunction with the arithmetic mean to tell you the spread of your
dataset: `[amean-stddev, amean+stddev]`.  Note that you could also use 2 or 3 standard deviations for different
spreads.

#### Geometric Standard Deviation

The geometric mean tells you the spread of your data if it follows a log-normal or exponential distribution.
Use the `gstddev()` method to get at it.

```javascript
var gsd = s1.gstddev();

assert.equal(gsd.toFixed(2), '2.20');
```

The geometric standard deviation is used in conjunction with the geometric mean to tell you the spread of your
dataset: `[gmean/gstddev, gmean*gstddev]`.  Note that this range is not symmetric around the geometric mean.

#### 95% Confidence Margin of Error

The Margin of Error value tells you the range within which the real arithmetic mean of the population is likely to
be with 95% confidence.  Use the `moe()` method to get at it.

```javascript
var moe = s1.moe();

assert.equal(moe.toFixed(2), '2.60');
```

This value suggests that we are 95% certain that the real mean of the population is within 2.60 of the calculated 
arithmetic mean of 4.67.  We could use this to find out the percent error in our sample.  In this case there is a
55.71% error.

The margin of error is inversely proportional to the square root of the number of data points, so increasing the
size of your sample will reduce the margin of error.  It is good to strive for a margin of error of less than 5%.

### Data filtering

When dealing with statistical samples, it may be necessary to filter the dataset to get rid of outliers.  Sometimes
an outlier is fairly obvious, and you can specify an upper and lower limit for it.   At other times, outliers are
only apparent when looking at the rest of the dataset.  Inter-Quartile-Range filtering is useful to filter out these
kinds of data sets.

Note that if your Stats object is configured to use buckets and has `store_data` set to false, then all filtering
will be done on an approximation of the data based on the configured value of `bucket_precision`.  For example,
if you have a set of numbers from 1-100 with `bucket_precision` set to 1, then filtering the dataset between 55
and 85 will get you a dataset between 55 and 85.  If instead, `bucket_precision` is set to 10, then the filtered
dataset will approximately range from 50 to 90.  Note, however, that the `range()` method will attempt to match as
closely as possible the real range.

#### Band-pass filtering

The `band_pass()` filter method returns a new `Stats` object with all its data points within the specified range.
This method takes in three arguments.  The first is the lower bound of the range, the second is the upper bound
of the range.  Both these arguments are required.

The third argument specifies whether the range is open or closed.  An open range does not include the upper and
lower bounds while a closed range includes them.  If not specified (or set to `false`), the range is closed.  If
set to `true` the range is open.

```javascript
var s5 = s1.band_pass(3, 8);
var r = s5.range();

assert.equal(r[0], 3);
assert.equal(r[1], 8);

s5 = s1.band_pass(3, 8, true);
r = s5.range();

assert.equal(r[0], 4);
assert.equal(r[1], 4);
```

Band pass filtering should be used if the range for your data is rigid and never changes.

#### IQR Filtering

IQR, or Inter Quartile Range filtering filters data based on the spread of the data.  It is much more adaptive to
changes in data ranges.  Use the `iqr()` method to IQR filter a dataset.  The `iqr()` method does not accept
any arguments.


```javascript
var s6 = s1.iqr();
r = s6.range();

assert.equal(r[0], 1);
assert.equal(r[1], 10);
```

In some cases, IQR filtering may not filter out anything.  This can happen if the acceptable range is wider than
the bounds of your dataset.


References
----------

Wikipedia is a great place to get information about Statistical functions.

Copyright
---------

`fast-stats` is Copyright 2011 Philip Tellis <philip@bluesmoon.info> and the latest version of the code is
available at https://github.com/bluesmoon/node-faststats

License
-------

Apache 2.0.  See the [LICENSE](https://github.com/bluesmoon/node-faststats/blob/master/LICENSE) file for details.
