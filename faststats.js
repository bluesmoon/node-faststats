/*
Note that if your data is too large, there _will_ be overflow.

TODO:
	filtering: iqr, band-pass
*/


function Stats() {
	this.reset();
	if(arguments)
		this.push.apply(this, arguments);

	return this;
}

Stats.prototype = {
	reset: function() {
		this.data = [];
		this.length = 0;
	
		this.data_sorted = null;
	
		this.sum = 0;
		this.sum_of_squares = 0;
		this.sum_of_logs = 0;
		this.sum_of_square_of_logs = 0;
	
		this._amean = null;
		this._gmean = null;
		this._stddev = null;
		this._moe = null;
	
		this._q1 = this._q2 = this._q3 = null;
	
		return this;
	},

	push: function() {
		var i, a;
		for(i=0; i<arguments.length; i++) {
			a = arguments[i];
			this.data.push(a);
			this.sum += a;
			this.sum_of_squares += a*a;
			this.sum_of_logs += Math.log(a);
			this.sum_of_square_of_logs += Math.pow(Math.log(a), 2);
			this.length++;

			this._amean = null;
			this._gmean = null;
			this._stddev = null;
			this._gstddev = null;
			this._moe = null;
			this._q1 = this._q2 = this._q3 = null;

			this._data_sorted = null;
		}

		return this;
	},

	amean: function() {
		if(this.length === 0)
			return NaN;
		if(this._amean === null)
			this._amean = this.sum/this.length;

		return this._amean;
	},

	gmean: function() {
		if(this.length === 0)
			return NaN;
		if(this._gmean === null)
			this._gmean = Math.exp(this.sum_of_logs/this.length);

		return this._gmean;
	},

	stddev: function() {
		if(this.data.length === 0)
			return NaN;
		if(this._stddev === null)
			this._stddev = Math.sqrt(this.length * this.sum_of_squares - this.sum*this.sum)/this.length;

		return this._stddev;
	},

	gstddev: function() {
		if(this.data.length === 0)
			return NaN;
		if(this._gstddev === null)
			this._gstddev = Math.exp(Math.sqrt(this.length * this.sum_of_square_of_logs - this.sum_of_logs*this.sum_of_logs)/this.length);

		return this._stddev;
	},

	moe: function() {
		if(this.data.length === 0)
			return NaN;
		// see http://en.wikipedia.org/wiki/Standard_error_%28statistics%29
		if(this._moe === null)
			this._moe = 1.96*this.stddev()/Math.sqrt(this.length);

		return this._moe;
	},

	range: function() {
		if(this.data.length === 0)
			return [NaN, NaN];
		return [Math.max(this.data), Math.min(this.data)];
	},

	percentile: function(p) {
		if(this.data.length === 0)
			return NaN;
		if(this._data_sorted === null)
			this._data_sorted = this.data.sort();

		if(p <=  0)
			return this._data_sorted[0];
		if(p == 50)
			return this.median();
		if(p >= 100)
			return this._data_sorted[this.length-1];

		return this._data_sorted[Math.floor(this.length*p/100)];
	},

	median: function() {
		if(this.data.length === 0)
			return NaN;
		if(this._data_sorted === null)
			this._data_sorted = this.data.sort();

		if(this._q2 === null) {
			if(this.length % 2 == 1)
				this._q2 = this._data_sorted[Math.floor(this.length/2)];
			else
				this._q2 = (this._data_sorted[this.length/2] + this._data_sorted[this.length/2-1])/2;
		}

		return this._q2;
	}
};

Stats.prototype.σ=Stats.prototype.stddev;
Stats.prototype.μ=Stats.prototype.amean;


exports.Stats = Stats;

if(process.argv[1].match(__filename)) {
	var s = new Stats(1, 2, 3);
	var l = process.argv.slice(2);
	if(!l.length) l = [10, 11, 15, 8, 13, 12, 19, 32, 17, 16];
	l.forEach(function(e, i, a) { a[i] = parseFloat(e, 10); });
	Stats.prototype.push.apply(s, l);
	console.log(s.data);
	console.log(s.amean().toFixed(2), s.μ().toFixed(2), s.stddev().toFixed(2), s.σ().toFixed(2), s.gmean().toFixed(2), s.median().toFixed(2), s.moe().toFixed(2));
}
