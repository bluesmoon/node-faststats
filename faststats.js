/*
Note that if your data is too large, there _will_ be overflow.
*/


function asc(a, b) { return a-b; }

var config_params = {
	bucket_precision: function(o, s) {
		if(typeof s != "number" || s <= 0) {
			throw "bucket_precision must be a positive number";
		}
		o._config.bucket_precision = s;
		o.buckets = [];
	},

	store_data: function(o, s) {
		if(typeof s != "boolean") {
			throw "store_data must be a true or false";
		}
		o._config.store_data = s;
	}
};

function Stats(c) {
	this.reset();

	this._config = { store_data:  true };

	if(c) {
		for(var k in config_params) {
			if(c.hasOwnProperty(k)) {
				config_params[k](this, c[k]);
			}
		}
	}

	return this;
}

Stats.prototype = {

	reset: function() {
		this.data = [];
		this.length = 0;
	
		this.sum = 0;
		this.sum_of_squares = 0;
		this.sum_of_logs = 0;
		this.sum_of_square_of_logs = 0;
		this.max = this.min = null;
	
		this._reset_cache();

		return this;
	},

	_reset_cache: function() {
		this._amean = null;
		this._gmean = null;
		this._stddev = null;
		this._gstddev = null;
		this._moe = null;
		this._data_sorted = null;
	},

	_add_cache: function(a) {
		this.sum += a;
		this.sum_of_squares += a*a;
		this.sum_of_logs += Math.log(a);
		this.sum_of_square_of_logs += Math.pow(Math.log(a), 2);
		this.length++;

		if(this.max === null || this.max < a)
			this.max = a;
		if(this.min === null || this.min > a)
			this.min = a;

		if(this.buckets) {
			var b = Math.floor(a/this._config.bucket_precision);
			this.buckets[b] = (this.buckets[b] || 0) + 1;
		}

		this._reset_cache();
	},

	_del_cache: function(a) {
		this.sum -= a;
		this.sum_of_squares -= a*a;
		this.sum_of_logs -= Math.log(a);
		this.sum_of_square_of_logs -= Math.pow(Math.log(a), 2);
		this.length--;

		if(this.length === 0) {
			this.max = this.min = null;
		}
		else if(this.max === a || this.min === a) {
			var i = this.length-1;
			this.max = this.min = this.data[i--];
			while(i--) {
				if(this.max < this.data[i])
					this.max = this.data[i];
				if(this.min > this.data[i])
					this.min = this.data[i];
			}
		}

		if(this.buckets) {
			var b = Math.floor(a/this._config.bucket_precision);
			this.buckets[b]--;
			if(this.buckets[b] === 0)
				delete this.buckets[b];
		}

		this._reset_cache();
	},

	push: function() {
		var i, a, args=Array.prototype.slice.call(arguments, 0);
		if(args.length && args[0] instanceof Array)
			args = args[0];
		for(i=0; i<args.length; i++) {
			a = args[i];
			if(this._config.store_data)
				this.data.push(a);
			this._add_cache(a);
		}

		return this;
	},

	pop: function() {
		if(this.length === 0 || this._config.store_data === false)
			return undefined;

		var a = this.data.pop();
		this._del_cache(a);

		return a;
	},

	unshift: function() {
		var i, a, args=Array.prototype.slice.call(arguments, 0);
		if(args.length && args[0] instanceof Array)
			args = args[0];
		i=args.length;
		while(i--) {
			a = args[i];
			if(this._config.store_data)
				this.data.unshift(a);
			this._add_cache(a);
		}

		return this;
	},

	shift: function() {
		if(this.length === 0 || this._config.store_data === false)
			return undefined;

		var a = this.data.shift();
		this._del_cache(a);

		return a;
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
		if(this.length === 0)
			return NaN;
		if(this._stddev === null)
			this._stddev = Math.sqrt(this.length * this.sum_of_squares - this.sum*this.sum)/this.length;

		return this._stddev;
	},

	gstddev: function() {
		if(this.length === 0)
			return NaN;
		if(this._gstddev === null)
			this._gstddev = Math.exp(Math.sqrt(this.length * this.sum_of_square_of_logs - this.sum_of_logs*this.sum_of_logs)/this.length);

		return this._gstddev;
	},

	moe: function() {
		if(this.length === 0)
			return NaN;
		// see http://en.wikipedia.org/wiki/Standard_error_%28statistics%29
		if(this._moe === null)
			this._moe = 1.96*this.stddev()/Math.sqrt(this.length);

		return this._moe;
	},

	range: function() {
		if(this.length === 0)
			return [NaN, NaN];
		return [this.min, this.max];
	},

	distribution: function() {
		if(this.length === 0)
			return [];
		if(!this.buckets)
			throw "bucket_precision not configured.";

		var d = [], j, i=Math.floor(this.min/this._config.bucket_precision), l=Math.floor(this.max/this._config.bucket_precision)+1;
		for(j=0; i<l && i<this.buckets.length; i++, j++) {
			if(this.buckets[i])
				d[j] = {
					bucket: (i+0.5)*this._config.bucket_precision,
					range: [i*this._config.bucket_precision, (i+1)*this._config.bucket_precision],
					count: this.buckets[i]
				};
		}

		return d;
		
	},

	percentile: function(p) {
		if(this.length === 0 || (!this._config.store_data && !this.buckets))
			return NaN;

		// If we come here, we either have sorted data or sorted buckets

		var i;

		if(p <=  0)
			i=0;
		else if(p == 25)
			i = [Math.floor((this.length-1)*0.25), Math.ceil((this.length-1)*0.25)];
		else if(p == 50)
			i = [Math.floor((this.length-1)*0.5), Math.ceil((this.length-1)*0.5)];
		else if(p == 75)
			i = [Math.floor((this.length-1)*0.75), Math.ceil((this.length-1)*0.75)];
		else if(p >= 100)
			i = this.length-1;
		else
			i = Math.floor(this.length*p/100);

		if(this._config.store_data) {
			if(this._data_sorted === null)
				this._data_sorted = this.data.sort(asc);

			if(typeof i == 'number')
				return this._data_sorted[i];
			else
				return (this._data_sorted[i[0]] + this._data_sorted[i[1]])/2;
		}
		else {
			var j;
			if(typeof i != 'number')
				i = i[0];

			j = Math.floor(this.min/this._config.bucket_precision);
			for(; j<this.buckets.length; j++) {
				if(!this.buckets[j])
					continue;
				if(i<this.buckets[j]) {
					break;
				}
				i-=this.buckets[j];
			}
			return (j+0.5)*this._config.bucket_precision;
		}
	},

	median: function() {
		return this.percentile(50);
	},

	iqr: function() {
		var q1, q3, fw;

		q1 = this.percentile(25);
		q3 = this.percentile(75);
	
		fw = (q3-q1)*1.5;
	
		return this.band_pass(q1-fw, q3+fw, true);
	},

	band_pass: function(low, high, open) {
		var i, b=new Stats(this._config);

		if(this.length === 0)
			return b;

		if(this._config.store_data) {
			if(this._data_sorted === null)
				this._data_sorted = this.data.sort(asc);
	
			for(i=0; i<this.length && (this._data_sorted[i] < high || (!open && this._data_sorted[i] === high)); i++) {
				if(this._data_sorted[i] > low || (!open && this._data_sorted[i] === low)) {
					b.push(this._data_sorted[i]);
				}
			}
		}
		else if(this.buckets) {
			low = Math.floor(low/this._config.bucket_precision);
			high = Math.floor(high/this._config.bucket_precision)+1;

			for(i=low; i<Math.min(this.buckets.length, high); i++) {
				for(var j=0; j<(this.buckets[i]|0); j++)
					b.push((i+0.5)*this._config.bucket_precision);
			}

			b.min = low;
			b.max = high;
		}

		return b;
	},

	copy: function() {
		var b = this.band_pass(this.min, this.max);

		b.sum = this.sum;
		b.sum_of_squares = this.sum_of_squares;
		b.sum_of_logs = this.sum_of_logs;
		b.sum_of_square_of_logs = this.sum_of_square_of_logs;

		return b;
	}
};

Stats.prototype.σ=Stats.prototype.stddev;
Stats.prototype.μ=Stats.prototype.amean;


exports.Stats = Stats;

if(process.argv[1] && process.argv[1].match(__filename)) {
	var s = new Stats().push(1, 2, 3);
	var l = process.argv.slice(2);
	if(!l.length) l = [10, 11, 15, 8, 13, 12, 19, 32, 17, 16];
	l.forEach(function(e, i, a) { a[i] = parseFloat(e, 10); });
	Stats.prototype.push.apply(s, l);
	console.log(s.data);
	console.log(s.amean().toFixed(2), s.μ().toFixed(2), s.stddev().toFixed(2), s.σ().toFixed(2), s.gmean().toFixed(2), s.median().toFixed(2), s.moe().toFixed(2));
}
